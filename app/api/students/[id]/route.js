import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Student from '@/models/Student';

export async function PUT(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SCHOOL_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { name, email, grade, parentEmail, classroom } = await req.json();

        await connectDB();
        const updatedStudent = await Student.findOneAndUpdate(
            { _id: id, school: session.user.id }, // Ensure student belongs to school
            { name, email, grade, parentEmail, classroom: classroom || null },
            { new: true }
        );

        if (!updatedStudent) {
            return NextResponse.json({ message: 'Student not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Student updated', student: updatedStudent }, { status: 200 });
    } catch (error) {
        console.error('Update Student Error:', error);
        return NextResponse.json({ message: 'Error updating student' }, { status: 500 });
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
        const deletedStudent = await Student.findOneAndDelete({ _id: id, school: session.user.id });

        if (!deletedStudent) {
            return NextResponse.json({ message: 'Student not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Student deleted' }, { status: 200 });
    } catch (error) {
        console.error('Delete Student Error:', error);
        return NextResponse.json({ message: 'Error deleting student' }, { status: 500 });
    }
}
