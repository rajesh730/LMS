import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Event from "@/models/Event";
import TeacherNote from "@/models/TeacherNote";
import Subject from "@/models/Subject";
import Chapter from "@/models/Chapter";
import Question from "@/models/Question";
import Grade from "@/models/Grade";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const student = await Student.findById(session.user.id).select("grade");
    if (!student) {
      return NextResponse.json({
        success: true,
        data: { events: [], notes: [], games: [] },
        message: "Student not found",
      });
    }

    const gradeName = student.grade;

    // If no grade assigned yet, return empty content
    if (!gradeName) {
      return NextResponse.json({
        success: true,
        data: { events: [], notes: [], games: [] },
        message: "No grade assigned",
      });
    }

    // Find Grade ID for models that reference Grade by ObjectId
    const gradeDoc = await Grade.findOne({ name: gradeName });
    const gradeId = gradeDoc?._id;

    // Events: approved and either no grade restriction or includes student's grade
    const events = await Event.find({
      status: "APPROVED",
      $or: [
        { eligibleGrades: { $size: 0 } },
        { eligibleGrades: { $in: [gradeName] } },
      ],
    })
      .sort({ date: 1 })
      .limit(10)
      .lean();

    // Notes: by grade (requires Grade ID)
    let notes = [];
    if (gradeId) {
      notes = await TeacherNote.find({
        grade: gradeId,
        isPublished: true,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    }

    // Games (MCQ): questions from subjects in this grade
    const subjectIds = await Subject.find({ grades: gradeName }).distinct(
      "_id"
    );
    const chapterIds = await Chapter.find({
      subject: { $in: subjectIds },
    }).distinct("_id");
    const games = await Question.find({
      chapter: { $in: chapterIds },
      type: "MCQ",
    })
      .select("text options points tags chapter createdAt")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        events,
        notes,
        games,
      },
    });
  } catch (error) {
    console.error("Student class content error", error);
    return NextResponse.json(
      { message: "Error fetching content" },
      { status: 500 }
    );
  }
}
