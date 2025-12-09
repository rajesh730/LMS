import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import Chapter from "@/models/Chapter";
import Question from "@/models/Question";
import Teacher from "@/models/Teacher";

async function ensureOwnership({ teacherEmail, chapterId, subjectId }) {
  const teacherDoc = await Teacher.findOne({ email: teacherEmail });
  if (!teacherDoc) return { error: { message: "Teacher not found", status: 404 } };

  let resolvedSubjectId = subjectId;
  if (chapterId && !resolvedSubjectId) {
    const chapter = await Chapter.findById(chapterId).lean();
    if (!chapter) return { error: { message: "Chapter not found", status: 404 } };
    resolvedSubjectId = chapter.subject;
  }

  const subject = await Subject.findOne({ _id: resolvedSubjectId, teacher: teacherDoc._id });
  if (!subject) return { error: { message: "Not allowed for this subject", status: 403 } };

  return { teacherDoc, subjectId: subject._id };
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const chapterId = searchParams.get("chapterId");
    const subjectId = searchParams.get("subjectId");
    if (!chapterId && !subjectId) {
      return NextResponse.json({ message: "chapterId or subjectId is required" }, { status: 400 });
    }

    const ownership = await ensureOwnership({ teacherEmail: session.user.email, chapterId, subjectId });
    if (ownership.error) return NextResponse.json({ message: ownership.error.message }, { status: ownership.error.status });

    const filter = chapterId
      ? { chapter: chapterId }
      : { subject: ownership.subjectId };

    // When filtering by subject, find chapters of subject
    if (!chapterId && ownership.subjectId) {
      const chapters = await Chapter.find({ subject: ownership.subjectId }).lean();
      filter.chapter = { $in: chapters.map((c) => c._id) };
      delete filter.subject;
    }

    const questions = await Question.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: questions });
  } catch (error) {
    console.error("Get questions error", error);
    return NextResponse.json({ message: "Error fetching questions" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();

    const body = await req.json();
    const { chapterId, text, type = "MCQ", options = [], correctAnswer, points = 1, tags = [] } = body;
    if (!chapterId || !text) {
      return NextResponse.json({ message: "chapterId and text are required" }, { status: 400 });
    }

    const ownership = await ensureOwnership({ teacherEmail: session.user.email, chapterId });
    if (ownership.error) return NextResponse.json({ message: ownership.error.message }, { status: ownership.error.status });

    const question = await Question.create({
      chapter: chapterId,
      text,
      type,
      options,
      correctAnswer,
      points,
      tags,
    });

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error) {
    console.error("Create question error", error);
    return NextResponse.json({ message: "Error creating question" }, { status: 500 });
  }
}
