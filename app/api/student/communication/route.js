import dbConnect from "@/lib/db";
import Communication from "@/models/Communication";
import Student from "@/models/Student";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// GET: Fetch communication history for the logged-in student (Parent View)
export async function GET(request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the student record associated with this user
    // Use ID from session as email might be unreliable (username login)
    const student = await Student.findById(session.user.id);
    if (!student) {
      return Response.json({ error: "Student profile not found" }, { status: 404 });
    }

    const communications = await Communication.find({ student: student._id })
      .sort({ createdAt: -1 })
      .populate("repliedBy", "name");

    return Response.json({ success: true, data: communications });
  } catch (error) {
    console.error("Error fetching communications:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Create a new communication (Absent Note / Feedback)
export async function POST(request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, subject, message, absentDate, attachments } = body;

    // Validation
    if (!type || !subject || !message) {
      return Response.json(
        { error: "Please provide all required fields" },
        { status: 400 }
      );
    }

    // Find the student record
    // Use ID from session as email might be unreliable (username login)
    const student = await Student.findById(session.user.id);
    if (!student) {
      return Response.json({ error: "Student profile not found" }, { status: 404 });
    }

    // Create the communication record
    const newCommunication = await Communication.create({
      student: student._id,
      school: student.school,
      type,
      subject,
      message,
      absentDate: type === "ABSENT_NOTE" ? absentDate : undefined,
      attachments: attachments || [],
      status: "PENDING",
    });

    return Response.json({ success: true, data: newCommunication }, { status: 201 });
  } catch (error) {
    console.error("Error creating communication:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
