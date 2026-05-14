import mongoose from "mongoose";

const PlatformSettingSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: "platform",
      unique: true,
      immutable: true,
    },
    general: {
      platformName: {
        type: String,
        default: "Pratyo",
        trim: true,
      },
      supportEmail: {
        type: String,
        default: "",
        trim: true,
      },
      supportPhone: {
        type: String,
        default: "",
        trim: true,
      },
      defaultTimezone: {
        type: String,
        default: "Asia/Kathmandu",
        trim: true,
      },
      defaultCountry: {
        type: String,
        default: "Nepal",
        trim: true,
      },
      statusPageUrl: {
        type: String,
        default: "",
        trim: true,
      },
      maintenanceMessage: {
        type: String,
        default: "",
        trim: true,
      },
    },
    governance: {
      schoolOnboardingMode: {
        type: String,
        enum: ["APPROVAL_REQUIRED", "AUTO_APPROVE"],
        default: "APPROVAL_REQUIRED",
      },
      eventPublishingMode: {
        type: String,
        enum: ["SUPER_ADMIN_REVIEW", "OWNER_DIRECT"],
        default: "SUPER_ADMIN_REVIEW",
      },
      defaultPublicResults: {
        type: Boolean,
        default: true,
      },
      allowPublicPartnerProfiles: {
        type: Boolean,
        default: true,
      },
      allowSchoolShowcases: {
        type: Boolean,
        default: true,
      },
    },
    defaults: {
      pendingSchoolRestrictions: {
        type: Boolean,
        default: true,
      },
      allowSupportTickets: {
        type: Boolean,
        default: true,
      },
        defaultTeacherRoles: {
          type: [String],
          default: [],
        },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

PlatformSettingSchema.pre("validate", function () {
  if (Array.isArray(this.defaults?.defaultTeacherRoles)) {
    this.defaults.defaultTeacherRoles = this.defaults.defaultTeacherRoles.map((role) =>
      role === "Club Lead" ? "Program Lead" : role
    );
  }
});

export default mongoose.models.PlatformSetting ||
  mongoose.model("PlatformSetting", PlatformSettingSchema);
