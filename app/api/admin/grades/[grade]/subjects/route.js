import { connectDB } from "@/lib/db";
import GradeSubject from "@/models/GradeSubject";
import { getServerSession } from "next-auth";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession();

    if (!session?.user?.schoolId) {
      return Response.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { grade } = await params;

    // Fetch all subjects for this grade
    const mappings = await GradeSubject.find({
      school: session.user.schoolId,
      grade,
      status: "ACTIVE"
    }).populate('subject');

    const subjects = mappings.map(m => m.subject);

    return Response.json(
      {
        data: { subjects }
      }
    );
  } catch (error) {
    console.error("Error fetching grade subjects:", error);
    return Response.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession();

    if (!session?.user?.schoolId) {
      return Response.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { grade } = await params;
    const url = new URL(req.url);
    const subjectId = url.searchParams.get('subjectId');

    if (!subjectId) {
      return Response.json(
        { message: "Subject ID is required" },
        { status: 400 }
      );
    }

    // Remove subject from grade
    await GradeSubject.deleteOne({
      school: session.user.schoolId,
      grade,
      subject: subjectId
    });

    return Response.json(
      { data: { message: "Subject removed from grade" } }
    );
  } catch (error) {
    console.error("Error removing subject from grade:", error);
    return Response.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
