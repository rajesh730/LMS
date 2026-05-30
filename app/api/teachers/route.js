import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Teacher from "@/models/Teacher";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { generateStrongPassword } from "@/lib/passwordGenerator";
import { buildPagination, escapeRegex, parsePagination } from "@/lib/pagination";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();

    if (Array.isArray(body)) {
      // Bulk Import
      const teachersToCreate = [];
      const usersToCreate = [];
      const generatedCredentials = [];
      const emails = body
        .map((teacher) => teacher.email)
        .filter(Boolean)
        .map((email) => email.toLowerCase());

      const [existingTeachers, existingUsers] = await Promise.all([
        Teacher.find({
          email: { $in: emails },
          isDeleted: { $ne: true },
        }).select("email").lean(),
        User.find({ email: { $in: emails } }).select("email").lean(),
      ]);

      const existingEmails = new Set([
        ...existingTeachers.map((teacher) => teacher.email.toLowerCase()),
        ...existingUsers.map((user) => user.email.toLowerCase()),
      ]);

      if (existingEmails.size > 0) {
        return NextResponse.json(
          {
            message: `Some mentor emails already exist: ${Array.from(existingEmails).join(", ")}`,
          },
          { status: 409 },
        );
      }

      for (const t of body) {
        const plainPassword = t.password || generateStrongPassword();
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        const teacherData = {
          name: t.name,
          email: t.email,
          phone: t.phone,
          subject: t.subject || "General", // Default if not provided
          roles: t.roles || ["MENTOR"],
          password: hashedPassword,
          school: session.user.id,
        };
        teachersToCreate.push(teacherData);
        usersToCreate.push({
          email: t.email,
          password: hashedPassword,
          role: "TEACHER",
          schoolName: session.user.name,
          status: "APPROVED",
        });
        generatedCredentials.push({
          name: t.name,
          email: t.email,
          password: plainPassword,
        });
      }

      try {
        const createdTeachers = await Teacher.insertMany(teachersToCreate, {
          ordered: true,
        });
        await User.insertMany(usersToCreate, { ordered: true });

        return NextResponse.json(
          {
            message: "Mentors imported successfully",
            count: createdTeachers.length,
            credentials: generatedCredentials,
          },
          { status: 201 },
        );
      } catch (bulkError) {
        console.error("Bulk Import Error", bulkError);
        return NextResponse.json(
          { message: "Error importing teachers. Emails must be unique." },
          { status: 500 },
        );
      }
    } else {
      // Single Creation
      let {
        name,
        email,
        phone,
        subject,
        roles,
        assignments,
        password,
        employmentType,
      } = body;

      if (!name || !email) {
        return NextResponse.json(
          { message: "Name and Email are required" },
          { status: 400 },
        );
      }

      // Auto-generate password if not provided
      if (!password) {
        password = generateStrongPassword();
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [existingTeacher, existingUser] = await Promise.all([
        Teacher.findOne({ email, isDeleted: { $ne: true } }),
        User.findOne({ email }),
      ]);

      if (existingTeacher || existingUser) {
        return NextResponse.json(
          { message: "A mentor with this email already exists" },
          { status: 409 },
        );
      }

      const newTeacher = await Teacher.create({
        name,
        email,
        phone,
        subject: subject || "General",
        roles: roles || ["MENTOR"],
        employmentType: employmentType || "FULL_TIME",
        password: hashedPassword,
        school: session.user.id,
      });

      await User.create({
        email,
        password: hashedPassword,
        role: "TEACHER",
        schoolName: session.user.name,
        status: "APPROVED",
      });

      if (assignments && Array.isArray(assignments)) {
        // Assignments parameter is accepted but not processed
      }

      return NextResponse.json(
        {
          message: "Teacher created",
          teacher: newTeacher,
          credentials: { email, password },
        },
        { status: 201 },
      );
    }
  } catch (error) {
    console.error("Create Teacher Error:", error);
    return NextResponse.json(
      { message: "Error creating teacher(s)" },
      { status: 500 },
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

    const updatedTeacher = await Teacher.findOneAndUpdate(
      { _id: id, school: session.user.id, isDeleted: { $ne: true } },
      { name, email, phone, subject, roles },
      { new: true },
    );

    if (!updatedTeacher) {
      return NextResponse.json(
        { message: "Teacher not found" },
        { status: 404 },
      );
    }

    if (assignments && Array.isArray(assignments)) {
      // Assignments parameter is accepted but not processed
    }

    return NextResponse.json(
      { message: "Teacher updated", teacher: updatedTeacher },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update Teacher Error:", error);
    return NextResponse.json(
      { message: "Error updating teacher" },
      { status: 500 },
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

    const teacherDoc = await Teacher.findOne({
      _id: id,
      school: session.user.id,
      isDeleted: { $ne: true },
    });
    if (!teacherDoc) {
      return NextResponse.json(
        { message: "Teacher not found" },
        { status: 404 },
      );
    }

    await Teacher.findOneAndUpdate(
      { _id: id, school: session.user.id, isDeleted: { $ne: true } },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: session.user.id,
        status: "INACTIVE",
      },
    );

    // Revoke linked legacy user account (if any)
    if (teacherDoc.email) {
      await User.findOneAndUpdate(
        { email: teacherDoc.email, role: "TEACHER" },
        { status: "UNSUBSCRIBED", $inc: { authVersion: 1 } },
      );
    }

    return NextResponse.json({ message: "Mentor archived" }, { status: 200 });
  } catch (error) {
    console.error("Delete Teacher Error:", error);
    return NextResponse.json(
      { message: "Error deleting teacher" },
      { status: 500 },
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
    const status = searchParams.get("status");
    const { page, limit, skip } = parsePagination(searchParams, {
      limit: 20,
      maxLimit: 200,
    });

    await connectDB();

    // Ensure we only fetch teachers for the current school
    const query = { school: session.user.id, isDeleted: { $ne: true } };

    if (status && status !== "ALL") {
      query.status = { $regex: new RegExp(`^${escapeRegex(status)}$`, "i") };
    }

    if (search) {
      const safeSearch = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { subject: { $regex: safeSearch, $options: "i" } },
        { phone: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [totalTeachers, teachers] = await Promise.all([
      Teacher.countDocuments(query),
      Teacher.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);
    const pagination = buildPagination({ page, limit, total: totalTeachers });

    // Map roles to teachers
    const teachersWithRoles = teachers.map((teacher) => ({
        ...teacher,
        detailedRoles: {
          activityLeadOf: [],
          mentorOf: [],
        },
      }));

    return NextResponse.json(
      {
        teachers: teachersWithRoles,
        pagination: {
          ...pagination,
          totalTeachers,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Fetch Teachers Error:", error);
    return NextResponse.json(
      { message: "Error fetching teachers" },
      { status: 500 },
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

    const teacherDoc = await Teacher.findOne({
      _id: id,
      school: session.user.id,
      isDeleted: { $ne: true },
    });
    if (!teacherDoc) {
      return NextResponse.json(
        { message: "Teacher not found" },
        { status: 404 },
      );
    }

    const newPassword = generateStrongPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Teacher.findOneAndUpdate(
      { _id: id, school: session.user.id, isDeleted: { $ne: true } },
      {
        password: hashedPassword,
      },
      { new: true },
    );

    // Also update User password
    if (teacherDoc.email) {
      // const hashedPassword = await bcrypt.hash(newPassword, 10); // Already hashed
      await User.findOneAndUpdate(
        { email: teacherDoc.email },
        { password: hashedPassword },
      );
    }

    return NextResponse.json(
      {
        message: "Password reset successfully",
        credentials: { email: teacherDoc.email, password: newPassword },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Reset Teacher Password Error:", error);
    return NextResponse.json(
      { message: "Error resetting password" },
      { status: 500 },
    );
  }
}
