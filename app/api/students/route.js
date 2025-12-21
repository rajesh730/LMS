import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { generateStudentPassword } from "@/lib/passwordGenerator";
import { validateActiveYear, missingYearResponse } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // GUARD: Ensure Active Academic Year
    try {
        await validateActiveYear(session.user.id);
    } catch (error) {
        if (error.message === "NO_ACTIVE_YEAR") {
            return missingYearResponse();
        }
        throw error;
    }

    const body = await req.json();

    if (Array.isArray(body)) {
      // Bulk Import
      const studentsToCreate = [];
      const createdCredentials = [];

      for (const s of body) {
        // Name Parsing
        const nameParts = s.name.trim().split(/\s+/);
        let firstName = nameParts[0];
        let middleName = "";
        let lastName = "";

        if (nameParts.length === 1) {
            lastName = ""; 
        } else if (nameParts.length === 2) {
            lastName = nameParts[1];
        } else {
            lastName = nameParts[nameParts.length - 1];
            middleName = nameParts.slice(1, -1).join(" ");
        }

        // Sanitize first name for credentials
        const cleanFirstName = firstName.replace(/[^a-zA-Z0-9]/g, "") || "Student";
        
        // Password: FirstName@123
        const password = `${cleanFirstName}@123`;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Username: firstname + rollnumber
        const username = `${cleanFirstName.toLowerCase()}${s.rollNumber}`;

        studentsToCreate.push({
          ...s,
          firstName,
          middleName,
          lastName,
          school: session.user.id,
          username,
          password: hashedPassword,
          visiblePassword: password,
        });
        createdCredentials.push({ username, password });
      }

      try {
        // ordered: false ensures that if one fails (e.g. duplicate email), others continue
        const createdStudents = await Student.insertMany(studentsToCreate, {
          ordered: false,
        });

        return NextResponse.json(
          {
            message: "Students imported",
            count: createdStudents.length,
            credentials: createdCredentials,
          },
          { status: 201 }
        );
      } catch (bulkError) {
        // If some succeeded, return success with count
        if (bulkError.insertedDocs) {
          return NextResponse.json(
            {
              message: `Imported ${bulkError.insertedDocs.length} students. Some failed due to duplicates.`,
              count: bulkError.insertedDocs.length,
            },
            { status: 201 }
          );
        }
        throw bulkError;
      }
    } else {
      // Single Creation
      const { name, email, grade, parentEmail, rollNumber, ...otherData } = body;

      if (!name || !email || !grade || !parentEmail || !rollNumber) {
        return NextResponse.json(
          { message: "All fields are required" },
          { status: 400 }
        );
      }

      // Name Parsing
      const nameParts = name.trim().split(/\s+/);
      let firstName = nameParts[0];
      let middleName = "";
      let lastName = "";

      if (nameParts.length === 1) {
          lastName = ""; 
      } else if (nameParts.length === 2) {
          lastName = nameParts[1];
      } else {
          lastName = nameParts[nameParts.length - 1];
          middleName = nameParts.slice(1, -1).join(" ");
      }

      // Sanitize first name for credentials
      const cleanFirstName = firstName.replace(/[^a-zA-Z0-9]/g, "") || "Student";
      
      // Password: FirstName@123
      const generatedPassword = `${cleanFirstName}@123`;
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
      
      // Username: firstname + rollnumber
      const username = `${cleanFirstName.toLowerCase()}${rollNumber}`;

      const newStudent = await Student.create({
        name,
        firstName,
        middleName,
        lastName,
        email,
        grade,
        parentEmail,
        rollNumber,
        username,
        password: hashedPassword,
        visiblePassword: generatedPassword,
        school: session.user.id,
        ...otherData
      });

      return NextResponse.json(
        {
          message: "Student created",
          student: newStudent,
          credentials: { username, password: generatedPassword },
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Create Student Error:", error);

    // Provide specific error messages for common issues
    let message = "Error creating student(s)";
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      message = `${
        field.charAt(0).toUpperCase() + field.slice(1)
      } already exists`;
    } else if (error.message.includes("validation failed")) {
      message = "Invalid data format. Please check all fields.";
    }

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    await connectDB();

    // Ensure we only fetch students for the current school
    const andConditions = [{ school: session.user.id }];
    
    // Filter by Status (default to ACTIVE if not specified, unless 'ALL' is requested)
    const status = searchParams.get("status");
    if (status && status !== "ALL") {
        // Case-insensitive status check
        andConditions.push({ status: { $regex: new RegExp(`^${status}$`, 'i') } });
    } else if (!status) {
        // Default behavior: Show only ACTIVE students (case-insensitive)
        andConditions.push({ status: { $regex: /^ACTIVE$/i } });
    }

    if (grade) {
      // Extract digits to handle "Grade 9", "9", "Class 9" variations robustly
      const gradeNumber = grade.replace(/\D/g, ""); 
      
      if (gradeNumber) {
          andConditions.push({
            $or: [
                { grade: grade }, // Exact match
                { grade: { $regex: new RegExp(`^${grade}$`, 'i') } }, // Case insensitive
                { grade: { $regex: new RegExp(`^Grade\\s*${gradeNumber}$`, 'i') } }, // "Grade 9", "Grade  9"
                { grade: { $regex: new RegExp(`^Class\\s*${gradeNumber}$`, 'i') } }, // "Class 9"
                { grade: gradeNumber } // "9"
            ]
          });
      } else {
          // Non-numeric grades (e.g. "Kindergarten")
          andConditions.push({
             $or: [
                { grade: grade },
                { grade: { $regex: new RegExp(`^${grade}$`, 'i') } }
             ]
          });
      }
    }

    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ]
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    console.log("DEBUG: Fetching students with query:", JSON.stringify(query));

    const totalStudents = await Student.countDocuments(query);
    console.log("DEBUG: Found total students:", totalStudents);

    const totalPages = Math.ceil(totalStudents / limit);

    const students = await Student.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(
      {
        students,
        pagination: {
          currentPage: page,
          totalPages,
          totalStudents,
          limit,
        },
        debug: {
            query: JSON.stringify(query),
            gradeParam: grade,
            statusParam: status
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch Students Error:", error);
    return NextResponse.json(
      { message: "Error fetching students", error: error.message },
      { status: 500 }
    );
  }
}

// Reset student password
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await connectDB();

    const studentDoc = await Student.findById(id);
    if (!studentDoc) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 }
      );
    }

    const firstName = studentDoc.name.split(" ")[0];
    const newPassword = generateStudentPassword(
      firstName,
      studentDoc.rollNumber,
      studentDoc.grade
    );

    await Student.findByIdAndUpdate(
      id,
      { visiblePassword: newPassword },
      { new: true }
    );

    // Also update User password
    if (studentDoc.email) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.findOneAndUpdate(
        { email: studentDoc.email },
        { password: hashedPassword }
      );
    }

    return NextResponse.json(
      {
        message: "Password reset successfully",
        credentials: { email: studentDoc.email, password: newPassword },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset Student Password Error:", error);
    return NextResponse.json(
      { message: "Error resetting password" },
      { status: 500 }
    );
  }
}
