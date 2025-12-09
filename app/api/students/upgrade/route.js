import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Student from "@/models/Student";
import connectDB from "@/lib/db";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { studentIds, targetClassroomId } = await req.json();

    if (!targetClassroomId) {
      return NextResponse.json(
        { error: "Target classroom is required" },
        { status: 400 }
      );
    }

    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      // Upgrade selected students
      await Student.updateMany(
        { _id: { $in: studentIds }, school: session.user.id },
        { $set: { classroom: targetClassroomId } }
      );
      return NextResponse.json({ message: "Students upgraded successfully" });
    } else {
      return NextResponse.json(
        { error: "No students selected" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error upgrading students:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
