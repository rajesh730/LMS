import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import Conversation from "@/models/Conversation";
import { successResponse, internalServerError } from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import { escapeRegex } from "@/lib/pagination";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";
import { TOPIC_CATALOGUE } from "@/lib/parentMessaging";
import { mergeDuplicateConversations } from "@/lib/mergeConversations";

export const dynamic = "force-dynamic";

// One screen of people. Past this a school should narrow by class or search
// rather than scroll, and the reads stay bounded on a small Atlas cluster.
const MAX_PEOPLE = 150;
const MAX_THREADS = 60;

/**
 * The people a school can message, with their conversation folded in.
 *
 * A pure inbox can only show parents who wrote first, which makes school →
 * parent contact a separate feature living behind a "new message" button. This
 * endpoint returns GUARDIANS instead, each carrying their thread when one
 * exists — so one list answers both "who is waiting for a reply?" and "who do I
 * want to talk to?".
 *
 * Scope decides who is in the list:
 *   ALL     every guardian, conversations first
 *   GRADE   guardians of one class
 *   CHOOSE  guardians matching a search
 *
 * Rows without a `conversationId` have no thread yet. They are not an error
 * state — they are the parents nobody has messaged, which is precisely who a
 * school most often needs.
 */
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
    const schoolId = getSessionSchoolId(session);
    const requested = String(searchParams.get("scope") || "").toUpperCase();
    const scope = ["ALL", "GRADE", "CHOOSE"].includes(requested)
      ? requested
      : "ALL";
    const grade = searchParams.get("grade") || "";
    const search = String(searchParams.get("search") || "").trim();

    // Same fold as the inbox: one thread per guardian per child.
    await mergeDuplicateConversations(schoolId);

    const linkQuery = { school: schoolId, status: "ACTIVE" };
    let scopedStudentIds = null;

    // --- A whole class -------------------------------------------------------
    if (scope === "GRADE") {
      if (!grade) {
        return successResponse(200, "Choose a class", {
          rows: [],
          needsGrade: true,
        });
      }

      // Grades are stored inconsistently in production ("9" / "Grade 9" /
      // "Class 9"), so match every equivalent spelling.
      const students = await Student.find({
        school: schoolId,
        isDeleted: { $ne: true },
        status: { $ne: "INACTIVE" },
        grade: { $in: getEquivalentGradeValues(grade) },
      })
        .select("_id")
        .lean();

      scopedStudentIds = students.map((student) => student._id);
      if (scopedStudentIds.length === 0) {
        return successResponse(200, "Directory loaded", { rows: [] });
      }
      linkQuery.student = { $in: scopedStudentIds };
    }

    // --- Search by either name ----------------------------------------------
    // A school thinks in both directions: "Aayush's mother" and "Mina BK". Both
    // have to find the same row, so the search hits students AND parents and
    // takes the union of their links.
    if (search) {
      const safe = escapeRegex(search);
      const [students, parents] = await Promise.all([
        Student.find({
          school: schoolId,
          isDeleted: { $ne: true },
          name: { $regex: safe, $options: "i" },
        })
          .select("_id")
          .lean(),
        Parent.find({
          isDeleted: { $ne: true },
          name: { $regex: safe, $options: "i" },
        })
          .select("_id")
          .lean(),
      ]);

      // Top-level fields AND with $or, so a parent-name hit still has to sit
      // inside the chosen class when both filters are active.
      linkQuery.$or = [
        { student: { $in: students.map((student) => student._id) } },
        { parent: { $in: parents.map((parent) => parent._id) } },
      ];
    }

    const links = await ParentStudentLink.find(linkQuery)
      .select("parent student relationshipType canMessageSchool isPrimaryGuardian")
      .limit(MAX_PEOPLE)
      .lean();

    // --- Their conversations -------------------------------------------------
    const conversationQuery = { school: schoolId, isDeleted: { $ne: true } };
    if (scopedStudentIds) {
      conversationQuery.student = { $in: scopedStudentIds };
    }
    if (search) {
      // Without this a search would show every thread in the school alongside
      // the handful of people who actually matched.
      conversationQuery.student = { $in: links.map((link) => link.student) };
      conversationQuery["participants.parent"] = {
        $in: links.map((link) => link.parent),
      };
    }

    const needConversations = !search || links.length > 0;
    const conversations = needConversations
      ? await Conversation.find(conversationQuery)
          .sort({ lastMessageAt: -1 })
          .limit(MAX_THREADS)
          .populate("student", "name grade")
          .select(
            "student participants topic lastMessageAt lastMessagePreview lastMessageSenderType"
          )
          .lean()
      : [];

    const parentIds = Array.from(
      new Set(links.map((link) => String(link.parent)))
    );
    const studentIds = Array.from(
      new Set(links.map((link) => String(link.student)))
    );

    const [parents, students] = await Promise.all([
      parentIds.length
        ? Parent.find({
            _id: { $in: parentIds },
            isDeleted: { $ne: true },
            status: "ACTIVE",
          })
            .select("name accessState")
            .lean()
        : [],
      studentIds.length
        ? Student.find({ _id: { $in: studentIds } })
            .select("name grade")
            .lean()
        : [],
    ]);

    const parentById = new Map(parents.map((p) => [String(p._id), p]));
    const studentById = new Map(students.map((s) => [String(s._id), s]));

    // --- Merge ---------------------------------------------------------------
    // Keyed on parent + child, which is exactly what makes a thread unique.
    const rowByKey = new Map();

    links.forEach((link) => {
      const parent = parentById.get(String(link.parent));
      const student = studentById.get(String(link.student));
      if (!parent || !student) return;

      const key = `${link.parent}:${link.student}`;
      rowByKey.set(key, {
        key,
        linkId: String(link._id),
        guardianName: parent.name,
        relationship: relationshipLabel(link.relationshipType),
        isPrimary: Boolean(link.isPrimaryGuardian),
        // A guardian who has not activated still gets the thread; the school
        // just should not expect an answer today.
        connected: parent.accessState === "ACTIVATED",
        canReply: link.canMessageSchool !== false,
        studentId: String(link.student),
        studentName: student.name,
        grade: student.grade || "",
        conversationId: null,
        emoji: "💬",
        preview: "",
        lastMessageAt: null,
        lastMessageSenderType: "",
        unreadCount: 0,
      });
    });

    conversations.forEach((conversation) => {
      const parentPart = (conversation.participants || []).find(
        (p) => p.participantType === "PARENT"
      );
      const staffPart = (conversation.participants || []).find(
        (p) => p.participantType === "STAFF"
      );
      if (!parentPart?.parent || !conversation.student) return;

      const key = `${parentPart.parent}:${conversation.student._id}`;
      const catalogue = TOPIC_CATALOGUE.find(
        (entry) => entry.topic === conversation.topic
      );

      // A thread whose link fell outside the window above still belongs in the
      // list — losing a parent's message because the roster page moved on would
      // be the worst failure this screen has.
      const base = rowByKey.get(key) || {
        key,
        linkId: null,
        guardianName: parentPart.displayName || "Guardian",
        relationship: "Guardian",
        isPrimary: false,
        connected: false,
        canReply: true,
        studentId: String(conversation.student._id),
        studentName: conversation.student.name || "",
        grade: conversation.student.grade || "",
      };

      rowByKey.set(key, {
        ...base,
        conversationId: String(conversation._id),
        emoji: catalogue?.emoji || "💬",
        preview: conversation.lastMessagePreview || "",
        lastMessageAt: conversation.lastMessageAt,
        lastMessageSenderType: conversation.lastMessageSenderType || "",
        unreadCount: staffPart?.unreadCount || 0,
      });
    });

    // Live conversations first, newest at the top; everyone else alphabetically
    // by child, which is how a class list is read.
    const rows = Array.from(rowByKey.values()).sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return (a.studentName || "").localeCompare(b.studentName || "");
    });

    return successResponse(200, "Directory loaded", {
      rows,
      scope,
      unread: rows.filter((row) => row.unreadCount > 0).length,
      // Everyone reachable in this scope — what a "message the whole class"
      // send would actually cost.
      messageable: rows.filter((row) => row.linkId).length,
      truncated: links.length >= MAX_PEOPLE,
    });
  } catch (err) {
    console.error("GET /api/school/messages/people error:", err);
    return internalServerError("Failed to load parents");
  }
}

function relationshipLabel(value) {
  if (!value) return "Guardian";
  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
