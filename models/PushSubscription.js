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
    // Ties a device to the credential generation that registered it. Issuing a
    // replacement Parent Access Card increments authVersion, which immediately
    // stops the old device from receiving private lock-screen alerts.
    authVersion: { type: Number, required: true, default: 0, min: 0 },
    expirationTime: { type: Date, default: null },
    userAgent: { type: String, default: "", maxlength: 500 },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ parent: 1, updatedAt: -1 });
PushSubscriptionSchema.index({ parent: 1, authVersion: 1 });

export default mongoose.models.PushSubscription ||
  mongoose.model("PushSubscription", PushSubscriptionSchema);
