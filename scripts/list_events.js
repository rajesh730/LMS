import mongoose from 'mongoose';
import connectDB from '../lib/db.js';
import Event from '../models/Event.js';
import '../models/User.js'; // Register model
import '../models/Group.js'; // Register model

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listEvents() {
    try {
        await connectDB();
        const events = await Event.find({});
        console.log('Events Found:', events.length);
        events.forEach(e => {
            console.log(`ID: ${e._id}, Title: ${e.title}`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listEvents();
