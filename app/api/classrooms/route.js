import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Classroom from '@/models/Classroom';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        await connectDB();
        const classrooms = await Classroom.find({ school: session.user.id })
            .populate('classTeacher', 'name')
            .populate('subjectTeachers.teacher', 'name');

        return NextResponse.json({ classrooms }, { status: 200 });
    } catch (error) {
        console.error('Error fetching classrooms:', error);
        return NextResponse.json({ message: 'Error fetching classrooms', error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { name, capacity, classTeacher, subjectTeachers } = await req.json();

        await connectDB();
        const classroom = await Classroom.create({
            name,
            capacity,
            classTeacher: classTeacher || null,
            subjectTeachers: subjectTeachers || [],
            school: session.user.id,
        });

        return NextResponse.json({ message: 'Classroom created', classroom }, { status: 201 });
    } catch (error) {
        console.error('Error creating classroom:', error);
        return NextResponse.json({ message: 'Error creating classroom' }, { status: 500 });
    }
}
