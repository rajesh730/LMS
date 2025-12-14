import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
    },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT"],
      default: "SCHOOL_ADMIN",
    },
    schoolName: {
      type: String,
      // Only required if role is SCHOOL_ADMIN
    },
    name: {
      type: String, // Generic name for Students/Teachers
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom", // Link for students
    },
    isDefaultAdmin: {
      type: Boolean,
      default: false,
    },
    principalName: {
      type: String,
    },
    principalPhone: {
      type: String,
    },
    schoolLocation: {
      type: String,
    },
    schoolPhone: {
      type: String,
    },
    website: {
      type: String,
    },
    establishedYear: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SUBSCRIBED", "UNSUBSCRIBED"],
      default: "PENDING",
    },
    // Education configuration for schools
    educationLevels: {
      school: { type: Boolean, default: false },
      highSchool: { type: Boolean, default: false },
      bachelor: { type: Boolean, default: false },
    },
    schoolConfig: {
      type: Schema.Types.Mixed,
      // Don't use defaults for Mixed type - let the API send the full object
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
