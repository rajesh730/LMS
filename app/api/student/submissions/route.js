import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import TalentProfile from "@/models/TalentProfile";
import TalentSubmission from "@/models/TalentSubmission";

export const dynamic = "force-dynamic";
const SUBMISSION_READY_STATUSES = ["APPROVED", "ENROLLED"];

function isEligibleForEvent(event, grade) {
  return !event.eligibleGrades?.length || event.eligibleGrades.includes(grade);
}

async function ensureTalentProfile(student) {
  return TalentProfile.findOneAndUpdate(
    { student: student._id },
    {
      $setOnInsert: {
        school: student.school,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const student = await Student.findById(session.user.id)
      .select("school grade")
      .lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    const approvedPlatformEventIds = student.school
      ? await EventSchoolInvitation.find({
          school: student.school,
          status: "APPROVED",
        }).distinct("event")
      : [];

    const [approvedParticipationEventIds, pendingRequests] = await Promise.all([
      ParticipationRequest.find({
        student: session.user.id,
        status: { $in: SUBMISSION_READY_STATUSES },
      }).distinct("event"),
      ParticipationRequest.find({
        student: session.user.id,
        status: "PENDING",
      })
        .populate("event", "title date eventType eventScope")
        .lean(),
    ]);

    const [submissions, events] = await Promise.all([
      TalentSubmission.find({ student: session.user.id })
        .sort({ updatedAt: -1 })
        .populate("event", "title date eventType visibility eventScope")
        .lean(),
      Event.find({
        _id: { $in: approvedParticipationEventIds },
        status: "APPROVED",
        lifecycleStatus: { $ne: "ARCHIVED" },
        $or: [
          { eventScope: "PLATFORM", _id: { $in: approvedPlatformEventIds } },
          { school: student.school },
        ],
      })
        .sort({ date: 1 })
        .select("title date eventType eligibleGrades visibility eventScope")
        .lean(),
    ]);

    const eligibleEvents = events.filter((event) =>
      isEligibleForEvent(event, student.grade)
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          submissions,
          eligibleEvents,
          pendingRequests: pendingRequests
            .filter((request) => request.event)
            .map((request) => ({
              _id: request._id,
              status: request.status,
              event: request.event,
            })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Student submissions GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load submissions" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const student = await Student.findById(session.user.id)
      .select("school grade")
      .lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const event = await Event.findById(body.eventId)
      .select("eligibleGrades lifecycleStatus status eventScope")
      .lean();

    if (!event || event.lifecycleStatus === "ARCHIVED" || event.status !== "APPROVED") {
      return NextResponse.json(
        { success: false, message: "Event not available for submissions" },
        { status: 400 }
      );
    }

    if (!isEligibleForEvent(event, student.grade)) {
      return NextResponse.json(
        { success: false, message: "You are not eligible for this event" },
        { status: 403 }
      );
    }

    if (event.eventScope === "PLATFORM") {
      const approvedInvitation = await EventSchoolInvitation.exists({
        event: event._id,
        school: student.school,
        status: "APPROVED",
      });

      if (!approvedInvitation) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Your school must approve this platform event before submissions are allowed.",
          },
          { status: 403 }
        );
      }
    }

    const approvedParticipation = await ParticipationRequest.findOne({
      event: event._id,
      student: session.user.id,
      status: { $in: SUBMISSION_READY_STATUSES },
    })
      .select("_id status")
      .lean();

    if (!approvedParticipation) {
      const pendingParticipation = await ParticipationRequest.findOne({
        event: event._id,
        student: session.user.id,
      })
        .select("status")
        .lean();

      return NextResponse.json(
        {
          success: false,
          message:
            pendingParticipation?.status === "PENDING"
              ? "Your participation is still pending approval. You can submit once the school confirms your registration."
              : "You can only submit after your participation has been approved for this event.",
        },
        { status: 403 }
      );
    }

    const assets = Array.isArray(body.assets)
      ? body.assets
          .filter((asset) => asset?.url)
          .map((asset) => ({
            type: asset.type || "LINK",
            label: asset.label || "",
            url: asset.url,
          }))
      : [];

    const talentProfile = await ensureTalentProfile({
      _id: session.user.id,
      school: student.school,
    });

    const submission = await TalentSubmission.create({
      event: body.eventId,
      school: student.school,
      student: session.user.id,
      talentProfile: talentProfile?._id || null,
      title: body.title,
      description: body.description || "",
      submissionType: body.submissionType || "SOLO",
      assets,
      status: body.status || "SUBMITTED",
    });

    const [submissionsCount, awardsCount, eventsParticipated] = await Promise.all([
      TalentSubmission.countDocuments({ student: session.user.id }),
      0,
      TalentSubmission.distinct("event", { student: session.user.id }),
    ]);

    await TalentProfile.findOneAndUpdate(
      { student: session.user.id },
      {
        $set: {
          stats: {
            submissionsCount,
            awardsCount,
            eventsParticipated: eventsParticipated.length,
          },
        },
      }
    );

    return NextResponse.json(
      { success: true, data: submission },
      { status: 201 }
    );
  } catch (error) {
    console.error("Student submissions POST error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create submission" },
      { status: 500 }
    );
  }
}
