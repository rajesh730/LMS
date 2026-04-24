import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";

const ACTIVE_REQUEST_STATUSES = ["PENDING", "APPROVED", "ENROLLED"];

async function getPlatformInvitationBlocker(event, schoolId) {
  if (event.eventScope !== "PLATFORM") return null;

  const invitation = await EventSchoolInvitation.findOne({
    event: event._id,
    school: schoolId,
  }).select("status");

  if (invitation?.status === "APPROVED") return null;

  if (invitation?.status === "DISAPPROVED") {
    return "Your school has disapproved this platform event.";
  }

  if (invitation?.status === "WITHDRAWN") {
    return "This platform event is no longer available for your school.";
  }

  return "Your school must approve this platform event before students can participate.";
}

function syncSchoolParticipants(event, schoolId, studentIds, contactInfo = {}) {
  const normalizedStudentIds = Array.from(
    new Set((studentIds || []).map((id) => String(id)))
  );

  const existingParticipant = event.participants.find(
    (participant) => participant.school?.toString() === schoolId.toString()
  );

  if (normalizedStudentIds.length === 0) {
    event.participants = event.participants.filter(
      (participant) => participant.school?.toString() !== schoolId.toString()
    );
    return;
  }

  if (existingParticipant) {
    existingParticipant.students = normalizedStudentIds;
    existingParticipant.contactPerson =
      contactInfo.contactPerson || existingParticipant.contactPerson;
    existingParticipant.contactPhone =
      contactInfo.contactPhone || existingParticipant.contactPhone;
    existingParticipant.notes =
      contactInfo.notes !== undefined ? contactInfo.notes : existingParticipant.notes;
    existingParticipant.expectedStudents = normalizedStudentIds.length;
    return;
  }

  event.participants.push({
    school: schoolId,
    students: normalizedStudentIds,
    joinedAt: new Date(),
    contactPerson: contactInfo.contactPerson || undefined,
    contactPhone: contactInfo.contactPhone || undefined,
    notes: contactInfo.notes || undefined,
    expectedStudents: normalizedStudentIds.length,
  });
}

