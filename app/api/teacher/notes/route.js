import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import TeacherNote from "@/models/TeacherNote";
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
    if (!subjectId)
      return NextResponse.json(
        { message: "subjectId is required" },
        { status: 400 }
      );

    const subject = await Subject.findOne({
      _id: subjectId,
      teacher: teacherDoc._id,
    });
    if (!subject)
      return NextResponse.json(
        { message: "Subject not found" },
        { status: 404 }
      );

    const notes = await TeacherNote.find({ subject: subjectId }).sort({
      createdAt: -1,
    });
    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error("Get notes error", error);
    return NextResponse.json(
      { message: "Error fetching notes" },
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
    const { subjectId, title, content, isPublished = true } = body;
    if (!subjectId || !title || !content) {
      return NextResponse.json(
        { message: "subjectId, title, content required" },
        { status: 400 }
      );
    }

    const subject = await Subject.findOne({
      _id: subjectId,
      teacher: teacherDoc._id,
    }).populate("classroom", "_id");
    if (!subject)
      return NextResponse.json(
        { message: "Subject not found" },
        { status: 404 }
      );

    const note = await TeacherNote.create({
      subject: subjectId,
      classroom: subject.classroom._id || subject.classroom,
      teacher: teacherDoc._id,
      title,
      content,
      isPublished,
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error("Create note error", error);
    return NextResponse.json(
      { message: "Error creating note" },
      { status: 500 }
    );
  }
}
