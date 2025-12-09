const mongoose = require('mongoose');
// require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/egrantha';

const UserSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        status: String,
        role: String
    }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');
        const user = await User.findOne({ email: 'admin@antigravity.edu' });
        if (user) {
            console.log('User found:');
            console.log('Email:', user.email);
            console.log('Password (stored):', user.password);
            console.log('Status:', user.status);
            console.log('Role:', user.role);
        } else {
            console.log('User NOT found with that email.');
        }
        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
check();
