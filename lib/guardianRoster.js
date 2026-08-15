/**
 * Guardian coverage across a whole school.
 *
 * The school-side question is NOT "who are this child's guardians?" (that is a
 * detail view) but **"which of my students has nobody connected?"** — a roster
 * question. This module answers it in a fixed number of queries regardless of
 * how many students the school has.
 *
 * It also surfaces the gap that matters most in a real rollout: student
 * registration has always collected `parentName` / `parentContactNumber` /
 * `parentEmail` as flat strings on the Student document, and none of that was
 * ever connected to a `Parent` account. A school with 300 carefully-registered
 * students has 300 sets of parent details the Parent App cannot see. The
 * `UNLINKED_DATA` coverage state makes those students findable so they can be
 * converted in bulk.
 */

// Registration writes these literals when the field is left blank, so they must
// never be treated as real contact information.
const PLACEHOLDER_VALUES = new Set([
  "to be added",
  "n/a",
  "na",
  "none",
  "-",
  "--",
  "nil",
  "not available",
  "not provided",
  "unknown",
]);

/**
 * Is this a real value a school actually typed, or registration filler?
 * Exported because the import path must apply exactly the same rule.
 */
export function isMeaningfulValue(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  return !PLACEHOLDER_VALUES.has(trimmed.toLowerCase());
}

/**
 * Does this student's registration record hold parent details worth importing?
 * A name alone is enough — a guardian needs no phone or email to hold a Parent
 * Access Card.
 */
export function hasImportableParentData(student) {
  return isMeaningfulValue(student?.parentName);
}

export const COVERAGE_STATES = [
  "ALL",
  "NO_GUARDIAN", // nobody linked at all
  "UNLINKED_DATA", // registration has parent details, but no guardian account
  "NOT_ACTIVATED", // guardian exists, card not yet used
  "ACTIVATED", // at least one guardian is using the app
  "REVOKED", // every guardian link has been withdrawn
];

/**
 * Classify one student's guardian coverage.
 *
 * Order matters — the states are checked most-actionable first, so a school
 * scanning the list sees the biggest gap rather than the most flattering label.
 */
export function classifyCoverage(student, links) {
  const active = links.filter((link) => link.status === "ACTIVE");

  if (active.length === 0) {
    if (links.length > 0) return "REVOKED";
    // The important distinction: "nobody connected AND nothing to work from"
    // versus "nobody connected BUT we already have their details".
    return hasImportableParentData(student) ? "UNLINKED_DATA" : "NO_GUARDIAN";
  }

  const anyActivated = active.some(
    (link) => link.parentAccessState === "ACTIVATED"
  );
  return anyActivated ? "ACTIVATED" : "NOT_ACTIVATED";
}

export const COVERAGE_LABELS = {
  NO_GUARDIAN: {
    label: "No guardian",
    emoji: "⚪",
    tone: "bg-slate-100 text-slate-700",
    hint: "Nobody is connected and no parent details are on file.",
  },
  UNLINKED_DATA: {
    // Guardians are linked automatically now, so anything left in this state
    // failed for a reason a human has to look at — an unusable name, or a
    // contact detail that clashes with an existing account.
    label: "Needs checking",
    emoji: "🟠",
    tone: "bg-orange-100 text-orange-800",
    hint: "The parent details on the student record could not be connected automatically.",
  },
  NOT_ACTIVATED: {
    label: "Card not used",
    emoji: "🟡",
    tone: "bg-amber-100 text-amber-900",
    hint: "A guardian exists but has not connected with their card yet.",
  },
  ACTIVATED: {
    label: "Connected",
    emoji: "🟢",
    tone: "bg-emerald-100 text-emerald-800",
    hint: "At least one guardian is using the Parent App.",
  },
  REVOKED: {
    label: "Access removed",
    emoji: "⛔",
    tone: "bg-red-100 text-red-800",
    hint: "Every guardian link for this student has been withdrawn.",
  },
};

/**
 * Build the roster rows for a page of students.
 *
 * `students` is already paginated by the caller; links and parents are then
 * fetched in TWO bulk queries rather than per student. On a 69ms-RTT cluster a
 * per-row lookup would make a 50-row page take three seconds (see MEMORY.md on
 * DB latency being the dominant cost).
 */
export function buildRosterRows({ students, links, parents }) {
  const parentById = new Map(parents.map((p) => [String(p._id), p]));

  const linksByStudent = new Map();
  links.forEach((link) => {
    const key = String(link.student);
    if (!linksByStudent.has(key)) linksByStudent.set(key, []);

    const parent = parentById.get(String(link.parent));
    linksByStudent.get(key).push({
      ...link,
      parentAccessState: parent?.accessState || "NOT_CREATED",
      parentDoc: parent || null,
    });
  });

  return students.map((student) => {
    const studentLinks = linksByStudent.get(String(student._id)) || [];
    const coverage = classifyCoverage(student, studentLinks);

    return {
      studentId: String(student._id),
      studentName: student.name,
      grade: student.grade || "",
      rollNumber: student.rollNumber || "",
      studentStatus: student.status,
      coverage,

      guardians: studentLinks.map((link) => ({
        linkId: String(link._id),
        parentId: link.parentDoc ? String(link.parentDoc._id) : null,
        // The household name where one is set, so an action is never attributed
        // to an individual who may not have performed it (§20).
        name: link.parentDoc?.isHousehold
          ? link.parentDoc.householdName || link.parentDoc.name
          : link.parentDoc?.name || "Guardian",
        parentIdentifier: link.parentDoc?.parentId || null,
        relationshipType: link.relationshipType,
        isPrimaryGuardian: Boolean(link.isPrimaryGuardian),
        linkStatus: link.status,
        accessState: link.parentAccessState,
        isHousehold: Boolean(link.parentDoc?.isHousehold),
        email: link.parentDoc?.email || "",
        phone: link.parentDoc?.phone || "",
        canGiveConsent: Boolean(link.canGiveConsent),
        canReceiveNotices: Boolean(link.canReceiveNotices),
      })),

      // What registration captured, shown so a school can see exactly what an
      // import would create before running it.
      registrationParent: hasImportableParentData(student)
        ? {
            name: String(student.parentName || "").trim(),
            relationshipType: student.guardianRelationship || "OTHER",
            phone: isMeaningfulValue(student.parentContactNumber)
              ? String(student.parentContactNumber).trim()
              : "",
            email: isMeaningfulValue(student.parentEmail)
              ? String(student.parentEmail).trim()
              : "",
          }
        : null,

      guardianCount: studentLinks.filter((l) => l.status === "ACTIVE").length,
    };
  });
}

/** Roll the rows up into the metric cards shown above the table. */
export function summariseCoverage(rows) {
  const summary = {
    total: rows.length,
    activated: 0,
    notActivated: 0,
    unlinkedData: 0,
    noGuardian: 0,
    revoked: 0,
  };

  rows.forEach((row) => {
    if (row.coverage === "ACTIVATED") summary.activated += 1;
    else if (row.coverage === "NOT_ACTIVATED") summary.notActivated += 1;
    else if (row.coverage === "UNLINKED_DATA") summary.unlinkedData += 1;
    else if (row.coverage === "NO_GUARDIAN") summary.noGuardian += 1;
    else if (row.coverage === "REVOKED") summary.revoked += 1;
  });

  return summary;
}
