import connectDB from "../../../../lib/db.js";
import Student from "../../../../models/Student.js";
import { hashPassword } from "../../../../lib/credentialGenerator.js";
import { successResponse, errorResponse } from "../../../../lib/apiResponse.js";

export async function POST(req) {
  try {
    await connectDB();

    const {
      // Login credentials
      username,
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
      school,
      email,
    } = await req.json();

    // Validate only required fields (parent details are now optional)
    const requiredFields = [
      { value: username, name: "username" },
      { value: password, name: "password" },
      { value: firstName, name: "firstName" },
      { value: lastName, name: "lastName" },
      { value: grade, name: "grade" },
      { value: rollNumber, name: "rollNumber" },
      { value: school, name: "school" },
    ];

    for (const field of requiredFields) {
      if (!field.value) {
        return errorResponse(400, `Missing required field: ${field.name}`);
      }
    }

    // Hash password - DISABLED as per request
    // const hashedPassword = await hashPassword(password);

    // Check if student already exists
    const existingStudent = await Student.findOne({
      username,
      school,
    });

    if (existingStudent) {
      return errorResponse(409, "Student with this username already exists");
    }

    // Check if roll number already exists in the same grade
    const existingRollNumber = await Student.findOne({
      school,
      grade,
      rollNumber,
    });

    if (existingRollNumber) {
      return errorResponse(409, `Roll number ${rollNumber} already exists in grade ${grade}`);
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await Student.findOne({ email });
      if (existingEmail) {
        return errorResponse(409, `Email ${email} is already registered`);
      }
    }

    // Create new student
    const newStudent = new Student({
      // Login credentials
      username,
      password: password, // Storing plain text password as requested

      // Student details
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email: parentEmail || undefined, // Using parent email as primary contact, undefined if empty
      dateOfBirth: new Date(dateOfBirth),
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
      school,

      // Status
      status: "ACTIVE",
    });

    await newStudent.save();

    return successResponse(
      200,
      "Student registered successfully",
      {
        id: newStudent._id,
        username: newStudent.username,
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
