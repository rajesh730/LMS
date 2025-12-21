import mongoose from "mongoose";

const GradingScaleSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true, // e.g., "Standard GPA System"
    },
    ranges: [
      {
        minPercentage: { type: Number, required: true },
        maxPercentage: { type: Number, required: true },
        grade: { type: String, required: true }, // e.g., "A+"
        gpa: { type: Number, required: true }, // e.g., 4.0
        description: { type: String }, // e.g., "Outstanding"
      }
    ],
    isDefault: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

export default mongoose.models.GradingScale || mongoose.model("GradingScale", GradingScaleSchema);
