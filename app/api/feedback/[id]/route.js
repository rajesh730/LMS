import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Feedback from "@/models/Feedback";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";

export async function PATCH(request, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const params = await props.params;
    const body = await request.json();
    const status = String(body.status || "").toUpperCase();
    if (!["NEW", "REVIEWED", "ARCHIVED"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const update = { status };
    if (status === "REVIEWED") {
      update.reviewedAt = new Date();
      update.reviewedBy = session.user.id;
    }

    const feedback = await Feedback.findByIdAndUpdate(params.id, update, {
      new: true,
    }).lean();

    if (!feedback) {
      return NextResponse.json({ message: "Feedback not found" }, { status: 404 });
    }

    publishWorkIndicatorsUpdate("feedback-updated", {
      feedbackId: String(feedback._id),
      status: feedback.status,
    });

    return NextResponse.json({ message: "Feedback updated" });
  } catch (error) {
    console.error("PATCH /api/feedback/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update feedback" },
      { status: 500 }
    );
  }
}
