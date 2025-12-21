import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import AcademicYear from "@/models/AcademicYear";
import SchoolConfig from "@/models/SchoolConfig";

export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    // 1. Verify the year exists (Global or Local)
    const year = await AcademicYear.findOne({
        _id: id,
        $or: [
            { school: session.user.id },
            { school: null },
            { school: { $exists: false } }
        ]
    });

    if (!year) {
      return NextResponse.json(
        { message: "Academic Year not found" },
        { status: 404 }
      );
    }

    // 2. Update SchoolConfig to point to this new year
    // This effectively "activates" it for this school
    await SchoolConfig.findOneAndUpdate(
        { school: session.user.id },
        { currentAcademicYear: year._id },
        { upsert: true, new: true }
    );

    return NextResponse.json(
      { message: "Academic Year activated successfully", year: year },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error activating academic year:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
