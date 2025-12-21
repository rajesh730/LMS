import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Grade from '@/models/Grade';
import GradeSubject from '@/models/GradeSubject';
import Subject from '@/models/Subject';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const schoolId = session.user.id;
    const school = await User.findById(schoolId);

    if (!school) {
      return NextResponse.json({ message: 'School not found' }, { status: 404 });
    }

    const response = {
      educationLevels: school.educationLevels,
      structures: []
    };

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const statusFilter = includeArchived ? 'INACTIVE' : 'ACTIVE';

    // Fetch all GLOBAL subjects for suggestions
    const globalSubjects = await Subject.find({ 
      subjectType: 'GLOBAL', 
      status: 'ACTIVE' 
    }).lean();

    // 1. Fetch Grades (for School level only)
    if (school.educationLevels?.school) {
      let grades = await Grade.find({ school: schoolId, level: 'SCHOOL' }).lean();
      
      // Custom sort for grades based on numeric value (Grade 1, Grade 2, ... Grade 10)
      grades.sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
      
      // Fetch subjects for each grade
      for (let grade of grades) {
        const gradeSubjects = await GradeSubject.find({ 
          school: schoolId, 
          grade: grade.name,
          status: statusFilter
        })
        .populate('subject')
        .populate('assignedTeacher', 'name email phone')
        .lean();
        
        grade.subjects = gradeSubjects.map(gs => ({
          ...gs.subject,
          creditHours: gs.creditHours,
          fullMarks: gs.fullMarks,
          passMarks: gs.passMarks,
          linkStatus: gs.status, // Pass the link status to frontend
          assignedTeacher: gs.assignedTeacher
        }));

        // Suggest Global Subjects
        const targetLevel = 'School';
        const existingSubjectIds = new Set(grade.subjects.map(s => s._id.toString()));
        const existingSubjectCodes = new Set(grade.subjects.map(s => s.code));

        grade.suggestedSubjects = globalSubjects.filter(gs => {
            // 1. Check if not already added (by ID or Code)
            if (existingSubjectIds.has(gs._id.toString())) return false;
            if (gs.code && existingSubjectCodes.has(gs.code)) return false;

            // 2. Check for specific grade match (Prioritized)
            if (gs.grades && gs.grades.length > 0) {
                const gradeNum = grade.name.replace(/\D/g, ''); // e.g. "9"
                
                // If specific grades are defined, we ONLY check if the current grade is in that list.
                // We ignore educationLevel in this case to prevent configuration errors hiding the subject.
                const isGradeMatch = gs.grades.some(g => {
                    const storedNum = g.toString().replace(/\D/g, '');
                    // Match numeric part (if exists) OR full string match (case insensitive)
                    return (gradeNum && storedNum === gradeNum) || 
                           g.toString().toLowerCase() === grade.name.toLowerCase();
                });
                
                return isGradeMatch;
            }

            // 3. If no specific grades, fall back to Education Level
            const isLevelApplicable = !gs.educationLevel || gs.educationLevel.length === 0 || gs.educationLevel.includes(targetLevel);
            
            return isLevelApplicable;
        });
      }

      if (grades.length > 0) {
        response.structures.push({
          type: 'GRADE',
          title: 'Grades (Grade 1-10)',
          items: grades
        });
      }
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Fetch Structure Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
