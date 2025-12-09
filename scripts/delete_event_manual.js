import mongoose from 'mongoose';
import connectDB from '../lib/db.js';
import Event from '../models/Event.js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function deleteEvent() {
    const id = '6926a7edbd5649502a961e3b'; // singing comp
    try {
        await connectDB();
        console.log(`Attempting to delete ID: ${id}`);
        const result = await Event.findByIdAndDelete(id);
        if (result) {
            console.log('Successfully deleted:', result.title);
        } else {
            console.log('Event not found.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

deleteEvent();
