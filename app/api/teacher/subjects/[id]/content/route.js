import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import Chapter from "@/models/Chapter";
import Question from "@/models/Question";
import Teacher from "@/models/Teacher";

export async function GET(_req, context) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "Subject id is required" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const teacherDoc = await Teacher.findOne({ email: session.user.email });
    if (!teacherDoc) {
      return NextResponse.json(
        { message: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const subject = await Subject.findOne({
      _id: id,
      teacher: teacherDoc._id,
    }).populate("classroom", "name");

    if (!subject) {
      return NextResponse.json(
        { message: "Subject not found" },
        { status: 404 }
      );
    }

    const chapters = await Chapter.find({ subject: subject._id })
      .sort({ order: 1 })
      .lean();

    const chapterIds = chapters.map((c) => c._id);
    const questions = await Question.find({ chapter: { $in: chapterIds } })
      .sort({ createdAt: -1 })
      .lean();

    const questionsByChapter = questions.reduce((acc, q) => {
      const key = q.chapter.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(q);
      return acc;
    }, {});

    const chapterWithQuestions = chapters.map((ch) => ({
      ...ch,
      questions: questionsByChapter[ch._id.toString()] || [],
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          subject,
          chapters: chapterWithQuestions,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Teacher subject content error", error);
    return NextResponse.json(
      { message: "Error fetching subject content" },
      { status: 500 }
    );
  }
}
