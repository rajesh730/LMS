import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import { buildCertificateCode, buildCertificatePath } from "@/lib/results";

function canManageResults(session, event) {
  if (!session?.user || !event) return false;
  if (session.user.role === "SUPER_ADMIN") {
    return event.eventScope === "PLATFORM";
  }
  if (session.user.role === "SCHOOL_ADMIN") {
    return String(event.school) === String(session.user.id);
  }
  return false;
}

export async function PATCH(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await props.params;
    await connectDB();

    const [event, achievement] = await Promise.all([
      Event.findById(params.id),
      Achievement.findOne({ _id: params.achievementId, event: params.id }),
    ]);

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }
    if (!canManageResults(session, event)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }
    if (!achievement) {
      return NextResponse.json(
        { success: false, message: "Certificate record not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const action = String(body.action || "save").toLowerCase();

    if (body.certificateRecipientName !== undefined) {
      achievement.certificateRecipientName = String(
        body.certificateRecipientName || ""
      ).trim();
    }

    if (!achievement.certificateCode) {
      achievement.certificateCode = buildCertificateCode(achievement._id, new Date());
    }

    if (action === "publish" || action === "issue" || action === "send_to_school") {
      achievement.certificateIssuedAt = new Date();
      achievement.certificateUrl = buildCertificatePath(achievement._id);
      achievement.schoolSharedAt = new Date();
      achievement.isPublic = Boolean(event.publicResultsEnabled);
      event.resultsPublished = true;
      if (event.lifecycleStatus === "ACTIVE") {
        event.lifecycleStatus = "COMPLETED";
      }
      await event.save();
    }

    if (action === "draft") {
      achievement.certificateIssuedAt = null;
      achievement.certificateUrl = "";
      achievement.schoolSharedAt = null;
      achievement.isPublic = false;
    }

    if (action === "publish_public") {
      if (!achievement.certificateIssuedAt) {
        achievement.certificateIssuedAt = new Date();
        achievement.certificateUrl = buildCertificatePath(achievement._id);
      }
      achievement.isPublic = true;
      event.resultsPublished = true;
      event.publicResultsEnabled = true;
      if (event.lifecycleStatus === "ACTIVE") {
        event.lifecycleStatus = "COMPLETED";
      }
      await event.save();
    }

    await achievement.save();

    return NextResponse.json({
      success: true,
      data: achievement,
      message:
        action === "send_to_school"
          ? "Certificate sent to the corresponding school dashboard"
          : action === "publish" || action === "issue"
          ? "Certificate issued"
          : action === "publish_public"
          ? "Certificate published publicly"
          : action === "draft"
          ? "Certificate moved to draft"
          : "Certificate updated",
    });
  } catch (error) {
    console.error("Certificate Update Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update certificate" },
      { status: 500 }
    );
  }
}
