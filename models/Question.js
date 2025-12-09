import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema(
  {
    chapter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
    },
    text: {
      type: String,
      required: [true, "Please provide question text"],
    },
    type: {
      type: String,
      enum: ["MCQ", "SHORT_ANSWER"],
      default: "MCQ",
    },
    options: [
      {
        text: String,
        isCorrect: Boolean,
      },
    ],
    correctAnswer: {
      type: String, // For SHORT_ANSWER or simple reference
    },
    points: {
      type: Number,
      default: 1,
    },
    tags: {
      type: [String], // e.g., ["important", "past"]
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Question ||
  mongoose.model("Question", QuestionSchema);
