import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import GradingScale from "@/models/GradingScale";
import { NextResponse } from "next/server";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const data = await req.json();

    const scale = await GradingScale.findOne({ _id: id, school: session.user.id });

    if (!scale) {
      return NextResponse.json({ error: "Grading Scale not found" }, { status: 404 });
    }

    Object.assign(scale, data);
    await scale.save();

    return NextResponse.json(scale);
  } catch (error) {
    console.error("Error updating grading scale:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const scale = await GradingScale.findOneAndDelete({ _id: id, school: session.user.id });

    if (!scale) {
      return NextResponse.json({ error: "Grading Scale not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Grading Scale deleted successfully" });
  } catch (error) {
    console.error("Error deleting grading scale:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
