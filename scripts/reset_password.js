const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/egrantha';

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String },
    status: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function resetPassword() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        // Create a new hashed password
        const newPassword = 'password123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        console.log('New hashed password:', hashedPassword);

        const res = await User.updateOne(
            { email: 'admin@antigravity.edu' },
            { $set: { password: hashedPassword, status: 'APPROVED' } }
        );
        console.log('Update result:', res);

        // Verify the update
        const user = await User.findOne({ email: 'admin@antigravity.edu' });
        console.log('User after update:');
        console.log('  Email:', user.email);
        console.log('  Status:', user.status);

        // Test password comparison
        const isMatch = await bcrypt.compare(newPassword, user.password);
        console.log('  Password match test:', isMatch);

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
resetPassword();
