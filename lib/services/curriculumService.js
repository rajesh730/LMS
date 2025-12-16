import Subject from '@/models/Subject';
import Faculty from '@/models/Faculty';
import GradeSubject from '@/models/GradeSubject';
import connectDB from '@/lib/db';

/**
 * Service to handle smart curriculum import and synchronization
 */
export class CurriculumService {
  
  /**
   * Import curriculum data for a school
   * @param {string} schoolId - The ID of the school
   * @param {Array} curriculumData - Array of faculty and subject data
   * @returns {Object} Summary of operations
   */
  static async importCurriculum(schoolId, curriculumData) {
    await connectDB();
    
    const results = {
      facultiesCreated: 0,
      facultiesUpdated: 0,
      subjectsLinked: 0,
      subjectsCreated: 0,
      errors: []
    };

    try {
      for (const facultyData of curriculumData) {
        // 1. Manage Faculty
        let faculty = await Faculty.findOne({
          school: schoolId,
          normalizedName: facultyData.name.toLowerCase().trim()
        });

        if (!faculty) {
          faculty = await Faculty.create({
            name: facultyData.name,
            school: schoolId,
            educationLevels: facultyData.educationLevels || ['HigherSecondary', 'Bachelor'], // Default or provided
            status: 'ACTIVE',
            createdBy: schoolId // Assuming school admin is importing
          });
          results.facultiesCreated++;
        } else {
          results.facultiesUpdated++;
        }

        // 2. Process Subjects
        if (facultyData.subjects && Array.isArray(facultyData.subjects)) {
          for (const subjectData of facultyData.subjects) {
            try {
              const subjectId = await this.processSubject(schoolId, faculty, subjectData);
              if (subjectId) {
                // Optional: Auto-create GradeSubject if grade is provided in import
                // This part depends on if the import includes grade info
                results.subjectsLinked++;
              }
            } catch (err) {
              results.errors.push(`Error processing subject ${subjectData.name}: ${err.message}`);
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Curriculum import failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Find or create a subject and link it to the faculty
   */
  static async processSubject(schoolId, faculty, subjectData) {
    // A. Check for GLOBAL Subject first (Exact Code Match)
    let subject = await Subject.findOne({
      code: subjectData.code,
      subjectType: 'GLOBAL',
      status: 'ACTIVE'
    });

    // B. If not global, check for existing SCHOOL_CUSTOM subject
    if (!subject) {
      subject = await Subject.findOne({
        code: subjectData.code,
        school: schoolId,
        subjectType: 'SCHOOL_CUSTOM'
      });
    }

    // C. If neither, create new SCHOOL_CUSTOM subject
    if (!subject) {
      subject = await Subject.create({
        name: subjectData.name,
        code: subjectData.code,
        description: subjectData.description || `Subject for ${faculty.name}`,
        subjectType: 'SCHOOL_CUSTOM',
        school: schoolId,
        createdBy: schoolId,
        applicableFaculties: [faculty._id] // Link to faculty immediately
      });
      // results.subjectsCreated++; // (Need to pass results object or return status)
    } else {
      // D. If subject exists, ensure this faculty is in applicableFaculties
      // Use $addToSet to avoid duplicates
      await Subject.findByIdAndUpdate(subject._id, {
        $addToSet: { applicableFaculties: faculty._id }
      });
    }

    return subject._id;
  }
}
