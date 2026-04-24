import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current student to find their class/grade
    const currentStudent = await Student.findOne({ email: session.user.email });
    if (!currentStudent) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    // Fetch top 10 students in the same grade & school
    const leaderboard = await Student.find({
      school: currentStudent.school,
      grade: currentStudent.grade,
      "gamification.totalPoints": { $gt: 0 }, // Only show students with points
    })
      .sort({ "gamification.totalPoints": -1 })
      .limit(10)
      .select("name gamification.totalPoints gamification.badges");

    // Anonymize names except for the current user
    const anonymizedLeaderboard = leaderboard.map((s) => {
      const isMe = s._id.toString() === currentStudent._id.toString();
      return {
        id: s._id,
        name: isMe ? "You" : `Student ${s.name.substring(0, 2)}...`, // Partial name or "Anonymous"
        points: s.gamification.totalPoints,
        badgesCount: s.gamification.badges.length,
        isMe,
      };
    });

    return Response.json({ success: true, data: anonymizedLeaderboard });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
