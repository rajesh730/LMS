import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import AcademicYear from "@/models/AcademicYear";
import SchoolConfig from "@/models/SchoolConfig";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    
    let years = [];
    let currentYearId = null;

    if (isSuperAdmin) {
        // Super Admin sees all Global Years (Drafts & Published)
        years = await AcademicYear.find({
            $or: [
                { school: null },
                { school: { $exists: false } }
            ]
        }).sort({ startDate: -1 });
    } else {
        // School Admin sees Published Global Years + Their Local Years
        if (!session.user.id) {
             return NextResponse.json({ message: "User ID missing in session" }, { status: 400 });
        }

        const config = await SchoolConfig.findOne({ school: session.user.id }).select('currentAcademicYear');
        currentYearId = config?.currentAcademicYear?.toString();

        years = await AcademicYear.find({
            $or: [
                { school: session.user.id },
                { 
                    $and: [
                        { $or: [{ school: null }, { school: { $exists: false } }] },
                        { isPublished: true }
                    ]
                }
            ]
        }).sort({ startDate: -1 });
    }

    // Map status dynamically based on SchoolConfig (only relevant for School Admin)
    const formattedYears = years.map(y => {
        const isCurrent = currentYearId ? y._id.toString() === currentYearId : false;
        let status = "UPCOMING";
        
        if (isCurrent) {
            status = "ACTIVE";
        } else if (new Date(y.endDate) < new Date()) {
            status = "COMPLETED";
        }

        return {
            ...y.toObject(),
            isCurrent,
            status
        };
    });

    return NextResponse.json({ years: formattedYears }, { status: 200 });
  } catch (error) {
    console.error("Error fetching academic years:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.toString() },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only Super Admin can create Global Years
    if (session.user.role !== "SUPER_ADMIN") {
         return NextResponse.json({ message: "Academic Years are managed globally by Super Admin." }, { status: 403 });
    }

    const { name, startDate, endDate, isPublished } = await req.json();

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { message: "Name, Start Date, and End Date are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const newYear = await AcademicYear.create({
      school: null, // Global
      name,
      startDate,
      endDate,
      isCurrent: false, // Global years don't have a single "current" state
      status: "UPCOMING",
      isPublished: isPublished || false,
    });

    return NextResponse.json(
      { message: "Global Academic Year created successfully", year: newYear },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating academic year:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
