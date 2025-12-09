import mongoose from 'mongoose';
import connectDB from '../lib/db.js';
import Event from '../models/Event.js';
import '../models/User.js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function createTestEvent() {
    try {
        await connectDB();
        const event = await Event.create({
            title: 'DELETE ME - TEST EVENT',
            description: 'This is a test event created for debugging deletion.',
            date: new Date(),
            createdBy: '60d5ecb8b392d70015c57c2a', // Mock ID, doesn't validate ref strictly usually or use a real one if needed
            status: 'APPROVED'
        });
        console.log('Created test event:', event._id);
        process.exit(0);
    } catch (error) {
        if (error.code === 11000) {
            console.log('Test event already exists or duplicate key.');
        } else {
            // If creator validation fails, we might need a real user.
            // But let's try.
            console.error('Error creating event:', error.message);
        }
        process.exit(1);
    }
}

createTestEvent();
