import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import Group from "@/models/Group";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      title,
      description,
      date,
      targetGroup,
      registrationDeadline,
      maxParticipants,
      maxParticipantsPerSchool,
      eligibleGrades,
    } = await req.json();

    if (!title || !description || !date) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const status = session.user.role === "TEACHER" ? "PENDING" : "APPROVED";

    // For non-super-admin, tag the school for scoping
    const school = ["SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)
      ? session.user.schoolId || null
      : null;

    const newEvent = await Event.create({
      title,
      description,
      date,
      createdBy: session.user.id,
      targetGroup: targetGroup || null,
      school,
      registrationDeadline: registrationDeadline || null,
      maxParticipants: maxParticipants || null,
      maxParticipantsPerSchool: maxParticipantsPerSchool || null,
      eligibleGrades: eligibleGrades || [],
      status,
    });

    return NextResponse.json(
      { message: "Event created successfully", event: newEvent },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Event Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Block unsubscribed schools
    if (
      session.user.role === "SCHOOL_ADMIN" &&
      session.user.status === "UNSUBSCRIBED"
    ) {
      return NextResponse.json(
        { message: "Subscription inactive" },
        { status: 403 }
      );
    }

    await connectDB();

    let query = {};

    if (
      session.user.role === "SCHOOL_ADMIN" ||
      session.user.role === "TEACHER"
    ) {
      // Find groups this school belongs to (if applicable) - For now assuming Teachers belong to same context
      // Ideally we need to filter by School. But Event model doesn't have School.
      // We are relying on 'targetGroup' which is Global or Group-based.
      // If we want to support School-specific events without Groups, we need 'school' field in Event.
      // For now, let's keep existing logic but add Status filter.

      const mongoose = (await import("mongoose")).default;

      // Resolve schoolId from session (SCHOOL_ADMIN uses own id; TEACHER was hydrated in auth callbacks)
      const schoolObjectId = session.user.schoolId
        ? new mongoose.Types.ObjectId(session.user.schoolId)
        : null;

      let groupIds = [];
      if (schoolObjectId) {
        const schoolGroups = await Group.find({
          schools: schoolObjectId,
        }).select("_id");
        groupIds = schoolGroups.map((g) => g._id);
      }

      // Base query: Global events OR Targeted events OR same-school events
      const orConditions = [{ targetGroup: null }];
      if (schoolObjectId) {
        orConditions.push({ school: schoolObjectId });
      }
      if (groupIds.length > 0) {
        orConditions.push({ targetGroup: { $in: groupIds } });
      }

      query = { $or: orConditions };

      // Status Filter:
      // SCHOOL_ADMIN sees all; TEACHER sees approved (or their own pending?)
      if (session.user.role === "TEACHER") {
        // Allow teachers to see approved events plus their own (even if pending)
        query = {
          $and: [
            { $or: orConditions },
            {
              $or: [{ status: "APPROVED" }, { createdBy: session.user.id }],
            },
          ],
        };
      }
    }

    // If Super Admin, query remains {} (fetch all)

    let events;
    try {
      // For admin, populate participant school details
      if (session.user.role === "SUPER_ADMIN") {
        events = await Event.find(query)
          .sort({ date: 1 })
          .populate("targetGroup", "name")
          .populate(
            "participants.school",
            "schoolName email principalName principalPhone schoolPhone"
          )
          .populate("participants.students", "name grade")
          .lean();
      } else {
        // For schools/teachers, just get basic data
        events = await Event.find(query)
          .sort({ date: 1 })
          .populate("targetGroup", "name")
          .lean();
      }
    } catch (queryError) {
      console.error("Query Error:", queryError.message);
      throw queryError;
    }

    // Add computed fields for frontend compatibility
    const eventsWithParticipation = await Promise.all(
      events.map(async (event) => {
        const eventObj = { ...event };

        // Map fields to frontend expectations
        eventObj.deadline = event.registrationDeadline;
        eventObj.capacity = event.maxParticipants;

        // Calculate real-time counts from ParticipationRequest
        // This ensures Super Admin sees all activity (Pending + Approved)
        const allRequests = await ParticipationRequest.find({
          event: event._id,
        }).select("school status");

        const uniqueSchools = new Set(
          allRequests.map((r) => r.school.toString())
        );
        eventObj.schoolCount = uniqueSchools.size;
        eventObj.studentCount = allRequests.length;

        // Keep legacy fields for compatibility if needed, but prefer new ones
        eventObj.enrolled = eventObj.studentCount;
        eventObj.participantCount = eventObj.schoolCount;

        // For Super Admin: Construct detailed participants list from requests
        if (session.user.role === "SUPER_ADMIN") {
          const detailedRequests = await ParticipationRequest.find({
            event: event._id,
          })
            .populate(
              "school",
              "schoolName email principalName principalPhone schoolPhone"
            )
            .populate("student", "name grade")
            .lean();

          // Group by school
          const schoolMap = new Map();

          // Initialize with existing participants (to keep notes/contact info)
          if (event.participants) {
            event.participants.forEach((p) => {
              if (p.school) {
                schoolMap.set(p.school._id.toString(), {
                  ...p,
                  students: [], // We will rebuild student list from requests to be accurate
                });
              }
            });
          }

          // Merge/Add from requests
          detailedRequests.forEach((req) => {
            if (!req.school) return;
            const schoolId = req.school._id.toString();

            if (!schoolMap.has(schoolId)) {
              schoolMap.set(schoolId, {
                school: req.school,
                contactPerson:
                  req.contactPerson || req.school.principalName || "N/A",
                contactPhone:
                  req.contactPhone || req.school.principalPhone || "N/A",
                joinedAt: req.requestedAt,
                students: [],
                notes: req.notes || "Pending Registration",
                status: req.status, // Added status
              });
            } else {
              // Update contact info if available in request
              const entry = schoolMap.get(schoolId);
              if (req.contactPerson) entry.contactPerson = req.contactPerson;
              if (req.contactPhone) entry.contactPhone = req.contactPhone;
              if (req.notes) entry.notes = req.notes;

              // Ensure status is set if it was missing (from initial population)
              if (!entry.status) entry.status = req.status;
              // If any request is PENDING, mark the school as PENDING
              else if (req.status === "PENDING") entry.status = "PENDING";
            }

            const schoolEntry = schoolMap.get(schoolId);
            // Add student if not already there
            if (
              req.student &&
              !schoolEntry.students.find(
                (s) => s._id.toString() === req.student._id.toString()
              )
            ) {
              // Attach requestId to student for easier approval
              const studentWithReq = { ...req.student, requestId: req._id };
              schoolEntry.students.push(studentWithReq);
            }
          });

          eventObj.participants = Array.from(schoolMap.values());
        }

        if (session.user.role === "SCHOOL_ADMIN") {
          // Check ParticipationRequest collection for status
          // Priority: APPROVED > PENDING > REJECTED
          const requests = await ParticipationRequest.find({
            event: event._id,
            school: session.user.id,
          }).select("status contactPerson contactPhone notes student");

          const statuses = requests.map((r) => r.status);

          if (statuses.includes("APPROVED")) {
            eventObj.participationStatus = "APPROVED";
            eventObj.isParticipating = true;
          } else if (statuses.includes("PENDING")) {
            eventObj.participationStatus = "PENDING";
            eventObj.isParticipating = true;
          } else if (statuses.includes("REJECTED")) {
            eventObj.participationStatus = "REJECTED";
            eventObj.isParticipating = true; // Show in "My Participated" even if rejected
          } else {
            eventObj.participationStatus = null;
            eventObj.isParticipating = false;
          }

          // Populate myParticipation for frontend editing
          if (requests.length > 0) {
            // Use the first request for contact info (assuming consistency)
            // Find one with contact info if possible
            const reqWithContact =
              requests.find((r) => r.contactPerson) || requests[0];

            eventObj.myParticipation = {
              contactPerson: reqWithContact.contactPerson || "",
              contactPhone: reqWithContact.contactPhone || "",
              notes: reqWithContact.notes || "",
              students: requests.map((r) => r.student),
            };
          }
        }

        return eventObj;
      })
    );

    return NextResponse.json(
      { events: eventsWithParticipation },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch Events Error:", error.message);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
