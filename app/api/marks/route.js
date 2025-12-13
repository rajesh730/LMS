import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Marks from "@/models/Marks";
import Student from "@/models/Student";
import Subject from "@/models/Subject";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  validationError,
  notFoundError,
  internalServerError,
} from "@/lib/apiResponse";

// POST: Create/Update marks
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TEACHER") {
      return unauthorizedError();
    }

    await connectDB();

    const {
      studentId,
      subjectId,
      classroomId,
      assessmentType,
      assessmentName,
      totalMarks,
      marksObtained,
      feedback,
    } = await req.json();

    // Validation
    if (
      !studentId ||
      !subjectId ||
      !assessmentType ||
      !assessmentName ||
      totalMarks === undefined ||
      marksObtained === undefined
    ) {
      return validationError("All required fields must be provided", {
        required: [
          "studentId",
          "subjectId",
          "assessmentType",
          "assessmentName",
          "totalMarks",
          "marksObtained",
        ],
      });
    }

    if (marksObtained < 0 || marksObtained > totalMarks) {
      return validationError(
        "Marks obtained must be between 0 and total marks"
      );
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return notFoundError("Student");
    }

    // Verify subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return notFoundError("Subject");
    }

    // Create or update marks
    const marks = await Marks.findOneAndUpdate(
      {
        student: studentId,
        subject: subjectId,
        assessmentType,
        assessmentName,
      },
      {
        student: studentId,
        subject: subjectId,
        teacher: session.user.id,
        school: session.user.schoolId || session.user.id,
        assessmentType,
        assessmentName,
        totalMarks,
        marksObtained,
        feedback: feedback || null,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return successResponse(201, "Marks saved successfully", marks);
  } catch (error) {
    console.error("Create Marks Error:", error);
    return internalServerError(error.message);
  }
}

// GET: Fetch marks with filters
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedError();
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("student");
    const subjectId = searchParams.get("subject");
    const assessmentType = searchParams.get("assessmentType");

    let query = { school: session.user.schoolId || session.user.id };

    if (studentId) query.student = studentId;
    if (subjectId) query.subject = subjectId;
    if (assessmentType) query.assessmentType = assessmentType;

    // Teachers can only see marks for their subjects
    if (session.user.role === "TEACHER") {
      query.teacher = session.user.id;
    }

    const marks = await Marks.find(query)
      .populate("student", "name email rollNumber grade")
      .populate("subject", "name code")
      .sort({ date: -1 });

    return successResponse(200, "Marks fetched successfully", marks);
  } catch (error) {
    console.error("Fetch Marks Error:", error);
    return internalServerError(error.message);
  }
}

// PATCH: Update marks
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TEACHER") {
      return unauthorizedError();
    }

    await connectDB();

    const { id } = params;
    const { marksObtained, feedback, assessmentName } = await req.json();

    const marks = await Marks.findById(id);
    if (!marks) {
      return notFoundError("Marks record");
    }

    if (marks.teacher.toString() !== session.user.id) {
      return unauthorizedError();
    }

    if (marksObtained !== undefined) {
      if (marksObtained < 0 || marksObtained > marks.totalMarks) {
        return validationError(
          "Marks obtained must be between 0 and total marks"
        );
      }
      marks.marksObtained = marksObtained;
    }

    if (feedback) marks.feedback = feedback;
    if (assessmentName) marks.assessmentName = assessmentName;

    await marks.save();

    return successResponse(200, "Marks updated successfully", marks);
  } catch (error) {
    console.error("Update Marks Error:", error);
    return internalServerError(error.message);
  }
}

// DELETE: Delete marks
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["TEACHER", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return unauthorizedError();
    }

    await connectDB();

    const { id } = params;
    const marks = await Marks.findById(id);

    if (!marks) {
      return notFoundError("Marks record");
    }

    if (
      session.user.role === "TEACHER" &&
      marks.teacher.toString() !== session.user.id
    ) {
      return unauthorizedError();
    }

    await Marks.deleteOne({ _id: id });

    return successResponse(200, "Marks deleted successfully", null);
  } catch (error) {
    console.error("Delete Marks Error:", error);
    return internalServerError(error.message);
  }
}
