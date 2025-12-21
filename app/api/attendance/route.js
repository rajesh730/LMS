import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Attendance from '@/models/Attendance';
import Student from '@/models/Student';
import Teacher from '@/models/Teacher';
import SchoolConfig from '@/models/SchoolConfig';
import { validateActiveYear, missingYearResponse } from "@/lib/guards";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SCHOOL_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // GUARD: Ensure Active Academic Year
        let currentAcademicYear;
        try {
            currentAcademicYear = await validateActiveYear(session.user.id);
        } catch (error) {
            if (error.message === "NO_ACTIVE_YEAR") {
                return missingYearResponse();
            }
            throw error;
        }

        const { date, records } = await req.json();

        if (!date || !records || !Array.isArray(records)) {
            return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
        }

        console.log('💾 Saving attendance:', { date, recordCount: records.length, sampleRecords: records.slice(0, 2) });

        // Normalize date to UTC midnight to match fetch queries
        const normalizedDate = new Date(new Date(date).setUTCHours(0, 0, 0, 0));
        console.log('📅 Date normalization:', { original: date, normalized: normalizedDate.toISOString() });

        const operations = records.map((record) => {
            const filter = {
                date: normalizedDate,
                school: session.user.id
            };

            // $setOnInsert is used for fields that should only be set when creating a new document
            const update = {
                $set: { status: record.status },
                $setOnInsert: {
                    date: normalizedDate,
                    school: session.user.id,
                    academicYear: currentAcademicYear // Tag with current session
                }
            };

            // Only add student or teacher field to both filter and update
            if (record.studentId) {
                filter.student = record.studentId;
                update.$setOnInsert.student = record.studentId;
            }
            if (record.teacherId) {
                filter.teacher = record.teacherId;
                update.$setOnInsert.teacher = record.teacherId;
            }

            return {
                updateOne: {
                    filter,
                    update,
                    upsert: true,
                },
            };
        });

        const result = await Attendance.bulkWrite(operations);
        console.log('✅ Saved:', { inserted: result.upsertedCount, modified: result.modifiedCount });

        return NextResponse.json({ message: 'Attendance saved successfully' }, { status: 200 });
    } catch (error) {
        console.error('Attendance Save Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SCHOOL_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');
        const type = searchParams.get('type');
        const grade = searchParams.get('grade');

        if (!date) {
            return NextResponse.json({ message: 'Date is required' }, { status: 400 });
        }

        await connectDB();

        // Normalize date to UTC midnight to match save operations
        const normalizedDate = new Date(new Date(date).setUTCHours(0, 0, 0, 0));

        const query = {
            school: session.user.id,
            date: normalizedDate,
        };

        console.log('🔍 Fetching attendance:', { date, normalizedDate: normalizedDate.toISOString(), type, grade });

        if (type === 'teacher') {
            query.teacher = { $exists: true };
        } else {
            query.student = { $exists: true };
            
            if (grade) {
                const studentsInGrade = await Student.find({ 
                    grade: grade, 
                    school: session.user.id 
                }).select('_id');
                
                const studentIds = studentsInGrade.map(s => s._id);
                query.student = { $in: studentIds };
            }
        }

        const attendance = await Attendance.find(query)
            .populate('student', 'name grade')
            .populate('teacher', 'name subject');

        console.log('📊 Results:', { count: attendance.length, hasData: attendance.length > 0 });

        return NextResponse.json({ attendance }, { status: 200 });
    } catch (error) {
        console.error('Attendance Fetch Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
