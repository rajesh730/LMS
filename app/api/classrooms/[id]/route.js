import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Classroom from '@/models/Classroom';

export async function PUT(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SCHOOL_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { name, capacity, classTeacher, subjectTeachers, subjects } = await req.json();

        await connectDB();

        const classroom = await Classroom.findOneAndUpdate(
            { _id: id, school: session.user.id },
            { name, capacity, classTeacher: classTeacher || null, subjectTeachers: subjectTeachers || [], subjects: subjects || [] },
            { new: true }
        ).populate('classTeacher', 'name').populate('subjectTeachers.teacher', 'name');

        if (!classroom) {
            return NextResponse.json({ message: 'Classroom not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Classroom updated successfully', classroom }, { status: 200 });
    } catch (error) {
        console.error('Update Classroom Error:', error);
        return NextResponse.json({ message: 'Error updating classroom' }, { status: 500 });
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

        const classroom = await Classroom.findOneAndDelete({ _id: id, school: session.user.id });

        if (!classroom) {
            return NextResponse.json({ message: 'Classroom not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Classroom deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Delete Classroom Error:', error);
        return NextResponse.json({ message: 'Error deleting classroom' }, { status: 500 });
    }
}
