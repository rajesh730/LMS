import mongoose from "mongoose";

const MarksSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    grade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grade",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      // required: true, // TODO: Make required after migration
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
    },
    // Assessment types
    assessmentType: {
      type: String,
      enum: [
        "UNIT_TEST",
        "MIDTERM",
        "ASSIGNMENT",
        "PROJECT",
        "FINAL_EXAM",
        "PRACTICAL",
        "ORAL",
      ],
      required: true,
    },
    assessmentName: {
      type: String,
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    marksObtained: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function () {
          return this.marksObtained <= this.totalMarks;
        },
        message: "Marks obtained cannot exceed total marks",
      },
    },
    percentage: {
      type: Number,
      default: 0,
    },
    grade: {
      type: String,
      enum: ["A+", "A", "B+", "B", "C+", "C", "D+", "D", "E", "F"],
      default: "F",
    },
    feedback: {
      type: String,
      maxlength: 500,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Pre-save hook to calculate percentage and grade
MarksSchema.pre("save", function (next) {
  if (this.totalMarks > 0) {
    this.percentage = Math.round((this.marksObtained / this.totalMarks) * 100);

    // Grade calculation based on percentage
    if (this.percentage >= 90) this.grade = "A+";
    else if (this.percentage >= 85) this.grade = "A";
    else if (this.percentage >= 80) this.grade = "B+";
    else if (this.percentage >= 75) this.grade = "B";
    else if (this.percentage >= 70) this.grade = "C+";
    else if (this.percentage >= 65) this.grade = "C";
    else if (this.percentage >= 60) this.grade = "D+";
    else if (this.percentage >= 55) this.grade = "D";
    else if (this.percentage >= 40) this.grade = "E";
    else this.grade = "F";
  }
  next();
});

// Index for faster queries
MarksSchema.index({ student: 1, subject: 1 });
MarksSchema.index({ teacher: 1, subject: 1 });
MarksSchema.index({ school: 1 });

export default mongoose.models.Marks || mongoose.model("Marks", MarksSchema);
