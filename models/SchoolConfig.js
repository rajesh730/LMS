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
    // Whether a child's photo may be shown to their authorised guardians in
    // the Parent App and on the activation confirmation screen (§54).
    //
    // Defaults to true because this is NOT public exposure: the photo is only
    // ever shown to a guardian holding a valid Parent Access Card for that
    // specific child, or already authorised through ParentStudentLink. A school
    // with a stricter photo policy can switch it off, and every surface falls
    // back to initials.
    allowStudentPhotoInParentApp: {
        type: Boolean,
        default: true,
    },
    // --- Parent messaging routing (§14) ---------------------------------
    // Maps each parent-facing topic to the staff who should receive it. A
    // parent picks a TOPIC, never a person, which is what stops every parent
    // in the school from messaging every teacher directly.
    //
    // An empty/absent array for a topic means "not offered by this school" —
    // the topic is hidden from the parent's chooser rather than silently
    // routed somewhere unattended. lib/parentMessaging.js falls back to the
    // school admin only when NO routes are configured at all, so a school that
    // has not set this up still receives parent messages.
    parentMessaging: {
        enabled: {
            type: Boolean,
            default: true,
        },
        routes: [
            {
                topic: {
                    type: String,
                    trim: true,
                },
                // Shown to the parent, e.g. "Class Teacher", "School Office".
                label: {
                    type: String,
                    default: "",
                    trim: true,
                },
                // Staff recipients. Teachers and school admins live in
                // different collections, so each entry records which.
                recipients: [
                    {
                        staff: {
                            type: mongoose.Schema.Types.ObjectId,
                            refPath: "parentMessaging.routes.recipients.staffModel",
                        },
                        staffModel: {
                            type: String,
                            enum: ["User", "Teacher"],
                            default: "User",
                        },
                    },
                ],
            },
        ],
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
