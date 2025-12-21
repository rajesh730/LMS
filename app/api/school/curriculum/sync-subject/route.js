import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Subject from '@/models/Subject';
import GradeSubject from '@/models/GradeSubject';
import User from '@/models/User';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, code, gradeId, educationLevel, isCustom, assignedTeacher } = await req.json();
    
    if (!name || !code) {
      return NextResponse.json({ message: 'Name and Code are required' }, { status: 400 });
    }

    if (!gradeId) {
      return NextResponse.json({ message: 'Grade must be specified' }, { status: 400 });
    }

    await connectDB();
    const schoolId = session.user.id;

    let subject;
    let isNewGlobal = false;
    let isNewCustom = false;

    if (isCustom) {
      // Handle Custom/Extra Subject (School Specific)
      // Check if this school already has this custom subject by CODE first (Code should be unique per school)
      // Or by Name? Usually Code is the strict identifier.
      // The user says: "if subject code and subject ,and grade match then do not entry"
      
      // First, try to find by Code within this school
      subject = await Subject.findOne({
        code: code,
        subjectType: 'SCHOOL_CUSTOM',
        school: schoolId
      });

      if (subject) {
        // Subject with this code exists.
        // Check if name matches (optional, but good for consistency)
        // If name is totally different, it might be a conflict.
        // For now, let's assume Code is the master key.
        
        // Update the grades list if this grade is not present
        if (gradeId && (!subject.grades || !subject.grades.includes(gradeId))) {
           // We need to update the subject to include this grade
           // This ensures the "grades" field in Subject collection is populated as requested
           await Subject.findByIdAndUpdate(subject._id, {
             $addToSet: { grades: gradeId }
           });
           // Refresh subject object
           subject.grades.push(gradeId);
        }
      } else {
        // No subject with this code. Check by Name just in case?
        // If we find by name but different code, that's a new subject (same name, diff code).
        // So we proceed to create.
        
        try {
          // Denormalize grade info into the subject for easier reporting
          // We strip "Class " or "Grade " if present to keep it clean? 
          // The user's screenshot showed "Class 1". Let's store exactly what is passed for now to match GradeSubject.
          const initialGrades = gradeId ? [gradeId] : [];
          
          subject = await Subject.create({
            name,
            code, 
            subjectType: 'SCHOOL_CUSTOM',
            school: schoolId,
            educationLevel: educationLevel ? [educationLevel] : [],
            grades: initialGrades, // Store grade info
            createdBy: session.user.id,
            status: 'ACTIVE'
          });
          isNewCustom = true;
        } catch (createError) {
          console.error('Custom Subject Creation Error:', createError);
          return NextResponse.json({ message: 'Failed to create custom subject', error: createError.message }, { status: 500 });
        }
      }
    } else {
      // Handle Global Subject (Standard Logic)
      // Case-insensitive search for GLOBAL subject
      // MUST include code to distinguish between subjects with same name (e.g. Math 001 vs Math 002)
      subject = await Subject.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        code: code,
        subjectType: 'GLOBAL'
      });

      if (subject) {
        // Existing Global Subject
        // Update grades if needed (User Request: Show grade in super admin for global subjects too)
        if (gradeId && (!subject.grades || !subject.grades.includes(gradeId))) {
           await Subject.findByIdAndUpdate(subject._id, {
             $addToSet: { grades: gradeId }
           });
           // Refresh subject object locally
           if (!subject.grades) subject.grades = [];
           subject.grades.push(gradeId);
        }
      } else {
        // Check if code is already taken by another global subject
        const existingCode = await Subject.findOne({ code, subjectType: 'GLOBAL' });
        if (existingCode) {
          return NextResponse.json({ 
            message: `Subject code '${code}' is already used by global subject '${existingCode.name}'` 
          }, { status: 409 });
        }

        // Create new Global Subject
        try {
          const initialGrades = gradeId ? [gradeId] : [];
          subject = await Subject.create({
            name,
            code, 
            subjectType: 'GLOBAL',
            educationLevel: educationLevel ? [educationLevel] : [],
            grades: initialGrades, // Store grade info
            createdBy: session.user.id,
            status: 'ACTIVE'
          });
          isNewGlobal = true;
        } catch (createError) {
          console.error('Subject Creation Error:', createError);
          return NextResponse.json({ message: 'Failed to create global subject', error: createError.message }, { status: 500 });
        }
      }
    }

    // 2. Link to School Context (Grade)

    try {
      if (gradeId) {
        // Check if already assigned to this grade (by ID)
        const existingLink = await GradeSubject.findOne({
          school: schoolId,
          grade: gradeId,
          subject: subject._id
        });

        // Also check if ANY subject with this CODE is already assigned to this grade
        // This prevents duplicate codes in the same grade (e.g. MTH001 global and MTH001 custom)
        if (!existingLink) {
            // Find all subjects assigned to this grade
            const gradeSubjects = await GradeSubject.find({
                school: schoolId,
                grade: gradeId,
                status: 'ACTIVE'
            }).populate('subject');

            const duplicateCode = gradeSubjects.find(gs => gs.subject && gs.subject.code === code);
            
            if (duplicateCode) {
                 return NextResponse.json({ 
                  message: `A subject with code '${code}' (${duplicateCode.subject.name}) is already assigned to this grade.`,
                  subject 
                }, { status: 409 });
            }
        }

        if (existingLink) {
          if (existingLink.status === 'INACTIVE') {
            // Reactivate
            existingLink.status = 'ACTIVE';
            if (assignedTeacher !== undefined) existingLink.assignedTeacher = assignedTeacher;
            await existingLink.save();
          } else {
            // If already active, we might just want to update the teacher if provided
            if (assignedTeacher !== undefined) {
                existingLink.assignedTeacher = assignedTeacher;
                await existingLink.save();
            } else {
                return NextResponse.json({ 
                  message: 'Subject already assigned to this grade',
                  subject 
                }, { status: 409 });
            }
          }
        } else {
          await GradeSubject.create({
            school: schoolId,
            grade: gradeId,
            subject: subject._id,
            isCompulsory: true, // Default
            fullMarks: 100, // Default
            passMarks: 40,   // Default
            createdBy: session.user.id, // Required by schema
            status: 'ACTIVE',
            assignedTeacher: assignedTeacher || null
          });
        }
      }
    } catch (linkError) {
      console.error('Link Subject Error:', linkError);
      return NextResponse.json({ message: 'Failed to link subject', error: linkError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Subject synced successfully',
      subject,
      isNewGlobal,
      isNewCustom
    }, { status: 201 });

  } catch (error) {
    console.error('Sync Subject Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
