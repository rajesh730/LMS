import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";
import { appendMessage } from "@/lib/parentMessaging";
import { notifyGuardians } from "@/lib/parentNotifications";

export const dynamic = "force-dynamic";

// A single send should stay something a school can reason about, and each
// recipient costs a conversation upsert plus a message write.
const MAX_RECIPIENTS = 500;

/**
 * Send a message from the school to guardians (§16).
 *
 * Targets a grade, selected students, or the whole school. Each guardian gets
 * it in their own thread, so a reply comes back privately rather than into a
 * group where other families would see it.
 *
 * Deliberately distinct from a Notice: a notice is a formal record with read
 * receipts, acknowledgement and consent. This is conversation — "the bus will
 * be late", "please bring a water bottle". Using a notice for that would train
 * parents to ignore notices, which is exactly what must not happen to the
 * channel that also carries school closures.
 */

/** Preview: how many guardians would this reach? */
export async function GET(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
      "TEACHER",
    ]);
    if (error) return error;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const recipients = await collectRecipients({
      schoolId: getSessionSchoolId(session),
      grade: searchParams.get("grade") || "",
    });

    return successResponse(200, "Recipients", {
      total: recipients.length,
      // Guardians who cannot yet sign in will still get the thread waiting for
      // them, but the school should know they will not see it today.
      connected: recipients.filter((r) => r.parent.accessState === "ACTIVATED")
        .length,
      notConnected: recipients.filter(
        (r) => r.parent.accessState !== "ACTIVATED"
      ).length,
    });
  } catch (err) {
    console.error("GET /api/school/guardians/message error:", err);
    return internalServerError("Failed to load recipients");
  }
}

export async function POST(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
      "TEACHER",
    ]);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const message = String(body.message || "").trim();
    // Capped here rather than trusted: both `Conversation.subject` and
    // `Message.subject` cap at 200, and a longer one would fail validation
    // mid-loop — turning an over-long headline into a partial send.
    const subject = String(body.subject || "").trim().slice(0, 200);
    const grade = body.grade || "";
    const studentIds = Array.isArray(body.studentIds) ? body.studentIds : null;
    // ONE specific guardian, by their ParentStudentLink. The separated-family
    // case depends on this: selecting a student messages every guardian of that
    // child, which is exactly wrong when the school needs a private word with
    // one of them (§19).
    const linkId = String(body.linkId || "").trim();
    // Exact guardians chosen by name in the composer. Distinct from
    // `studentIds`, which reaches EVERY guardian of those children — picking
    // people by name is what stops a message going to a parent the school did
    // not mean to include.
    const linkIds = Array.isArray(body.linkIds)
      ? body.linkIds.map((id) => String(id)).filter(Boolean)
      : null;

    if (!message) return validationError("Please write a message");
    if (!linkId && !linkIds?.length && !grade && !studentIds && body.scope !== "ALL") {
      return validationError(
        "Choose who to send this to"
      );
    }

    await connectDB();

    const schoolId = getSessionSchoolId(session);
    const school = await User.findById(schoolId)
      .select("schoolName name")
      .lean();
    const schoolName = school?.schoolName || school?.name || "School";

    const recipients = await collectRecipients({
      schoolId,
      grade,
      studentIds,
      linkId,
      linkIds,
    });

    if (recipients.length === 0) {
      return errorResponse(404, "No guardians match that selection", "NO_RECIPIENTS");
    }
    if (recipients.length > MAX_RECIPIENTS) {
      return errorResponse(
        400,
        `That would message ${recipients.length} guardians. Please send it one grade at a time (maximum ${MAX_RECIPIENTS}).`,
        "TOO_MANY"
      );
    }

    let sent = 0;
    const failures = [];

    for (const { parent, student } of recipients) {
      try {
        // The guardian's single thread for this child — the same one their own
        // messages land in. Announcements used to open a SEPARATE thread, so a
        // parent who replied to one appeared twice in the inbox.
        let conversation = await Conversation.findOne({
          student: student._id,
          school: schoolId,
          isDeleted: { $ne: true },
          "participants.parent": parent._id,
        }).sort({ createdAt: 1 });

        if (!conversation) {
          conversation = await Conversation.create({
            school: schoolId,
            student: student._id,
            topic: "ADMINISTRATION",
            routedToLabel: schoolName,
            subject: subject || schoolName,
            originType: "SCHOOL_ANNOUNCEMENT",
            participants: [
              {
                participantType: "PARENT",
                parent: parent._id,
                displayName: parent.name,
                lastReadAt: null,
                unreadCount: 0,
              },
              {
                participantType: "STAFF",
                staff: session.user.id,
                staffModel: "User",
                displayName: schoolName,
                lastReadAt: new Date(),
                unreadCount: 0,
              },
            ],
          });
        }

        // The subject travels with EVERY send, not just the one that happened
        // to create the thread. A guardian keeps one thread per child for
        // years, so binding the headline to thread creation meant the school
        // typed "Sports day" and the parent saw an unlabelled message.
        await appendMessage({
          conversation,
          senderType: "STAFF",
          senderStaff: session.user.id,
          senderStaffModel: "User",
          senderName: schoolName,
          subject,
          body: message,
        });

        sent += 1;
      } catch (err) {
        failures.push({ studentName: student.name, reason: err.message });
      }
    }

    // A message the parent never learns about is not a message. Fire-and-forget
    // per the notification contract — a failure here must not fail the send.
    const studentIdsTouched = Array.from(
      new Set(recipients.map((r) => String(r.student._id)))
    );

    const notificationTitle = (
      subject ? `${subject.slice(0, 120)} — ${schoolName}` : `Message from ${schoolName}`
    ).slice(0, 180);
    await Promise.all(
      studentIdsTouched.map((studentId) =>
        notifyGuardians({
          studentId,
          category: "MESSAGE",
          priority: "INFO",
          // The subject leads when there is one: "Sports day" tells a guardian
          // whether to open this now far better than "Message from …" does,
          // and the school name is already the notification's context.
          // Kept inside UserNotification.title's 180-character limit — an
          // over-long title fails validation, and this call is fire-and-forget,
          // so the failure would be a notification nobody ever receives.
          title: notificationTitle,
          message: message.slice(0, 160),
          href: "/parent/messages",
          metadata: { from: "SCHOOL" },
        })
      )
    ).catch((err) =>
      console.error("[school message] notify failed:", err.message)
    );

    return successResponse(200, "Message sent", {
      sent,
      failures,
      notConnected: recipients.filter(
        (r) => r.parent.accessState !== "ACTIVATED"
      ).length,
      // Guardians the school has not enabled messaging for. They will receive
      // this, but cannot write back.
      cannotReply: recipients.filter((r) => r.canReply === false).length,
    });
  } catch (err) {
    console.error("POST /api/school/guardians/message error:", err);
    return internalServerError("Failed to send the message");
  }
}

