const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/egrantha';

const UserSchema = new mongoose.Schema(
    {
        email: { type: String, required: true },
        status: String
    }
);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function approve() {
    try {
        await mongoose.connect(MONGODB_URI);
        const res = await User.updateOne(
            { email: 'admin@antigravity.edu' },
            { $set: { status: 'APPROVED' } }
        );
        console.log('Update result:', res);
        await mongoose.disconnect();
    } catch (e) { console.error(e); }
}
approve();
