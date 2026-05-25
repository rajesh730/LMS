import mongoose from "mongoose";

const UserSurfaceSeenStateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      index: true,
    },
    surface: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    seenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

UserSurfaceSeenStateSchema.index(
  { user: 1, surface: 1 },
  { unique: true }
);

export default mongoose.models.UserSurfaceSeenState ||
  mongoose.model("UserSurfaceSeenState", UserSurfaceSeenStateSchema);
