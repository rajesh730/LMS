import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Subject from '@/models/Subject';
import Faculty from '@/models/Faculty';
import connectDB from '@/lib/db';

export async function GET(req) {
  try {
    await connectDB();
    const token = await getToken({ req });
    
    if (!token || (token.role !== 'SCHOOL_ADMIN' && token.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = token.role === 'SCHOOL_ADMIN' ? token.sub : req.nextUrl.searchParams.get('schoolId');
    const facultyId = req.nextUrl.searchParams.get('facultyId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    let query = {
      status: 'ACTIVE',
      $or: [
        { subjectType: 'GLOBAL' },
        { school: schoolId, subjectType: 'SCHOOL_CUSTOM' }
      ]
    };

    // If facultyId is provided, filter subjects that are applicable to this faculty
    if (facultyId) {
      query.applicableFaculties = facultyId;
    }

    const subjects = await Subject.find(query).sort({ name: 1 });

    return NextResponse.json({
      success: true,
      data: subjects
    });

  } catch (error) {
    console.error('Fetch Subjects Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const token = await getToken({ req });
    
    if (!token || token.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, code, facultyId, description, creditHours } = body;

    if (!name || !code || !facultyId) {
      return NextResponse.json({ error: 'Name, Code and Faculty are required' }, { status: 400 });
    }

    // Check if subject exists (Global or Custom)
    let subject = await Subject.findOne({
      code: code,
      $or: [
        { subjectType: 'GLOBAL' },
        { school: token.sub, subjectType: 'SCHOOL_CUSTOM' }
      ]
    });

    if (subject) {
      // If subject exists, just link the faculty
      if (!subject.applicableFaculties.includes(facultyId)) {
        subject.applicableFaculties.push(facultyId);
        await subject.save();
      }
    } else {
      // Create new Custom Subject
      subject = await Subject.create({
        name,
        code,
        description,
        subjectType: 'SCHOOL_CUSTOM',
        school: token.sub,
        createdBy: token.sub,
        applicableFaculties: [facultyId],
        // You might want to store creditHours in GradeSubject, but for now we can store it in description or metadata if needed
      });
    }

    return NextResponse.json({
      success: true,
      data: subject,
      message: 'Subject added successfully'
    });

  } catch (error) {
    console.error('Create Subject Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
