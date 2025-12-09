import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a group name'],
            unique: true,
        },
        schools: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
    },
    { timestamps: true }
);

export default mongoose.models.Group || mongoose.model('Group', GroupSchema);
