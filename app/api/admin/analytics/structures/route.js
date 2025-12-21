import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Grade from '@/models/Grade';
import connectDB from '@/lib/db';

export async function GET(req) {
  try {
    await connectDB();
    const token = await getToken({ req });
    
    if (!token || token.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Aggregate Grades
    const grades = await Grade.aggregate([
      {
        $group: {
          _id: { name: "$name", level: "$level" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.level": 1, "_id.name": 1 } }
    ]);

    // Process Data for Frontend
    const structuredData = {
      school: grades.filter(g => g._id.level === 'SCHOOL').map(g => ({ name: g._id.name, count: g.count })),
    };

    return NextResponse.json({
      success: true,
      data: structuredData
    });

  } catch (error) {
    console.error('Fetch School Structures Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
