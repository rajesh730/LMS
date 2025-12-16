import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Faculty from "@/models/Faculty";
import Subject from "@/models/Subject";
import GradeSubject from "@/models/GradeSubject";
import Student from "@/models/Student";
import { NextResponse } from "next/server";

/**
 * GET /api/faculties
 * List faculties for a school
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    let query = { status: "ACTIVE" };

    // Check if requesting global faculties
    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    if (type === "global" && session.user.role === "SUPER_ADMIN") {
      query.school = null;
    } else {
      query.school = session.user.id;
    }

    const faculties = await Faculty.find(query)
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: { faculties }
    });
  } catch (error) {
    console.error("Fetch faculties error:", error);
    return NextResponse.json(
      { error: "Failed to fetch faculties" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/faculties
 * Create a new faculty
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, educationLevels } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Faculty name is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const isGlobal = session.user.role === 'SUPER_ADMIN';
    const schoolId = isGlobal ? null : session.user.id;

    // Check for duplicate (case-insensitive)
    const normalizedName = name.toLowerCase().trim().replace(/\s+/g, ' ');
    const exists = await Faculty.findOne({
      normalizedName,
      school: schoolId,
      mergedInto: null
    });

    if (exists) {
      return NextResponse.json(
        { error: `Faculty "${name}" already exists` },
        { status: 400 }
      );
    }

    const faculty = new Faculty({
      name: name.trim(),
      normalizedName,
      school: schoolId,
      educationLevels: educationLevels || [],
      createdBy: session.user.id,
    });

    await faculty.save();

    return NextResponse.json({
      success: true,
      data: { faculty },
      message: "Faculty created successfully"
    });
  } catch (error) {
    console.error("Create faculty error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create faculty" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/faculties/{id}
 * Update a faculty
 */
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Faculty ID is required" },
        { status: 400 }
      );
    }

    const { name, educationLevels, status } = await req.json();

    await connectDB();

    const faculty = await Faculty.findById(id);

    if (!faculty || faculty.school.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Faculty not found" },
        { status: 404 }
      );
    }

    if (name && name.trim() !== faculty.name) {
      // Check for duplicate with new name
      const normalizedName = name.toLowerCase().trim().replace(/\s+/g, ' ');
      const exists = await Faculty.findOne({
        normalizedName,
        school: session.user.id,
        _id: { $ne: id },
        mergedInto: null
      });

      if (exists) {
        return NextResponse.json(
          { error: `Faculty "${name}" already exists` },
          { status: 400 }
        );
      }

      faculty.name = name.trim();
      faculty.normalizedName = normalizedName;
    }

    if (educationLevels) {
      faculty.educationLevels = educationLevels;
    }

    if (status && ["ACTIVE", "INACTIVE"].includes(status)) {
      faculty.status = status;
    }

    faculty.updatedBy = session.user.id;
    await faculty.save();

    return NextResponse.json({
      success: true,
      data: { faculty },
      message: "Faculty updated successfully"
    });
  } catch (error) {
    console.error("Update faculty error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update faculty" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/faculties/{id}
 * Delete a faculty (soft delete via status)
 */
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Faculty ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const faculty = await Faculty.findById(id);

    if (!faculty) {
      return NextResponse.json(
        { error: "Faculty not found" },
        { status: 404 }
      );
    }

    // Check if faculty is in use
    const inUse = await GradeSubject.findOne({ faculty: faculty.name });

    if (inUse) {
      return NextResponse.json(
        { error: "Cannot delete faculty - it is being used in grade assignments" },
        { status: 400 }
      );
    }

    faculty.status = "INACTIVE";
    faculty.updatedBy = session.user.id;
    await faculty.save();

    return NextResponse.json({
      success: true,
      message: "Faculty deactivated successfully"
    });
  } catch (error) {
    console.error("Delete faculty error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete faculty" },
      { status: 500 }
    );
  }
}
