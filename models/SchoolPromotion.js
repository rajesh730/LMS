import mongoose from "mongoose";

const { Schema } = mongoose;

const SchoolPromotionSchema = new Schema(
  {
    school: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: 220,
      default: "",
    },
    placement: {
      type: String,
      enum: ["HOME_SPOTLIGHT", "SCHOOLS_SPOTLIGHT"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "PAUSED"],
      default: "DRAFT",
      index: true,
    },
    priority: {
      type: String,
      enum: ["STANDARD", "PREMIUM"],
      default: "STANDARD",
      index: true,
    },
    startsAt: {
      type: Date,
      required: true,
      index: true,
    },
    endsAt: {
      type: Date,
      required: true,
      index: true,
    },
    destinationUrl: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    lastShownAt: {
      type: Date,
      default: null,
      index: true,
    },
    impressionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

SchoolPromotionSchema.index({
  placement: 1,
  status: 1,
  startsAt: 1,
  endsAt: 1,
  lastShownAt: 1,
});
SchoolPromotionSchema.index({ school: 1, placement: 1, status: 1 });

export default mongoose.models.SchoolPromotion ||
  mongoose.model("SchoolPromotion", SchoolPromotionSchema);
