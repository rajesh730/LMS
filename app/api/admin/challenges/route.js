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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const challenges = await PlatformChallenge.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      challenges: challenges.map(serializeChallenge),
    });
  } catch (error) {
    console.error("GET /api/admin/challenges error:", error);
    return NextResponse.json(
      { message: "Failed to load student challenges" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const title = String(body.title || "").trim();
    const prompt = String(body.prompt || "").trim();
    const status =
      String(body.status || "").toUpperCase() === "PUBLISHED"
        ? "PUBLISHED"
        : "DRAFT";
    const targetGrades = Array.isArray(body.targetGrades)
      ? body.targetGrades.map((grade) => String(grade).trim()).filter(Boolean)
      : [];
    const deadline = body.deadline ? new Date(body.deadline) : null;

    if (!title || !prompt) {
      return NextResponse.json(
        { message: "Title and topic are required" },
        { status: 400 }
      );
    }

    const challenge = await PlatformChallenge.create({
      title,
      prompt,
      status,
      targetGrades,
      deadline,
      createdBy: session.user.id,
    });

    return NextResponse.json(
      {
        message:
          status === "PUBLISHED"
            ? "Challenge published for students"
            : "Challenge saved as draft",
        challenge: serializeChallenge(challenge),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/challenges error:", error);
    return NextResponse.json(
      { message: "Failed to save student challenge" },
      { status: 500 }
    );
  }
}
