import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import SchoolConfig from "@/models/SchoolConfig";
import User from "@/models/User";
import Student from "@/models/Student";
import Teacher from "@/models/Teacher";
import { buildGradeLabels } from "@/lib/schoolGrades";
import { normalizeTeacherRoles } from "@/lib/teacherRoleDefaults";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
} from "@/lib/apiResponse";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return unauthorizedError();
    }

    await connectDB();

    const user = await User.findById(session.user.id).select("schoolConfig");
    const grades = buildGradeLabels(user?.schoolConfig);

    let config = await SchoolConfig.findOne({ school: session.user.id });
    if (!config) {
      config = await SchoolConfig.create({
        school: session.user.id,
        grades,
      });
    } else {
      let changed = false;

      if (grades.length > 0) {
        const hasDifferentGrades =
          JSON.stringify(config.grades || []) !== JSON.stringify(grades);
        if (hasDifferentGrades) {
          config.grades = grades;
          changed = true;
        }
      }

      const normalizedRoles = normalizeTeacherRoles(config.teacherRoles || []);
      if (
        JSON.stringify(normalizedRoles) !== JSON.stringify(config.teacherRoles || [])
      ) {
        config.teacherRoles = normalizedRoles;
        changed = true;
      }

      if (changed) {
        await config.save();
      }
    }

    const [totalStudents, totalTeachers] = await Promise.all([
      Student.countDocuments({ school: session.user.id, isDeleted: { $ne: true } }),
      Teacher.countDocuments({
        school: session.user.id,
        isDeleted: { $ne: true },
      }),
    ]);

    const payload = config.toObject();
    payload.totalStudents = totalStudents;
    payload.totalTeachers = totalTeachers;
    payload.teacherRoles = normalizeTeacherRoles(config.teacherRoles || []);

    return successResponse(200, "Config retrieved", payload);
  } catch (error) {
    console.error("Get Config Error:", error);
    return errorResponse(500, "Error fetching config");
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return unauthorizedError();
    }

    const body = await req.json();
    const {
      schoolName,
      schoolCode,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      principalName,
      teacherRoles,
    } = body;

    await connectDB();

    const updateData = {};
    if (schoolName !== undefined) updateData.schoolName = schoolName;
    if (schoolCode !== undefined) updateData.schoolCode = schoolCode;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (principalName !== undefined) updateData.principalName = principalName;
    if (teacherRoles) {
      updateData.teacherRoles = normalizeTeacherRoles(teacherRoles);
      updateData.teacherRolesCustomized = true;
    }

    const config = await SchoolConfig.findOneAndUpdate(
      { school: session.user.id },
      updateData,
      { new: true, upsert: true }
    );

    return successResponse(200, "Config updated successfully", config);
  } catch (error) {
    console.error("Update Config Error:", error);
    return errorResponse(500, "Error updating config");
  }
}
