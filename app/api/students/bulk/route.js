import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Student from "@/models/Student";
import User from "@/models/User";
import connectDB from "@/lib/db";

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { studentIds, classroomId } = await req.json();

    const collectEmails = async (filter) => {
      const students = await Student.find(filter).select("email");
      return students.map((s) => s.email).filter(Boolean);
    };

    if (classroomId) {
      // Delete all students in the class
      const emails = await collectEmails({
        classroom: classroomId,
        school: session.user.id,
      });
      await Student.deleteMany({
        classroom: classroomId,
        school: session.user.id,
      });
      if (emails.length) {
        await User.deleteMany({ email: { $in: emails } });
      }
      return NextResponse.json({
        message: "All students in class deleted successfully",
      });
    } else if (
      studentIds &&
      Array.isArray(studentIds) &&
      studentIds.length > 0
    ) {
      // Delete selected students
      const emails = await collectEmails({
        _id: { $in: studentIds },
        school: session.user.id,
      });
      await Student.deleteMany({
        _id: { $in: studentIds },
        school: session.user.id,
      });
      if (emails.length) {
        await User.deleteMany({ email: { $in: emails } });
      }
      return NextResponse.json({
        message: "Selected students deleted successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error deleting students:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
