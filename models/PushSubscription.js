import mongoose from "mongoose";

const PushSubscriptionSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      required: true,
      index: true,
    },
    endpoint: { type: String, required: true, unique: true, maxlength: 2048 },
    keys: {
      p256dh: { type: String, required: true, maxlength: 512 },
      auth: { type: String, required: true, maxlength: 256 },
    },
    userAgent: { type: String, default: "", maxlength: 500 },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ parent: 1, updatedAt: -1 });

export default mongoose.models.PushSubscription ||
  mongoose.model("PushSubscription", PushSubscriptionSchema);
