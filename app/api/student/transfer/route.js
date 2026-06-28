import connectDB from "@/lib/db";
import Student from "@/models/Student";
import StudentTransfer from "@/models/StudentTransfer";
import User from "@/models/User";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession } from "@/lib/authz";
import {
  notifyReleaseRequested,
  notifyAdmissionRequested,
} from "@/lib/transferNotifications";

function serializeSchool(school) {
  if (!school) return null;
  return {
    id: String(school._id || school.id),
    name: school.schoolName || school.name || "School",
    location: school.schoolLocation || "",
    province: school.province || "",
    district: school.district || "",
  };
}

function serializeTransfer(transfer) {
  if (!transfer) return null;
  return {
    id: String(transfer._id),
    status: transfer.status,
    transferCode: transfer.transferCode || "",
    reason: transfer.reason || "",
    toGrade: transfer.toGrade || "",
    toRollNumber: transfer.toRollNumber || "",
    requestedAt: transfer.createdAt,
    releasedAt: transfer.releasedAt,
    targetSelectedAt: transfer.targetSelectedAt,
    decidedAt: transfer.decidedAt,
    decisionReason: transfer.decisionReason || "",
    fromSchool: serializeSchool(transfer.fromSchool),
    toSchool: serializeSchool(transfer.toSchool),
  };
}

async function getStudentTransferData(studentId) {
  const student = await Student.findById(studentId)
    .select("name grade rollNumber platformStudentId school")
    .populate("school", "schoolName name schoolLocation")
    .lean();

  if (!student) return null;

  const transfer = await StudentTransfer.findOne({
    student: studentId,
    status: { $in: ["PENDING_RELEASE", "RELEASED", "PENDING_ADMISSION", "PENDING"] },
  })
    .sort({ createdAt: -1 })
    .populate("fromSchool", "schoolName name schoolLocation")
    .populate("toSchool", "schoolName name schoolLocation")
    .lean();

  const schools = await User.find({
    role: "SCHOOL_ADMIN",
    status: { $in: ["APPROVED", "SUBSCRIBED"] },
    _id: { $ne: student.school?._id || student.school },
  })
    .select("schoolName name schoolLocation province district")
    .sort({ schoolName: 1, name: 1 })
    .limit(500)
    .lean();

  const profiles = await SchoolShowcaseProfile.find({
    school: { $in: schools.map((school) => school._id) },
  })
    .select("school coverImageUrl")
    .lean();
  const logoBySchool = new Map(
    profiles.map((profile) => [String(profile.school), profile.coverImageUrl || ""])
  );

  return {
    student: {
      id: String(student._id),
      name: student.name,
      grade: student.grade,
      rollNumber: student.rollNumber,
      platformStudentId: student.platformStudentId,
      currentSchool: serializeSchool(student.school),
    },
    transfer: serializeTransfer(transfer),
    schools: schools.map((school) => ({
      ...serializeSchool(school),
      logoUrl: logoBySchool.get(String(school._id)) || "",
    })),
  };
}

export async function GET() {
  try {
    const { session, error } = await requireApiSession(["STUDENT"]);
    if (error) return error;

    await connectDB();
    const data = await getStudentTransferData(session.user.id);
    if (!data) return errorResponse(404, "Student record not found.");

    return successResponse(200, "Transfer status loaded", data);
  } catch (err) {
    console.error("GET /api/student/transfer error:", err);
    return internalServerError("Failed to load transfer status");
  }
}

export async function POST(req) {
  try {
    const { session, error } = await requireApiSession(["STUDENT"]);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const reason = String(body.reason || "").trim().slice(0, 500);

    await connectDB();

    const student = await Student.findOne({
      _id: session.user.id,
      isDeleted: { $ne: true },
      status: "ACTIVE",
    })
      .select("name platformStudentId school")
      .populate("school", "schoolName name");

    if (!student) return errorResponse(404, "Student record not found.");

    const existing = await StudentTransfer.findOne({
      student: student._id,
      status: { $in: ["PENDING", "PENDING_RELEASE", "RELEASED", "PENDING_ADMISSION"] },
    }).select("_id status");

    if (existing) {
      return errorResponse(409, "You already have an active transfer request.");
    }

    const created = await StudentTransfer.create({
      student: student._id,
      platformStudentId: student.platformStudentId || "",
      fromSchool: student.school?._id || student.school,
      requestedByStudent: student._id,
      status: "PENDING_RELEASE",
      studentNameSnapshot: student.name || "",
      fromSchoolNameSnapshot:
        student.school?.schoolName || student.school?.name || "",
      reason,
    });

    await notifyReleaseRequested({ transfer: created });

    const data = await getStudentTransferData(session.user.id);
    return successResponse(
      201,
      "Transfer request sent to your current school.",
      data
    );
  } catch (err) {
    if (err?.code === 11000) {
      return errorResponse(409, "You already have an active transfer request.");
    }
    console.error("POST /api/student/transfer error:", err);
    return internalServerError("Failed to request transfer");
  }
}

export async function PATCH(req) {
  try {
    const { session, error } = await requireApiSession(["STUDENT"]);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();

    await connectDB();

    const transfer = await StudentTransfer.findOne({
      student: session.user.id,
      status: { $in: ["PENDING_RELEASE", "RELEASED", "PENDING_ADMISSION", "PENDING"] },
    });

    if (!transfer) return errorResponse(404, "No active transfer request found.");

    if (action === "cancel") {
      if (transfer.status === "COMPLETED") {
        return errorResponse(400, "Completed transfers cannot be cancelled.");
      }
      transfer.status = "CANCELLED";
      transfer.decidedAt = new Date();
      transfer.decisionReason = "Cancelled by student";
      await transfer.save();
      const data = await getStudentTransferData(session.user.id);
      return successResponse(200, "Transfer request cancelled.", data);
    }

    if (action !== "select_school") {
      return errorResponse(400, "Action must be select_school or cancel.");
    }

    if (transfer.status !== "RELEASED") {
      return errorResponse(
        409,
        "Your current school must approve release before you select a new school."
      );
    }

    const toSchool = String(body.toSchool || "").trim();
    if (!toSchool) return errorResponse(400, "Select the school you are joining.");

    const school = await User.findOne({
      _id: toSchool,
      role: "SCHOOL_ADMIN",
      status: { $in: ["APPROVED", "SUBSCRIBED"] },
    }).select("_id");

    if (!school) return errorResponse(404, "Selected school is not available.");
    if (String(school._id) === String(transfer.fromSchool)) {
      return errorResponse(400, "Select a different school.");
    }

    transfer.toSchool = school._id;
    transfer.status = "PENDING_ADMISSION";
    transfer.targetSelectedAt = new Date();
    await transfer.save();

    await notifyAdmissionRequested({ transfer });

    const data = await getStudentTransferData(session.user.id);
    return successResponse(
      200,
      "Admission request sent to the selected school.",
      data
    );
  } catch (err) {
    console.error("PATCH /api/student/transfer error:", err);
    return internalServerError("Failed to update transfer request");
  }
}
