import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import EventRound from "@/models/EventRound";
import RoundParticipant from "@/models/RoundParticipant";
import RoundSubmission from "@/models/RoundSubmission";

function getSchoolId(session) {
  return session?.user?.schoolId || session?.user?.id || null;
}

function isValidSubmissionUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export async function POST(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const params = await props.params;
    const schoolId = getSchoolId(session);
    const body = await req.json();

    const studentId = body.studentId;
    const submissionUrl = String(body.submissionUrl || "").trim();
    const submissionType = body.submissionType || "VIDEO_LINK";
    const remarks = String(body.remarks || "").trim();

    if (!studentId || !submissionUrl) {
      return NextResponse.json(
        { message: "Student and submission link are required" },
        { status: 400 }
      );
    }

    if (!isValidSubmissionUrl(submissionUrl)) {
      return NextResponse.json(
        { message: "Please enter a valid http or https link" },
        { status: 400 }
      );
    }

    const round = await EventRound.findOne({
      _id: params.roundId,
      event: params.id,
    });
    if (!round) {
      return NextResponse.json({ message: "Round not found" }, { status: 404 });
    }
    if (round.mode !== "ONLINE_SUBMISSION") {
      return NextResponse.json(
        { message: "Submissions are only allowed for online submission rounds" },
        { status: 400 }
      );
    }
    if (
      round.submissionDeadline &&
      new Date(round.submissionDeadline) < new Date()
    ) {
      return NextResponse.json(
        { message: "Submission deadline has passed" },
        { status: 400 }
      );
    }

    const participant = await RoundParticipant.findOne({
      event: params.id,
      round: params.roundId,
      school: schoolId,
      student: studentId,
    });
    if (!participant) {
      return NextResponse.json(
        { message: "Student is not eligible for this round" },
        { status: 403 }
      );
    }
    if (participant.status === "DISQUALIFIED") {
      return NextResponse.json(
        { message: "This student can no longer submit for this round" },
        { status: 400 }
      );
    }

    const submission = await RoundSubmission.findOneAndUpdate(
      {
        event: params.id,
        round: params.roundId,
        school: schoolId,
        student: studentId,
      },
      {
        event: params.id,
        round: params.roundId,
        school: schoolId,
        student: studentId,
        submissionType,
        submissionUrl,
        remarks,
        status: "SUBMITTED",
        submittedBy: session.user.id,
        submittedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    participant.status = "PARTICIPATED";
    participant.updatedBy = session.user.id;
    await participant.save();

    return NextResponse.json({
      message: "Submission saved",
      submission,
    });
  } catch (error) {
    console.error("Round Submission Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