export async function POST(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return errorResponse(401, "Unauthorized: Please log in");
    }

    const { id: eventId } = await params;

    // Validate event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(404, "Event not found");
    }

    // ===== VALIDATION 0: Check Registration Deadline =====
    if (event.registrationDeadline) {
      const now = new Date();
      const deadline = new Date(event.registrationDeadline);
      if (now > deadline) {
        return errorResponse(
          400,
          `Registration deadline has passed (${deadline.toLocaleDateString()})`
        );
      }
    }

    // ==========================================
    // CASE 1: STUDENT SELF-REGISTRATION
    // ==========================================
    if (session.user.role === "STUDENT") {
      // Fetch student by email from session
      const student = await Student.findOne({ email: session.user.email });
      if (!student) {
        return errorResponse(404, "Student not found");
      }

      // Get school from student's record
      const schoolId = student.school || session.user.schoolId;
      if (!schoolId) {
        return errorResponse(400, "Student school information not found");
      }

      const invitationBlocker = await getPlatformInvitationBlocker(
        event,
        schoolId
      );
      if (invitationBlocker) {
        return errorResponse(403, invitationBlocker);
      }

      // Check Grade Eligibility
      if (event.eligibleGrades && event.eligibleGrades.length > 0) {
        if (!event.eligibleGrades.includes(student.grade)) {
          return errorResponse(
            400,
            `Student grade "${
              student.grade
            }" is not eligible for this event. Eligible grades: ${event.eligibleGrades.join(
              ", "
            )}`
          );
        }
      }

      // Check Max Participants Per School
      if (event.maxParticipantsPerSchool) {
        const approvedCount = await ParticipationRequest.countDocuments({
          event: eventId,
          school: schoolId,
          status: { $in: ACTIVE_REQUEST_STATUSES },
        });

        if (approvedCount >= event.maxParticipantsPerSchool) {
          return errorResponse(
            400,
            `This school has reached the maximum participant limit (${event.maxParticipantsPerSchool}) for this event`
          );
        }
      }

      // Check Global Max Participants
      if (event.maxParticipants) {
        const totalApproved = await ParticipationRequest.countDocuments({
          event: eventId,
          status: { $in: ACTIVE_REQUEST_STATUSES },
        });

        if (totalApproved >= event.maxParticipants) {
          return errorResponse(
            400,
            `This event has reached the maximum participant limit (${event.maxParticipants})`
          );
        }
      }

      // Check if request already exists
      const existingRequest = await ParticipationRequest.findOne({
        student: student._id,
        event: eventId,
        school: schoolId,
      });

      if (existingRequest) {
        return errorResponse(
          400,
          `You already have a ${existingRequest.status} request for this event`
        );
      }

      // Create participation request
      const request = new ParticipationRequest({
        student: student._id,
        event: eventId,
        school: schoolId,
        status: "PENDING",
      });

      await request.save();

      const populatedRequest = await ParticipationRequest.findById(request._id)
        .populate("student", "name enrollmentNumber")
        .populate("event", "title description")
        .lean();

      return successResponse(
        200,
        "Participation request created",
        populatedRequest
      );
    }

    // ==========================================
    // CASE 2: SCHOOL ADMIN BULK REGISTRATION
    // ==========================================
    if (session.user.role === "SCHOOL_ADMIN") {
      const body = await req.json();
      // Allow both naming conventions
      const studentIds = body.studentIds || body.students;
      const contactPerson = body.contactPerson;
      const phone = body.phone || body.contactPhone;
      const notes = body.notes;

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return errorResponse(400, "No students selected");
      }

      const schoolId = session.user.id;
      const invitationBlocker = await getPlatformInvitationBlocker(
        event,
        schoolId
      );
      if (invitationBlocker) {
        return errorResponse(403, invitationBlocker);
      }

      // ===== VALIDATION: Check Max Participants Per School =====
      if (event.maxParticipantsPerSchool) {
        // Count existing active requests (PENDING, APPROVED, ENROLLED)
        const existingCount = await ParticipationRequest.countDocuments({
          event: eventId,
          school: schoolId,
          status: { $in: ACTIVE_REQUEST_STATUSES },
        });

        const availableSlots = event.maxParticipantsPerSchool - existingCount;

        if (availableSlots <= 0) {
          return errorResponse(
            400,
            `Registration failed: Your school has already reached the limit of ${event.maxParticipantsPerSchool} students for this event.`
          );
        }

        // Filter out students who are already registered to avoid false positives
        const alreadyRegisteredCount =
          await ParticipationRequest.countDocuments({
            event: eventId,
            student: { $in: studentIds },
            status: { $in: ACTIVE_REQUEST_STATUSES },
          });

        const newStudentsCount = studentIds.length - alreadyRegisteredCount;

        if (newStudentsCount > availableSlots) {
          return errorResponse(
            400,
            `Registration failed: You are trying to register ${newStudentsCount} new students, but only ${availableSlots} slots are remaining for your school (Limit: ${event.maxParticipantsPerSchool}).`
          );
        }
      }

      if (event.maxParticipants) {
        const existingGlobalCount = await ParticipationRequest.countDocuments({
          event: eventId,
          status: { $in: ACTIVE_REQUEST_STATUSES },
        });

        const alreadyRegisteredCount =
          await ParticipationRequest.countDocuments({
            event: eventId,
            student: { $in: studentIds },
            status: { $in: ACTIVE_REQUEST_STATUSES },
          });

        const newStudentsCount = studentIds.length - alreadyRegisteredCount;
        const availableGlobalSlots = event.maxParticipants - existingGlobalCount;

        if (newStudentsCount > availableGlobalSlots) {
          return errorResponse(
            400,
            `Registration failed: You are trying to register ${newStudentsCount} new students, but only ${availableGlobalSlots} total slots remain for this event (Limit: ${event.maxParticipants}).`
          );
        }
      }

      let successCount = 0;
      let errors = [];
      const approvedStudentIds = [];
      const now = new Date();

      // Process each student
      for (const studentId of studentIds) {
        try {
          // Verify student belongs to this school
          const student = await Student.findOne({
            _id: studentId,
            school: schoolId,
          });

          if (!student) {
            errors.push(`Student ${studentId} not found or not in your school`);
            continue;
          }

          // Check Grade Eligibility
          if (event.eligibleGrades && event.eligibleGrades.length > 0) {
            if (!event.eligibleGrades.includes(student.grade)) {
              errors.push(
                `Student ${student.name} (Grade ${student.grade}) is not eligible for this event.`
              );
              continue;
            }
          }

          // Check if request already exists
          const existingRequest = await ParticipationRequest.findOne({
            student: studentId,
            event: eventId,
          });

          if (existingRequest) {
            if (
              existingRequest.status === "APPROVED" ||
              existingRequest.status === "ENROLLED"
            ) {
              approvedStudentIds.push(studentId);
            }
            continue;
          }

          // Create Request
          await ParticipationRequest.create({
            student: studentId,
            event: eventId,
            school: schoolId,
            status: "APPROVED",
            approvedAt: now,
            approvedBy: session.user.id,
            enrollmentConfirmedAt: now,
            studentNotifiedAt: now,
            contactPerson: contactPerson || undefined,
            contactPhone: phone || undefined,
            notes: notes || undefined,
          });

          approvedStudentIds.push(studentId);
          successCount++;
        } catch (err) {
          console.error(`Error processing student ${studentId}:`, err);
          errors.push(`Error processing student ${studentId}`);
        }
      }

      if (approvedStudentIds.length > 0) {
        syncSchoolParticipants(event, schoolId, approvedStudentIds, {
          contactPerson,
          contactPhone: phone,
          notes,
        });
        await event.save();
      }

      return successResponse(
        200,
        `Successfully registered ${successCount} students.`,
        { successCount, errors }
      );
    }

    return errorResponse(
      403,
      "Only students or school admins can request participation"
    );
  } catch (error) {
    console.error("POST /api/events/[id]/participate error:", error);
    return internalServerError("Internal server error");
  }
}

