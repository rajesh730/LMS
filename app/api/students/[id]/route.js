import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Student from '@/models/Student';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { generateStudentPassword } from '@/lib/passwordGenerator';
import { generateUniqueStudentUsername } from '@/lib/studentIdentity';
import { normalizeGradeValue } from '@/lib/schoolGrades';

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

        const normalizedGrade =
            grade !== undefined ? normalizeGradeValue(grade) : existingStudent.grade;
        const normalizedRollNumber =
            rollNumber !== undefined ? String(rollNumber).trim() : existingStudent.rollNumber;

        // 2. Check for Roll Number Uniqueness (if changed)
        if (
            normalizedRollNumber &&
            (normalizedRollNumber !== existingStudent.rollNumber ||
                normalizedGrade !== existingStudent.grade)
        ) {
            const rollCheck = await Student.findOne({
                school: session.user.id,
                grade: normalizedGrade,
                rollNumber: normalizedRollNumber,
                _id: { $ne: id } // Exclude current student
            });

            if (rollCheck) {
                return NextResponse.json({ 
                    message: `Roll number ${normalizedRollNumber} is already assigned in ${normalizedGrade}` 
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
            grade: normalizedGrade,
            section,
            rollNumber: normalizedRollNumber,
            phone,
            address,
            gender,
            dateOfBirth: dob,
            bloodGroup,
            parentName,
            parentEmail,
            parentContactNumber: parentPhone,
            parentAlternativeContact: emergencyContact,
            status // Added status
        };

        // Name Parsing for Update
        if (
            name ||
            normalizedRollNumber !== existingStudent.rollNumber ||
            normalizedGrade !== existingStudent.grade
        ) {
            const effectiveName = name || existingStudent.name;
            const nameParts = effectiveName.trim().split(/\s+/);
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
            updateData.username = await generateUniqueStudentUsername(Student, {
                firstName,
                grade: normalizedGrade,
                rollNumber: normalizedRollNumber,
                school: session.user.id,
                excludeId: id,
            });
            updateData.visiblePassword = `${cleanFirstName}@123`;
            updateData.password = await bcrypt.hash(updateData.visiblePassword, 10);
        }

        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        // Student email is optional and separate from guardian email.
        if (email !== undefined && String(email).trim()) {
            updateData.email = String(email).trim();
        }

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


export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SCHOOL_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        await connectDB();
        const studentDoc = await Student.findOne({ _id: id, school: session.user.id });

        if (!studentDoc) {
            return NextResponse.json({ message: 'Student not found' }, { status: 404 });
        }

        const firstName = (studentDoc.firstName || studentDoc.name?.split(' ')?.[0] || 'Student').trim();
        const newPassword = generateStudentPassword(
            firstName,
            studentDoc.rollNumber,
            studentDoc.grade
        );

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await Student.findByIdAndUpdate(
            id,
            { password: hashedPassword, visiblePassword: newPassword },
            { new: true }
        );

        if (studentDoc.email) {
            await User.findOneAndUpdate(
                { email: studentDoc.email },
                { password: hashedPassword }
            );
        }

        return NextResponse.json(
            {
                message: 'Password reset successfully',
                credentials: { email: studentDoc.email, password: newPassword },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Reset Student Password Error:', error);
        return NextResponse.json({ message: 'Error resetting password' }, { status: 500 });
    }
}
