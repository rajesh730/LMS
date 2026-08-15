import mongoose from "mongoose";

/**
 * A parent ↔ school conversation thread (§13–§15).
 *
 * Scoping rules that make this safe:
 *   - A thread is always about ONE child at ONE school. Switching child in the
 *     app switches the thread list; it never carries a thread across children.
 *   - A parent never picks a teacher. They pick a TOPIC ("Learning",
 *     "Transport", …) and the school's routing config decides which staff
 *     inbox receives it (§14). This is what prevents every parent messaging
 *     every teacher directly.
 *   - Staff participants are stored as refs, never as phone numbers or personal
 *     emails. Communication stays inside Pravyo (§15).
 *
 * ConversationParticipant is embedded rather than a separate collection: the
 * participant set is small (one guardian + one or two staff), always loaded
 * with the conversation, and never queried independently.
 */

// Topics a parent can start a thread about. The school maps each to a staff
// inbox in SchoolConfig.parentMessaging (see lib/parentMessaging.js).
export const CONVERSATION_TOPICS = [
  "LEARNING",
  "EVENTS",
  "TRANSPORT",
  "FEES",
  "ADMINISTRATION",
  "WELLBEING",
  "OTHER",
];

const participantSchema = new mongoose.Schema(
  {
    // Exactly one of parent / user (staff) is set.
    participantType: {
      type: String,
      enum: ["PARENT", "STAFF"],
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      default: null,
    },
    // Staff are Users (SCHOOL_ADMIN) or Teachers. `staffModel` records which,
    // because the two live in different collections.
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "participants.staffModel",
      default: null,
    },
    staffModel: {
      type: String,
      enum: ["User", "Teacher"],
      default: "User",
    },
    displayName: {
      type: String,
      default: "",
      trim: true,
    },
    // Per-participant unread bookkeeping. Kept on the conversation so the list
    // screen needs one query, not one per thread (§22 — minimise payload and
    // round trips on slow connections).
    lastReadAt: {
      type: Date,
      default: null,
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The child this thread concerns. Required — there is no "general" parent
    // thread, because every school conversation is about a specific student and
    // mixing them would breach §36.
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    topic: {
      type: String,
      enum: CONVERSATION_TOPICS,
      default: "OTHER",
    },
    // Human label for the staff side, e.g. "Class Teacher", "School Office".
    // Snapshotted so a thread stays readable after staff changes.
    routedToLabel: {
      type: String,
      default: "",
      trim: true,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
      maxLength: 200,
    },
    participants: {
      type: [participantSchema],
      default: [],
    },
    // Denormalised for the list screen — avoids fetching the last Message of
    // every thread just to render previews.
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastMessagePreview: {
      type: String,
      default: "",
      trim: true,
      maxLength: 200,
    },
    lastMessageSenderType: {
      type: String,
      enum: ["PARENT", "STAFF", ""],
      default: "",
    },
    // Set when a school broadcast (§16) seeded this thread, so the UI can label
    // it as an announcement rather than a two-way conversation the parent began.
    originType: {
      type: String,
      enum: ["PARENT_INITIATED", "SCHOOL_ANNOUNCEMENT"],
      default: "PARENT_INITIATED",
    },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// The parent's thread list for the selected child.
ConversationSchema.index({
  "participants.parent": 1,
  student: 1,
  isDeleted: 1,
  lastMessageAt: -1,
});
// The staff inbox.
ConversationSchema.index({ school: 1, isDeleted: 1, lastMessageAt: -1 });
ConversationSchema.index({ school: 1, topic: 1, status: 1, lastMessageAt: -1 });

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);
