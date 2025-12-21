import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import GradingScale from "@/models/GradingScale";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch scales for the user's school
    // If user is admin, use their ID. If teacher, use their school ID (if available/implemented)
    // For now, assuming School Admin context for configuration.
    
    let schoolId = session.user.id;
    if (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN") {
        // Teachers might need to read this, but usually don't create it.
        // If teacher, we need to find their school.
        // For now, let's restrict creation/management to School Admin.
        // But reading might be needed for teachers.
        // Let's assume School Admin for now.
    }

    const scales = await GradingScale.find({ school: schoolId }).sort({ createdAt: -1 });
    return NextResponse.json(scales);
  } catch (error) {
    console.error("Error fetching grading scales:", error);
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

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    if (!data.name || !data.ranges || !Array.isArray(data.ranges)) {
      return NextResponse.json(
        { error: "Invalid data. Name and ranges are required." },
        { status: 400 }
      );
    }

    // Create scale
    const scale = await GradingScale.create({
      ...data,
      school: session.user.id,
    });

    return NextResponse.json(scale, { status: 201 });
  } catch (error) {
    console.error("Error creating grading scale:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
