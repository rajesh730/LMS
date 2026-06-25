import UserNotification from "@/models/UserNotification";
import { publishRealtimeEvent } from "@/lib/realtimeBus";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";

const STUDENT_TRANSFER_HREF = "/student/transfer";
const SCHOOL_TRANSFER_HREF = "/school/dashboard?tab=student-transfers";

function withReason(message, reason) {
  const trimmed = String(reason || "").trim();
  return trimmed ? `${message} Reason: ${trimmed}` : message;
}

function buildStudentNotification({ transfer, title, message }) {
  if (!transfer?.student || !transfer?.fromSchool) return null;
  return {
    targetRole: "STUDENT",
    recipientStudent: transfer.student,
    school: transfer.fromSchool,
    category: "TRANSFER",
    title,
    message,
    href: STUDENT_TRANSFER_HREF,
    metadata: {
      transferId: String(transfer._id || ""),
      status: transfer.status || "",
    },
  };
}

function buildSchoolNotification({ transfer, schoolId, title, message }) {
  if (!schoolId) return null;
  return {
    targetRole: "SCHOOL_ADMIN",
    recipientUser: schoolId,
    school: schoolId,
    category: "TRANSFER",
    title,
    message,
    href: SCHOOL_TRANSFER_HREF,
    metadata: {
      transferId: String(transfer?._id || ""),
      status: transfer?.status || "",
    },
  };
}

/**
 * Notify the people involved when a transfer is rejected. A single
 * UserNotification surfaces in the bell dropdown, the Notices page, and the
 * sidebar red dot, so we just create the records and nudge realtime clients.
 *
 * type:
 *  - "release":   current school declined the student's release request.
 *  - "admission": chosen school declined the student's admission.
 *  - "claim":     legacy — current school declined a school-initiated request.
 */
export async function notifyTransferRejected({ transfer, type, reason } = {}) {
  if (!transfer) return;

  const name = transfer.studentNameSnapshot || "The student";
  const docs = [];
  let notifiedStudent = false;
  const notifiedSchoolIds = [];

  if (type === "release") {
    docs.push(
      buildStudentNotification({
        transfer,
        title: "Transfer request rejected",
        message: withReason(
          "Your current school declined your transfer release request.",
          reason
        ),
      })
    );
    notifiedStudent = true;
  } else if (type === "admission") {
    docs.push(
      buildStudentNotification({
        transfer,
        title: "Admission request rejected",
        message: withReason(
          "The school you selected declined your admission. You can choose another school.",
          reason
        ),
      })
    );
    notifiedStudent = true;

    if (transfer.fromSchool) {
      docs.push(
        buildSchoolNotification({
          transfer,
          schoolId: transfer.fromSchool,
          title: "Student admission rejected",
          message: withReason(
            `${name}'s admission was rejected by the selected school. They remain released and can choose another school.`,
            reason
          ),
        })
      );
      notifiedSchoolIds.push(String(transfer.fromSchool));
    }
  } else if (type === "claim") {
    const destinationSchool = transfer.toSchool;
    if (destinationSchool) {
      docs.push(
        buildSchoolNotification({
          transfer,
          schoolId: destinationSchool,
          title: "Transfer request rejected",
          message: withReason(
            `Your transfer request for ${name} was rejected by their current school.`,
            reason
          ),
        })
      );
      notifiedSchoolIds.push(String(destinationSchool));
    }
  }

  const validDocs = docs.filter(Boolean);
  if (validDocs.length === 0) return;

  await UserNotification.insertMany(validDocs);

  if (notifiedStudent) {
    publishRealtimeEvent("student-notifications", {
      kind: "student-transfer-rejected",
      transferId: String(transfer._id || ""),
    });
  }
  if (notifiedSchoolIds.length > 0) {
    publishRealtimeEvent("school-notifications", {
      kind: "school-transfer-rejected",
      transferId: String(transfer._id || ""),
    });
  }
  publishWorkIndicatorsUpdate("student-transfer-rejected", {
    transferId: String(transfer._id || ""),
    studentId: String(transfer.student || ""),
    schoolIds: notifiedSchoolIds,
  });
}
