import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { CurriculumService } from '@/lib/services/curriculumService';

export async function POST(req) {
  try {
    const token = await getToken({ req });
    
    if (!token || (token.role !== 'SCHOOL_ADMIN' && token.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = token.role === 'SCHOOL_ADMIN' ? token.sub : req.nextUrl.searchParams.get('schoolId');
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    const body = await req.json();
    
    // Validate body structure
    if (!body.faculties || !Array.isArray(body.faculties)) {
      return NextResponse.json({ error: 'Invalid data format. Expected { faculties: [] }' }, { status: 400 });
    }

    const result = await CurriculumService.importCurriculum(schoolId, body.faculties);

    return NextResponse.json({
      success: true,
      message: 'Curriculum imported successfully',
      data: result
    });

  } catch (error) {
    console.error('Curriculum Import Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
