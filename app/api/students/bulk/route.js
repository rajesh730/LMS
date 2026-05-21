import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Student from "@/models/Student";
import User from "@/models/User";
import connectDB from "@/lib/db";

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { studentIds } = await req.json();

    const collectEmails = async (filter) => {
      const students = await Student.find(filter).select("email");
      return students.map((s) => s.email).filter(Boolean);
    };

    if (
      studentIds &&
      Array.isArray(studentIds) &&
      studentIds.length > 0
    ) {
      // Delete selected students
      const emails = await collectEmails({
        _id: { $in: studentIds },
        school: session.user.id,
        isDeleted: { $ne: true },
      });
      await Student.updateMany(
        {
          _id: { $in: studentIds },
          school: session.user.id,
          isDeleted: { $ne: true },
        },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: session.user.id,
            status: "INACTIVE",
            statusChangedAt: new Date(),
            statusChangedBy: session.user.id,
            statusReason: "Bulk archived by school admin",
          },
        }
      );
      if (emails.length) {
        await User.updateMany(
          { email: { $in: emails }, role: "STUDENT" },
          { status: "UNSUBSCRIBED", $inc: { authVersion: 1 } }
        );
      }
      return NextResponse.json({
        message: "Selected students archived successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error deleting students:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
