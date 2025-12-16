import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Grade from '@/models/Grade';
import Faculty from '@/models/Faculty';
import GradeSubject from '@/models/GradeSubject';
import FacultySubject from '@/models/FacultySubject';
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

    // 1. Fetch Grades (for School and High School levels)
    if (school.educationLevels?.school || school.educationLevels?.highSchool) {
      let grades = await Grade.find({ school: schoolId }).lean();
      
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
        }).populate('subject').lean();
        
        grade.subjects = gradeSubjects.map(gs => ({
          ...gs.subject,
          creditHours: gs.creditHours,
          fullMarks: gs.fullMarks,
          passMarks: gs.passMarks,
          linkStatus: gs.status // Pass the link status to frontend
        }));

        // Suggest Global Subjects
        const targetLevel = grade.level === 'HIGH_SCHOOL' ? 'HigherSecondary' : (grade.level === 'BACHELOR' ? 'Bachelor' : 'School');
        const existingSubjectIds = new Set(grade.subjects.map(s => s._id.toString()));

        grade.suggestedSubjects = globalSubjects.filter(gs => {
            // 1. Check if not already added
            if (existingSubjectIds.has(gs._id.toString())) return false;

            // 2. Check for specific grade match (Prioritized)
            if (gs.grades && gs.grades.length > 0) {
                const gradeNum = grade.name.replace(/\D/g, ''); // e.g. "9"
                
                // If specific grades are defined, we ONLY check if the current grade is in that list.
                // We ignore educationLevel in this case to prevent configuration errors hiding the subject.
                const isGradeMatch = gs.grades.some(g => {
                    const storedNum = g.toString().replace(/\D/g, '');
                    return storedNum === gradeNum;
                });
                
                // Debug logging for specific grade check
                // if (gs.name === 'starlink') {
                //    console.log(`Checking ${gs.name} for ${grade.name} (${gradeNum}): Grades=${gs.grades}, Match=${isGradeMatch}`);
                // }

                return isGradeMatch;
            }

            // 3. If no specific grades, fall back to Education Level
            const isLevelApplicable = !gs.educationLevel || gs.educationLevel.length === 0 || gs.educationLevel.includes(targetLevel);
            
            // Debug logging for level fallback
            // if (gs.name === 'starlink') {
            //    console.log(`Checking ${gs.name} for ${grade.name}: Level Fallback. SubjectLevel=${gs.educationLevel}, Target=${targetLevel}, Match=${isLevelApplicable}`);
            // }

            return isLevelApplicable;
        });
      }

      if (grades.length > 0) {
        response.structures.push({
          type: 'GRADE',
          title: 'Grades (Grade 1-12)',
          items: grades
        });
      }
    }

    // 2. Fetch Faculties (for High School / Bachelor)
    if (school.educationLevels?.highSchool || school.educationLevels?.bachelor) {
      const faculties = await Faculty.find({ school: schoolId }).sort({ name: 1 }).lean();

      // Fetch subjects for each faculty
      for (let faculty of faculties) {
        const facultySubjects = await FacultySubject.find({
          school: schoolId,
          faculty: faculty.name, // FacultySubject uses faculty name string
          status: statusFilter
        }).populate('subject').sort({ year: 1, semester: 1 }).lean();

        // Group by Year/Semester or just return flat list with metadata
        faculty.subjects = facultySubjects.map(fs => ({
          ...fs.subject,
          year: fs.year,
          semester: fs.semester,
          creditHours: fs.creditHours,
          linkStatus: fs.status // Pass the link status to frontend
        }));

        // Suggest Global Subjects
        const existingSubjectIds = new Set(faculty.subjects.map(s => s._id.toString()));
        const facultyLevels = faculty.educationLevels || [];

        faculty.suggestedSubjects = globalSubjects.filter(gs => {
            const subjectLevels = gs.educationLevel || [];
            // Match if subject has no specific level OR overlaps with faculty levels
            const isLevelApplicable = subjectLevels.length === 0 || subjectLevels.some(sl => facultyLevels.includes(sl));
            
            // Check if subject is specifically tagged for this faculty (if tags exist)
            // We match by Faculty Name (normalized) or ID if available. 
            // Global Subjects store `applicableFaculties` as IDs.
            // But here `faculty` is a School Faculty (which might map to a Global Faculty).
            // This is tricky because School Faculty != Global Faculty directly.
            // However, if the Global Subject has `applicableFaculties` (IDs), we should check if this school faculty is "linked" to it?
            // Or simpler: If Global Subject has NO specific faculties, it applies to all.
            // If it HAS specific faculties, we only show it if the current faculty matches?
            // Since we don't have a direct link here easily, we'll rely on Level for now, 
            // BUT we can check if the Global Subject is restricted to specific faculties.
            // If gs.applicableFaculties is populated, we might want to be careful.
            // For now, let's assume Level is the primary filter for Faculties.
            
            const notAdded = !existingSubjectIds.has(gs._id.toString());
            return isLevelApplicable && notAdded;
        });
      }

      response.structures.push({
        type: 'FACULTY',
        title: 'Faculties (High School / University)',
        items: faculties
      });
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Fetch Structure Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
