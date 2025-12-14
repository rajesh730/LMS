import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Faculty from "@/models/Faculty";
import Subject from "@/models/Subject";
import GradeSubject from "@/models/GradeSubject";
import Student from "@/models/Student";
import { NextResponse } from "next/server";

/**
 * PATCH /api/faculties/{id}/merge
 * Merge one faculty into another (for corrections/duplicates)
 * 
 * Example: Merge "Scince" into "Science"
 * All records using "Scince" are updated to "Science"
 */
export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const { targetFacultyId } = await req.json();

    if (!id || !targetFacultyId) {
      return NextResponse.json(
        { error: "Faculty ID and target faculty ID are required" },
        { status: 400 }
      );
    }

    if (id === targetFacultyId) {
      return NextResponse.json(
        { error: "Cannot merge faculty into itself" },
        { status: 400 }
      );
    }

    await connectDB();

    const sourceFaculty = await Faculty.findById(id);
    const targetFaculty = await Faculty.findById(targetFacultyId);

    if (!sourceFaculty || !targetFaculty) {
      return NextResponse.json(
        { error: "Faculty not found" },
        { status: 404 }
      );
    }

    if (sourceFaculty.school.toString() !== targetFaculty.school.toString()) {
      return NextResponse.json(
        { error: "Can only merge faculties from the same school" },
        { status: 400 }
      );
    }

    // Update all references
    const oldName = sourceFaculty.name;
    const newName = targetFaculty.name;

    // 1. Update Subject.applicableFaculties
    await Subject.updateMany(
      { applicableFaculties: oldName },
      { $set: { "applicableFaculties.$": newName } }
    );

    // 2. Update GradeSubject.faculty
    await GradeSubject.updateMany(
      { faculty: oldName },
      { faculty: newName }
    );

    // 3. Update Student.faculty
    await Student.updateMany(
      { faculty: oldName },
      { faculty: newName }
    );

    // 4. Mark source faculty as merged
    sourceFaculty.mergedInto = targetFacultyId;
    sourceFaculty.status = "INACTIVE";
    sourceFaculty.updatedBy = session.user.id;
    await sourceFaculty.save();

    return NextResponse.json({
      success: true,
      data: {
        sourceFaculty,
        targetFaculty,
        updatedRecords: {
          subjects: "Updated",
          gradeSubjects: "Updated",
          students: "Updated"
        }
      },
      message: `Successfully merged "${oldName}" into "${newName}". All records updated.`
    });
  } catch (error) {
    console.error("Merge faculty error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to merge faculties" },
      { status: 500 }
    );
  }
}
