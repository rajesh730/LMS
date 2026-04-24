import mongoose from "mongoose";

const PARTNER_ROLES = [
  "ORGANIZER_PARTNER",
  "CHALLENGE_PARTNER",
  "SPONSOR",
  "VENUE_PARTNER",
  "MENTOR_PARTNER",
  "MEDIA_PARTNER",
  "PRESENTED_BY",
  "OTHER",
];

const ExternalOrganizerSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: [true, "Please provide an organization name"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    organizationType: {
      type: String,
      enum: ["COMPANY", "ACADEMY", "NGO", "CLUB", "INDIVIDUAL", "OTHER"],
      default: "COMPANY",
    },
    partnerRoles: {
      type: [String],
      enum: PARTNER_ROLES,
      default: ["ORGANIZER_PARTNER"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    logoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    website: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    contactName: {
      type: String,
      default: "",
      trim: true,
    },
    contactEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      default: "",
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"],
      default: "PENDING",
    },
    profileVisibility: {
      type: String,
      enum: ["PUBLIC", "PRIVATE"],
      default: "PRIVATE",
    },
    trustLevel: {
      type: String,
      enum: ["REQUEST_ONLY", "APPROVED_PARTNER", "FEATURED_PARTNER"],
      default: "REQUEST_ONLY",
    },
    createdFromProposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventProposal",
      default: null,
    },
    adminNotes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

ExternalOrganizerSchema.index({
  organizationName: "text",
  description: "text",
});
ExternalOrganizerSchema.index({ verificationStatus: 1, profileVisibility: 1 });

export { PARTNER_ROLES };

export default mongoose.models.ExternalOrganizer ||
  mongoose.model("ExternalOrganizer", ExternalOrganizerSchema);
