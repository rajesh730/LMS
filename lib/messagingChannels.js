/**
 * Realtime channel names for parent ↔ school messaging, and who may listen.
 *
 * SECURITY NOTE. The SSE route treats any channel it does not recognise as
 * PUBLIC. That is fine for the existing broadcast channels (a public feed, an
 * event notice board) but would be catastrophic here — `parent-messages:<id>`
 * carries one family's private conversation with the school, and a default of
 * "anyone may subscribe" would let a stranger tail it by guessing an id.
 *
 * So these channels are namespaced AND explicitly validated. `canAccessChannel`
 * is the allow-list; a channel that does not match one of these shapes falls
 * through to the route's existing rules unchanged.
 */

export const MESSAGE_CHANNEL_PREFIXES = {
  // Everything happening in one school's parent inbox.
  SCHOOL: "school-messages:",
  // Everything happening in one guardian's threads, across their children.
  PARENT: "parent-messages:",
};

export function schoolMessagesChannel(schoolId) {
  return `${MESSAGE_CHANNEL_PREFIXES.SCHOOL}${String(schoolId)}`;
}

export function parentMessagesChannel(parentId) {
  return `${MESSAGE_CHANNEL_PREFIXES.PARENT}${String(parentId)}`;
}

/** Is this one of the private messaging channels? */
export function isMessagingChannel(channel) {
  return Object.values(MESSAGE_CHANNEL_PREFIXES).some((prefix) =>
    String(channel || "").startsWith(prefix)
  );
}

/**
 * May this session listen to this messaging channel?
 *
 * Ownership only — a school hears its own inbox, a guardian hears their own
 * threads, and nobody hears anyone else's. SUPER_ADMIN is deliberately NOT
 * exempt: platform staff have no business tailing a family's private
 * conversation in real time, and the audited assisted-access view exists for
 * the cases where they legitimately need to look.
 */
export function canAccessChannel(channel, session) {
  const name = String(channel || "");
  const user = session?.user;
  if (!user?.id) return false;

  if (name.startsWith(MESSAGE_CHANNEL_PREFIXES.SCHOOL)) {
    const schoolId = name.slice(MESSAGE_CHANNEL_PREFIXES.SCHOOL.length);
    if (!schoolId) return false;
    if (!["SCHOOL_ADMIN", "TEACHER"].includes(user.role)) return false;
    // SCHOOL_ADMIN's own id IS the school; a teacher carries schoolId.
    const own = user.role === "SCHOOL_ADMIN" ? user.id : user.schoolId;
    return String(own) === schoolId;
  }

  if (name.startsWith(MESSAGE_CHANNEL_PREFIXES.PARENT)) {
    const parentId = name.slice(MESSAGE_CHANNEL_PREFIXES.PARENT.length);
    if (!parentId) return false;
    if (user.role !== "PARENT") return false;
    return String(user.id) === parentId;
  }

  return false;
}

/** Event kinds carried on these channels. */
export const MESSAGE_EVENTS = {
  NEW_MESSAGE: "message:new",
  // The other side opened the thread — drives the live "seen" tick.
  THREAD_READ: "message:read",
};
