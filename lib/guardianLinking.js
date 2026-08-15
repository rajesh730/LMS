import Parent from "@/models/Parent";
import ParentStudentLink, {
  applyAccessLevelDefaults,
  PARENT_RELATIONSHIP_TYPES,
} from "@/models/ParentStudentLink";
import { isMeaningfulValue, hasImportableParentData } from "@/lib/guardianRoster";

/**
 * Turn the parent details captured at student registration into a real
 * guardian.
 *
 * The school entering a parent's name on a registration form IS the school
 * asserting that this person is the child's guardian — that is exactly the
 * trust relationship §27's invitation flow was trying to establish, only it
 * already happened, in person, at the front desk. So registration data is
 * treated as authentic and linked automatically.
 *
 * Shared by every path that creates a student (single, bulk array, CSV import)
 * and by the retrospective importer, so all four behave identically.
 *
 * Three rules keep this safe to run automatically:
 *
 *  1. **Never invent a guardian.** Placeholder text like "To be added" is
 *     filtered out; only a real name creates an account.
 *  2. **Never grant the power to act.** Auto-linked guardians get view +
 *     notices. Consent and event registration stay off until a human decides
 *     (§20) — an automatic process must not decide who may consent for a child.
 *  3. **Never issue a credential.** No Parent Access Card is printed here. The
 *     relationship exists; handing out the key is a separate, deliberate act.
 */

function normalizeRelationship(value) {
  const candidate = String(value || "").toUpperCase();
  return PARENT_RELATIONSHIP_TYPES.includes(candidate) ? candidate : "OTHER";
}

/** Comparable form of a guardian's name: case, spacing and punctuation folded. */
export function normalizeGuardianName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, "") // keep Devanagari
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Are these plausibly the same person?
 *
 * Exact match after normalisation — deliberately not fuzzy. "Anita Rai" and
 * "Mina BK" must never be treated as one guardian, and a fuzzy matcher that
 * tolerates a middle name would eventually tolerate something it should not.
 */
export function guardianNamesMatch(a, b) {
  const left = normalizeGuardianName(a);
  const right = normalizeGuardianName(b);
  return Boolean(left) && left === right;
}

/**
 * Find the guardian a student's registration details refer to, if one exists.
 *
 * A contact detail on its own is NOT enough. Registration generates a
 * name-derived placeholder email, so two unrelated students who happen to share
 * a name (there really are two "Aayush Basnet") get the SAME `parentEmail` —
 * and matching on that alone merged two different families into one account,
 * letting one mother see the other's child.
 *
 * So the rule is: a contact match identifies a CANDIDATE; the guardian's name
 * must also agree before it is treated as the same person.
 *
 * Returns `{ parent, conflict }`:
 *   - `parent`   — a genuine match, safe to reuse (real siblings)
 *   - `conflict` — the contact belongs to someone else, so the caller must
 *                  create a separate account and must NOT reuse that contact
 *                  (the unique index would reject it anyway)
 */
async function findMatchingGuardian({ email, phone, guardianName }) {
  if (!email && !phone) return { parent: null, conflict: null };

  const candidates = await Parent.find({
    $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    isDeleted: { $ne: true },
  }).limit(10);

  if (candidates.length === 0) return { parent: null, conflict: null };

  const sameName = candidates.find((candidate) =>
    guardianNamesMatch(candidate.name, guardianName)
  );

  if (sameName) return { parent: sameName, conflict: null };

  // Contact collides but the name does not. A false SPLIT is an inconvenience
  // the school can fix; a false MERGE exposes one family's child to another.
  // Always split.
  return {
    parent: null,
    conflict: {
      emailTaken: candidates.some((c) => email && c.email === email),
      phoneTaken: candidates.some((c) => phone && c.phone === phone),
    },
  };
}

/**
 * Link one student's registration parent.
 *
 * @returns {Promise<{linked: boolean, reason?: string, parentId?: string}>}
 *
 * NEVER throws. Called from inside student creation, where a guardian problem
 * must not fail the student's registration — the same contract the email layer
 * follows elsewhere in this codebase.
 */