/**
 * Guardians who may be messaged for this selection.
 *
 * Filtered on `canMessageSchool` — a guardian the school restricted to
 * view-only should not be dragged into a conversation they cannot reply to.
 */
async function collectRecipients({
  schoolId,
  grade,
  studentIds = null,
  linkId = "",
  linkIds = null,
}) {
  // Named guardians. Resolved from the links themselves so the school and the
  // child both come from the authorised records rather than the request.
  if (linkIds?.length) {
    const links = await ParentStudentLink.find({
      _id: { $in: linkIds },
      school: schoolId,
      status: "ACTIVE",
    })
      .select("parent student canMessageSchool")
      .lean();

    if (links.length === 0) return [];

    const [parents, students] = await Promise.all([
      Parent.find({
        _id: { $in: links.map((l) => l.parent) },
        isDeleted: { $ne: true },
        status: "ACTIVE",
      })
        .select("name accessState")
        .lean(),
      Student.find({ _id: { $in: links.map((l) => l.student) } })
        .select("name grade")
        .lean(),
    ]);

    const parentById = new Map(parents.map((p) => [String(p._id), p]));
    const studentById = new Map(students.map((s) => [String(s._id), s]));

    return links
      .map((link) => {
        const parent = parentById.get(String(link.parent));
        const student = studentById.get(String(link.student));
        if (!parent || !student) return null;
        return {
          parent,
          student,
          canReply: link.canMessageSchool !== false,
        };
      })
      .filter(Boolean);
  }

  // Single-guardian path. Resolved from the link itself so the school and the
  // child both come from the authorised record rather than the request.
  if (linkId) {
    const link = await ParentStudentLink.findOne({
      _id: linkId,
      school: schoolId,
      status: "ACTIVE",
    })
      .select("parent student canMessageSchool")
      .lean();

    if (!link) return [];

    const [parent, student] = await Promise.all([
      Parent.findOne({
        _id: link.parent,
        isDeleted: { $ne: true },
        status: "ACTIVE",
      })
        .select("name accessState")
        .lean(),
      Student.findById(link.student).select("name grade").lean(),
    ]);

    if (!parent || !student) return [];

    // Deliberately NOT filtered on `canMessageSchool` here, unlike the bulk
    // path. The school has picked this individual on purpose, and refusing
    // would be obstructive — but the guardian cannot reply if messaging is off
    // for them, so that is reported back rather than hidden.
    return [{ parent, student, canReply: link.canMessageSchool !== false }];
  }

  const studentQuery = {
    school: schoolId,
    isDeleted: { $ne: true },
    status: { $ne: "INACTIVE" },
  };

  if (Array.isArray(studentIds) && studentIds.length > 0) {
    studentQuery._id = { $in: studentIds };
  } else if (grade) {
    studentQuery.grade = { $in: getEquivalentGradeValues(grade) };
  }

  const students = await Student.find(studentQuery)
    .select("name grade")
    .lean();
  if (students.length === 0) return [];

  const links = await ParentStudentLink.find({
    student: { $in: students.map((s) => s._id) },
    status: "ACTIVE",
    canMessageSchool: true,
  })
    .select("parent student")
    .lean();
  if (links.length === 0) return [];

  const parents = await Parent.find({
    _id: { $in: Array.from(new Set(links.map((l) => String(l.parent)))) },
    isDeleted: { $ne: true },
    status: "ACTIVE",
  })
    .select("name accessState")
    .lean();

  const parentById = new Map(parents.map((p) => [String(p._id), p]));
  const studentById = new Map(students.map((s) => [String(s._id), s]));

  return links
    .map((link) => {
      const parent = parentById.get(String(link.parent));
      const student = studentById.get(String(link.student));
      if (!parent || !student) return null;
      return { parent, student };
    })
    .filter(Boolean);
}
