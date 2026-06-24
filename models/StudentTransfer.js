import mongoose from "mongoose";

// A claim-and-approve record for moving an existing student between schools.
// The new school files the request (after verifying platformStudentId + DOB);
// the origin school approves it. On approval the SAME Student document is reused
// so all achievements/writings/results stay with the person.

const StudentTransferSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    platformStudentId: {
      type: String,
      required: true,
      trim: true,
    },
    fromSchool: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    toSchool: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },
    // Where the new school will place the student.
    toGrade: {
      type: String,
      default: "",
      trim: true,
    },
    toRollNumber: {
      type: String,
      default: "",
      trim: true,
    },
    toAcademicYear: {
      type: String,
      default: "",
      trim: true,
    },
    toAcademicYearStart: {
      type: Number,
      default: null,
    },
    // Snapshots for display without extra populates / after the student moves.
    studentNameSnapshot: {
      type: String,
      default: "",
      trim: true,
    },
    fromSchoolNameSnapshot: {
      type: String,
      default: "",
      trim: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    decisionReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Only one open (PENDING) transfer per student at a time.
StudentTransferSchema.index(
  { student: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } }
);
StudentTransferSchema.index({ toSchool: 1, status: 1, createdAt: -1 });
StudentTransferSchema.index({ fromSchool: 1, status: 1, createdAt: -1 });

export default mongoose.models.StudentTransfer ||
  mongoose.model("StudentTransfer", StudentTransferSchema);