export async function linkGuardianFromStudentRecord({
  student,
  schoolId,
  actorId = null,
}) {
  try {
    if (!hasImportableParentData(student)) {
      return { linked: false, reason: "NO_PARENT_DATA" };
    }

    const existing = await ParentStudentLink.findOne({
      student: student._id,
    })
      .select("_id")
      .lean();

    if (existing) return { linked: false, reason: "ALREADY_LINKED" };

    const email = isMeaningfulValue(student.parentEmail)
      ? String(student.parentEmail).trim().toLowerCase()
      : "";
    const phone = isMeaningfulValue(student.parentContactNumber)
      ? String(student.parentContactNumber).trim()
      : "";

    const guardianName = String(student.parentName).trim();

    // Reuse an existing guardian only when the contact AND the name agree, so
    // real siblings share one login while two unrelated families that happen to
    // share a generated email stay separate. See findMatchingGuardian.
    const { parent: matched, conflict } = await findMatchingGuardian({
      email,
      phone,
      guardianName,
    });

    let parent = matched;

    if (!parent) {
      parent = await Parent.create({
        name: guardianName,
        // Drop a contact that belongs to a DIFFERENT guardian. Keeping it would
        // violate the unique index, and it was never this person's detail
        // anyway — it came from a name-derived placeholder.
        email: email && !conflict?.emailTaken ? email : undefined,
        phone: phone && !conflict?.phoneTaken ? phone : undefined,
        status: "ACTIVE",
        accessState: "NOT_CREATED",
      });
    }

    const preset = applyAccessLevelDefaults({ accessLevel: "VIEW_AND_NOTICES" });

    await ParentStudentLink.create({
      parent: parent._id,
      student: student._id,
      school: schoolId,
      relationshipType: normalizeRelationship(student.guardianRelationship),
      accessLevel: "VIEW_AND_NOTICES",
      canViewPortfolio: preset.canViewPortfolio,
      canReceiveNotices: preset.canReceiveNotices,
      canRegisterEvents: preset.canRegisterEvents,
      canGiveConsent: preset.canGiveConsent,
      canMessageSchool: preset.canMessageSchool,
      isPrimaryGuardian: true,
      invitedBy: actorId,
      // The school established this in person at registration; there is no
      // code for anyone to redeem.
      status: "ACTIVE",
      activatedAt: new Date(),
    });

    return { linked: true, parentId: String(parent._id) };
  } catch (err) {
    // A duplicate key means a concurrent request won the race — not a problem.
    if (err?.code === 11000) {
      return { linked: false, reason: "ALREADY_LINKED" };
    }
    console.error(
      "[guardianLinking] could not link guardian for student",
      String(student?._id),
      err.message
    );
    return { linked: false, reason: "ERROR" };
  }
}

/**
 * Keep the guardian in step after a student's parent details are edited.
 *
 * Registration is not the only moment parent details arrive — a school
 * corrects a misspelled name, adds a phone number that was missing, or fills
 * in a parent who was left blank at first. Any of those must reach the guardian
 * record, otherwise the roster shows stale information and the school has to
 * remember a second, manual step.
 *
 * Behaviour:
 *   - no guardian yet  → create one (same rules as registration)
 *   - guardian exists  → update the PRIMARY guardian's name and contacts
 *
 * What it deliberately does NOT do: touch permissions, touch access state, or
 * create a second guardian. Editing a student's record is a correction, not a
 * decision about who may act for the child.
 *
 * NEVER throws.
 */
export async function syncGuardianFromStudentRecord({
  student,
  schoolId,
  actorId = null,
}) {
  try {
    if (!hasImportableParentData(student)) {
      return { synced: false, reason: "NO_PARENT_DATA" };
    }

    const link = await ParentStudentLink.findOne({
      student: student._id,
      status: "ACTIVE",
    })
      .sort({ isPrimaryGuardian: -1, createdAt: 1 })
      .select("parent")
      .lean();

    // Nothing linked yet — this is just a late registration, so create.
    if (!link) {
      const created = await linkGuardianFromStudentRecord({
        student,
        schoolId,
        actorId,
      });
      return { synced: created.linked, created: created.linked };
    }

    const email = isMeaningfulValue(student.parentEmail)
      ? String(student.parentEmail).trim().toLowerCase()
      : "";
    const phone = isMeaningfulValue(student.parentContactNumber)
      ? String(student.parentContactNumber).trim()
      : "";

    const updates = { name: String(student.parentName).trim() };
    // Only ever ADD contact details from a student edit. Clearing them here
    // would let a blank field on a student form silently strip an email the
    // guardian actually relies on for notices.
    if (email) updates.email = email;
    if (phone) updates.phone = phone;

    await Parent.updateOne({ _id: link.parent }, { $set: updates });

    return { synced: true, created: false };
  } catch (err) {
    // A duplicate email means the new address already belongs to another
    // guardian. Leave the existing record untouched rather than merging two
    // families on the strength of a typo.
    if (err?.code === 11000) {
      return { synced: false, reason: "DUPLICATE_CONTACT" };
    }
    console.error(
      "[guardianLinking] could not sync guardian for student",
      String(student?._id),
      err.message
    );
    return { synced: false, reason: "ERROR" };
  }
}

/**
 * Link many students at once.
 *
 * Sequential rather than parallel: a 200-row CSV import firing 200 concurrent
 * parent lookups plus writes would spike connections on a small Atlas tier
 * (maxPoolSize is 10 per instance — see lib/db.js).
 */
export async function linkGuardiansForStudents({
  students,
  schoolId,
  actorId = null,
}) {
  let linked = 0;
  let skipped = 0;

  for (const student of students) {
    const result = await linkGuardianFromStudentRecord({
      student,
      schoolId,
      actorId,
    });
    if (result.linked) linked += 1;
    else skipped += 1;
  }

  return { linked, skipped };
}
