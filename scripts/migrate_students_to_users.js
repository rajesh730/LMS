import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../lib/db.js'; // Adjust path based on execution context
import Student from '../models/Student.js';
import User from '../models/User.js';

// We need to establish connection slightly differently as this is a standalone script
// Depending on how you run it (node scripts/migrate.js vs nextjs api), imports might need adjustment.
// For simplicity in this environment, we assume we use `npm run dev` context or similar, 
// OR we just assume standard node execution with dotenv.

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

async function migrateStudents() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const students = await Student.find({});
        console.log(`Found ${students.length} students.`);

        let count = 0;
        const hashedPassword = await bcrypt.hash('student123', 10);

        for (const student of students) {
            // Check if user exists
            const existingUser = await User.findOne({ email: student.email });
            if (!existingUser) {
                await User.create({
                    email: student.email,
                    password: hashedPassword,
                    role: 'STUDENT',
                    schoolName: 'Student', // Placeholder
                    status: 'APPROVED',
                    // We can add a name field to User schema or just rely on Student profile
                    // For auth session, we might want a name here or join later.
                    // Let's assume we update User schema to have a 'name' field generally (it had schoolName/principalName)
                });
                console.log(`Created User for ${student.email}`);
                count++;
            } else {
                // console.log(`User already exists for ${student.email}`);
            }
        }

        console.log(`Migration complete. Created ${count} new User accounts.`);
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateStudents();
