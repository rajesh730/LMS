import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Teacher from "@/models/Teacher";
import Student from "@/models/Student";

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

        // 1. Try Teacher collection FIRST (Clean Architecture)
        const teacher = await Teacher.findOne({ email: credentials.email });

        if (teacher) {
          let isValid = false;

          if (teacher.password) {
            isValid = await bcrypt.compare(
              credentials.password,
              teacher.password,
            );
          } else {
            // Fallback: Try User collection or visiblePassword
            const user = await User.findOne({ email: credentials.email });
            if (user && user.password) {
              isValid = await bcrypt.compare(
                credentials.password,
                user.password,
              );
            } else if (teacher.visiblePassword) {
              // Last resort: Plain text comparison (for legacy data)
              isValid = credentials.password === teacher.visiblePassword;
            }
          }

          if (!isValid) {
            throw new Error("Invalid password");
          }

          // Return teacher user object
          return {
            id: teacher._id.toString(),
            email: teacher.email,
            role: "TEACHER",
            name: teacher.name,
            status: "APPROVED", // Teachers are always approved when created
            schoolId: teacher.school?.toString(),
          };
        }

        // 2. Try User collection (Admins, School Admins, Legacy support)
        const user = await User.findOne({ email: credentials.email });

        if (user) {
          const isValid = await bcrypt.compare(
            credentials.password,
            user.password,
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

          if (user.role === "SCHOOL_ADMIN") {
            schoolId = user._id.toString();
          }

          return {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            name:
              user.role === "SUPER_ADMIN"
                ? user.name || user.email
                : user.schoolName || "Admin",
            status: user.status,
            schoolId,
            authVersion: user.authVersion || 0,
          };
        }

        // 3. Try Student collection (Students)
        // Check by username OR email (in case they use email)
        const student = await Student.findOne({
          $or: [{ username: credentials.email }, { email: credentials.email }],
        });

        if (student) {
          const isValid = await bcrypt.compare(
            credentials.password,
            student.password,
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
        token.authVersion = user.authVersion || 0;
        delete token.error;
      } else if (
        token?.id &&
        ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(String(token.role || ""))
      ) {
        await connectDB();
        const currentUser = await User.findById(token.id).select(
          "authVersion status role"
        );

        if (!currentUser) {
          token.error = "SessionRevoked";
          delete token.role;
          delete token.schoolId;
        } else {
          token.status = currentUser.status;
          if ((currentUser.authVersion || 0) !== (token.authVersion || 0)) {
            token.error = "SessionRevoked";
            delete token.role;
            delete token.schoolId;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.status = token.status;
        session.user.schoolId = token.schoolId || null;
        session.user.authVersion = token.authVersion || 0;
        if (token.error) {
          session.error = token.error;
        }
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
