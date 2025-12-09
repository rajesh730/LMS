import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Group from '@/models/Group';

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { name, schools } = await req.json();
        if (!name) {
            return NextResponse.json({ message: 'Group name is required' }, { status: 400 });
        }

        await connectDB();
        const group = await Group.create({ name, schools: schools || [] });

        return NextResponse.json({ message: 'Group created', group }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: 'Error creating group' }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const groups = await Group.find().populate('schools', 'schoolName email');

        return NextResponse.json({ groups }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching groups' }, { status: 500 });
    }
}
