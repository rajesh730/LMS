import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Teacher from "@/models/Teacher";
import Student from "@/models/Student";
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
        email: { label: "Email/Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectDB();

        // 1. Try User collection (Admins, Teachers)
        const user = await User.findOne({ email: credentials.email });

        if (user) {
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
            // Legacy support if any students are still in User collection
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
        }

        // 2. Try Student collection (Students)
        // Check by username OR email (in case they use email)
        const student = await Student.findOne({
          $or: [{ username: credentials.email }, { email: credentials.email }],
        });

        if (student) {
          const isValid = await bcrypt.compare(
            credentials.password,
            student.password
          );

          if (!isValid) {
            throw new Error("Invalid password");
          }

          // Return student user object
          return {
            id: student._id.toString(),
            email: student.email || student.username, // Use username if email missing
            role: "STUDENT",
            name: student.name,
            status: "ACTIVE", // Default to active as status management is removed
            schoolId: student.school?.toString(),
          };
        }

        throw new Error("No user found with this email/username");
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

export { handler as GET, handler as POST, authOptions };
