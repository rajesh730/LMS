import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import GradeSubject from '@/models/GradeSubject';
import FacultySubject from '@/models/FacultySubject';
import Subject from '@/models/Subject';

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { subjectId, gradeId, facultyId, creditHours, year, semester, isCustom, name, code, status } = await req.json();
    const schoolId = session.user.id;

    await connectDB();

    // 1. Update Link
    const updateData = {};
    if (creditHours !== undefined) updateData.creditHours = creditHours;
    if (year !== undefined) updateData.year = year;
    if (semester !== undefined) updateData.semester = semester;
    if (status !== undefined) updateData.status = status;

    if (gradeId) {
        await GradeSubject.findOneAndUpdate(
            { school: schoolId, grade: gradeId, subject: subjectId },
            updateData
        );
    } else if (facultyId) {
        await FacultySubject.findOneAndUpdate(
            { school: schoolId, faculty: facultyId, subject: subjectId },
            updateData
        );
    }

    // 2. Update Subject (Name, Code) - ONLY if Custom
    if (isCustom) {
        const updateQuery = { name, code };
        
        // Ensure the grade is recorded in the Subject document for visibility
        if (gradeId) {
            updateQuery.$addToSet = { grades: gradeId };
        }

        await Subject.findOneAndUpdate(
            { _id: subjectId, school: schoolId, subjectType: 'SCHOOL_CUSTOM' },
            updateQuery
        );
    } else {
        // For Global Subjects, we don't update Name/Code, but we should update the Grade visibility
        if (gradeId) {
            await Subject.findOneAndUpdate(
                { _id: subjectId, subjectType: 'GLOBAL' },
                { $addToSet: { grades: gradeId } }
            );
        }
    }

    return NextResponse.json({ message: 'Updated' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    const gradeId = searchParams.get('gradeId');
    const facultyId = searchParams.get('facultyId');
    const permanent = searchParams.get('permanent') === 'true';
    const schoolId = session.user.id;

    await connectDB();

    if (gradeId) {
        if (permanent) {
            await GradeSubject.findOneAndDelete({ school: schoolId, grade: gradeId, subject: subjectId });
        } else {
            await GradeSubject.findOneAndUpdate(
                { school: schoolId, grade: gradeId, subject: subjectId },
                { status: 'INACTIVE' }
            );
        }
    } else if (facultyId) {
        if (permanent) {
            await FacultySubject.findOneAndDelete({ school: schoolId, faculty: facultyId, subject: subjectId });
        } else {
            await FacultySubject.findOneAndUpdate(
                { school: schoolId, faculty: facultyId, subject: subjectId },
                { status: 'INACTIVE' }
            );
        }
    }

    return NextResponse.json({ message: permanent ? 'Permanently Deleted' : 'Archived' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
