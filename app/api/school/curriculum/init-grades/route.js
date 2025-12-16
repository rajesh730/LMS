import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Grade from '@/models/Grade';
import User from '@/models/User';
import Student from '@/models/Student';
import GradeSubject from '@/models/GradeSubject';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const schoolId = session.user.id;
    
    // Fetch school config to check education levels
    const school = await User.findById(schoolId);
    if (!school) {
      return NextResponse.json({ message: 'School not found' }, { status: 404 });
    }

    // Define standard grades with "Grade" prefix instead of "Class"
    const standardGrades = [
      { name: 'Grade 1', oldName: 'Class 1', level: 'SCHOOL' },
      { name: 'Grade 2', oldName: 'Class 2', level: 'SCHOOL' },
      { name: 'Grade 3', oldName: 'Class 3', level: 'SCHOOL' },
      { name: 'Grade 4', oldName: 'Class 4', level: 'SCHOOL' },
      { name: 'Grade 5', oldName: 'Class 5', level: 'SCHOOL' },
      { name: 'Grade 6', oldName: 'Class 6', level: 'SCHOOL' },
      { name: 'Grade 7', oldName: 'Class 7', level: 'SCHOOL' },
      { name: 'Grade 8', oldName: 'Class 8', level: 'SCHOOL' },
      { name: 'Grade 9', oldName: 'Class 9', level: 'SCHOOL' },
      { name: 'Grade 10', oldName: 'Class 10', level: 'SCHOOL' },
    ];

    // Add High School grades if applicable
    if (school.educationLevels?.highSchool) {
      standardGrades.push(
        { name: 'Grade 11', oldName: 'Class 11', level: 'HIGH_SCHOOL' },
        { name: 'Grade 12', oldName: 'Class 12', level: 'HIGH_SCHOOL' }
      );
    }

    let updatedCount = 0;
    let createdCount = 0;
    let mergedCount = 0;

    // Process each standard grade
    for (const stdGrade of standardGrades) {
      // 1. Check if "Grade X" already exists
      const existingGrade = await Grade.findOne({ 
        school: schoolId, 
        name: stdGrade.name 
      });

      // 2. Check if "Class X" exists (old variant)
      let oldGrade = null;
      if (stdGrade.oldName) {
        oldGrade = await Grade.findOne({
          school: schoolId,
          name: { $regex: new RegExp(`^${stdGrade.oldName}$`, 'i') }
        });
      }

      if (existingGrade && oldGrade) {
        // MERGE SCENARIO: Both exist. Move everything to existingGrade and delete oldGrade.
        // 1. Move Students
        await Student.updateMany(
          { school: schoolId, grade: oldGrade.name },
          { $set: { grade: existingGrade.name } }
        );
        
        // 2. Move GradeSubjects
        await GradeSubject.updateMany(
          { school: schoolId, grade: oldGrade.name },
          { $set: { grade: existingGrade.name } }
        );
        
        // 3. Delete old grade
        await Grade.findByIdAndDelete(oldGrade._id);
        mergedCount++;
      } 
      else if (!existingGrade && oldGrade) {
        // RENAME SCENARIO: Only old exists. Rename it.
        oldGrade.name = stdGrade.name;
        await oldGrade.save();
        updatedCount++;
      }
      else if (!existingGrade && !oldGrade) {
        // CREATE SCENARIO: Neither exists. Create new.
        await Grade.create({
          name: stdGrade.name,
          level: stdGrade.level,
          school: schoolId,
          capacity: 40,
          isActive: true
        });
        createdCount++;
      }
    }

    return NextResponse.json({ 
      message: `Sync complete: Created ${createdCount}, Renamed ${updatedCount}, Merged ${mergedCount} grades`, 
      created: createdCount,
      updated: updatedCount,
      merged: mergedCount
    }, { status: 201 });

  } catch (error) {
    console.error('Init Grades Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
