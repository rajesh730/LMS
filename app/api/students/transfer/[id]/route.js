import crypto from "crypto";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import User from "@/models/User";
import AcademicYear from "@/models/AcademicYear";
import StudentTransfer from "@/models/StudentTransfer";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import { notifyTransferRejected } from "@/lib/transferNotifications";
import { normalizeGradeValue } from "@/lib/schoolGrades";
import { generateUniqueStudentUsername } from "@/lib/studentIdentity";
import {
  ensureActiveAcademicYear,
  makeEnrollmentEntry,
  closeCurrentEnrollments,
} from "@/lib/studentEnrollment";

function generateTransferCode() {
  return `TR-${crypto.randomInt(100000, 999999)}`;
}

async function moveStudent({ transfer, session, toGrade, toRollNumber }) {
  const student = await Student.findById(transfer.student);
  if (!student || student.isDeleted) {
    return { error: errorResponse(404, "Student record not found.") };
  }

  if (String(student.school || "") !== String(transfer.fromSchool || "")) {
    return {
      error: errorResponse(
        409,
        "This student is no longer at the releasing school. The request is stale."
      ),
    };
  }

  const toSchoolId = transfer.toSchool;
  if (!toSchoolId) {
    return { error: errorResponse(400, "Destination school is missing.") };
  }

  const targetGrade = normalizeGradeValue(toGrade || transfer.toGrade || student.grade);
  const rollNumber = String(toRollNumber || transfer.toRollNumber || student.rollNumber).trim();

  if (!targetGrade || !rollNumber) {
    return {
      error: errorResponse(
        400,
        "Target grade and roll number are required before admission approval."
      ),
    };
  }

  const rollClash = await Student.findOne({
    school: toSchoolId,
    grade: targetGrade,
    rollNumber,
    isDeleted: { $ne: true },
    status: { $nin: ["ALUMNI", "GRADUATED", "INACTIVE"] },
    _id: { $ne: student._id },
  }).select("_id");

  if (rollClash) {
    return {
      error: errorResponse(
        409,
        `Roll number ${rollNumber} is already used in ${targetGrade} at this school.`
      ),
    };
  }

  const [toSchool, toYear, fromYear] = await Promise.all([
    User.findById(toSchoolId).select("schoolName name").lean(),
    ensureActiveAcademicYear(toSchoolId),
    ensureActiveAcademicYear(transfer.fromSchool),
  ]);

  const newUsername = await generateUniqueStudentUsername(Student, {
    firstName: student.firstName,
    grade: targetGrade,
    rollNumber,
    school: toSchoolId,
  });

  closeCurrentEnrollments(student, "TRANSFERRED");
  student.enrollments.push(
    makeEnrollmentEntry({
      school: toSchoolId,
      schoolName: toSchool?.schoolName || toSchool?.name || "",
      grade: targetGrade,
      rollNumber,
      academicYear: toYear,
    })
  );

  student.school = toSchoolId;
  student.grade = targetGrade;
  student.rollNumber = rollNumber;
  student.username = newUsername;
  student.status = "ACTIVE";
  student.statusChangedAt = new Date();
  student.statusChangedBy = session.user.id;
  student.statusReason = "Transferred to a new school";

  await student.save();

  transfer.toGrade = targetGrade;
  transfer.toRollNumber = rollNumber;
  transfer.toAcademicYear = toYear?.year || "";
  transfer.toAcademicYearStart = toYear?.yearStart ?? null;
  transfer.status = transfer.status === "PENDING" ? "APPROVED" : "COMPLETED";
  transfer.decidedBy = session.user.id;
  transfer.decidedAt = new Date();
  await transfer.save();

  await Promise.all([
    fromYear?._id
      ? AcademicYear.updateOne(
          { _id: fromYear._id },
          { $inc: { "summary.transferredOut": 1 } }
        )
      : Promise.resolve(),
    toYear?._id
      ? AcademicYear.updateOne(
          { _id: toYear._id },
          { $inc: { "summary.transferredIn": 1 } }
        )
      : Promise.resolve(),
  ]);

  return { newUsername };
}

