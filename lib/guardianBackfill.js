import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import SchoolConfig from "@/models/SchoolConfig";
import {
  linkGuardiansForStudents,
  guardianNamesMatch,
} from "@/lib/guardianLinking";
import { hasImportableParentData, isMeaningfulValue } from "@/lib/guardianRoster";

/**
 * Automatic, one-time guardian backfill for a school.
 *
 * Students registered before Parent Access existed carry their parent's details
 * on the student record with no guardian account behind them. Asking a school
 * to notice that and press an "Import" button is a manual task the software
 * should simply do — so the roster calls this on load and the gap closes by
 * itself.
 *
 * Three properties make it safe to run from a page load:
 *
 *  1. **Batched.** At most BATCH_SIZE students per call, so a 2,000-student
 *     school never turns one request into a timeout. Remaining students are
 *     picked up by the next load; the work is self-resuming.
 *  2. **Idempotent.** Students that already have a link are excluded by the
 *     query, and `linkGuardianFromStudentRecord` re-checks before writing.
 *  3. **Marked complete.** Once nothing is left, `completedAt` is stamped and
 *     the scan stops running — a school with 400 fully-linked students does
 *     not pay for this check on every visit.
 *
 * It never throws: a backfill problem must not stop the roster rendering.
 */

// Sized so the whole batch comfortably fits inside a serverless request even
// at ~69ms round-trip latency (see MEMORY.md on DB latency dominating).
const BATCH_SIZE = 100;

// Cheap re-check for schools that are already complete but may have gained
// students through a path that somehow skipped linking.
const RECHECK_AFTER_MS = 24 * 60 * 60 * 1000;

export async function runGuardianBackfill(schoolId) {
  try {
    await connectDB();

    // SAFETY FIRST: undo any wrongly-merged guardians before anything else.
    // An earlier matcher trusted a contact detail alone, so two unrelated
    // families sharing a generated email ended up on one account — one parent
    // could see the other's child. This runs on every load until clean.
    const split = await splitMergedGuardians(schoolId);

    // Guardians created before Parent IDs were assigned at creation have a
    // blank ID column in the roster. Fill those in — it is cheap, and it is
    // what a school notices immediately.
    const idPass = await backfillParentIds(schoolId);
    const idsAssigned = idPass.assigned;

    const config = await SchoolConfig.findOne({ school: schoolId })
      .select("guardianBackfill")
      .lean();

    const completedAt = config?.guardianBackfill?.completedAt || null;
    const lastRunAt = config?.guardianBackfill?.lastRunAt || null;

    // Already done, and checked recently — nothing left to link.
    if (
      completedAt &&
      lastRunAt &&
      Date.now() - new Date(lastRunAt).getTime() < RECHECK_AFTER_MS
    ) {
      return {
        ran: idsAssigned > 0,
        linked: 0,
        // Keep the page polling while a long ID run finishes.
        remaining: idPass.more ? -1 : 0,
        idsAssigned,
        guardiansSplit: split.split,
      };
    }

    // Students at this school that no guardian is linked to yet.
    const linkedStudentIds = await ParentStudentLink.distinct("student", {
      school: schoolId,
    });

    const candidates = await Student.find({
      school: schoolId,
      isDeleted: { $ne: true },
      status: { $ne: "INACTIVE" },
      _id: { $nin: linkedStudentIds },
    })
      .limit(BATCH_SIZE)
      .select(
        "name parentName parentEmail parentContactNumber guardianRelationship"
      )
      .lean();

    // Only those with real details — placeholder text like "To be added" is
    // not a guardian.
    const importable = candidates.filter(hasImportableParentData);

    if (importable.length === 0) {
      // Nothing left worth linking. Mark complete so this stops scanning.
      await markProgress(schoolId, { complete: true, linked: 0 });
      return {
        ran: idsAssigned > 0,
        linked: 0,
        remaining: idPass.more ? -1 : 0,
        idsAssigned,
        guardiansSplit: split.split,
      };
    }

    const result = await linkGuardiansForStudents({
      students: importable,
      schoolId,
      actorId: null, // system action, not a person
    });

    // A full batch probably means more are waiting, so stay incomplete and let
    // the next load continue.
    const likelyMore = candidates.length === BATCH_SIZE;

    await markProgress(schoolId, {
      complete: !likelyMore,
      linked: result.linked,
    });

    return {
      ran: true,
      linked: result.linked,
      remaining: likelyMore || idPass.more ? -1 : 0, // -1 = unknown, more to come
      idsAssigned,
      guardiansSplit: split.split,
    };
  } catch (err) {
    // The roster must still render.
    console.error("[guardianBackfill] failed:", err.message);
    return {
      ran: false,
      linked: 0,
      remaining: 0,
      idsAssigned: 0,
      guardiansSplit: 0,
      error: true,
    };
  }
}

