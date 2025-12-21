import mongoose from "mongoose";

/**
 * ActivityLog Schema - Tracks all admin actions for audit trail
 *
 * Stores information about:
 * - Create/Update/Delete operations
 * - Approvals/Rejections
 * - Status changes
 * - Bulk operations
 *
 * Helps with:
 * - Compliance and auditing
 * - Troubleshooting issues
 * - Understanding who did what and when
 */
const ActivityLogSchema = new mongoose.Schema(
  {
    // What action was performed
    action: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "RESTORE",
        "APPROVE",
        "REJECT",
        "SUSPEND",
        "ACTIVATE",
        "BULK_DELETE",
        "BULK_UPDATE",
        "IMPORT",
        "EXPORT",
      ],
      required: true,
    },

    // What type of entity was affected
    targetType: {
      type: String,
      enum: [
        "Student",
        "Teacher",
        "Event",
        "ParticipationRequest",
        "School",
        "Subject",
      ],
      required: true,
    },

    // ID of the entity affected
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Human-readable name of what was affected
    targetName: {
      type: String,
      required: true,
    },

    // Who performed the action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // School/organization context
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // School admin user
      required: true,
    },

    // What changed (for UPDATE actions)
    changes: {
      before: mongoose.Schema.Types.Mixed, // Previous values
      after: mongoose.Schema.Types.Mixed, // New values
    },

    // Additional details about the action
    details: {
      reason: String, // Why was this done
      bulkCount: Number, // If bulk operation, how many affected
      ipAddress: String, // For security
      userAgent: String, // Browser info
    },

    // Status of the operation
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
    },

    // Error message if failed
    errorMessage: String,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: "activitylogs",
  }
);

// Index for efficient querying
ActivityLogSchema.index({ school: 1, createdAt: -1 });
ActivityLogSchema.index({ targetType: 1, targetId: 1 });
ActivityLogSchema.index({ performedBy: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1 });

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);
