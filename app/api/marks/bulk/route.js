import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Marks from "@/models/Marks";
import Student from "@/models/Student";
import Grade from "@/models/Grade";
import Exam from "@/models/Exam";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId");
    const gradeId = searchParams.get("gradeId");
    const subjectId = searchParams.get("subjectId");

    if (!examId || !gradeId || !subjectId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // 1. Get Grade Name to fetch students
    const gradeDoc = await Grade.findById(gradeId);
    if (!gradeDoc) {
      return NextResponse.json({ error: "Grade not found" }, { status: 404 });
    }

    // 2. Get Exam to check academic year (optional validation)
    const examDoc = await Exam.findById(examId);
    if (!examDoc) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // 3. Fetch Students in this grade for the user's school
    // Teachers/Admins belong to a school.
    // If teacher, we assume they can only see students of their school.
    // We need to determine the school ID.
    let schoolId = session.user.id; // Default for School Admin
    if (session.user.role === "TEACHER") {
        // For teachers, we need to find their school. 
        // In this system, usually the teacher is created by a school admin.
        // We might need to fetch the Teacher profile to get the school ID if not in session.
        // However, let's assume for now we can query students by just the grade name 
        // and filter by the teacher's assigned school if we had that info.
        // A safer bet: The Student model has a 'school' field.
        // We need to filter by that.
        // Let's try to find the school from the Exam document, as Exams are school-specific.
        schoolId = examDoc.school;
    }

    const students = await Student.find({
      grade: gradeDoc.name,
      school: schoolId,
      currentStatus: "active", // Only active students
    })
    .select("name rollNumber _id")
    .sort({ rollNumber: 1 });

    // 4. Fetch existing marks
    const existingMarks = await Marks.find({
      exam: examId,
      subject: subjectId,
      grade: gradeId,
      school: schoolId,
    });

    // 5. Merge data
    const studentMarks = students.map((student) => {
      const markEntry = existingMarks.find(
        (m) => m.student.toString() === student._id.toString()
      );
      return {
        studentId: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        marksObtained: markEntry ? markEntry.marksObtained : "",
        totalMarks: markEntry ? markEntry.totalMarks : examDoc.weightage || 100, // Default to exam weightage or 100
        remarks: markEntry ? markEntry.remarks : "",
        markId: markEntry ? markEntry._id : null,
      };
    });

    return NextResponse.json(studentMarks);
  } catch (error) {
    console.error("Error fetching bulk marks:", error);
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

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { examId, gradeId, subjectId, marks } = body;

    if (!examId || !gradeId || !subjectId || !Array.isArray(marks)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    const examDoc = await Exam.findById(examId);
    if (!examDoc) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Determine school ID (similar logic to GET)
    const schoolId = examDoc.school;

    // Process each mark entry
    const operations = marks.map((entry) => {
      const filter = {
        student: entry.studentId,
        exam: examId,
        subject: subjectId,
      };

      const update = {
        student: entry.studentId,
        exam: examId,
        subject: subjectId,
        grade: gradeId,
        school: schoolId,
        academicYear: examDoc.academicYear,
        teacher: session.user.id, // The one entering the marks
        assessmentType: examDoc.term, // Sync with exam term
        marksObtained: entry.marksObtained,
        totalMarks: entry.totalMarks,
        remarks: entry.remarks,
      };

      return {
        updateOne: {
          filter: filter,
          update: { $set: update },
          upsert: true,
        },
      };
    });

    if (operations.length > 0) {
      await Marks.bulkWrite(operations);
    }

    return NextResponse.json({ message: "Marks updated successfully" });
  } catch (error) {
    console.error("Error saving bulk marks:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
