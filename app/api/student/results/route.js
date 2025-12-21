import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Marks from "@/models/Marks";
import Exam from "@/models/Exam";
import GradingScale from "@/models/GradingScale";
import Student from "@/models/Student";
import Subject from "@/models/Subject";
import { calculateGrade, calculateGPA } from "@/lib/gradeCalculator";
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

    if (!examId) {
      return NextResponse.json({ error: "Exam ID is required" }, { status: 400 });
    }

    // Identify Student
    let studentId;
    if (session.user.role === "STUDENT") {
        // Find student profile linked to user
        const student = await Student.findOne({ email: session.user.email });
        if (!student) {
             return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
        }
        studentId = student._id;
    } else {
        // Allow admins/teachers to view specific student result?
        // For now, let's focus on Student View.
        // If needed, we can accept studentId param for admins.
        studentId = searchParams.get("studentId");
        if (!studentId && session.user.role !== "STUDENT") {
             return NextResponse.json({ error: "Student ID required for non-student users" }, { status: 400 });
        }
    }

    // Fetch Exam
    const exam = await Exam.findById(examId).populate("academicYear");
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if results are published (for students)
    if (session.user.role === "STUDENT" && exam.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Results are not yet published" }, { status: 403 });
    }

    // Fetch Student Details
    const student = await Student.findById(studentId);

    // Fetch Marks
    const marks = await Marks.find({
      student: studentId,
      exam: examId,
    }).populate("subject");

    // Fetch Grading Scale (Default for school)
    // Assuming student has a school field, or we use exam.school
    const gradingScale = await GradingScale.findOne({ 
        school: exam.school, 
        isDefault: true 
    });

    // Process Results
    const subjectResults = marks.map(mark => {
        const percentage = (mark.marksObtained / mark.totalMarks) * 100;
        const gradeInfo = calculateGrade(percentage, gradingScale);
        
        return {
            subject: mark.subject.name,
            marksObtained: mark.marksObtained,
            totalMarks: mark.totalMarks,
            percentage: percentage.toFixed(1),
            grade: gradeInfo?.grade || "-",
            gpa: gradeInfo?.gpa || 0,
            remarks: mark.remarks || gradeInfo?.description || ""
        };
    });

    // Calculate Totals
    const totalObtained = subjectResults.reduce((sum, sub) => sum + sub.marksObtained, 0);
    const maxMarks = subjectResults.reduce((sum, sub) => sum + sub.totalMarks, 0);
    const overallPercentage = maxMarks > 0 ? (totalObtained / maxMarks) * 100 : 0;
    const overallGradeInfo = calculateGrade(overallPercentage, gradingScale);
    const overallGPA = calculateGPA(subjectResults);

    const resultData = {
        student: {
            name: student.name,
            rollNumber: student.rollNumber,
            grade: student.grade,
            section: student.section || "A"
        },
        exam: {
            name: exam.name,
            term: exam.term,
            date: exam.endDate,
            academicYear: exam.academicYear?.name
        },
        subjects: subjectResults,
        summary: {
            totalObtained,
            maxMarks,
            percentage: overallPercentage.toFixed(2),
            gpa: overallGPA,
            grade: overallGradeInfo?.grade || "-"
        }
    };

    return NextResponse.json(resultData);

  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
