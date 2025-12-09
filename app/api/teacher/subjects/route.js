import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Subject from '@/models/Subject';
import Classroom from '@/models/Classroom';
import Teacher from '@/models/Teacher';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'SCHOOL_ADMIN')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // 1. Find Teacher Profile
        // If logged in as Teacher, use session ID. If School Admin, maybe this is not the right generic Viewer?
        // But let's assume this route is for the specific Teacher Dashboard.

        let teacherId = null;
        if (session.user.role === 'TEACHER') {
            // The User ID corresponds to the User collection.
            // We need to find the Teacher document that is linked to this User email?
            // Wait, when we created Teachers, we created User accounts.
            // But the 'Teacher' model is separate.
            // Teacher model has `email`. User model has `email`.
            const teacherDoc = await Teacher.findOne({ email: session.user.email });
            if (!teacherDoc) {
                return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });
            }
            teacherId = teacherDoc._id;
        }

        if (!teacherId) {
            return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });
        }

        // 2. Sync Subjects from Classrooms
        // We look for Classrooms where this teacher is a subject teacher.
        const classrooms = await Classroom.find({ "subjectTeachers.teacher": teacherId });

        const subjects = [];

        for (const classroom of classrooms) {
            for (const st of classroom.subjectTeachers) {
                if (st.teacher.toString() === teacherId.toString()) {
                    // Check if Subject document exists
                    let subject = await Subject.findOne({
                        classroom: classroom._id,
                        name: st.subject,
                        teacher: teacherId
                    });

                    if (!subject) {
                        // Auto-create Subject if missing (Lazy Sync)
                        subject = await Subject.create({
                            name: st.subject,
                            code: `${st.subject.substring(0, 3).toUpperCase()}-${classroom.name}`, // Auto-gen code
                            classroom: classroom._id,
                            teacher: teacherId,
                            school: classroom.school,
                            description: `Subject ${st.subject} for Class ${classroom.name}`
                        });
                    }
                    subjects.push(subject);
                }
            }
        }

        // Populate specific fields if needed
        const populatedSubjects = await Subject.find({ _id: { $in: subjects.map(s => s._id) } })
            .populate('classroom', 'name');

        return NextResponse.json({ subjects: populatedSubjects }, { status: 200 });

    } catch (error) {
        console.error('Fetch Teacher Subjects Error:', error);
        return NextResponse.json({ message: 'Error fetching subjects' }, { status: 500 });
    }
}
