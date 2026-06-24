import connectDB from "../../../../lib/db.js";
import Student from "../../../../models/Student.js";
import AcademicYear from "../../../../models/AcademicYear.js";
import { successResponse, errorResponse } from "../../../../lib/apiResponse.js";
import {
  generatePlatformStudentId,
  generateUniqueStudentUsername,
} from "../../../../lib/studentIdentity.js";
import { normalizeGradeValue } from "../../../../lib/schoolGrades.js";
import {
  getSessionSchoolId,
  isActiveStudentQuery,
  requireApiSession,
} from "../../../../lib/authz.js";
import {
  ensureActiveAcademicYear,
  makeEnrollmentEntry,
} from "../../../../lib/studentEnrollment.js";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) {
      return errorResponse(403, "Forbidden", "FORBIDDEN");
    }

    await connectDB();
    const { students } = await req.json();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return errorResponse(400, "No students provided");
    }

    const results = {
      success: [],
      failed: [],
    };
    const reservedUsernames = new Set();
    const academicYear = await ensureActiveAcademicYear(schoolId);
    const schoolNameSnapshot =
      session.user.schoolName || session.user.name || "";

    for (const studentData of students) {
      try {
        // Basic validation
        if (!studentData.firstName || !studentData.lastName || !studentData.grade || !studentData.rollNumber) {
          throw new Error("Missing required fields (First Name, Last Name, Grade, Roll Number)");
        }

        // Generate credentials
        const cleanFirstName = studentData.firstName.replace(/[^a-zA-Z0-9]/g, "") || "Student";
        const normalizedGrade = normalizeGradeValue(studentData.grade);
        const normalizedRollNumber = String(studentData.rollNumber).trim();
        const username = await generateUniqueStudentUsername(Student, {
          firstName: studentData.firstName,
          grade: normalizedGrade,
          rollNumber: normalizedRollNumber,
          school: schoolId,
          reserved: reservedUsernames,
        });
        
        // Password: FirstName@123
        const plainPassword = `${cleanFirstName}@123`;
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Roll number is free if no on-roster student holds it (graduated/
        // transferred/inactive students release their roll number).
        const existingRollNumber = await Student.findOne({
          school: schoolId,
          grade: normalizedGrade,
          rollNumber: normalizedRollNumber,
          isDeleted: { $ne: true },
          status: { $nin: ["ALUMNI", "GRADUATED", "INACTIVE"] },
        });

        if (existingRollNumber) {
          throw new Error(
            `Roll number ${normalizedRollNumber} already exists in ${normalizedGrade}`
          );
        }

        // Check for duplicate email (if provided)
        if (studentData.email) {
          const existingEmail = await Student.findOne(
            isActiveStudentQuery({ email: studentData.email })
          );
          if (existingEmail) {
            throw new Error(`Email ${studentData.email} is already registered`);
          }
        }

        const newStudent = new Student({
          ...studentData,
          platformStudentId: await generatePlatformStudentId(Student),
          name: `${studentData.firstName} ${studentData.lastName}`,
          username,
          password: hashedPassword,
          visiblePassword: plainPassword,
          school: schoolId,
          grade: normalizedGrade,
          rollNumber: normalizedRollNumber,
          status: "ACTIVE",
          email: studentData.email || undefined,
          // Set defaults for optional fields if missing
          guardianRelationship: studentData.guardianRelationship || "FATHER",
          parentName: studentData.parentName || "To be added",
          parentContactNumber: studentData.parentContactNumber || "To be added",
          parentEmail: studentData.parentEmail || undefined,
          enrollments: [
            makeEnrollmentEntry({
              school: schoolId,
              schoolName: schoolNameSnapshot,
              grade: normalizedGrade,
              rollNumber: normalizedRollNumber,
              academicYear,
            }),
          ],
        });

        await newStudent.save();

        results.success.push({
          name: newStudent.name,
          username: newStudent.username,
          password: plainPassword, 
        });

      } catch (error) {
        results.failed.push({
          student: studentData,
          reason: error.message,
        });
      }
    }

    if (academicYear?._id && results.success.length > 0) {
      await AcademicYear.updateOne(
        { _id: academicYear._id },
        { $inc: { "summary.admitted": results.success.length } }
      );
    }

    return successResponse(200, "Bulk registration completed", results);

  } catch (error) {
    console.error("Bulk registration error:", error);
    return errorResponse(500, "Internal server error");
  }
}
