import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import TalentSubmission from "@/models/TalentSubmission";

export const dynamic = "force-dynamic";

function resolveSchoolId(session) {
  if (session.user.role === "SCHOOL_ADMIN") return session.user.id;
  if (session.user.role === "TEACHER") return session.user.schoolId;
  return null;
}

export async function PUT(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const schoolId = resolveSchoolId(session);
    if (!schoolId) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const params = await props.params;
    await connectDB();

    const submission = await TalentSubmission.findOne({
      _id: params.id,
      school: schoolId,
    });

    if (!submission) {
      return NextResponse.json({ success: false, message: "Submission not found" }, { status: 404 });
    }

    const body = await req.json();

    if (body.status) {
      submission.status = body.status;
    }

    submission.reviewNotes = body.reviewNotes || "";
    submission.reviewedByName = session.user.name || session.user.email || "";
    submission.reviewedByRole = session.user.role;
    submission.reviewedAt = new Date();

    if (body.status === "PUBLISHED" && !submission.publishedAt) {
      submission.publishedAt = new Date();
    }
    if (body.status !== "PUBLISHED") {
      submission.publishedAt = null;
    }

    await submission.save();

    return NextResponse.json({ success: true, data: submission }, { status: 200 });
  } catch (error) {
    console.error("School submissions PUT error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to review submission" },
      { status: 500 }
    );
  }
}
