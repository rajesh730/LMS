import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Teacher from "@/models/Teacher";
import Student from "@/models/Student";

const PERSISTENT_SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const SESSION_REFRESH_INTERVAL = 60 * 60 * 24; // 1 day

// Match NextAuth's own secure-cookie detection so the cookie name/flags stay
// correct in both local (http) and production (https) environments.
const useSecureCookies = (process.env.NEXTAUTH_URL || "").startsWith("https://");
const cookiePrefix = useSecureCookies ? "__Secure-" : "";

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
        const teacher = await Teacher.findOne({
          email: credentials.email,
          isDeleted: { $ne: true },
          status: { $ne: "INACTIVE" },
        });

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

          if (["STUDENT", "TEACHER"].includes(user.role)) {
            throw new Error("Your profile is inactive or unavailable.");
          }

          // Resolve a schoolId for downstream filtering
          let schoolId = null;

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
          isDeleted: { $ne: true },
          status: "ACTIVE",
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
      } else if (token?.id) {
        await connectDB();
        const role = String(token.role || "");

        if (["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(role)) {
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
        } else if (role === "TEACHER") {
          const currentTeacher = await Teacher.findById(token.id).select(
            "status isDeleted school"
          );

          if (
            !currentTeacher ||
            currentTeacher.isDeleted ||
            currentTeacher.status === "INACTIVE"
          ) {
            token.error = "SessionRevoked";
            delete token.role;
            delete token.schoolId;
          } else {
            token.schoolId = currentTeacher.school?.toString() || null;
          }
        } else if (role === "STUDENT") {
          const currentStudent = await Student.findById(token.id).select(
            "status isDeleted school"
          );

          if (
            !currentStudent ||
            currentStudent.isDeleted ||
            currentStudent.status !== "ACTIVE"
          ) {
            token.error = "SessionRevoked";
            delete token.role;
            delete token.schoolId;
          } else {
            token.schoolId = currentStudent.school?.toString() || null;
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
    maxAge: PERSISTENT_SESSION_MAX_AGE,
    updateAge: SESSION_REFRESH_INTERVAL,
  },
  jwt: {
    maxAge: PERSISTENT_SESSION_MAX_AGE,
  },
  // Explicitly persist the session cookie. Setting maxAge on the cookie itself
  // writes a Max-Age into the Set-Cookie header, so the cookie survives tab and
  // browser closes (instead of being a session-only cookie). The user stays
  // logged in until they explicitly sign out or the year elapses.
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        maxAge: PERSISTENT_SESSION_MAX_AGE,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
