import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pin } = await request.json();

    if (!pin) {
      return Response.json({ error: "PIN is required" }, { status: 400 });
    }

    // Find by ID instead of email, as email might be missing or username might be used
    const student = await Student.findById(session.user.id);
    
    if (!student) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    // Handle missing PIN (default to 1234)
    const storedPin = student.parentAccessPin || "1234";

    if (storedPin === pin) {
      // If it was missing, save it for future consistency
      if (!student.parentAccessPin) {
          try {
            student.parentAccessPin = "1234";
            await student.save();
          } catch (err) {
            console.error("Failed to save default PIN:", err);
            // Continue even if save fails, as access is valid
          }
      }
      return Response.json({ success: true });
    } else {
      return Response.json({ success: false, error: "Incorrect PIN" });
    }

  } catch (error) {
    console.error("Error verifying PIN:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
