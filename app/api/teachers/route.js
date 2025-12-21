import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Teacher from "@/models/Teacher";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { generateStrongPassword } from "@/lib/passwordGenerator";
import { validateActiveYear, missingYearResponse } from "@/lib/guards";

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
      const teachersToCreate = [];

      body.forEach((t, index) => {
        const teacherData = {
          name: t.name,
          email: t.email,
          phone: t.phone,
          subject: t.subject || "General", // Default if not provided
          roles: t.roles || ["SUBJECT_TEACHER"],
          school: session.user.id,
        };
        teachersToCreate.push(teacherData);
      });

      try {
        const createdTeachers = await Teacher.insertMany(teachersToCreate, {
          ordered: true,
        }); // Ordered true to map by index

        return NextResponse.json(
          {
            message: "Teachers imported successfully",
            count: createdTeachers.length,
          },
          { status: 201 }
        );
      } catch (bulkError) {
        console.error("Bulk Import Error", bulkError);
        return NextResponse.json(
          { message: "Error importing teachers. Emails must be unique." },
          { status: 500 }
        );
      }
    } else {
      // Single Creation
      let { name, email, phone, subject, roles, assignments, password, employmentType } = body;

      if (!name || !email) {
        return NextResponse.json(
          { message: "Name and Email are required" },
          { status: 400 }
        );
      }

      // Auto-generate password if not provided
      if (!password) {
        password = generateStrongPassword();
      }

      const newTeacher = await Teacher.create({
        name,
        email,
        phone,
        subject: subject || "General",
        roles: roles || ["SUBJECT_TEACHER"],
        employmentType: employmentType || "FULL_TIME",
        visiblePassword: password,
        school: session.user.id,
      });

      // Create User account for Teacher
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
          email,
          password: hashedPassword,
          role: "TEACHER",
          schoolName: session.user.name, // Link to school name if available
          status: "APPROVED",
        });
      }

      if (assignments && Array.isArray(assignments)) {
        // Assignments parameter is accepted but not processed
      }

      return NextResponse.json(
        {
          message: "Teacher created",
          teacher: newTeacher,
          credentials: { email, password },
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Create Teacher Error:", error);
    return NextResponse.json(
      { message: "Error creating teacher(s)" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { name, email, phone, subject, roles, assignments } =
      await req.json();

    await connectDB();

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      id,
      { name, email, phone, subject, roles },
      { new: true }
    );

    if (!updatedTeacher) {
      return NextResponse.json(
        { message: "Teacher not found" },
        { status: 404 }
      );
    }

    if (assignments && Array.isArray(assignments)) {
      // Assignments parameter is accepted but not processed
    }

    return NextResponse.json(
      { message: "Teacher updated", teacher: updatedTeacher },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update Teacher Error:", error);
    return NextResponse.json(
      { message: "Error updating teacher" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await connectDB();

    const teacherDoc = await Teacher.findById(id);
    if (!teacherDoc) {
      return NextResponse.json(
        { message: "Teacher not found" },
        { status: 404 }
      );
    }

    await Teacher.findByIdAndDelete(id);

    // Remove linked user account (if any)
    if (teacherDoc.email) {
      await User.deleteOne({ email: teacherDoc.email });
    }

    return NextResponse.json({ message: "Teacher deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete Teacher Error:", error);
    return NextResponse.json(
      { message: "Error deleting teacher" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 100; // Increased limit to ensure dropdowns get all teachers
    const skip = (page - 1) * limit;

    await connectDB();

    // Ensure we only fetch teachers for the current school
    const query = { school: session.user.id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const totalTeachers = await Teacher.countDocuments(query);
    const totalPages = Math.ceil(totalTeachers / limit);

    // Fetch teachers
    const teachers = await Teacher.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Map roles to teachers
    const teachersWithRoles = teachers.map((teacher) => {
      const t = teacher.toObject();

      return {
        ...t,
        detailedRoles: {
          classTeacherOf: [],
          subjectTeacherOf: [],
        },
      };
    });

    return NextResponse.json({ 
        teachers: teachersWithRoles,
        pagination: {
            page,
            totalPages,
            totalTeachers,
            limit
        }
    }, { status: 200 });
  } catch (error) {
    console.error("Fetch Teachers Error:", error);
    return NextResponse.json(
      { message: "Error fetching teachers" },
      { status: 500 }
    );
  }
}

// Reset teacher password
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await connectDB();

    const teacherDoc = await Teacher.findById(id);
    if (!teacherDoc) {
      return NextResponse.json(
        { message: "Teacher not found" },
        { status: 404 }
      );
    }

    const newPassword = generateStrongPassword();
    await Teacher.findByIdAndUpdate(
      id,
      { visiblePassword: newPassword },
      { new: true }
    );

    // Also update User password
    if (teacherDoc.email) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.findOneAndUpdate(
        { email: teacherDoc.email },
        { password: hashedPassword }
      );
    }

    return NextResponse.json(
      {
        message: "Password reset successfully",
        credentials: { email: teacherDoc.email, password: newPassword },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset Teacher Password Error:", error);
    return NextResponse.json(
      { message: "Error resetting password" },
      { status: 500 }
    );
  }
}
