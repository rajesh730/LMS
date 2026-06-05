import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      message:
        "Review actions were removed. Use School Wall hide/show and Publish Articles controls.",
    }, { status: 410 });
  } catch (error) {
    console.error("PATCH /api/school/magazine-submissions/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update writing" },
      { status: 500 }
    );
  }
}
