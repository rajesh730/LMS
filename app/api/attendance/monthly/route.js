import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Attendance from '@/models/Attendance';
import Student from '@/models/Student';
import connectDB from '@/lib/db';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const month = parseInt(searchParams.get('month'));
        const year = parseInt(searchParams.get('year'));

        if (!month || !year) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        console.log('📅 Fetching monthly attendance:', { month, year });

        // Fetch all students for the school
        const students = await Student.find({
            school: session.user.id
        }).select('_id name grade').sort({ name: 1 });

        const studentIds = students.map(s => s._id);
        console.log('👨‍🎓 Found students:', studentIds.length);

        // Calculate start and end date of the month with UTC normalization
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        console.log('📆 Date range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

        // Fetch attendance
        const attendance = await Attendance.find({
            student: { $in: studentIds },
            date: { $gte: startDate, $lte: endDate },
            school: session.user.id
        }).populate('student', 'name grade');

        console.log('📊 Found attendance records:', attendance.length);

        return NextResponse.json({ attendance, students });
    } catch (error) {
        console.error('Error fetching monthly attendance:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