export async function GET(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return errorResponse(401, "Unauthorized: Please log in");
    }

    const { id: eventId } = await params;

    // CASE 1: SCHOOL ADMIN
    if (session.user.role === "SCHOOL_ADMIN") {
      const requests = await ParticipationRequest.find({
        event: eventId,
        school: session.user.id,
      })
        .populate("student", "name grade")
        .lean();

      console.log(
        `[GET Participate] Found ${requests.length} requests for event ${eventId}`
      );
      if (requests.length > 0) {
        console.log(
          "[GET Participate] First request student:",
          JSON.stringify(requests[0].student, null, 2)
        );
        console.log(
          "[GET Participate] First request contact:",
          requests[0].contactPerson,
          requests[0].contactPhone
        );
      }

      if (!requests || requests.length === 0) {
        return successResponse(200, "No participation requests found", {
          requests: [],
        });
      }

      // Extract common contact info from the first request (assuming it's consistent)
      const firstReq = requests[0];
      const contactInfo = {
        contactPerson: firstReq.contactPerson || "",
        contactPhone: firstReq.contactPhone || "",
        notes: firstReq.notes || "",
      };

      return successResponse(200, "Participation details found", {
        requests,
        contactInfo,
      });
    }

    // CASE 2: STUDENT
    if (session.user.role === "STUDENT") {
      // Fetch student by email from session
      const student = await Student.findOne({ email: session.user.email });
      if (!student) {
        return errorResponse(404, "Student not found");
      }

      // Check participation status
      const request = await ParticipationRequest.findOne({
        student: student._id,
        event: eventId,
        school: session.user.schoolId,
      })
        .populate("event", "title description")
        .lean();

      if (!request) {
        return successResponse(200, "No participation request found", null);
      }

      return successResponse(200, "Participation request found", request);
    }

    return errorResponse(403, "Unauthorized role");
  } catch (error) {
    console.error("GET /api/events/[id]/participate error:", error);
    return internalServerError("Internal server error");
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return errorResponse(401, "Unauthorized: Please log in");
    }

    const { id: eventId } = await params;

    // CASE 1: SCHOOL ADMIN WITHDRAWAL (ALL)
    if (session.user.role === "SCHOOL_ADMIN") {
      const schoolId = session.user.id;

      const result = await ParticipationRequest.deleteMany({
        event: eventId,
        school: schoolId,
        status: { $in: ["PENDING", "APPROVED", "ENROLLED", "REJECTED"] },
      });

      // Also remove from Event.participants to keep sync
      await Event.updateOne(
        { _id: eventId },
        {
          $pull: {
            participants: { school: schoolId },
          },
        }
      );

      if (result.deletedCount === 0) {
        return errorResponse(404, "No active participation found to withdraw");
      }

      return successResponse(200, "School participation withdrawn", {
        count: result.deletedCount,
      });
    }

    // CASE 2: STUDENT WITHDRAWAL
    if (session.user.role !== "STUDENT") {
      return errorResponse(
        403,
        "Only students or school admins can withdraw requests"
      );
    }

    // Fetch student by email (consistent with POST/GET)
    const student = await Student.findOne({ email: session.user.email });
    if (!student) {
      return errorResponse(404, "Student not found");
    }

    // Get school from student's record
    const schoolId = student.school || session.user.schoolId;
    if (!schoolId) {
      return errorResponse(400, "Student school information not found");
    }

    // Find and delete request (only if PENDING or REJECTED)
    const request = await ParticipationRequest.findOne({
      student: student._id,
      event: eventId,
      school: schoolId,
      status: { $in: ["PENDING", "REJECTED"] },
    });

    if (!request) {
      return errorResponse(404, "No pending request found to withdraw");
    }

    await ParticipationRequest.deleteOne({ _id: request._id });

    return successResponse(200, "Participation request withdrawn", null);
  } catch (error) {
    console.error("DELETE /api/events/[id]/participate error:", error);
    return internalServerError("Internal server error");
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(
        403,
        "Unauthorized: Only school admins can update participation"
      );
    }

    const { id: eventId } = await params;
    const body = await req.json();
    console.log("[PUT Participate] Received update for event:", eventId);
    console.log("[PUT Participate] Body:", JSON.stringify(body, null, 2));

    // Allow both naming conventions (frontend sends 'students' and 'contactPhone')
    const studentIds = body.studentIds || body.students;
    const contactPerson = body.contactPerson;
    const phone = body.phone || body.contactPhone;
    const notes = body.notes;

    if (!Array.isArray(studentIds)) {
      console.log("[PUT Participate] Invalid student list:", studentIds);
      return errorResponse(400, "Invalid student list");
    }

    const schoolId = session.user.id;
    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(404, "Event not found");
    }

    const invitationBlocker = await getPlatformInvitationBlocker(
      event,
      schoolId
    );
    if (invitationBlocker) {
      return errorResponse(403, invitationBlocker);
    }

    // Check Max Participants Per School
    if (
      event.maxParticipantsPerSchool &&
      studentIds.length > event.maxParticipantsPerSchool
    ) {
      console.log(
        `[PUT Participate] Limit exceeded. Count: ${studentIds.length}, Limit: ${event.maxParticipantsPerSchool}`
      );
      return errorResponse(
        400,
        `Cannot update: You selected ${studentIds.length} students, but the limit is ${event.maxParticipantsPerSchool}.`
      );
    }

    // Get existing requests
    const existingRequests = await ParticipationRequest.find({
      event: eventId,
      school: schoolId,
    });

    const existingStudentIds = existingRequests.map((r) =>
      r.student.toString()
    );

    // Determine to Add and to Remove
    const toAdd = studentIds.filter((id) => !existingStudentIds.includes(id));
    const toRemove = existingStudentIds.filter(
      (id) => !studentIds.includes(id)
    );

    if (event.maxParticipants) {
      const globalActiveCount = await ParticipationRequest.countDocuments({
        event: eventId,
        status: { $in: ACTIVE_REQUEST_STATUSES },
      });
      const toRemoveActiveCount = existingRequests.filter(
        (request) =>
          toRemove.includes(request.student.toString()) &&
          ACTIVE_REQUEST_STATUSES.includes(request.status)
      ).length;
      const reactivatedCount = existingRequests.filter(
        (request) =>
          studentIds.includes(request.student.toString()) &&
          !ACTIVE_REQUEST_STATUSES.includes(request.status)
      ).length;
      const projectedCount =
        globalActiveCount - toRemoveActiveCount + toAdd.length + reactivatedCount;

      if (projectedCount > event.maxParticipants) {
        return errorResponse(
          400,
          `Cannot update: This change would exceed the global event limit of ${event.maxParticipants} students.`
        );
      }
    }

    // Remove students
    if (toRemove.length > 0) {
      await ParticipationRequest.deleteMany({
        event: eventId,
        school: schoolId,
        student: { $in: toRemove },
      });
    }

    // Add new students
    const now = new Date();
    for (const studentId of toAdd) {
      // Verify student belongs to this school
      const student = await Student.findOne({
        _id: studentId,
        school: schoolId,
      });

      if (student) {
        await ParticipationRequest.create({
          student: studentId,
          event: eventId,
          school: schoolId,
          status: "APPROVED",
          approvedAt: now,
          approvedBy: session.user.id,
          enrollmentConfirmedAt: now,
          studentNotifiedAt: now,
          contactPerson: contactPerson || undefined,
          contactPhone: phone || undefined,
          notes: notes || undefined,
        });
      }
    }

    // Update contact info and keep selected students approved
    const toKeep = studentIds.filter((id) => existingStudentIds.includes(id));
    if (toKeep.length > 0) {
      const updateData = {
        status: "APPROVED",
        approvedAt: now,
        approvedBy: session.user.id,
        rejectedAt: null,
        rejectionReason: null,
      };

      if (contactPerson) updateData.contactPerson = contactPerson;
      if (phone) updateData.contactPhone = phone;
      if (notes !== undefined) updateData.notes = notes;
      updateData.enrollmentConfirmedAt = now;
      updateData.studentNotifiedAt = now;

      await ParticipationRequest.updateMany(
        {
          event: eventId,
          school: schoolId,
          student: { $in: toKeep },
        },
        {
          $set: updateData,
        }
      );
    }

    syncSchoolParticipants(event, schoolId, studentIds, {
      contactPerson,
      contactPhone: phone,
      notes,
    });
    await event.save();

    return successResponse(200, "Participation updated successfully");
  } catch (error) {
    console.error("PUT /api/events/[id]/participate error:", error);
    return internalServerError("Internal server error");
  }
}
