import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

export default mongoose.models.Event || mongoose.model("Event", EventSchema);
