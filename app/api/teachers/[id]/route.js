import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Teacher from '@/models/Teacher';
import User from '@/models/User';

export async function PUT(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SCHOOL_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const { 
            name, email, phone, address, gender, dob, bloodGroup,
            designation, experience, dateOfJoining, qualification,
            emergencyContact, subject, roles 
        } = body;

        await connectDB();

        // 1. Find the teacher first
        const existingTeacher = await Teacher.findOne({
            _id: id,
            school: session.user.id,
            isDeleted: { $ne: true },
        });
        if (!existingTeacher) {
            return NextResponse.json({ message: 'Teacher not found' }, { status: 404 });
        }

        // 2. Check for Email Uniqueness (if changed)
        if (email && email !== existingTeacher.email) {
            const emailCheck = await Teacher.findOne({
                email: email,
                isDeleted: { $ne: true },
                _id: { $ne: id }
            });

            if (emailCheck) {
                return NextResponse.json({ message: 'Email already in use' }, { status: 400 });
            }
        }

        // 3. Prepare Update Object
        const updateData = {
            name,
            email,
            phone,
            address,
            gender,
            dob,
            bloodGroup,
            designation,
            experience,
            dateOfJoining,
            qualification,
            emergencyContact,
            subject,
            roles
        };

        // 4. Perform Update
        const updatedTeacher = await Teacher.findOneAndUpdate(
            { _id: id, school: session.user.id, isDeleted: { $ne: true } },
            updateData,
            { new: true, runValidators: true }
        );

        return NextResponse.json({ 
            message: 'Teacher updated successfully', 
            teacher: updatedTeacher 
        }, { status: 200 });

    } catch (error) {
        console.error('Update Teacher Error:', error);
        return NextResponse.json({ 
            message: error.message || 'Error updating teacher' 
        }, { status: 500 });
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
        const deletedTeacher = await Teacher.findOneAndUpdate(
            { _id: id, school: session.user.id, isDeleted: { $ne: true } },
            {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: session.user.id,
                status: 'INACTIVE',
            },
            { new: true }
        );

        if (!deletedTeacher) {
            return NextResponse.json({ message: 'Teacher not found' }, { status: 404 });
        }

        if (deletedTeacher.email) {
            await User.findOneAndUpdate(
                { email: deletedTeacher.email, role: 'TEACHER' },
                { status: 'UNSUBSCRIBED', $inc: { authVersion: 1 } }
            );
        }

        return NextResponse.json({ message: 'Mentor archived successfully' }, { status: 200 });
    } catch (error) {
        console.error('Delete Teacher Error:', error);
        return NextResponse.json({ message: 'Error deleting teacher' }, { status: 500 });
    }
}
