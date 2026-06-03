import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const schools = await User.find({ role: 'SCHOOL_ADMIN' })
            .select(
                "schoolName principalName email status schoolPhone schoolLocation province district website establishedYear createdAt updatedAt educationLevels"
            )
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ schools }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching schools' }, { status: 500 });
    }
}
