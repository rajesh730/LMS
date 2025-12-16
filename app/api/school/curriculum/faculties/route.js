import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Faculty from '@/models/Faculty';
import User from '@/models/User';
import SchoolConfig from '@/models/SchoolConfig';
import connectDB from '@/lib/db';

export async function GET(req) {
  try {
    await connectDB();
    const token = await getToken({ req });
    
    if (!token || (token.role !== 'SCHOOL_ADMIN' && token.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use token.sub as schoolId for SCHOOL_ADMIN
    const schoolId = token.role === 'SCHOOL_ADMIN' ? token.sub : req.nextUrl.searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    let faculties = await Faculty.find({ 
      school: schoolId,
      status: 'ACTIVE'
    }).select('name _id educationLevels').sort({ name: 1 });

    // Auto-seed from School Config if no faculties exist
    if (faculties.length === 0) {
      const school = await User.findById(schoolId);
      const schoolConfigDoc = await SchoolConfig.findOne({ school: schoolId });
      
      // Merge config sources: User.schoolConfig and SchoolConfig model
      const config = {
        ...(school?.schoolConfig || {}),
        ...(schoolConfigDoc ? { grades: schoolConfigDoc.grades } : {})
      };

      const newFaculties = [];
      const processedNames = new Set();

      // Helper to add unique faculty
      const addFaculty = (name, level) => {
        if (!name) return;
        const normalized = name.trim();
        if (!processedNames.has(normalized.toLowerCase())) {
          newFaculties.push({
            name: normalized,
            school: schoolId,
            educationLevels: [level],
            status: 'ACTIVE',
            createdBy: schoolId
          });
          processedNames.add(normalized.toLowerCase());
        }
      };

      // 1. Check for explicit 'faculties' or 'streams' array in config
      if (Array.isArray(config.faculties)) {
        config.faculties.forEach(f => addFaculty(f, 'Bachelor'));
      } else if (Array.isArray(config.streams)) {
        config.streams.forEach(f => addFaculty(f, 'HigherSecondary'));
      }

      // 2. If no faculties/streams found, check for 'grades' (for schools)
      // Treat grades as "Faculties" for subject grouping purposes
      if (newFaculties.length === 0 && Array.isArray(config.grades)) {
          config.grades.forEach(g => addFaculty(g, 'School'));
      }

      if (newFaculties.length > 0) {
        await Faculty.insertMany(newFaculties);
        // Refetch
        faculties = await Faculty.find({ 
          school: schoolId,
          status: 'ACTIVE'
        }).select('name _id educationLevels').sort({ name: 1 });
      }
    }

    return NextResponse.json({
      success: true,
      data: faculties
    });

  } catch (error) {
    console.error('Fetch Faculties Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
