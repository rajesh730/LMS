import connectDB from "../../../../lib/db.js";
import Student from "../../../../models/Student.js";
import AcademicYear from "../../../../models/AcademicYear.js";
import { hashPassword } from "../../../../lib/credentialGenerator.js";
import { successResponse, errorResponse } from "../../../../lib/apiResponse.js";
import {
  getSessionSchoolId,
  isActiveStudentQuery,
  requireApiSession,
} from "../../../../lib/authz.js";
import {
  generatePlatformStudentId,
  generateUniqueStudentUsername,
} from "../../../../lib/studentIdentity.js";
import { normalizeGradeValue } from "../../../../lib/schoolGrades.js";
import {
  ensureActiveAcademicYear,
  makeEnrollmentEntry,
} from "../../../../lib/studentEnrollment.js";

export async function POST(req) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) {
      return errorResponse(403, "Forbidden", "FORBIDDEN");
    }

    await connectDB();

    const {
      // Login credentials
      password,

      // Student details
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      grade,
      rollNumber,
      address,
      bloodGroup,

      // Parent details
      guardianRelationship,
      parentName,
      parentContactNumber,
      parentEmail,
      parentAlternativeContact,

      // School reference
      email,
    } = await req.json();

    // Validate only required fields (parent details are now optional)
    const requiredFields = [
      { value: password, name: "password" },
      { value: firstName, name: "firstName" },
      { value: lastName, name: "lastName" },
      { value: grade, name: "grade" },
      { value: rollNumber, name: "rollNumber" },
    ];

    for (const field of requiredFields) {
      if (!field.value) {
        return errorResponse(400, `Missing required field: ${field.name}`);
      }
    }

    const normalizedGrade = normalizeGradeValue(grade);
    const normalizedRollNumber = String(rollNumber).trim();

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Check if roll number is already used by an on-roster student in this grade.
    // Graduated/transferred/inactive students release their roll number.
    const existingRollNumber = await Student.findOne({
      school: schoolId,
      grade: normalizedGrade,
      rollNumber: normalizedRollNumber,
      isDeleted: { $ne: true },
      status: { $nin: ["ALUMNI", "GRADUATED", "INACTIVE"] },
    });

    if (existingRollNumber) {
      return errorResponse(
        409,
        `Roll number ${normalizedRollNumber} already exists in ${normalizedGrade}`
      );
    }

    // Student email is optional and distinct from guardian email.
    if (email) {
      const existingEmail = await Student.findOne(
        isActiveStudentQuery({ email })
      );
      if (existingEmail) {
        return errorResponse(409, `Email ${email} is already registered`);
      }
    }

    const generatedUsername = await generateUniqueStudentUsername(Student, {
      firstName,
      grade: normalizedGrade,
      rollNumber: normalizedRollNumber,
      school: schoolId,
    });

    // Stamp the first enrollment with the school's current academic year so the
    // student's journey/history starts from registration.
    const academicYear = await ensureActiveAcademicYear(schoolId);
    const schoolNameSnapshot =
      session.user.schoolName || session.user.name || "";

    // Create new student
    const newStudent = new Student({
      // Login credentials
      platformStudentId: await generatePlatformStudentId(Student),
      username: generatedUsername,
      password: hashedPassword,

      // Student details
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email: email || undefined,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      phone,
      grade: normalizedGrade,
      rollNumber: normalizedRollNumber,
      address,
      bloodGroup,

      // Parent details
      guardianRelationship,
      parentName,
      parentContactNumber,
      parentEmail,
      parentAlternativeContact,

      // School reference
      school: schoolId,

      // Status
      status: "ACTIVE",

      // Journey / history — first enrollment
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

    if (academicYear?._id) {
      await AcademicYear.updateOne(
        { _id: academicYear._id },
        { $inc: { "summary.admitted": 1 } }
      );
    }

    return successResponse(
      200,
      "Student registered successfully",
      {
        id: newStudent._id,
        platformStudentId: newStudent.platformStudentId,
        username: newStudent.username,
        password,
        name: newStudent.name,
        grade: newStudent.grade,
        parentName: newStudent.parentName,
        parentEmail: newStudent.parentEmail,
      }
    );
  } catch (error) {
    console.error("Student registration error:", error);
    return errorResponse(
      500,
      error.message || "Failed to register student"
    );
  }
}
