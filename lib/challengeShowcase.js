import connectDB from "@/lib/db";
import PlatformChallengeSubmission from "@/models/PlatformChallengeSubmission";
import "@/models/PlatformChallenge";
import "@/models/Student";
import "@/models/User";

export async function getPublicChallengeResponses(limit = 50) {
  await connectDB();

  return PlatformChallengeSubmission.find({
    status: "SELECTED",
    isPublic: true,
  })
    .populate("challenge", "title")
    .populate("student", "name grade rollNumber")
    .populate("school", "schoolName name")
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();
}

export function serializeChallengeResponse(response) {
  return {
    id: String(response._id),
    title: response.title,
    content: response.content,
    category: response.category,
    publishedAt: response.publishedAt
      ? new Date(response.publishedAt).toISOString()
      : null,
    challenge: response.challenge
      ? {
          id: String(response.challenge._id),
          title: response.challenge.title,
        }
      : null,
    student: response.student
      ? {
          id: String(response.student._id),
          name: response.student.name,
          grade: response.student.grade,
        }
      : null,
    school: response.school
      ? {
          id: String(response.school._id),
          schoolName: response.school.schoolName || "",
          name: response.school.name || "",
        }
      : null,
  };
}
