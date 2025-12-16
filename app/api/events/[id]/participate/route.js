import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";

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
          status: "APPROVED",
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
          status: "APPROVED",
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

      // ===== VALIDATION: Check Max Participants Per School =====
      if (event.maxParticipantsPerSchool) {
        // Count existing active requests (PENDING, APPROVED, ENROLLED)
        const existingCount = await ParticipationRequest.countDocuments({
          event: eventId,
          school: schoolId,
          status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
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
            status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
          });

        const newStudentsCount = studentIds.length - alreadyRegisteredCount;

        if (newStudentsCount > availableSlots) {
          return errorResponse(
            400,
            `Registration failed: You are trying to register ${newStudentsCount} new students, but only ${availableSlots} slots are remaining for your school (Limit: ${event.maxParticipantsPerSchool}).`
          );
        }
      }

      let successCount = 0;
      let errors = [];

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
            // Update contact info if provided
            if (contactPerson || phone || notes) {
              existingRequest.contactPerson =
                contactPerson || existingRequest.contactPerson;
              existingRequest.contactPhone =
                phone || existingRequest.contactPhone;
              existingRequest.notes = notes || existingRequest.notes;

              // Reset status to PENDING on update
              existingRequest.status = "PENDING";

              await existingRequest.save();
            }
            continue;
          }

          // Create Request
          await ParticipationRequest.create({
            student: studentId,
            event: eventId,
            school: schoolId,
            status: "PENDING",
            contactPerson: contactPerson || undefined,
            contactPhone: phone || undefined,
            notes: notes || undefined,
          });

          successCount++;
        } catch (err) {
          console.error(`Error processing student ${studentId}:`, err);
          errors.push(`Error processing student ${studentId}`);
        }
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
        // Allow withdrawing PENDING, APPROVED, and REJECTED.
        status: { $in: ["PENDING", "APPROVED", "REJECTED"] },
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

    // Remove students
    if (toRemove.length > 0) {
      await ParticipationRequest.deleteMany({
        event: eventId,
        school: schoolId,
        student: { $in: toRemove },
        // Only allow removing PENDING or APPROVED (maybe not REJECTED? or yes?)
        // If we remove REJECTED, they can re-apply. That seems fine.
      });

      // Also remove from Event.participants to keep sync
      await Event.updateOne(
        { _id: eventId, "participants.school": schoolId },
        {
          $pull: {
            "participants.$.students": { $in: toRemove },
          },
        }
      );

      // Cleanup empty participants (schools with 0 students)
      await Event.updateOne(
        { _id: eventId },
        {
          $pull: {
            participants: { students: { $size: 0 } },
          },
        }
      );
    }

    // Add new students
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
          status: "PENDING",
          contactPerson: contactPerson || undefined,
          contactPhone: phone || undefined,
          notes: notes || undefined,
        });
      }
    }

    // Update contact info and reset status for existing (kept) students
    const toKeep = studentIds.filter((id) => existingStudentIds.includes(id));
    if (toKeep.length > 0) {
      const updateData = {
        status: "PENDING", // Reset status to PENDING on any update
      };

      if (contactPerson) updateData.contactPerson = contactPerson;
      if (phone) updateData.contactPhone = phone;
      if (notes) updateData.notes = notes;

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

    return successResponse(200, "Participation updated successfully");
  } catch (error) {
    console.error("PUT /api/events/[id]/participate error:", error);
    return internalServerError("Internal server error");
  }
}
