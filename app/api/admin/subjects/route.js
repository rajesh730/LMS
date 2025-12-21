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
    
    // Fetch all subjects (Global + School Custom)
    // We populate the school field to identify custom subjects
    const subjects = await Subject.find({ 
      status: status
    })
    .populate('school', 'schoolName')
    .sort({ subjectType: 1, name: 1 }); // Sort by Type (Global first) then Name
    
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
    const { name, code, description, academicType, educationLevel, grades } = body;

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

    // Standardize Grades
    const standardizeGrades = (inputGrades) => {
        if (!inputGrades || !Array.isArray(inputGrades)) return [];
        const mapping = {
            '1': 'Grade 1', 'one': 'Grade 1', 'first': 'Grade 1', 'class 1': 'Grade 1',
            '2': 'Grade 2', 'two': 'Grade 2', 'second': 'Grade 2', 'class 2': 'Grade 2',
            '3': 'Grade 3', 'three': 'Grade 3', 'third': 'Grade 3', 'class 3': 'Grade 3',
            '4': 'Grade 4', 'four': 'Grade 4', 'fourth': 'Grade 4', 'class 4': 'Grade 4',
            '5': 'Grade 5', 'five': 'Grade 5', 'fifth': 'Grade 5', 'class 5': 'Grade 5',
            '6': 'Grade 6', 'six': 'Grade 6', 'sixth': 'Grade 6', 'class 6': 'Grade 6',
            '7': 'Grade 7', 'seven': 'Grade 7', 'seventh': 'Grade 7', 'class 7': 'Grade 7',
            '8': 'Grade 8', 'eight': 'Grade 8', 'eighth': 'Grade 8', 'class 8': 'Grade 8',
            '9': 'Grade 9', 'nine': 'Grade 9', 'ninth': 'Grade 9', 'class 9': 'Grade 9',
            '10': 'Grade 10', 'ten': 'Grade 10', 'tenth': 'Grade 10', 'class 10': 'Grade 10',
        };
        return [...new Set(inputGrades.map(g => {
            const key = g.toString().toLowerCase().replace(/\s+/g, ' ').trim();
            
            // Check for G+Number pattern (e.g. G1, G10)
            const gMatch = key.match(/^g(\d+)$/);
            if (gMatch) return `Grade ${gMatch[1]}`;

            return mapping[key] || g;
        }))];
    };

    const subject = await Subject.create({
      name,
      code,
      description,
      academicType,
      educationLevel: Array.isArray(educationLevel) ? educationLevel : [educationLevel],
      grades: standardizeGrades(grades || []),
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

