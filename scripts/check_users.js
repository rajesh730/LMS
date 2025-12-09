const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Hardcoded URI to match lib/db.js
const MONGODB_URI = 'mongodb://localhost:27017/egrantha';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT'], default: 'SCHOOL_ADMIN' },
    schoolName: String,
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'UNSUBSCRIBED'], default: 'PENDING' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function checkUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB:', MONGODB_URI);

        const users = await User.find({});
        console.log('Found users:', users.length);

        const targetEmail = 'orbit4@gmail.com';
        const targetPassword = 'orbit';
        let user = await User.findOne({ email: targetEmail });

        if (user) {
            console.log(`User found: ${user.email}, Role: ${user.role}, Status: ${user.status}`);
            console.log('Resetting password to "orbit"...');
            const hashedPassword = await bcrypt.hash(targetPassword, 10);
            user.password = hashedPassword;
            user.status = 'APPROVED';
            user.role = 'SCHOOL_ADMIN'; // Ensure correct role
            await user.save();
            console.log('User updated successfully.');
        } else {
            console.log(`User ${targetEmail} not found. Creating...`);
            const hashedPassword = await bcrypt.hash(targetPassword, 10);
            await User.create({
                email: targetEmail,
                password: hashedPassword,
                role: 'SCHOOL_ADMIN',
                status: 'APPROVED',
                schoolName: 'Orbit School'
            });
            console.log('User created successfully.');
        }

        console.log('Done');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUsers();
