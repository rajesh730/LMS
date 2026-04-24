import mongoose from "mongoose";

const scorecardCriterionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    maxScore: {
      type: Number,
      default: 10,
      min: 1,
      max: 100,
    },
  },
  { _id: false }
);

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a title"],
    },
    description: {
      type: String,
      required: [true, "Please provide a description"],
    },
    date: {
      type: Date,
      required: [true, "Please provide a date"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null, // null means Global
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null = global event
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    lifecycleStatus: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "ARCHIVED"],
      default: "ACTIVE",
    },
    eventScope: {
      type: String,
      enum: ["SCHOOL", "PLATFORM"],
      default: function () {
        return this.school ? "SCHOOL" : "PLATFORM";
      },
    },
    ownerType: {
      type: String,
      enum: ["SCHOOL", "PLATFORM"],
      default: function () {
        return this.school ? "SCHOOL" : "PLATFORM";
      },
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    eventType: {
      type: String,
      enum: [
        "COMPETITION",
        "SHOWCASE",
        "AUDITION",
        "WORKSHOP",
        "CLUB_ACTIVITY",
        "EXHIBITION",
        "FESTIVAL",
        "OTHER",
      ],
      default: "COMPETITION",
    },
    visibility: {
      type: String,
      enum: ["PRIVATE", "INVITED", "PUBLIC"],
      default: "INVITED",
    },
    registrationMode: {
      type: String,
      enum: ["DIRECT", "THROUGH_SCHOOL"],
      default: "THROUGH_SCHOOL",
    },
    featuredOnLanding: {
      type: Boolean,
      default: false,
    },
    isTalentFocused: {
      type: Boolean,
      default: true,
    },
    publicHighlightsEnabled: {
      type: Boolean,
      default: true,
    },
    publicResultsEnabled: {
      type: Boolean,
      default: false,
    },
    partnerBrandingEnabled: {
      type: Boolean,
      default: false,
    },
    sourceProposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventProposal",
      default: null,
    },
    partners: [
      {
        organizer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ExternalOrganizer",
          default: null,
        },
        role: {
          type: String,
          enum: [
            "ORGANIZER_PARTNER",
            "CHALLENGE_PARTNER",
            "SPONSOR",
            "VENUE_PARTNER",
            "MENTOR_PARTNER",
            "MEDIA_PARTNER",
            "PRESENTED_BY",
            "OTHER",
          ],
          default: "ORGANIZER_PARTNER",
        },
        displayName: {
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
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    resultsPublished: {
      type: Boolean,
      default: false,
    },
    scorecardCriteria: {
      type: [scorecardCriterionSchema],
      default: [],
    },
    // New fields for participation
    registrationDeadline: {
      type: Date,
      default: null, // null = no deadline
    },
    maxParticipants: {
      type: Number,
      default: null, // null = unlimited
    },
    maxParticipantsPerSchool: {
      type: Number,
      default: null, // null = unlimited
    },
    eligibleGrades: {
      type: [String], // e.g. ["Class 9", "Class 10"]
      default: [], // empty = all grades
    },
    participants: [
      {
        school: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        contactPerson: String,
        contactPhone: String,
        expectedStudents: Number,
        notes: String,
        students: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
          },
        ],
      },
    ],
    assignedMentors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
      },
    ],
  },
  { timestamps: true }
);

EventSchema.index({ eventScope: 1, visibility: 1, lifecycleStatus: 1, date: 1 });
EventSchema.index({ "partners.organizer": 1, visibility: 1, lifecycleStatus: 1 });

export default mongoose.models.Event || mongoose.model("Event", EventSchema);
