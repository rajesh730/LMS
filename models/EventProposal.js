import mongoose from "mongoose";

const EVENT_PROPOSAL_ROLES = [
  "ORGANIZER_PARTNER",
  "CHALLENGE_PARTNER",
  "SPONSOR",
  "VENUE_PARTNER",
  "MENTOR_PARTNER",
  "MEDIA_PARTNER",
  "PRESENTED_BY",
  "OTHER",
];

const EventProposalSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: [true, "Please provide an organization name"],
      trim: true,
    },
    organizationType: {
      type: String,
      enum: ["COMPANY", "ACADEMY", "NGO", "CLUB", "INDIVIDUAL", "OTHER"],
      default: "COMPANY",
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
      required: [true, "Please provide a contact name"],
      trim: true,
    },
    contactEmail: {
      type: String,
      required: [true, "Please provide a contact email"],
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      default: "",
      trim: true,
    },
    eventTitle: {
      type: String,
      required: [true, "Please provide an event title"],
      trim: true,
    },
    eventDescription: {
      type: String,
      required: [true, "Please provide an event description"],
      trim: true,
    },
    proposedRoles: {
      type: [String],
      enum: EVENT_PROPOSAL_ROLES,
      default: ["ORGANIZER_PARTNER"],
    },
    targetGrades: {
      type: [String],
      default: [],
    },
    expectedSchools: {
      type: Number,
      default: null,
    },
    expectedStudents: {
      type: Number,
      default: null,
    },
    preferredDate: {
      type: Date,
      default: null,
    },
    eventMode: {
      type: String,
      enum: ["ONLINE", "ONSITE", "HYBRID", "UNDECIDED"],
      default: "UNDECIDED",
    },
    venue: {
      type: String,
      default: "",
      trim: true,
    },
    prizeDetails: {
      type: String,
      default: "",
      trim: true,
    },
    dataAccessNeeds: {
      type: String,
      default: "",
      trim: true,
    },
    safetyNotes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["NEW", "UNDER_REVIEW", "APPROVED", "REJECTED", "CONVERTED_TO_EVENT"],
      default: "NEW",
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExternalOrganizer",
      default: null,
    },
    linkedEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
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

EventProposalSchema.index({ status: 1, createdAt: -1 });
EventProposalSchema.index({
  organizationName: "text",
  eventTitle: "text",
  eventDescription: "text",
});

export { EVENT_PROPOSAL_ROLES };

export default mongoose.models.EventProposal ||
  mongoose.model("EventProposal", EventProposalSchema);
