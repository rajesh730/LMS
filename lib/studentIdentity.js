export async function generatePlatformStudentId(StudentModel) {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const platformStudentId = `STU-${year}-${suffix}`;
    const existing = await StudentModel.exists({ platformStudentId });
    if (!existing) return platformStudentId;
  }

  return `STU-${year}-${Date.now().toString().slice(-6)}`;
}

function cleanToken(value, fallback) {
  const token = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return token || fallback;
}

export async function generateUniqueStudentUsername(
  StudentModel,
  { firstName, grade, rollNumber, school, excludeId = null, reserved = new Set() }
) {
  const nameToken = cleanToken(firstName, "student");
  const gradeNumber = String(grade || "").match(/\d+/)?.[0] || "";
  const gradeToken = gradeNumber ? `g${gradeNumber}` : cleanToken(grade, "grade");
  const rollToken = cleanToken(rollNumber, "roll");
  const baseUsername = `${nameToken}.${gradeToken}.${rollToken}`;
  let username = baseUsername;
  let counter = 1;

  while (true) {
    const query = { username, school };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existsInDb = await StudentModel.exists(query);
    const existsInBatch = reserved.has(username);
    if (!existsInDb && !existsInBatch) {
      reserved.add(username);
      return username;
    }

    counter += 1;
    username = `${baseUsername}.${counter}`;
  }
}

/**
 * The canonical "which Student row is this session?" query.
 *
 * `User` and `Student` are separate collections — the single most common source
 * of confusion in this codebase — so resolving a signed-in student means
 * matching the session against FOUR possible identity fields:
 *
 *   _id       a Student logging in directly
 *   userId    a Student linked to a User row
 *   email     matched on email
 *   username  students often sign in with a username in the email field
 *
 * This query existed in 20 hand-copied places before it lived here, and the
 * copies had already drifted: `app/api/student/history/route.js` omitted both
 * `status: "ACTIVE"` and the `userId` branch, so an inactive student could read
 * their history while a userId-linked student could not. Any new student-facing
 * surface must call this rather than re-typing the object.
 *
 * Spread it so a caller can add its own scoping:
 *   Student.findOne({ ...buildStudentLookupForSession(session), school })
 */
export function buildStudentLookupForSession(session) {
  return {
    isDeleted: { $ne: true },
    status: "ACTIVE",
    $or: [
      { _id: session.user.id },
      { userId: session.user.id },
      { email: session.user.email },
      { username: session.user.email },
    ],
  };
}
