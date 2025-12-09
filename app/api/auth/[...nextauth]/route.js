import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Teacher from "@/models/Teacher";
import { ensureDefaultAdmin } from "@/lib/seed";

// Run seed on startup
connectDB().then(() => {
  ensureDefaultAdmin();
});

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectDB();

        const user = await User.findOne({ email: credentials.email });

        if (!user) {
          throw new Error("No user found with this email");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error("Invalid password");
        }

        if (user.status === "PENDING") {
          throw new Error("Your account is pending approval.");
        }

        if (user.status === "REJECTED") {
          throw new Error("Your account has been rejected.");
        }

        if (user.status === "UNSUBSCRIBED") {
          throw new Error("Your account is inactive.");
        }

        // Resolve a schoolId for downstream filtering
        let schoolId = null;

        if (user.role === "STUDENT") {
          return {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            name: user.name,
            status: user.status,
            schoolId,
          };
        }

        if (user.role === "TEACHER") {
          // Map teacher to their school for event/subject filtering
          const teacherDoc = await Teacher.findOne({
            email: user.email,
          }).select("school");
          schoolId = teacherDoc?.school?.toString() || null;
          return {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            name: user.name,
            status: user.status,
            schoolId,
          };
        }

        // SCHOOL_ADMIN and SUPER_ADMIN
        schoolId = user._id.toString();
        return {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          name: user.schoolName || "Admin",
          status: user.status,
          schoolId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.status = user.status;
        token.schoolId = user.schoolId || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.status = token.status;
        session.user.schoolId = token.schoolId || null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
