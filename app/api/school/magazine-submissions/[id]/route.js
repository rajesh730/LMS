import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/authz";

export async function PATCH() {
  try {
    const { session, error: authError } = await requireApiSession();
    if (authError) return authError;

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
