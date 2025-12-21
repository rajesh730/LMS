import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import AcademicYear from "@/models/AcademicYear";

export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const updates = await req.json();
    
    console.log(`Updating Academic Year ${id} with:`, updates);

    await connectDB();

    const updatedYear = await AcademicYear.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!updatedYear) {
      console.log("Year not found");
      return NextResponse.json({ message: "Year not found" }, { status: 404 });
    }

    console.log("Year updated successfully");
    return NextResponse.json({ message: "Year updated", year: updatedYear }, { status: 200 });
  } catch (error) {
    console.error("Error updating year:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const deletedYear = await AcademicYear.findByIdAndDelete(id);

    if (!deletedYear) {
      return NextResponse.json({ message: "Year not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Year deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting year:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
