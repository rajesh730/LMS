import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import Chapter from "@/models/Chapter";
import Teacher from "@/models/Teacher";

async function authorizeChapter(chapterId, session) {
  if (!session || session.user.role !== "TEACHER") {
    return { error: { message: "Unauthorized", status: 401 } };
  }
  await connectDB();
  const teacherDoc = await Teacher.findOne({ email: session.user.email });
  if (!teacherDoc)
    return { error: { message: "Teacher not found", status: 404 } };

  const chapter = await Chapter.findById(chapterId);
  if (!chapter) return { error: { message: "Chapter not found", status: 404 } };

  const subject = await Subject.findOne({
    _id: chapter.subject,
    teacher: teacherDoc._id,
  });
  if (!subject)
    return { error: { message: "Not allowed for this subject", status: 403 } };

  return { chapter };
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  const auth = await authorizeChapter(params.id, session);
  if (auth.error)
    return NextResponse.json(
      { message: auth.error.message },
      { status: auth.error.status }
    );

  try {
    const body = await req.json();
    const updates = {};
    if (body.title) updates.title = body.title;
    if (typeof body.order === "number") updates.order = body.order;
    if (body.content !== undefined) updates.content = body.content;
    if (body.resources !== undefined) updates.resources = body.resources;

    const updated = await Chapter.findByIdAndUpdate(params.id, updates, {
      new: true,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update chapter error", error);
    return NextResponse.json(
      { message: "Error updating chapter" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req, { params }) {
  const session = await getServerSession(authOptions);
  const auth = await authorizeChapter(params.id, session);
  if (auth.error)
    return NextResponse.json(
      { message: auth.error.message },
      { status: auth.error.status }
    );

  try {
    await Chapter.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete chapter error", error);
    return NextResponse.json(
      { message: "Error deleting chapter" },
      { status: 500 }
    );
  }
}
