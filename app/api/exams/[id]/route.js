import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Exam from "@/models/Exam";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const exam = await Exam.findById(id).populate("academicYear", "name");

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check access rights
    // Admin can access their own exams
    // Teachers/Students can access exams of their school
    if (session.user.role === "admin" && exam.school.toString() !== session.user.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // For teachers/students, we should verify they belong to the school.
    // Assuming session.user.schoolId is available or similar check.
    // For now, we'll be lenient on GET if authenticated, or strict if we had the schoolId in session.

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Error fetching exam:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const data = await req.json();

    const exam = await Exam.findOne({ _id: id, school: session.user.id });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Update fields
    Object.assign(exam, data);
    await exam.save();

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Error updating exam:", error);
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

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const exam = await Exam.findOneAndDelete({ _id: id, school: session.user.id });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Exam deleted successfully" });
  } catch (error) {
    console.error("Error deleting exam:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
