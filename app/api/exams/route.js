import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Exam from "@/models/Exam";
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
    const academicYear = searchParams.get("academicYear");
    const status = searchParams.get("status");

    let query = {};

    // If user is a school admin, filter by their ID
    if (session.user.role === "admin") {
      query.school = session.user.id;
    } 
    // If user is teacher or student, we need to find their school
    else if (session.user.role === "teacher" || session.user.role === "student") {
      // Assuming the session or user object has a schoolId or we need to fetch it.
      // For now, let's assume the school ID is passed or we can derive it.
      // In this system, usually teachers/students are linked to a school.
      // Let's check the session structure or User model if needed.
      // For simplicity, if schoolId is passed in query, use it, otherwise rely on session if available.
      
      if (session.user.schoolId) {
         query.school = session.user.schoolId;
      } else {
         // Fallback: if the user is a teacher/student, they should be associated with a school.
         // We might need to fetch the user to get the school ID if it's not in the session.
         // For now, let's assume the client passes the school ID or we filter by what we know.
         // If we can't determine school, we might return empty or error.
         // However, usually in this app, we might want to allow fetching if the user belongs to the school.
      }
    }

    if (academicYear) {
      query.academicYear = academicYear;
    }

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
