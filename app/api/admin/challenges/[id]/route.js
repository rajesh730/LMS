import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import PlatformChallenge from "@/models/PlatformChallenge";

function serializeChallenge(challenge) {
  return {
    id: String(challenge._id),
    title: challenge.title,
    prompt: challenge.prompt,
    deadline: challenge.deadline,
    targetGrades: challenge.targetGrades || [],
    status: challenge.status,
    createdAt: challenge.createdAt,
    updatedAt: challenge.updatedAt,
  };
}

export async function PATCH(request, props) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const params = await props.params;
    const challenge = await PlatformChallenge.findById(params.id);

    if (!challenge) {
      return NextResponse.json(
        { message: "Challenge not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const title = String(body.title || "").trim();
    const prompt = String(body.prompt || "").trim();
    const status = String(body.status || challenge.status).toUpperCase();

    if (!["DRAFT", "PUBLISHED", "CLOSED"].includes(status)) {
      return NextResponse.json(
        { message: "Invalid challenge status" },
        { status: 400 }
      );
    }

    if (!title || !prompt) {
      return NextResponse.json(
        { message: "Title and topic are required" },
        { status: 400 }
      );
    }

    challenge.title = title;
    challenge.prompt = prompt;
    challenge.status = status;
    challenge.targetGrades = Array.isArray(body.targetGrades)
      ? body.targetGrades.map((grade) => String(grade).trim()).filter(Boolean)
      : [];
    challenge.deadline = body.deadline ? new Date(body.deadline) : null;

    await challenge.save();

    return NextResponse.json({
      message: "Challenge updated",
      challenge: serializeChallenge(challenge),
    });
  } catch (error) {
    console.error("PATCH /api/admin/challenges/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update challenge" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, props) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const params = await props.params;
    const challenge = await PlatformChallenge.findById(params.id);

    if (!challenge) {
      return NextResponse.json(
        { message: "Challenge not found" },
        { status: 404 }
      );
    }

    await PlatformChallenge.deleteOne({ _id: challenge._id });

    return NextResponse.json({ message: "Challenge deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/challenges/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to delete challenge" },
      { status: 500 }
    );
  }
}
