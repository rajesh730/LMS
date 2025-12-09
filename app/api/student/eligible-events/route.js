import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";

/**
 * GET /api/student/eligible-events
 * Returns events visible to the student based on their grade eligibility
 * Includes capacity metrics, deadline info, and participation status
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    // Only students can access this endpoint
    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Students only" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get student's grade from Student model
    const student = await Student.findById(session.user.id).select("grade");

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student record not found" },
        { status: 404 }
      );
    }

    if (!student.grade) {
      return NextResponse.json(
        { success: false, message: "Student grade not configured" },
        { status: 400 }
      );
    }

    const studentGrade = student.grade;

    // Get all APPROVED events (status-filtered by event creation role)
    const events = await Event.find({ status: "APPROVED" })
      .populate("targetGroup", "name grades")
      .populate("participants.school", "schoolName _id")
      .populate("participants.students", "_id")
      .sort({ date: 1 })
      .lean();

    // Filter events by grade eligibility and calculate capacity metrics
    const eligibleEvents = events
      .map((event) => {
        // Check if student is eligible by grade
        const isEligible =
          !event.eligibleGrades ||
          event.eligibleGrades.length === 0 ||
          event.eligibleGrades.includes(studentGrade);

        if (!isEligible) {
          return null; // Filter out ineligible events
        }

        // Check deadline
        const now = new Date();
        const deadlinePassed =
          event.registrationDeadline &&
          new Date(event.registrationDeadline) < now;

        // Calculate total enrolled students
        const totalEnrolled =
          event.participants?.reduce(
            (sum, p) => sum + (p.students?.length || 0),
            0
          ) || 0;

        // Check if globally full
        const isGloballyFull =
          event.maxParticipants && totalEnrolled >= event.maxParticipants;

        // Calculate per-school capacity breakdown
        const schoolCapacity = (event.participants || [])
          .map((p) => {
            const enrolled = p.students?.length || 0;
            const maxPerSchool = event.maxParticipantsPerSchool;
            const percentage = maxPerSchool
              ? Math.round((enrolled / maxPerSchool) * 100)
              : 0;

            return {
              schoolId: p.school?._id?.toString(),
              schoolName: p.school?.schoolName || "Unknown School",
              enrolled,
              maxCapacity: maxPerSchool,
              percentage,
              status:
                enrolled >= (maxPerSchool || 0)
                  ? "full"
                  : enrolled >= (maxPerSchool || 0) * 0.8
                  ? "near-capacity"
                  : "available",
            };
          })
          .sort((a, b) => {
            // Sort: full → near-capacity → available
            const order = { full: 0, "near-capacity": 1, available: 2 };
            return order[a.status] - order[b.status];
          });

        // Calculate global enrollment percentage
        const globalPercentage = event.maxParticipants
          ? Math.round((totalEnrolled / event.maxParticipants) * 100)
          : 0;

        // Get ineligibility reason if not eligible
        let ineligibilityReason = null;
        if (deadlinePassed) {
          ineligibilityReason = "Registration deadline has passed";
        } else if (isGloballyFull) {
          ineligibilityReason = "Event is full globally";
        }

        return {
          _id: event._id,
          title: event.title,
          description: event.description,
          date: event.date,
          eligibleGrades: event.eligibleGrades || [],

          // Capacity Metrics
          maxParticipants: event.maxParticipants,
          totalEnrolled,
          enrollmentPercentage: event.maxParticipants ? globalPercentage : 0,
          enrollmentStatus: isGloballyFull
            ? "full"
            : globalPercentage >= 80
            ? "near-capacity"
            : "available",

          maxParticipantsPerSchool: event.maxParticipantsPerSchool,
          schoolCapacity,

          // Deadline Info
          registrationDeadline: event.registrationDeadline,
          deadlinePassed,

          // Eligibility Status
          isEligible: true, // All returned events are eligible
          ineligibilityReason,

          // For display purposes
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        };
      })
      .filter((e) => e !== null); // Remove ineligible events

    // Fetch student's participation requests for these events
    const eventIds = eligibleEvents.map((e) => e._id);
    const participationRequests = await ParticipationRequest.find({
      student: session.user.id,
      event: { $in: eventIds },
    })
      .select("event status requestedAt approvedAt rejectionReason")
      .lean();

    // Create a map for quick lookup
    const requestMap = {};
    participationRequests.forEach((req) => {
      requestMap[req.event.toString()] = req;
    });

    // Add participation status to events
    const eventsWithStatus = eligibleEvents.map((event) => {
      const request = requestMap[event._id.toString()];
      if (request) {
        return {
          ...event,
          studentRequest: {
            status: request.status, // PENDING | APPROVED | ENROLLED | REJECTED
            requestId: request._id,
            requestedAt: request.requestedAt,
            approvedAt: request.approvedAt,
            rejectionReason: request.rejectionReason || null,
          },
        };
      }
      return event;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Eligible events fetched successfully",
        data: eventsWithStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/student/eligible-events error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
