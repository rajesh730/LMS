import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Subject from '@/models/Subject';
import Teacher from '@/models/Teacher';

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
            teacherId = teacherDoc._id;
        }

        if (!teacherId) {
            return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });
        }

        // Note: Classroom feature has been removed, so subjects are no longer tied to classrooms
        // Fetch subjects directly by teacher
        const subjects = await Subject.find({ teacher: teacherId });

        return NextResponse.json({ subjects: subjects }, { status: 200 });

    } catch (error) {
        console.error('Fetch Teacher Subjects Error:', error);
        return NextResponse.json({ message: 'Error fetching subjects' }, { status: 500 });
    }
}
