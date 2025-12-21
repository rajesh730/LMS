import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Subject from '@/models/Subject';
import Teacher from '@/models/Teacher';
import Grade from '@/models/Grade';
import { validateActiveYear, missingYearResponse } from '@/lib/guards';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SCHOOL_ADMIN')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // 1. Find Teacher Profile
        let teacherId = null;
        if (session.user.role === 'TEACHER') {
            const teacherDoc = await Teacher.findOne({ email: session.user.email });
            if (!teacherDoc) {
                return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });
            }
            
            // Validate Active Year
            try {
                await validateActiveYear(teacherDoc.school);
            } catch (error) {
                if (error.message === "NO_ACTIVE_YEAR") {
                    return missingYearResponse();
                }
                throw error;
            }

            teacherId = teacherDoc._id;
        }

        if (!teacherId) {
            return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });
        }

        // Fetch subjects from Grade assignments
        const grades = await Grade.find({
            "teachers.teacher": teacherId
        }).populate("teachers.subjects");

        const subjectMap = new Map();
        
        grades.forEach(grade => {
            const teacherAssignment = grade.teachers.find(t => t.teacher.toString() === teacherId.toString());
            if (teacherAssignment && teacherAssignment.subjects) {
                teacherAssignment.subjects.forEach(subject => {
                    if (subject && !subjectMap.has(subject._id.toString())) {
                        subjectMap.set(subject._id.toString(), subject);
                    }
                });
            }
        });

        const subjects = Array.from(subjectMap.values());

        return NextResponse.json({ subjects: subjects }, { status: 200 });

    } catch (error) {
        console.error('Fetch Teacher Subjects Error:', error);
        return NextResponse.json({ message: 'Error fetching subjects' }, { status: 500 });
    }
}
