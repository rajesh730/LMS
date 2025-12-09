/**
 * Generate a strong random password.
 * Format: RandomWord + 4 digits + special char
 * Example: butterfly1234!
 */
export function generateStrongPassword() {
  const adjectives = [
    "bright",
    "swift",
    "quick",
    "fresh",
    "calm",
    "bold",
    "keen",
    "wise",
    "kind",
    "clear",
  ];
  const nouns = [
    "eagle",
    "tiger",
    "river",
    "forest",
    "ocean",
    "stone",
    "star",
    "cloud",
    "flame",
    "wave",
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  const special = ["!", "@", "#", "$", "%"][Math.floor(Math.random() * 5)];

  return `${adj}${noun}${num}${special}`;
}

/**
 * Generate student password from their details.
 * Format: FirstName + RollNumber + @ + Grade (no spaces)
 * Example: John12@Class10A
 */
export function generateStudentPassword(firstName, rollNumber, grade) {
  const cleanGrade = (grade || "").replace(/\s+/g, "");
  return `${firstName}${rollNumber}@${cleanGrade}`;
}
