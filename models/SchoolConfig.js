import mongoose from 'mongoose';

const SchoolConfigSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    schoolCode: {
        type: String,
        default: "",
        trim: true,
    },
    city: {
        type: String,
        default: "",
        trim: true,
    },
    state: {
        type: String,
        default: "",
        trim: true,
    },
    pincode: {
        type: String,
        default: "",
        trim: true,
    },
    teacherRoles: {
        type: [String],
        default: [],
    },
    teacherRolesCustomized: {
        type: Boolean,
        default: false,
    },
    grades: {
        type: [String],
        default: [],
    },
    // Which calendar this school's academic years are displayed in (AD or BS).
    academicCalendar: {
        type: String,
        enum: ["AD", "BS"],
        default: "AD",
    },
}, { timestamps: true });

SchoolConfigSchema.pre("validate", function () {
    if (Array.isArray(this.teacherRoles)) {
        this.teacherRoles = this.teacherRoles.map((role) =>
            role === "Club Lead" ? "Program Lead" : role
        );
    }
});

export default mongoose.models.SchoolConfig || mongoose.model('SchoolConfig', SchoolConfigSchema);
