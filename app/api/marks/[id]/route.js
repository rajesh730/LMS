import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Marks from "@/models/Marks";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";

// PATCH: Update specific marks
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TEACHER") {
      return unauthorizedError();
    }

    await connectDB();

    const { id } = params;
    const updateData = await req.json();

    const marks = await Marks.findById(id);
    if (!marks) {
      return notFoundError("Marks record");
    }

    if (marks.teacher.toString() !== session.user.id) {
      return unauthorizedError();
    }

    // Update allowed fields
    if (updateData.marksObtained !== undefined) {
      if (
        updateData.marksObtained < 0 ||
        updateData.marksObtained > marks.totalMarks
      ) {
        return validationError(
          "Marks obtained must be between 0 and total marks"
        );
      }
      marks.marksObtained = updateData.marksObtained;
    }

    if (updateData.feedback !== undefined) marks.feedback = updateData.feedback;
    if (updateData.assessmentName)
      marks.assessmentName = updateData.assessmentName;

    await marks.save();

    return successResponse(200, "Marks updated successfully", marks);
  } catch (error) {
    console.error("Update Marks Error:", error);
    return internalServerError(error.message);
  }
}

// DELETE: Delete specific marks
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

// GET: Fetch single marks record
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedError();
    }

    await connectDB();

    const { id } = params;
    const marks = await Marks.findById(id)
      .populate("student", "name email rollNumber grade")
      .populate("subject", "name code")
      .populate("classroom", "name")
      .populate("teacher", "name");

    if (!marks) {
      return notFoundError("Marks record");
    }

    return successResponse(200, "Marks record fetched successfully", marks);
  } catch (error) {
    console.error("Fetch Marks Error:", error);
    return internalServerError(error.message);
  }
}
