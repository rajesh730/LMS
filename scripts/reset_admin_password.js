const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const UserSchema = new mongoose.Schema({
    email: String,
    password: String,
    role: String
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const admin = await User.findOne({ role: 'SCHOOL_ADMIN' });
        if (!admin) {
            console.log('No School Admin found');
            return;
        }

        const hashedPassword = await bcrypt.hash('password123', 10);
        admin.password = hashedPassword;
        await admin.save();

        console.log(`Password for ${admin.email} reset to 'password123'`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

resetPassword();
