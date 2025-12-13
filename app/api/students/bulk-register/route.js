import connectDB from "../../../../lib/db.js";
import Student from "../../../../models/Student.js";
import { successResponse, errorResponse } from "../../../../lib/apiResponse.js";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    await connectDB();
    const { students, schoolId } = await req.json();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return errorResponse(400, "No students provided");
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const studentData of students) {
      try {
        // Basic validation
        if (!studentData.firstName || !studentData.lastName || !studentData.grade || !studentData.rollNumber) {
          throw new Error("Missing required fields (First Name, Last Name, Grade, Roll Number)");
        }

        // Generate credentials
        const cleanFirstName = studentData.firstName.replace(/[^a-zA-Z0-9]/g, "") || "Student";
        const username = `${cleanFirstName.toLowerCase()}${studentData.rollNumber}`;
        
        // Password: FirstName@123
        const plainPassword = `${cleanFirstName}@123`;
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Check for duplicate roll number in the same grade
        const existingRollNumber = await Student.findOne({
          school: schoolId,
          grade: studentData.grade,
          rollNumber: studentData.rollNumber,
        });

        if (existingRollNumber) {
          throw new Error(`Roll number ${studentData.rollNumber} already exists in grade ${studentData.grade}`);
        }

        // Check for duplicate email (if provided)
        if (studentData.email) {
          const existingEmail = await Student.findOne({ email: studentData.email });
          if (existingEmail) {
            throw new Error(`Email ${studentData.email} is already registered`);
          }
        }

        const newStudent = new Student({
          ...studentData,
          name: `${studentData.firstName} ${studentData.lastName}`,
          username,
          password: hashedPassword,
          visiblePassword: plainPassword,
          school: schoolId,
          status: "ACTIVE",
          email: studentData.email || undefined,
          // Set defaults for optional fields if missing
          guardianRelationship: studentData.guardianRelationship || "FATHER",
          parentName: studentData.parentName || "To be added",
          parentContactNumber: studentData.parentContactNumber || "To be added",
          parentEmail: studentData.parentEmail || `${username}@school.local`,
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

    return successResponse(200, "Bulk registration completed", results);

  } catch (error) {
    console.error("Bulk registration error:", error);
    return errorResponse(500, "Internal server error");
  }
}
