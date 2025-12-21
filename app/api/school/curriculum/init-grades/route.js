import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Grade from '@/models/Grade';
import User from '@/models/User';
import Student from '@/models/Student';
import GradeSubject from '@/models/GradeSubject';
import SchoolConfig from '@/models/SchoolConfig';
import Subject from '@/models/Subject';

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

    // Define standard grades with "Grade" prefix instead of "Class" or numbers
    const standardGrades = [
      { name: 'Grade 1', aliases: ['Class 1', '1', 'Grade1', 'One', 'First', 'G1'], level: 'SCHOOL' },
      { name: 'Grade 2', aliases: ['Class 2', '2', 'Grade2', 'Two', 'Second', 'G2'], level: 'SCHOOL' },
      { name: 'Grade 3', aliases: ['Class 3', '3', 'Grade3', 'Three', 'Third', 'G3'], level: 'SCHOOL' },
      { name: 'Grade 4', aliases: ['Class 4', '4', 'Grade4', 'Four', 'Fourth', 'G4'], level: 'SCHOOL' },
      { name: 'Grade 5', aliases: ['Class 5', '5', 'Grade5', 'Five', 'Fifth', 'G5'], level: 'SCHOOL' },
      { name: 'Grade 6', aliases: ['Class 6', '6', 'Grade6', 'Six', 'Sixth', 'G6'], level: 'SCHOOL' },
      { name: 'Grade 7', aliases: ['Class 7', '7', 'Grade7', 'Seven', 'Seventh', 'G7'], level: 'SCHOOL' },
      { name: 'Grade 8', aliases: ['Class 8', '8', 'Grade8', 'Eight', 'Eighth', 'G8'], level: 'SCHOOL' },
      { name: 'Grade 9', aliases: ['Class 9', '9', 'Grade9', 'Nine', 'Ninth', 'G9'], level: 'SCHOOL' },
      { name: 'Grade 10', aliases: ['Class 10', '10', 'Grade10', 'Ten', 'Tenth', 'G10'], level: 'SCHOOL' },
    ];

    let updatedCount = 0;
    let createdCount = 0;
    let mergedCount = 0;
    let subjectUpdateCount = 0;

    // Process each standard grade
    for (const stdGrade of standardGrades) {
      // 1. Check if "Grade X" already exists (The Target)
      const existingGrade = await Grade.findOne({ 
        school: schoolId, 
        name: stdGrade.name 
      });

      // 2. Find ALL old variants that exist
      // We construct a regex that matches any of the aliases exactly (case insensitive)
      const aliasRegex = new RegExp(`^(${stdGrade.aliases.join('|')})$`, 'i');
      const oldGrades = await Grade.find({
        school: schoolId,
        name: { $regex: aliasRegex }
      });

      if (existingGrade) {
        // MERGE SCENARIO: Target exists. Merge any old variants into it.
        for (const oldGrade of oldGrades) {
            // Skip if it's the same document (shouldn't happen due to name check, but safety first)
            if (oldGrade._id.toString() === existingGrade._id.toString()) continue;

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
      } else {
        // RENAME/CREATE SCENARIO
        if (oldGrades.length > 0) {
            // Pick the first one to be the "survivor" and rename it
            const survivor = oldGrades[0];
            survivor.name = stdGrade.name;
            await survivor.save();
            updatedCount++;

            // If there are others, merge them into the survivor
            for (let i = 1; i < oldGrades.length; i++) {
                const victim = oldGrades[i];
                
                await Student.updateMany(
                    { school: schoolId, grade: victim.name },
                    { $set: { grade: stdGrade.name } }
                );
                
                await GradeSubject.updateMany(
                    { school: schoolId, grade: victim.name },
                    { $set: { grade: stdGrade.name } }
                );
                
                await Grade.findByIdAndDelete(victim._id);
                mergedCount++;
            }
        } else {
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

      // 4. Standardize Subjects (Global and Custom)
      // Find subjects that use any of the aliases in their 'grades' array
      // and replace them with the standard name
      const subjectsToUpdate = await Subject.find({
        grades: { $in: stdGrade.aliases }
      });

      for (const subject of subjectsToUpdate) {
        // Replace aliases with standard name
        const newGrades = subject.grades.map(g => {
            // Check if g matches any alias (case insensitive)
            const isAlias = stdGrade.aliases.some(alias => 
                alias.toLowerCase() === g.toLowerCase()
            );
            return isAlias ? stdGrade.name : g;
        });
        
        // Remove duplicates
        subject.grades = [...new Set(newGrades)];
        await subject.save();
        subjectUpdateCount++;
      }
    }

    // 3. Update SchoolConfig to ensure consistency
    // This ensures the "Grades" list in settings matches our standardized list
    await SchoolConfig.findOneAndUpdate(
        { school: schoolId },
        { 
            $set: { 
                grades: standardGrades.map(g => g.name) 
            } 
        },
        { upsert: true, new: true }
    );

    return NextResponse.json({ 
      message: `Sync complete: Created ${createdCount}, Renamed ${updatedCount}, Merged ${mergedCount} grades. Updated ${subjectUpdateCount} subjects.`, 
      created: createdCount,
      updated: updatedCount,
      merged: mergedCount,
      subjectsUpdated: subjectUpdateCount
    }, { status: 201 });

  } catch (error) {
    console.error('Init Grades Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
