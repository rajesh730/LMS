import mongoose from "mongoose";

// A transfer record for moving an existing student between schools.
// New flow: student requests release -> current school approves and issues a
// transfer code -> student selects destination -> destination school admits.
// The SAME Student document is reused so achievements/writings/results stay
// linked to the person.

const StudentTransferSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    platformStudentId: {
      type: String,
      default: "",
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
      default: null,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    requestedByStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED",
        "PENDING_RELEASE",
        "RELEASED",
        "PENDING_ADMISSION",
        "COMPLETED",
        "REJECTED",
        "CANCELLED",
      ],
      default: "PENDING_RELEASE",
    },
    transferCode: {
      type: String,
      default: "",
      trim: true,
    },
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    targetSelectedAt: {
      type: Date,
      default: null,
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
  { student: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ["PENDING", "PENDING_RELEASE", "RELEASED", "PENDING_ADMISSION"],
      },
    },
  }
);
StudentTransferSchema.index({ toSchool: 1, status: 1, createdAt: -1 });
StudentTransferSchema.index({ fromSchool: 1, status: 1, createdAt: -1 });

const existingStudentTransferModel = mongoose.models.StudentTransfer;

if (
  existingStudentTransferModel &&
  (!existingStudentTransferModel.schema.path("transferCode") ||
    !existingStudentTransferModel.schema
      .path("status")
      ?.enumValues?.includes("PENDING_RELEASE"))
) {
  delete mongoose.models.StudentTransfer;
}

const StudentTransfer =
  mongoose.models.StudentTransfer ||
  mongoose.model("StudentTransfer", StudentTransferSchema);

export default StudentTransfer;
