const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "General",
    },
    relatedTicket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportTicket",
    },
    views: {
      type: Number,
      default: 0,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    notHelpful: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    published: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

faqSchema.index({ category: 1, published: 1 });
faqSchema.index({ title: "text", content: "text" });

const FAQ = mongoose.models.FAQ || mongoose.model("FAQ", faqSchema);

module.exports = FAQ;
