import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function PUT(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Await params for Next.js 15+
        const { id } = await params;
        const { status } = await req.json();

        if (!['PENDING', 'APPROVED', 'REJECTED', 'SUBSCRIBED', 'UNSUBSCRIBED'].includes(status)) {
            return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
        }

        await connectDB();
        const user = await User.findByIdAndUpdate(id, { status }, { new: true });

        if (!user) {
            return NextResponse.json({ message: 'School not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Status updated', user }, { status: 200 });
    } catch (error) {
        console.error('Error updating status:', error);
        return NextResponse.json({ message: 'Error updating status' }, { status: 500 });
    }
}
