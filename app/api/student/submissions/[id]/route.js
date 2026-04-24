import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import TalentSubmission from "@/models/TalentSubmission";

export const dynamic = "force-dynamic";

function normalizeAssets(assets) {
  return Array.isArray(assets)
    ? assets
        .filter((asset) => asset?.url)
        .map((asset) => ({
          type: asset.type || "LINK",
          label: asset.label || "",
          url: asset.url,
        }))
    : [];
}

export async function PUT(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await props.params;
    await connectDB();

    const submission = await TalentSubmission.findOne({
      _id: params.id,
      student: session.user.id,
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, message: "Submission not found" },
        { status: 404 }
      );
    }

    if (submission.status === "PUBLISHED") {
      return NextResponse.json(
        { success: false, message: "Published submissions can no longer be edited" },
        { status: 400 }
      );
    }

    const body = await req.json();

    submission.title = body.title || submission.title;
    submission.description = body.description || "";
    submission.submissionType = body.submissionType || submission.submissionType;
    submission.status = body.status || submission.status;
    submission.assets = normalizeAssets(body.assets);

    await submission.save();

    return NextResponse.json(
      { success: true, data: submission },
      { status: 200 }
    );
  } catch (error) {
    console.error("Student submissions PUT error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update submission" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await props.params;
    await connectDB();

    const submission = await TalentSubmission.findOne({
      _id: params.id,
      student: session.user.id,
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, message: "Submission not found" },
        { status: 404 }
      );
    }

    if (submission.status === "PUBLISHED") {
      return NextResponse.json(
        { success: false, message: "Published submissions cannot be deleted" },
        { status: 400 }
      );
    }

    await TalentSubmission.deleteOne({ _id: submission._id });

    return NextResponse.json(
      { success: true, message: "Submission deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Student submissions DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete submission" },
      { status: 500 }
    );
  }
}
