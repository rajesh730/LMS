import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Student from "@/models/Student";
import { normalizeCalendar } from "@/lib/nepaliDate";

// Update the signed-in user's preferred display calendar (AD or BS). Students
// live in the Student collection; admins in the User collection.
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const calendar = normalizeCalendar(body?.calendar);

    await connectDB();

    if (session.user.role === "STUDENT") {
      await Student.updateOne(
        { _id: session.user.id },
        { $set: { calendarPreference: calendar } }
      );
    } else if (["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      await User.updateOne(
        { _id: session.user.id },
        { $set: { calendarPreference: calendar } }
      );
    } else {
      return NextResponse.json(
        { message: "Calendar preference is not available for this account." },
        { status: 400 }
      );
    }

    return NextResponse.json({ calendar });
  } catch (error) {
    console.error("POST /api/me/calendar-preference error:", error);
    return NextResponse.json(
      { message: "Failed to update calendar preference" },
      { status: 500 }
    );
  }
}
