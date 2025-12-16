import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Faculty from '@/models/Faculty';
import connectDB from '@/lib/db';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const token = await getToken({ req });
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: schoolId } = params;

    const faculties = await Faculty.find({ 
      school: schoolId,
      status: 'ACTIVE'
    }).select('name _id educationLevels');

    return NextResponse.json({
      success: true,
      data: faculties
    });

  } catch (error) {
    console.error('Fetch Faculties Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
