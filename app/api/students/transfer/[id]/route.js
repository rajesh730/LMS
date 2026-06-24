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
import { generateUniqueStudentUsername } from "@/lib/studentIdentity";
import {
  ensureActiveAcademicYear,
  makeEnrollmentEntry,
  closeCurrentEnrollments,
} from "@/lib/studentEnrollment";

// PUT { action: "approve" | "reject" | "cancel" }
// approve/reject: by the origin school (the student is leaving them).
// cancel: by the requesting (new) school.
export async function PUT(req, { params }) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) return errorResponse(403, "Forbidden", "FORBIDDEN");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();

    if (!["approve", "reject", "cancel"].includes(action)) {
      return errorResponse(400, "Action must be approve, reject, or cancel.");
    }

    await connectDB();

    const transfer = await StudentTransfer.findById(id);
    if (!transfer || transfer.status !== "PENDING") {
      return errorResponse(404, "Transfer request not found or already decided.");
    }

    const isOrigin = String(transfer.fromSchool || "") === String(schoolId);
    const isRequester = String(transfer.toSchool || "") === String(schoolId);

    if (action === "cancel") {
      if (!isRequester) {
        return errorResponse(403, "Only the requesting school can cancel this.");
      }
      transfer.status = "CANCELLED";
      transfer.decidedBy = session.user.id;
      transfer.decidedAt = new Date();
      await transfer.save();
      return successResponse(200, "Transfer request cancelled.");
    }

    // approve / reject — origin school only.
    if (!isOrigin) {
      return errorResponse(
        403,
        "Only the student's current school can approve or reject this."
      );
    }

    if (action === "reject") {
      transfer.status = "REJECTED";
      transfer.decidedBy = session.user.id;
      transfer.decidedAt = new Date();
      transfer.decisionReason = String(body.reason || "").trim();
      await transfer.save();
      return successResponse(200, "Transfer request rejected.");
    }

    // ── approve: move the SAME student document to the new school ──
    const student = await Student.findById(transfer.student);
    if (!student || student.isDeleted) {
      return errorResponse(404, "Student record not found.");
    }
    if (String(student.school || "") !== String(transfer.fromSchool || "")) {
      return errorResponse(
        409,
        "This student is no longer at your school. The request is stale."
      );
    }

    const toSchoolId = transfer.toSchool;
    const toGrade = transfer.toGrade || student.grade;
    const rollNumber = transfer.toRollNumber || student.rollNumber;

    // Roll number must be free among on-roster students in the target grade.
    const rollClash = await Student.findOne({
      school: toSchoolId,
      grade: toGrade,
      rollNumber,
      isDeleted: { $ne: true },
      status: { $nin: ["ALUMNI", "GRADUATED", "INACTIVE"] },
      _id: { $ne: student._id },
    }).select("_id");
    if (rollClash) {
      return errorResponse(
        409,
        `Roll number ${rollNumber} is already used in ${toGrade} at the new school. The new school should set a different roll number and re-request.`
      );
    }

    const [toSchool, toYear, fromYear] = await Promise.all([
      User.findById(toSchoolId).select("schoolName name").lean(),
      ensureActiveAcademicYear(toSchoolId),
      ensureActiveAcademicYear(transfer.fromSchool),
    ]);

    const newUsername = await generateUniqueStudentUsername(Student, {
      firstName: student.firstName,
      grade: toGrade,
      rollNumber,
      school: toSchoolId,
    });

    // Close the origin enrollment, open the new one — same document.
    closeCurrentEnrollments(student, "TRANSFERRED");
    student.enrollments.push(
      makeEnrollmentEntry({
        school: toSchoolId,
        schoolName: toSchool?.schoolName || toSchool?.name || "",
        grade: toGrade,
        rollNumber,
        academicYear: toYear,
      })
    );

    student.school = toSchoolId;
    student.grade = toGrade;
    student.rollNumber = rollNumber;
    student.username = newUsername;
    student.status = "ACTIVE";
    student.statusChangedAt = new Date();
    student.statusChangedBy = session.user.id;
    student.statusReason = "Transferred to a new school";

    await student.save();

    transfer.status = "APPROVED";
    transfer.decidedBy = session.user.id;
    transfer.decidedAt = new Date();
    await transfer.save();

    // Reflect the move in both schools' current-year summaries.
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

    return successResponse(200, "Transfer approved. The student has moved.", {
      newUsername,
    });
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
