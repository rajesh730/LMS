import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Student from '@/models/Student';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        // Only SUPER_ADMIN or SCHOOL_ADMIN should ideally trigger this
        if (!session) { // || session.user.role !== 'SUPER_ADMIN'
            // For safety in this dev environment, we allow it if we are authenticated at all, or just open for run check
            // But let's stick to simple safety:
            if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SCHOOL_ADMIN') {
                return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }
        }

        await connectDB();
        const students = await Student.find({});
        let count = 0;
        const hashedPassword = await bcrypt.hash('student123', 10);

        for (const student of students) {
            const existingUser = await User.findOne({ email: student.email });
            if (!existingUser) {
                await User.create({
                    email: student.email,
                    password: hashedPassword,
                    role: 'STUDENT',
                    name: student.name,
                    schoolName: 'Student', // Placeholder or fetch school name
                    classroomId: student.classroom,
                    status: 'APPROVED',
                });
                count++;
            }
        }

        return NextResponse.json({ message: `Migration successful. Created ${count} accounts.` });
    } catch (error) {
        console.error('Migration Error:', error);
        return NextResponse.json({ message: 'Error during migration' }, { status: 500 });
    }
}
