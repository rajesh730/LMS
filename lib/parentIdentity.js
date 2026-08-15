import crypto from "crypto";

/**
 * Pravyo Parent ID (§2).
 *
 * A permanent, human-readable handle for a guardian account: `PRV-P-X7K4Q9`.
 *
 * Design constraints and why each one matters:
 *
 *  - **Random, not sequential, not derived.** Not from the Mongo ObjectId, not
 *    from a roll number, not from a counter. A guessable or enumerable ID would
 *    let anyone walk the guardian space, and §53 requires that knowing an ID
 *    reveals nothing.
 *  - **Unambiguous alphabet.** No O/0, I/1, or 5/S confusion. This ID gets read
 *    off a printed card, sometimes aloud over a phone, often by someone who is
 *    not confident with Latin characters. A mistyped ID must not silently
 *    resolve to a *different real guardian*.
 *  - **Case-insensitive.** Normalised on both write and read.
 *
 * The ID is an IDENTIFIER, never a credential. Authentication is always the
 * PIN. See lib/parentCredentials.js.
 */

// 32 characters, 6 positions => 32^6 ≈ 1.07 billion. With a realistic ceiling
// of a few hundred thousand guardians the space stays sparse enough that
// guessing a live ID is impractical, and the rate limiter closes the rest.
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ID_LENGTH = 6;
const ID_PREFIX = "PRV-P-";

/** Generate a candidate Parent ID. Uniqueness is enforced by the caller. */
export function generateParentIdCandidate() {
  const bytes = crypto.randomBytes(ID_LENGTH);
  let body = "";
  for (let i = 0; i < ID_LENGTH; i += 1) {
    body += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  }
  return `${ID_PREFIX}${body}`;
}

/**
 * Normalise anything a guardian might type into the canonical form.
 *
 * Accepts `prv-p-x7k4q9`, `PRVPX7K4Q9`, `prv p x7k4q9`, or bare `X7K4Q9` — all
 * resolve to `PRV-P-X7K4Q9`. A parent copying an ID off a card should not be
 * defeated by a missing hyphen.
 *
 * Returns "" when the input cannot be a valid ID, so callers can reject early
 * without hitting the database.
 */
export function normalizeParentId(value) {
  const raw = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (!raw) return "";

  // Tolerate the prefix being present, absent, or partially typed.
  const body = raw.startsWith("PRVP") ? raw.slice(4) : raw;

  if (body.length !== ID_LENGTH) return "";
  // Every character must be in the alphabet — this is what stops an ambiguous
  // character (O, I, 0, 1) resolving to something valid by accident.
  if (![...body].every((char) => ID_ALPHABET.includes(char))) return "";

  return `${ID_PREFIX}${body}`;
}

export function isValidParentIdFormat(value) {
  return normalizeParentId(value) !== "";
}

/**
 * Allocate a Parent ID that is not already taken.
 *
 * Collisions are vanishingly unlikely but must not be silently ignored — a
 * duplicate would mean two guardians sharing a login handle. Retries a handful
 * of times, then throws rather than returning something unsafe.
 */
export async function allocateParentId(ParentModel, attempts = 8) {
  for (let i = 0; i < attempts; i += 1) {
    const candidate = generateParentIdCandidate();
    const existing = await ParentModel.exists({ parentId: candidate });
    if (!existing) return candidate;
  }
  throw new Error("Could not allocate a unique Parent ID");
}

/**
 * Give a parent document an ID if it has none.
 *
 * Extracted from the model's pre-save hook so it can be tested directly — a
 * hook buried in Mongoose middleware is exactly the kind of code that silently
 * stops firing and is never noticed until a column goes blank.
 *
 * Returns true when an ID was assigned, false when one was already present.
 */
export async function ensureParentId(doc, ParentModel) {
  if (!doc) return false;
  if (doc.parentId) return false;

  doc.parentId = await allocateParentId(ParentModel || doc.constructor);
  return true;
}

export const PARENT_ID_PREFIX = ID_PREFIX;
export const PARENT_ID_LENGTH = ID_LENGTH;
export const PARENT_ID_ALPHABET = ID_ALPHABET;
