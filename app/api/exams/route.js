import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Exam from "@/models/Exam";
import Student from "@/models/Student";
import Teacher from "@/models/Teacher";
import { NextResponse } from "next/server";
import { validateActiveYear, missingYearResponse } from "@/lib/guards";

export async function GET(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let schoolId = null;

    // Determine School ID based on Role
    if (session.user.role === "SCHOOL_ADMIN" || session.user.role === "admin") {
      schoolId = session.user.id;
    } else if (session.user.role === "TEACHER") {
      const teacher = await Teacher.findOne({ email: session.user.email });
      if (teacher) schoolId = teacher.school;
    } else if (session.user.role === "STUDENT") {
      const student = await Student.findOne({ email: session.user.email });
      if (student) schoolId = student.school;
    }

    if (!schoolId) {
      return NextResponse.json({ error: "School not found for user" }, { status: 404 });
    }

    // GUARD: Ensure Active Academic Year
    let activeYearId;
    try {
        activeYearId = await validateActiveYear(schoolId);
    } catch (error) {
        if (error.message === "NO_ACTIVE_YEAR") {
            return missingYearResponse();
        }
        throw error;
    }

    let query = {
      school: schoolId,
      academicYear: activeYearId // Only fetch exams for the active year
    };

    if (status) {
      query.status = status;
    }

    const exams = await Exam.find(query)
      .populate("academicYear", "name")
      .sort({ startDate: 1 });

    return NextResponse.json(exams);
  } catch (error) {
    console.error("Error fetching exams:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "SCHOOL_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // GUARD: Ensure Active Academic Year
    try {
        await validateActiveYear(session.user.id);
    } catch (error) {
        if (error.message === "NO_ACTIVE_YEAR") {
            return missingYearResponse();
        }
        throw error;
    }

    const data = await req.json();

    // Validate required fields
    if (!data.name || !data.academicYear || !data.term || !data.startDate || !data.endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create exam
    const exam = await Exam.create({
      ...data,
      school: session.user.id, // The logged-in admin is the school
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    console.error("Error creating exam:", error);
    // Check for duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "An exam with this name already exists for this academic year." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
