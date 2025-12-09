import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import SchoolConfig from "@/models/SchoolConfig";
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

    let config = await SchoolConfig.findOne({ school: session.user.id });
    if (!config) {
      config = await SchoolConfig.create({ school: session.user.id });
    }

    return successResponse(200, "Config retrieved", config);
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
      subjects,
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
    if (teacherRoles) updateData.teacherRoles = teacherRoles;
    if (subjects) updateData.subjects = subjects;

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