/**
 * Undo guardians that were wrongly merged into one account.
 *
 * The cause: an earlier matcher reused an existing guardian whenever a contact
 * detail matched. Registration generates a name-derived placeholder email, so
 * two unrelated students who share a name produce the SAME `parentEmail` — and
 * their two different mothers were merged into one login, each able to see the
 * other's child.
 *
 * The repair, per guardian holding several children:
 *   1. Read each linked student's own `parentName`.
 *   2. Group the links by that name.
 *   3. The group matching the guardian's own name keeps the account.
 *   4. Every other group gets a fresh guardian account, and its links are
 *      repointed.
 *
 * Genuine siblings are untouched: their students all carry the same
 * `parentName`, so they form a single group.
 *
 * Runs on every roster load rather than once. It is cheap when clean (a single
 * indexed query), and a correctness repair should not depend on a flag that
 * could be set prematurely.
 */
async function splitMergedGuardians(schoolId) {
  const links = await ParentStudentLink.find({
    school: schoolId,
    status: "ACTIVE",
  })
    .select("parent student relationshipType")
    .lean();

  if (links.length === 0) return { split: 0 };

  // Only guardians with more than one child can be wrongly merged.
  const byParent = new Map();
  links.forEach((link) => {
    const key = String(link.parent);
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(link);
  });

  const multi = [...byParent.entries()].filter(([, rows]) => rows.length > 1);
  if (multi.length === 0) return { split: 0 };

  const [parents, students] = await Promise.all([
    Parent.find({ _id: { $in: multi.map(([id]) => id) } }),
    Student.find({ _id: { $in: links.map((l) => l.student) } })
      .select("parentName parentEmail parentContactNumber guardianRelationship")
      .lean(),
  ]);

  const parentById = new Map(parents.map((p) => [String(p._id), p]));
  const studentById = new Map(students.map((s) => [String(s._id), s]));

  let splitCount = 0;

  for (const [parentId, rows] of multi) {
    const parent = parentById.get(parentId);
    if (!parent) continue;

    // Group this guardian's children by the parent name on each student record.
    const groups = new Map();
    rows.forEach((link) => {
      const student = studentById.get(String(link.student));
      const name = String(student?.parentName || "").trim();
      // A student with no usable parent name tells us nothing, so it stays put.
      const key = isMeaningfulValue(name) ? name.toLowerCase() : "__unknown__";
      if (!groups.has(key)) groups.set(key, { name, links: [] });
      groups.get(key).links.push(link);
    });

    if (groups.size <= 1) continue; // genuine siblings — nothing to do

    for (const [key, group] of groups) {
      // The group whose name matches the account keeps it. Unknown names also
      // stay, since moving them would be a guess.
      if (key === "__unknown__" || guardianNamesMatch(parent.name, group.name)) {
        continue;
      }

      try {
        // Create the separate guardian WITHOUT the contact details that belong
        // to the account being split away from — those were the placeholder
        // that caused the merge, and the unique index would reject them.
        const replacement = await Parent.create({
          name: group.name,
          status: "ACTIVE",
          accessState: "NOT_CREATED",
        });

        await ParentStudentLink.updateMany(
          { _id: { $in: group.links.map((l) => l._id) } },
          { $set: { parent: replacement._id } }
        );

        splitCount += group.links.length;

        console.warn(
          `[guardianBackfill] split wrongly-merged guardian: "${group.name}" ` +
            `moved off ${parent.name}'s account (${group.links.length} child(ren))`
        );
      } catch (err) {
        console.error(
          "[guardianBackfill] could not split a merged guardian:",
          err.message
        );
      }
    }
  }

  return { split: splitCount };
}

/**
 * Give a Parent ID to any guardian at this school that is missing one.
 *
 * Guardians created before IDs were assigned at creation show a blank ID
 * column, which staff cannot read out over the phone or print on a list.
 *
 * Uses `.save()` rather than a bulk update so the model's own pre-save hook
 * does the allocation — one implementation, one uniqueness check, no chance of
 * this path drifting from the others.
 *
 * Small batch: this is only ever a one-off catch-up, and each row costs a
 * uniqueness probe.
 */
async function backfillParentIds(schoolId) {
  const links = await ParentStudentLink.distinct("parent", {
    school: schoolId,
  });
  if (links.length === 0) return { assigned: 0, more: false };

  const parents = await Parent.find({
    _id: { $in: links },
    isDeleted: { $ne: true },
    $or: [{ parentId: { $exists: false } }, { parentId: null }, { parentId: "" }],
  }).limit(BATCH_SIZE);

  let assigned = 0;

  for (const parent of parents) {
    try {
      // The pre-save hook fills parentId when it is missing.
      await parent.save();
      assigned += 1;
    } catch (err) {
      // A collision on the generated ID is retried by the allocator; anything
      // else here should not stop the rest of the batch.
      console.error(
        "[guardianBackfill] could not assign a Parent ID:",
        err.message
      );
    }
  }

  // A full batch means more are probably waiting, so the caller keeps the page
  // polling rather than leaving a school to reload by hand.
  return { assigned, more: parents.length === BATCH_SIZE };
}

async function markProgress(schoolId, { complete, linked }) {
  const update = {
    $set: { "guardianBackfill.lastRunAt": new Date() },
    $inc: { "guardianBackfill.linkedCount": linked },
  };
  if (complete) {
    update.$set["guardianBackfill.completedAt"] = new Date();
  }

  await SchoolConfig.updateOne({ school: schoolId }, update, { upsert: true });
}
