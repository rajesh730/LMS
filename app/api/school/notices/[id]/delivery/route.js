import connectDB from "@/lib/db";
import Notice from "@/models/Notice";
import NoticeReceipt from "@/models/NoticeReceipt";
import "@/models/Parent";
import "@/models/Student";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId, sameId } from "@/lib/authz";
import {
  publishNotice,
  resolveNoticeRecipients,
  describeReachability,
} from "@/lib/notifications/service";
import { normalizeNoticePriority } from "@/lib/notifications/NotificationChannel";

export const dynamic = "force-dynamic";

/**
 * Notice delivery overview and offline follow-up (§37, §38, §39).
 *
 * GET   — real delivery metrics plus the follow-up list.
 * POST  — publish (or re-run) delivery across channels.
 * PATCH — record a paper hand-over or an in-person acknowledgement.
 *
 * Every number returned here is derived from actual receipt records. §37 is
 * explicit — "Do not invent delivery success" — so there is no estimated or
 * assumed delivery anywhere in this file.
 */

async function authoriseNotice(session, noticeId) {
  await connectDB();

  const notice = await Notice.findById(noticeId).lean();
  if (!notice) {
    return { error: errorResponse(404, "Notice not found", "NOT_FOUND") };
  }

  const schoolId = getSessionSchoolId(session);
  if (
    session.user.role !== "SUPER_ADMIN" &&
    !sameId(schoolId, notice.school)
  ) {
    // Tenant isolation (§56) — same 404 so School B notices are not
    // discoverable from School A.
    return { error: errorResponse(404, "Notice not found", "NOT_FOUND") };
  }

  return { notice };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
      "TEACHER",
    ]);
    if (error) return error;

    const authorised = await authoriseNotice(session, id);
    if (authorised.error) return authorised.error;

    const { notice } = authorised;

    const [recipients, receipts] = await Promise.all([
      resolveNoticeRecipients(notice),
      NoticeReceipt.find({ notice: notice._id })
        .select(
          "parent student openedAt acknowledgedAt consentDecision deliveries"
        )
        .lean(),
    ]);

    const receiptByKey = new Map(
      receipts.map((r) => [`${r.parent}:${r.student}`, r])
    );

    let opened = 0;
    let digitalUnread = 0;
    let emailAvailable = 0;
    let offlineFollowUp = 0;
    let acknowledged = 0;
    let consentYes = 0;
    let consentNo = 0;

    const followUp = [];

    recipients.forEach(({ parent, student, link }) => {
      const receipt = receiptByKey.get(`${parent._id}:${student._id}`);
      const reach = describeReachability(parent, link);

      if (receipt?.openedAt) {
        opened += 1;
      } else if (reach.key === "CONNECTED") {
        digitalUnread += 1;
      }

      if (receipt?.acknowledgedAt) acknowledged += 1;
      if (receipt?.consentDecision === "YES") consentYes += 1;
      if (receipt?.consentDecision === "NO") consentNo += 1;

      if (reach.key === "EMAIL") emailAvailable += 1;

      // The follow-up list: guardians no digital channel reached AND who have
      // not been recorded as handled on paper.
      const handledOnPaper = (receipt?.deliveries || []).some(
        (d) => d.channel === "PAPER"
      );
      const needsFollowUp =
        !receipt?.openedAt &&
        !handledOnPaper &&
        ["OFFLINE", "PHONE"].includes(reach.key);

      if (needsFollowUp) {
        offlineFollowUp += 1;
        followUp.push({
          // Only what a staff member needs to find the family and hand over a
          // sheet. No email, no Parent ID, no portfolio data (§38).
          studentName: student.name,
          grade: student.grade || "",
          guardianName: parent.isHousehold
            ? parent.householdName || parent.name
            : parent.name,
          relationshipType: link.relationshipType || "",
          contactMethod: parent.phone ? "Phone" : "None on file",
          phone: parent.phone || "",
          receiptKey: `${parent._id}:${student._id}`,
          parentId: String(parent._id),
          studentId: String(student._id),
        });
      }
    });

    followUp.sort(
      (a, b) =>
        a.grade.localeCompare(b.grade) ||
        a.studentName.localeCompare(b.studentName)
    );

    return successResponse(200, "Delivery overview", {
      notice: {
        id: String(notice._id),
        title: notice.title,
        priority: normalizeNoticePriority(notice),
        requiresAcknowledgement: Boolean(notice.requiresAcknowledgement),
        requiresConsent: Boolean(notice.requiresConsent),
        publishedAt: notice.publishedAt,
      },
      metrics: {
        guardians: recipients.length,
        opened,
        digitalUnread,
        emailAvailable,
        offlineFollowUp,
        acknowledged,
        consentYes,
        consentNo,
      },
      followUp,
    });
  } catch (err) {
    console.error("GET /api/school/notices/[id]/delivery error:", err);
    return internalServerError("Failed to load delivery overview");
  }
}

/** Run delivery across all configured channels (§24 — publish once). */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
    ]);
    if (error) return error;

    const authorised = await authoriseNotice(session, id);
    if (authorised.error) return authorised.error;

    const result = await publishNotice(id);

    return successResponse(200, "Notice delivered", result);
  } catch (err) {
    console.error("POST /api/school/notices/[id]/delivery error:", err);
    return internalServerError("Failed to deliver notice");
  }
}

/**
 * Record a paper hand-over or an in-person acknowledgement (§39).
 *
 * The critical rule: recording a PAPER delivery must NOT set `openedAt`.
 * Handing someone a sheet is not evidence they read it, and quietly marking it
 * read would corrupt the school's own picture of who actually knows.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
      "TEACHER",
    ]);
    if (error) return error;

    const authorised = await authoriseNotice(session, id);
    if (authorised.error) return authorised.error;

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").toUpperCase();

    if (!body.parentId || !body.studentId) {
      return validationError("parentId and studentId are required");
    }

    const filter = {
      notice: id,
      parent: body.parentId,
      student: body.studentId,
    };

    if (action === "PAPER_DELIVERED") {
      await NoticeReceipt.updateOne(
        filter,
        {
          $setOnInsert: {
            ...filter,
            school: authorised.notice.school,
            deliveredAt: new Date(),
          },
          $push: {
            deliveries: {
              channel: "PAPER",
              // Not "SENT" — a person physically handed it over.
              status: "HANDED_OVER",
              attemptedAt: new Date(),
              recordedBy: session.user.id,
              note: String(body.note || "").slice(0, 200),
            },
          },
        },
        { upsert: true }
      );

      // Deliberately NOT setting openedAt. See the note above.
      return successResponse(200, "Paper delivery recorded", null);
    }

    if (action === "ACKNOWLEDGED_IN_PERSON") {
      await NoticeReceipt.updateOne(
        { ...filter, acknowledgedAt: null },
        {
          $set: {
            acknowledgedAt: new Date(),
            // Flags this as a staff-recorded confirmation rather than the
            // guardian pressing the button themselves.
            acknowledgementMethod: "IN_PERSON",
            acknowledgementRecordedBy: session.user.id,
          },
        }
      );
      return successResponse(200, "Acknowledgement recorded", null);
    }

    return validationError("Unknown action");
  } catch (err) {
    console.error("PATCH /api/school/notices/[id]/delivery error:", err);
    return internalServerError("Failed to record delivery");
  }
}
