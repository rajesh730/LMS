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
    allowStudentGlobalWall: {
        type: Boolean,
        default: false,
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
