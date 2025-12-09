import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import Chapter from "@/models/Chapter";
import Question from "@/models/Question";
import Teacher from "@/models/Teacher";

async function authorizeQuestion(questionId, session) {
  if (!session || session.user.role !== "TEACHER") {
    return { error: { message: "Unauthorized", status: 401 } };
  }
  await connectDB();
  const teacherDoc = await Teacher.findOne({ email: session.user.email });
  if (!teacherDoc)
    return { error: { message: "Teacher not found", status: 404 } };

  const question = await Question.findById(questionId);
  if (!question)
    return { error: { message: "Question not found", status: 404 } };

  const chapter = await Chapter.findById(question.chapter).lean();
  if (!chapter) return { error: { message: "Chapter not found", status: 404 } };

  const subject = await Subject.findOne({
    _id: chapter.subject,
    teacher: teacherDoc._id,
  });
  if (!subject)
    return { error: { message: "Not allowed for this subject", status: 403 } };

  return { question };
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  const auth = await authorizeQuestion(params.id, session);
  if (auth.error)
    return NextResponse.json(
      { message: auth.error.message },
      { status: auth.error.status }
    );

  try {
    const body = await req.json();
    const updates = {};
    if (body.text) updates.text = body.text;
    if (body.type) updates.type = body.type;
    if (body.options !== undefined) updates.options = body.options;
    if (body.correctAnswer !== undefined)
      updates.correctAnswer = body.correctAnswer;
    if (typeof body.points === "number") updates.points = body.points;
    if (body.tags !== undefined) updates.tags = body.tags;

    const updated = await Question.findByIdAndUpdate(params.id, updates, {
      new: true,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update question error", error);
    return NextResponse.json(
      { message: "Error updating question" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req, { params }) {
  const session = await getServerSession(authOptions);
  const auth = await authorizeQuestion(params.id, session);
  if (auth.error)
    return NextResponse.json(
      { message: auth.error.message },
      { status: auth.error.status }
    );

  try {
    await Question.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete question error", error);
    return NextResponse.json(
      { message: "Error deleting question" },
      { status: 500 }
    );
  }
}
