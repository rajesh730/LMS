import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Teacher from '@/models/Teacher';

export async function PUT(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SCHOOL_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { name, email, subject, roles } = await req.json();

        await connectDB();
        const updatedTeacher = await Teacher.findOneAndUpdate(
            { _id: id, school: session.user.id },
            { name, email, subject, roles },
            { new: true }
        );

        if (!updatedTeacher) {
            return NextResponse.json({ message: 'Teacher not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Teacher updated', teacher: updatedTeacher }, { status: 200 });
    } catch (error) {
        console.error('Update Teacher Error:', error);
        return NextResponse.json({ message: 'Error updating teacher' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SCHOOL_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        await connectDB();
        const deletedTeacher = await Teacher.findOneAndDelete({ _id: id, school: session.user.id });

        if (!deletedTeacher) {
            return NextResponse.json({ message: 'Teacher not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Teacher deleted' }, { status: 200 });
    } catch (error) {
        console.error('Delete Teacher Error:', error);
        return NextResponse.json({ message: 'Error deleting teacher' }, { status: 500 });
    }
}
