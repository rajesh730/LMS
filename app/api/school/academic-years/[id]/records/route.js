import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import StudentAcademicRecord from "@/models/StudentAcademicRecord";
import Student from "@/models/Student"; // Ensure model is registered

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params; // Academic Year ID

    await connectDB();

    const records = await StudentAcademicRecord.find({
      school: session.user.id,
      academicYear: id,
    })
      .populate("student", "name email") // Fetch student name
      .sort({ grade: 1, rollNumber: 1 });

    return NextResponse.json({ records }, { status: 200 });
  } catch (error) {
    console.error("Error fetching academic records:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
