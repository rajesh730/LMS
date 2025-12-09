import mongoose from 'mongoose';

const ChapterSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please provide a chapter title'],
        },
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
        },
        order: {
            type: Number,
            required: true,
        },
        content: {
            type: String, // Rich text content
        },
        resources: [{
            title: String,
            url: String,
        }],
    },
    { timestamps: true }
);

export default mongoose.models.Chapter || mongoose.model('Chapter', ChapterSchema);
