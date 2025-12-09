import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Group from '@/models/Group';

export async function PUT(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { name, schools } = await req.json();

        await connectDB();
        const updatedGroup = await Group.findByIdAndUpdate(
            id,
            { name, schools },
            { new: true }
        );

        if (!updatedGroup) {
            return NextResponse.json({ message: 'Group not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Group updated', group: updatedGroup }, { status: 200 });
    } catch (error) {
        console.error('Update Group Error:', error);
        return NextResponse.json({ message: 'Error updating group' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        await connectDB();
        const deletedGroup = await Group.findByIdAndDelete(id);

        if (!deletedGroup) {
            return NextResponse.json({ message: 'Group not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Group deleted' }, { status: 200 });
    } catch (error) {
        console.error('Delete Group Error:', error);
        return NextResponse.json({ message: 'Error deleting group' }, { status: 500 });
    }
}
