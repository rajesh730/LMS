import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import User from "@/models/User";
import Classroom from "@/models/Classroom";
import bcrypt from "bcryptjs";
import { generateStudentPassword } from "@/lib/passwordGenerator";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    await connectDB();

    if (Array.isArray(body)) {
      // Bulk Import
      // 1. Extract unique classroom names
      const classroomNames = [
        ...new Set(body.map((s) => s.classroom).filter(Boolean)),
      ];

      // 2. Find existing classrooms for this school
      const existingClassrooms = await Classroom.find({
        school: session.user.id,
        name: { $in: classroomNames },
      });

      // 3. Create a map of Name -> ID
      const classroomMap = {};
      existingClassrooms.forEach((c) => {
        classroomMap[c.name] = c._id;
      });

      // 4. Prepare students with correct IDs
      const studentsToCreate = body.map((s) => {
        let classroomId = undefined;
        // If it's already a valid ObjectId (from frontend resolution), use it
        if (s.classroom && s.classroom.match(/^[0-9a-fA-F]{24}$/)) {
          classroomId = s.classroom;
        }
        // Otherwise try to map from name
        else if (s.classroom && classroomMap[s.classroom]) {
          classroomId = classroomMap[s.classroom];
        }

        return {
          ...s,
          school: session.user.id,
          classroom: classroomId,
        };
      });

      try {
        // ordered: false ensures that if one fails (e.g. duplicate email), others continue
        const createdStudents = await Student.insertMany(studentsToCreate, {
          ordered: false,
        });

        // Create User accounts for these students with generated passwords
        const failedUsers = [];
        const createdCredentials = [];

        for (const student of createdStudents) {
          try {
            const firstName = student.name.split(" ")[0];
            const password = generateStudentPassword(
              firstName,
              student.rollNumber,
              student.grade
            );
            const hashedPassword = await bcrypt.hash(password, 10);

            const existingUser = await User.findOne({ email: student.email });
            if (!existingUser) {
              await User.create({
                email: student.email,
                password: hashedPassword,
                role: "STUDENT",
                schoolName: session.user.name,
                name: student.name,
                classroomId: student.classroom,
                status: "APPROVED",
              });
            }
            createdCredentials.push({ email: student.email, password });
          } catch (err) {
            console.error("Failed to create user for student:", student.email);
            failedUsers.push(student.email);
          }
        }

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
          // Create User account for successful ones
          const hashedPassword = await bcrypt.hash("student123", 10);
          for (const student of bulkError.insertedDocs) {
            try {
              const existingUser = await User.findOne({ email: student.email });
              if (!existingUser) {
                await User.create({
                  email: student.email,
                  password: hashedPassword,
                  role: "STUDENT",
                  schoolName: session.user.name,
                  name: student.name,
                  classroomId: student.classroom,
                  status: "APPROVED",
                });
              }
            } catch (err) {
              console.error("Failed user creation", err);
            }
          }

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
      const { name, email, grade, parentEmail, classroom, rollNumber } = body;

      if (!name || !email || !grade || !parentEmail || !rollNumber) {
        return NextResponse.json(
          { message: "All fields are required" },
          { status: 400 }
        );
      }

      // Generate Password using utility
      const firstName = name.split(" ")[0];
      const generatedPassword = generateStudentPassword(
        firstName,
        rollNumber,
        grade
      );

      const newStudent = await Student.create({
        name,
        email,
        grade,
        parentEmail,
        rollNumber,
        visiblePassword: generatedPassword,
        classroom: classroom || null,
        school: session.user.id,
      });

      // Create User Account
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);
        await User.create({
          email,
          password: hashedPassword,
          role: "STUDENT",
          schoolName: session.user.name,
          name: name,
          classroomId: classroom || null,
          status: "APPROVED",
        });
      }

      return NextResponse.json(
        {
          message: "Student created",
          student: newStudent,
          credentials: { email, password: generatedPassword },
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
    const classroomId = searchParams.get("classroom");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    await connectDB();

    const query = { school: session.user.id };

    if (classroomId) {
      query.classroom = classroomId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const totalStudents = await Student.countDocuments(query);
    const totalPages = Math.ceil(totalStudents / limit);

    const students = await Student.find(query)
      .populate("classroom", "name")
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
