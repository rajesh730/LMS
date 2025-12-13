import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import Grade from "@/models/Grade";
import School from "@/models/School";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    // Only SUPER_ADMIN can seed data
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Only SUPER_ADMIN can seed data." },
        { status: 403 }
      );
    }

    await connectDB();

    // Global subjects to create
    const globalSubjects = [
      {
        name: "English",
        code: "ENG",
        description: "English Language and Literature",
        subjectType: "GLOBAL",
        academicType: "CORE",
        status: "ACTIVE",
        school: null,
      },
      {
        name: "Mathematics",
        code: "MATH",
        description: "Mathematics",
        subjectType: "GLOBAL",
        academicType: "CORE",
        status: "ACTIVE",
        school: null,
      },
      {
        name: "Science",
        code: "SCI",
        description: "General Science",
        subjectType: "GLOBAL",
        academicType: "CORE",
        status: "ACTIVE",
        school: null,
      },
      {
        name: "Social Studies",
        code: "SS",
        description: "Social Studies and History",
        subjectType: "GLOBAL",
        academicType: "CORE",
        status: "ACTIVE",
        school: null,
      },
      {
        name: "Computer Science",
        code: "CS",
        description: "Computer Science and IT",
        subjectType: "GLOBAL",
        academicType: "CORE",
        status: "ACTIVE",
        school: null,
      },
      {
        name: "Physical Education",
        code: "PE",
        description: "Physical Education and Sports",
        subjectType: "GLOBAL",
        academicType: "ELECTIVE",
        status: "ACTIVE",
        school: null,
      },
      {
        name: "Art",
        code: "ART",
        description: "Art and Design",
        subjectType: "GLOBAL",
        academicType: "ELECTIVE",
        status: "ACTIVE",
        school: null,
      },
      {
        name: "Music",
        code: "MUS",
        description: "Music and Performing Arts",
        subjectType: "GLOBAL",
        academicType: "ELECTIVE",
        status: "ACTIVE",
        school: null,
      },
    ];

    // Insert global subjects
    const createdSubjects = await Subject.insertMany(globalSubjects, {
      ordered: false,
    }).catch((err) => {
      // Ignore duplicate key errors
      if (err.code !== 11000) throw err;
      return [];
    });

    return NextResponse.json(
      {
        success: true,
        message: "Seed data created successfully",
        subjectsCreated: createdSubjects.length,
        subjects: createdSubjects.map((s) => ({
          id: s._id,
          name: s.name,
          code: s.code,
          type: s.subjectType,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      {
        error: "Failed to seed data",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await connectDB();

    // Get stats
    const globalCount = await Subject.countDocuments({
      subjectType: "GLOBAL",
    });
    const customCount = await Subject.countDocuments({
      subjectType: "SCHOOL_CUSTOM",
    });

    return NextResponse.json({
      stats: {
        globalSubjects: globalCount,
        customSubjects: customCount,
        totalSubjects: globalCount + customCount,
      },
      message: "POST to /api/seed/subjects to create initial global subjects",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get stats", message: error.message },
      { status: 500 }
    );
  }
}
