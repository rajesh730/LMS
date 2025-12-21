import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import TeacherNote from "@/models/TeacherNote";
import Teacher from "@/models/Teacher";
import Grade from "@/models/Grade";

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

    // Verify teacher teaches this subject
    const grades = await Grade.find({
      "teachers": {
        $elemMatch: {
          teacher: teacherDoc._id,
          subjects: subjectId
        }
      }
    });

    if (grades.length === 0)
      return NextResponse.json(
        { message: "Subject not assigned to teacher" },
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

    const { subjectId, title, content, isPublished = true, gradeId } = body;
    if (!subjectId || !title || !content) {
      return NextResponse.json(
        { message: "subjectId, title, content required" },
        { status: 400 }
      );
    }

    // Find grades where teacher teaches this subject
    const grades = await Grade.find({
      "teachers": {
        $elemMatch: {
          teacher: teacherDoc._id,
          subjects: subjectId
        }
      }
    });

    if (grades.length === 0) {
      return NextResponse.json(
        { message: "Subject not assigned to teacher" },
        { status: 404 }
      );
    }

    let targetGradeId = gradeId;

    // If gradeId not provided, try to infer
    if (!targetGradeId) {
      if (grades.length === 1) {
        targetGradeId = grades[0]._id;
      } else {
        return NextResponse.json(
          { message: "Multiple grades found for this subject. Please specify gradeId." },
          { status: 400 }
        );
      }
    } else {
      // Verify the provided gradeId is valid for this teacher/subject
      const isValidGrade = grades.some(g => g._id.toString() === targetGradeId);
      if (!isValidGrade) {
        return NextResponse.json(
          { message: "Invalid grade for this subject assignment" },
          { status: 400 }
        );
      }
    }

    const note = await TeacherNote.create({
      subject: subjectId,
      grade: targetGradeId,
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
