import mongoose from "mongoose";

/**
 * A single message inside a Conversation (§15).
 *
 * Supports text, image, document and voice. Voice matters more than it looks:
 * a guardian who is uncomfortable typing — or not fully literate — can hold the
 * mic and speak, which is the difference between the school hearing from them
 * and not (§15, §7).
 *
 * `transcript` and `translations` are defined but not populated yet. They are
 * here so transcription/translation can be added later without a migration
 * against a collection that will by then be large.
 */

const attachmentSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["IMAGE", "DOCUMENT", "VOICE"],
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    // Small preview for IMAGE so a thread on a slow connection does not pull
    // full-size photos (§22).
    thumbnailUrl: {
      type: String,
      default: "",
      trim: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    mimeType: {
      type: String,
      default: "",
      trim: true,
    },
    sizeBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    // VOICE only.
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    // Denormalised from the conversation so a message can be authorised and
    // school-scoped without a join on every read.
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    senderType: {
      type: String,
      enum: ["PARENT", "STAFF", "SYSTEM"],
      required: true,
    },
    senderParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      default: null,
    },
    senderStaff: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderStaffModel",
      default: null,
    },
    senderStaffModel: {
      type: String,
      enum: ["User", "Teacher"],
      default: "User",
    },
    // Snapshot so an old thread still reads correctly after a teacher leaves.
    senderName: {
      type: String,
      default: "",
      trim: true,
    },

    /**
     * The headline the school typed, when this message is an announcement.
     *
     * **On the message, not the conversation, and that placement is the whole
     * point.** `Conversation.subject` exists and looks like the natural home for
     * it, but a guardian has exactly ONE thread per child (see
     * `findOrCreateConversation`), which that thread carries for years. "Sports
     * day", "Fee reminder" and "School closed Friday" all land in it. A single
     * subject on the conversation can hold one of those, so every announcement
     * after the first silently lost its headline — the school typed it, and the
     * parent never saw it.
     *
     * Empty for ordinary back-and-forth. A reply is not an announcement and does
     * not want a headline, so the UI renders one only where it exists.
     */
    subject: {
      type: String,
      default: "",
      trim: true,
      maxLength: 200,
    },
    body: {
      type: String,
      default: "",
      trim: true,
      maxLength: 4000,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    // Threaded replies — a plain self-ref, rendered as a quoted block.
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    /**
     * Set when this message is a Notice mirrored into the guardian's inbox.
     *
     * Parents live in the conversation thread, not in a separate Notice Centre,
     * so a notice published to parents is delivered here too — as an
     * announcement carrying the notice's title as its subject.
     *
     * The reference is what makes that delivery idempotent: the inbox channel
     * refuses to post a notice into a thread that already has it, so a re-run
     * of delivery cannot fill a family's chat with duplicates. It also keeps
     * the copy traceable back to the formal record, which still owns read
     * receipts, acknowledgement and consent.
     */
    sourceNotice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notice",
      default: null,
    },

    // Reserved for future voice transcription / message translation (§15).
    transcript: {
      type: String,
      default: "",
      trim: true,
    },
    translations: {
      type: Map,
      of: String,
      default: undefined,
    },

    // Read tracking is coarse by design: a thread has at most a handful of
    // participants, and per-recipient receipts here would duplicate what the
    // conversation's per-participant lastReadAt already answers.
    readByParentAt: {
      type: Date,
      default: null,
    },
    readByStaffAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Thread pagination — newest first, then reversed for display (§22).
MessageSchema.index({ conversation: 1, isDeleted: 1, createdAt: -1 });
// Backs the inbox channel's "has this notice already been delivered here?"
// check, which runs once per publish across every recipient's thread.
MessageSchema.index({ sourceNotice: 1, conversation: 1 }, { sparse: true });

export default mongoose.models.Message || mongoose.model("Message", MessageSchema);
