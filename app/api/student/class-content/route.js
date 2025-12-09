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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const student = await Student.findById(session.user.id)
      .select("grade classroom")
      .populate("classroom", "name");
    if (!student) {
      return NextResponse.json({
        success: true,
        data: { events: [], notes: [], games: [] },
        message: "Student not found",
      });
    }

    const grade = student.grade;
    const classroomId = student.classroom?._id || student.classroom;

    // If no classroom assigned yet, return empty content instead of 404
    if (!classroomId) {
      return NextResponse.json({
        success: true,
        data: { events: [], notes: [], games: [] },
        message: "No classroom assigned",
      });
    }

    // Events: approved and either no grade restriction or includes student's grade
    const events = await Event.find({
      status: "APPROVED",
      $or: [
        { eligibleGrades: { $size: 0 } },
        { eligibleGrades: { $in: [grade] } },
      ],
    })
      .sort({ date: 1 })
      .limit(10)
      .lean();

    // Notes: by classroom
    const notes = await TeacherNote.find({
      classroom: classroomId,
      isPublished: true,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Games (MCQ): questions from subjects in this classroom
    const subjectIds = await Subject.find({ classroom: classroomId }).distinct(
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
