import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Subject from '@/models/Subject';
import connectDB from '@/lib/db';

export async function GET(req) {
  try {
    await connectDB();
    const token = await getToken({ req });
    
    if (!token || token.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'ACTIVE';
    
    console.log(`Fetching subjects with status: ${status}`);

    // Fetch all subjects (Global + School Custom)
    // We populate the school field to identify custom subjects
    const subjects = await Subject.find({ 
      status: status
    })
    .populate('school', 'schoolName')
    .sort({ subjectType: 1, name: 1 }); // Sort by Type (Global first) then Name
    
    console.log(`Found ${subjects.length} subjects`);

    return NextResponse.json({
      success: true,
      data: subjects
    });

  } catch (error) {
    console.error('Fetch Global Subjects Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const token = await getToken({ req });
    
    if (!token || token.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, code, description, academicType, educationLevel, grades, applicableFaculties, year, semester } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
    }

    // Check duplicate
    const existing = await Subject.findOne({ 
      code, 
      subjectType: 'GLOBAL',
      status: 'ACTIVE'
    });

    if (existing) {
      return NextResponse.json({ error: 'Global subject with this code already exists' }, { status: 400 });
    }

    const subject = await Subject.create({
      name,
      code,
      description,
      academicType,
      educationLevel: Array.isArray(educationLevel) ? educationLevel : [educationLevel],
      grades: grades || [],
      applicableFaculties: applicableFaculties || [],
      year: year || null,
      semester: semester || null,
      subjectType: 'GLOBAL',
      school: null,
      createdBy: token.sub,
      status: 'ACTIVE'
    });

    return NextResponse.json({
      success: true,
      data: subject,
      message: 'Global subject created successfully'
    });

  } catch (error) {
    console.error('Create Global Subject Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

