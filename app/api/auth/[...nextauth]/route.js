import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Teacher from "@/models/Teacher";
import Student from "@/models/Student";
import { applyRateLimit } from "@/lib/rateLimit";

const PERSISTENT_SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const SESSION_REFRESH_INTERVAL = 60 * 60 * 24; // 1 day

// How long a token's DB-backed checks (status/authVersion/school/calendar) stay
// trusted before we re-query. Without this, every getServerSession() — and we
// call it on essentially every authenticated render — fired a findById, adding a
// DB round trip to each request. Revalidating at most once per minute keeps
// revocation effectively immediate (≤60s) while cutting the vast majority of
// those queries. A client session.update() bypasses it for instant refreshes.
const TOKEN_REVALIDATE_MS = 60 * 1000;

// Look up a school's display name by id. Pure fetch — call sites decide when to
// re-resolve (e.g. when the user's school changes on transfer) vs. reuse cache.
async function fetchSchoolName(schoolId) {
  if (!schoolId) return null;
  const school = await User.findById(schoolId).select("schoolName name").lean();
  return school?.schoolName || school?.name || null;
}

// Keep the token's cached schoolName in sync with its current school. Tracks
// which school the cached name belongs to (`schoolNameForId`) and re-fetches only
// when that no longer matches the current school — so routine refreshes stay
// cheap, but a transferred student's name updates (including students who were
// already transferred before this tracking existed).
async function syncSchoolOnToken(token, nextSchoolId) {
  const newSchoolId = nextSchoolId?.toString() || null;
  if (!newSchoolId) {
    token.schoolName = null;
    token.schoolNameForId = null;
  } else if (newSchoolId !== token.schoolNameForId || !token.schoolName) {
    token.schoolName = await fetchSchoolName(newSchoolId);
    token.schoolNameForId = newSchoolId;
  }
  token.schoolId = newSchoolId;
}

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
      async authorize(credentials, req) {
        const identifier = String(credentials?.email || "").trim();
        const normalizedEmail = identifier.toLowerCase();

        // Throttle credential attempts per client IP to blunt brute-forcing.
        const ip =
          String(req?.headers?.["x-forwarded-for"] || "")
            .split(",")[0]
            .trim() || "unknown";
        const rate = await applyRateLimit({
          key: `login:${ip}`,
          windowMs: 10 * 60 * 1000,
          max: 15,
        });
        if (!rate.ok) {
          throw new Error(
            `Too many login attempts. Try again in ${rate.retryAfter}s.`
          );
        }

        await connectDB();

        // 1. Try Teacher collection FIRST (Clean Architecture)
        const teacher = await Teacher.findOne({
          email: normalizedEmail,
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
            // Fallback: a legacy teacher whose credentials live in the User
            // collection. Hashed compare only — no plaintext path.
            const user = await User.findOne({ email: normalizedEmail });
            if (user && user.password) {
              isValid = await bcrypt.compare(
                credentials.password,
                user.password,
              );
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
        const user = await User.findOne({ email: normalizedEmail });

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
            schoolName:
              user.role === "SUPER_ADMIN" ? null : user.schoolName || null,
            status: user.status,
            schoolId,
            authVersion: user.authVersion || 0,
            calendarPreference: user.calendarPreference || "BS",
          };
        }

        // 3. Try Student collection (Students)
        // Check by username OR email (in case they use email)
        const student = await Student.findOne({
          $or: [{ username: identifier }, { email: normalizedEmail }],
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
            calendarPreference: student.calendarPreference || "BS",
          };
        }

        throw new Error("No user found with this email/username");
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.status = user.status;
        token.schoolId = user.schoolId || null;
        token.schoolName = user.schoolName || null;
        token.authVersion = user.authVersion || 0;
        token.calendarPreference = user.calendarPreference || "BS";
        token.lastValidatedAt = Date.now();
        delete token.error;
      } else if (
        token?.id &&
        // Skip the DB revalidation when we checked recently — unless the client
        // explicitly asked for a refresh via session.update().
        (trigger === "update" ||
          !token.lastValidatedAt ||
          Date.now() - token.lastValidatedAt >= TOKEN_REVALIDATE_MS)
      ) {
        await connectDB();
        token.lastValidatedAt = Date.now();
        const role = String(token.role || "");

        if (["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(role)) {
          const currentUser = await User.findById(token.id).select(
            "authVersion status role schoolName calendarPreference"
          );

          if (!currentUser) {
            token.error = "SessionRevoked";
            delete token.role;
            delete token.schoolId;
          } else {
            token.status = currentUser.status;
            token.calendarPreference = currentUser.calendarPreference || "BS";
            token.schoolName =
              role === "SUPER_ADMIN" ? null : currentUser.schoolName || null;
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
            await syncSchoolOnToken(token, currentTeacher.school);
          }
        } else if (role === "STUDENT") {
          const currentStudent = await Student.findById(token.id).select(
            "status isDeleted school calendarPreference"
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
            token.calendarPreference = currentStudent.calendarPreference || "BS";
            await syncSchoolOnToken(token, currentStudent.school);
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
        session.user.schoolName = token.schoolName || null;
        session.user.authVersion = token.authVersion || 0;
        session.user.calendarPreference = token.calendarPreference || "BS";
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
