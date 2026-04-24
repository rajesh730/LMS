import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Communication from "@/models/Communication";
import Student from "@/models/Student";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const query = { school: session.user.id };
    if (type && type !== "ALL") query.type = type;
    if (status && status !== "ALL") query.status = status;

    const communications = await Communication.find(query)
      .populate("student", "name grade rollNumber")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: communications });
  } catch (error) {
    console.error("Error fetching school communications:", error);
    return NextResponse.json(
      { message: "Error fetching communications" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { id, status, adminReply } = body;

    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (adminReply) {
      updateData.adminReply = adminReply;
      updateData.repliedAt = new Date();
      updateData.repliedBy = session.user.id;
      // Auto-set status to RESOLVED or ACKNOWLEDGED if replying
      if (!status || status === "PENDING") {
          updateData.status = "RESOLVED";
      }
    }

    const updatedComm = await Communication.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedComm) {
      return NextResponse.json({ message: "Communication not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedComm });
  } catch (error) {
    console.error("Error updating communication:", error);
    return NextResponse.json(
      { message: "Error updating communication" },
      { status: 500 }
    );
  }
}
