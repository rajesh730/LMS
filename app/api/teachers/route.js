import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Teacher from "@/models/Teacher";
import Classroom from "@/models/Classroom";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { generateStrongPassword } from "@/lib/passwordGenerator";

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
      const classrooms = await Classroom.find({ school: session.user.id });
      const classroomMap = {}; // Name -> ID
      classrooms.forEach((c) => (classroomMap[c.name] = c._id));

      const teachersToCreate = [];
      const assignmentsToProcess = []; // [{ teacherIndex, assignments: [] }]

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

        // Parse Assignments from CSV
        // Format: "Class Teacher: 10-A; Subject Teacher: Math (10-A)"
        if (t.assignments) {
          const assignments = [];
          const parts = t.assignments.split(";");
          parts.forEach((part) => {
            const trimmed = part.trim();
            if (trimmed.toLowerCase().startsWith("class teacher:")) {
              const className = trimmed.split(":")[1].trim();
              if (classroomMap[className]) {
                assignments.push({
                  classId: classroomMap[className],
                  role: "CLASS_TEACHER",
                });
              }
            } else if (trimmed.toLowerCase().startsWith("subject teacher:")) {
              // "Subject Teacher: Math (10-A)"
              const details = trimmed.split(":")[1].trim(); // "Math (10-A)"
              const match = details.match(/(.*)\s\((.*)\)/);
              if (match) {
                const subject = match[1].trim();
                const className = match[2].trim();
                if (classroomMap[className]) {
                  assignments.push({
                    classId: classroomMap[className],
                    role: "SUBJECT_TEACHER",
                    subject,
                  });
                }
              }
            }
          });
          if (assignments.length > 0) {
            assignmentsToProcess.push({ teacherIndex: index, assignments });
          }
        }
      });

      try {
        const createdTeachers = await Teacher.insertMany(teachersToCreate, {
          ordered: true,
        }); // Ordered true to map by index

        // Process Assignments
        for (const item of assignmentsToProcess) {
          const teacher = createdTeachers[item.teacherIndex];
          if (teacher) {
            await syncAssignments(
              teacher._id,
              item.assignments,
              session.user.id
            );
          }
        }

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
      let { name, email, phone, subject, roles, assignments, password } = body;

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
        await syncAssignments(newTeacher._id, assignments, session.user.id);
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
      await syncAssignments(updatedTeacher._id, assignments, session.user.id);
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

    // Remove from all classrooms
    await Classroom.updateMany(
      { school: session.user.id },
      {
        $pull: { subjectTeachers: { teacher: id } },
      }
    );
    await Classroom.updateMany(
      { school: session.user.id, classTeacher: id },
      { $unset: { classTeacher: "" } }
    );

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

async function syncAssignments(teacherId, assignments, schoolId) {
  // 1. Clear existing assignments for this teacher in this school
  // Remove as Class Teacher
  await Classroom.updateMany(
    { school: schoolId, classTeacher: teacherId },
    { $unset: { classTeacher: "" } }
  );
  // Remove as Subject Teacher
  await Classroom.updateMany(
    { school: schoolId },
    { $pull: { subjectTeachers: { teacher: teacherId } } }
  );

  // 2. Add new assignments
  for (const assignment of assignments) {
    if (assignment.role === "CLASS_TEACHER") {
      await Classroom.findByIdAndUpdate(assignment.classId, {
        classTeacher: teacherId,
      });
    } else if (assignment.role === "SUBJECT_TEACHER") {
      await Classroom.findByIdAndUpdate(assignment.classId, {
        $push: {
          subjectTeachers: { teacher: teacherId, subject: assignment.subject },
        },
      });
    }
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Fetch teachers
    const teachers = await Teacher.find({ school: session.user.id }).sort({
      createdAt: -1,
    });

    // Fetch classrooms to aggregate roles
    const classrooms = await Classroom.find({ school: session.user.id })
      .populate("classTeacher", "_id")
      .populate("subjectTeachers.teacher", "_id");

    // Map roles to teachers
    const teachersWithRoles = teachers.map((teacher) => {
      const t = teacher.toObject();

      // Find class teacher roles
      const classTeacherOf = classrooms
        .filter(
          (c) =>
            c.classTeacher && c.classTeacher._id.toString() === t._id.toString()
        )
        .map((c) => c.name);

      // Find subject teacher roles
      const subjectTeacherOf = [];
      classrooms.forEach((c) => {
        c.subjectTeachers.forEach((st) => {
          if (st.teacher && st.teacher._id.toString() === t._id.toString()) {
            subjectTeacherOf.push(`${st.subject} (${c.name})`);
          }
        });
      });

      return {
        ...t,
        detailedRoles: {
          classTeacherOf,
          subjectTeacherOf,
        },
      };
    });

    return NextResponse.json({ teachers: teachersWithRoles }, { status: 200 });
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
