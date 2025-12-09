import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import Chapter from "@/models/Chapter";
import Teacher from "@/models/Teacher";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const teacherDoc = await Teacher.findOne({ email: session.user.email });
    if (!teacherDoc)
      return NextResponse.json(
        { message: "Teacher not found" },
        { status: 404 }
      );

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    if (!subjectId) {
      return NextResponse.json(
        { message: "subjectId is required" },
        { status: 400 }
      );
    }

    const subject = await Subject.findOne({
      _id: subjectId,
      teacher: teacherDoc._id,
    });
    if (!subject)
      return NextResponse.json(
        { message: "Subject not found" },
        { status: 404 }
      );

    const chapters = await Chapter.find({ subject: subjectId }).sort({
      order: 1,
    });
    return NextResponse.json({ success: true, data: chapters });
  } catch (error) {
    console.error("Get chapters error", error);
    return NextResponse.json(
      { message: "Error fetching chapters" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const teacherDoc = await Teacher.findOne({ email: session.user.email });
    if (!teacherDoc)
      return NextResponse.json(
        { message: "Teacher not found" },
        { status: 404 }
      );

    const body = await req.json();
    const { subjectId, title, order } = body;
    if (!subjectId || !title) {
      return NextResponse.json(
        { message: "subjectId and title are required" },
        { status: 400 }
      );
    }

    const subject = await Subject.findOne({
      _id: subjectId,
      teacher: teacherDoc._id,
    });
    if (!subject)
      return NextResponse.json(
        { message: "Subject not found" },
        { status: 404 }
      );

    const chapterCount = await Chapter.countDocuments({ subject: subjectId });
    const chapter = await Chapter.create({
      subject: subjectId,
      title,
      order: typeof order === "number" ? order : chapterCount + 1,
    });

    return NextResponse.json({ success: true, data: chapter }, { status: 201 });
  } catch (error) {
    console.error("Create chapter error", error);
    return NextResponse.json(
      { message: "Error creating chapter" },
      { status: 500 }
    );
  }
}