export async function PUT(req, { params }) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) return errorResponse(403, "Forbidden", "FORBIDDEN");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();

    await connectDB();

    const transfer = await StudentTransfer.findById(id);
    if (!transfer) return errorResponse(404, "Transfer request not found.");

    const isOrigin = String(transfer.fromSchool || "") === String(schoolId);
    const isDestination = String(transfer.toSchool || "") === String(schoolId);

    if (action === "cancel") {
      const canCancelLegacy =
        transfer.status === "PENDING" &&
        (isDestination || String(transfer.requestedBy || "") === String(session.user.id));
      const canCancelReleased =
        isOrigin && ["RELEASED", "PENDING_ADMISSION"].includes(transfer.status);

      if (!canCancelLegacy && !canCancelReleased) {
        return errorResponse(403, "This school cannot cancel this transfer.");
      }
      if (transfer.status === "COMPLETED" || transfer.status === "APPROVED") {
        return errorResponse(409, "This transfer can no longer be cancelled here.");
      }
      transfer.status = "CANCELLED";
      transfer.decidedBy = session.user.id;
      transfer.decidedAt = new Date();
      transfer.decisionReason = canCancelReleased
        ? "Cancelled by releasing school before admission completion"
        : String(body.reason || "").trim();
      await transfer.save();
      return successResponse(200, "Transfer request cancelled.");
    }

    if (action === "approve" && transfer.status === "PENDING") {
      if (!isOrigin) {
        return errorResponse(403, "Only the student's current school can approve this.");
      }
      const result = await moveStudent({
        transfer,
        session,
        toGrade: transfer.toGrade,
        toRollNumber: transfer.toRollNumber,
      });
      if (result.error) return result.error;
      return successResponse(200, "Transfer approved. The student has moved.", {
        newUsername: result.newUsername,
      });
    }

    if (action === "reject" && transfer.status === "PENDING") {
      if (!isOrigin) {
        return errorResponse(403, "Only the student's current school can reject this.");
      }
      transfer.status = "REJECTED";
      transfer.decidedBy = session.user.id;
      transfer.decidedAt = new Date();
      transfer.decisionReason = String(body.reason || "").trim();
      await transfer.save();
      await notifyTransferRejected({
        transfer,
        type: "claim",
        reason: transfer.decisionReason,
      });
      return successResponse(200, "Transfer request rejected.");
    }

    if (action === "approve_release") {
      if (!isOrigin || transfer.status !== "PENDING_RELEASE") {
        return errorResponse(403, "Only the current school can approve this release.");
      }
      transfer.status = "RELEASED";
      transfer.transferCode = generateTransferCode();
      transfer.releasedBy = session.user.id;
      transfer.releasedAt = new Date();
      await transfer.save();
      return successResponse(200, "Transfer release approved. Code issued.", {
        transferCode: transfer.transferCode,
      });
    }

    if (action === "reject_release") {
      if (!isOrigin || transfer.status !== "PENDING_RELEASE") {
        return errorResponse(403, "Only the current school can reject this release.");
      }
      transfer.status = "REJECTED";
      transfer.decidedBy = session.user.id;
      transfer.decidedAt = new Date();
      transfer.decisionReason = String(body.reason || "").trim();
      await transfer.save();
      await notifyTransferRejected({
        transfer,
        type: "release",
        reason: transfer.decisionReason,
      });
      return successResponse(200, "Transfer release rejected.");
    }

    if (action === "approve_admission") {
      if (!isDestination || transfer.status !== "PENDING_ADMISSION") {
        return errorResponse(403, "Only the selected school can approve admission.");
      }
      const result = await moveStudent({
        transfer,
        session,
        toGrade: body.toGrade,
        toRollNumber: body.toRollNumber,
      });
      if (result.error) return result.error;
      return successResponse(200, "Admission approved. The student has moved.", {
        newUsername: result.newUsername,
      });
    }

    if (action === "reject_admission") {
      if (!isDestination || transfer.status !== "PENDING_ADMISSION") {
        return errorResponse(403, "Only the selected school can reject admission.");
      }
      transfer.status = "RELEASED";
      transfer.toSchool = null;
      transfer.targetSelectedAt = null;
      transfer.toGrade = "";
      transfer.toRollNumber = "";
      transfer.decidedBy = session.user.id;
      transfer.decidedAt = new Date();
      transfer.decisionReason = String(body.reason || "").trim();
      await transfer.save();
      await notifyTransferRejected({
        transfer,
        type: "admission",
        reason: transfer.decisionReason,
      });
      return successResponse(
        200,
        "Admission rejected. The student can choose another school."
      );
    }

    return errorResponse(400, "Invalid transfer action for the current status.");
  } catch (err) {
    if (err?.code === 11000) {
      return errorResponse(
        409,
        "A roll number or username conflict blocked the transfer. Adjust and retry."
      );
    }
    console.error("PUT /api/students/transfer/[id] error:", err);
    return internalServerError("Failed to process transfer");
  }
}
