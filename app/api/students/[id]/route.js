import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Student from '@/models/Student';
import bcrypt from 'bcryptjs';

export async function PUT(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SCHOOL_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        
        // Destructure all possible fields
        const { 
            name, email, grade, section, rollNumber, 
            phone, address, gender, dob, bloodGroup,
            parentName, parentEmail, parentPhone, emergencyContact,
            status // Added status
        } = body;

        await connectDB();

        // 1. Find the student first to ensure they exist and belong to this school
        const existingStudent = await Student.findOne({ _id: id, school: session.user.id });
        if (!existingStudent) {
            return NextResponse.json({ message: 'Student not found' }, { status: 404 });
        }

        // 2. Check for Roll Number Uniqueness (if changed)
        if (rollNumber && (rollNumber !== existingStudent.rollNumber || grade !== existingStudent.grade)) {
            const rollCheck = await Student.findOne({
                school: session.user.id,
                grade: grade || existingStudent.grade,
                rollNumber: rollNumber,
                _id: { $ne: id } // Exclude current student
            });

            if (rollCheck) {
                return NextResponse.json({ 
                    message: `Roll number ${rollNumber} is already assigned in Grade ${grade || existingStudent.grade}` 
                }, { status: 400 });
            }
        }

        // 3. Check for Email Uniqueness (if changed and provided)
        if (email && email !== existingStudent.email) {
            const emailCheck = await Student.findOne({
                email: email,
                _id: { $ne: id }
            });

            if (emailCheck) {
                return NextResponse.json({ message: 'Email already in use' }, { status: 400 });
            }
        }

        // 4. Prepare Update Object
        const updateData = {
            name,
            grade,
            section,
            rollNumber,
            phone,
            address,
            gender,
            dob,
            bloodGroup,
            parentName,
            parentEmail,
            parentPhone,
            emergencyContact,
            status // Added status
        };

        // Name Parsing for Update
        if (name) {
            const nameParts = name.trim().split(/\s+/);
            let firstName = nameParts[0];
            let middleName = "";
            let lastName = "";

            if (nameParts.length === 1) {
                lastName = ""; 
            } else if (nameParts.length === 2) {
                lastName = nameParts[1];
            } else {
                lastName = nameParts[nameParts.length - 1];
                middleName = nameParts.slice(1, -1).join(" ");
            }
            
            updateData.firstName = firstName;
            updateData.middleName = middleName;
            updateData.lastName = lastName;

            // Update Credentials if Name or Roll Number changes
            // Note: This changes the student's login. Admin should be aware.
            const cleanFirstName = firstName.replace(/[^a-zA-Z0-9]/g, "") || "Student";
            const newRollNumber = rollNumber || existingStudent.rollNumber;
            
            updateData.username = `${cleanFirstName.toLowerCase()}${newRollNumber}`;
            updateData.visiblePassword = `${cleanFirstName}@123`;
            updateData.password = await bcrypt.hash(updateData.visiblePassword, 10);
        }

        // Only update email if provided (it might be optional/empty)
        if (email !== undefined) updateData.email = email;

        // 5. Perform Update
        const updatedStudent = await Student.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        return NextResponse.json({ 
            message: 'Student updated successfully', 
            student: updatedStudent 
        }, { status: 200 });

    } catch (error) {
        console.error('Update Student Error:', error);
        return NextResponse.json({ 
            message: error.message || 'Error updating student' 
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
        const deletedStudent = await Student.findOneAndDelete({ _id: id, school: session.user.id });

        if (!deletedStudent) {
            return NextResponse.json({ message: 'Student not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Student deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Delete Student Error:', error);
        return NextResponse.json({ message: 'Error deleting student' }, { status: 500 });
    }
}
