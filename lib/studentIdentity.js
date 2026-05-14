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
