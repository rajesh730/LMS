// Debug script to check events and test API
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/egrantha';

async function debug() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Check events directly
        const db = mongoose.connection.db;
        const events = await db.collection('events').find({}).toArray();
        console.log('\n=== EVENTS IN DATABASE ===');
        console.log('Total events:', events.length);

        if (events.length > 0) {
            events.forEach((e, i) => {
                console.log(`\n${i + 1}. ${e.title}`);
                console.log(`   Status: ${e.status}`);
                console.log(`   Date: ${e.date}`);
                console.log(`   CreatedBy: ${e.createdBy}`);
                console.log(`   Participants: ${e.participants?.length || 0}`);
            });
        } else {
            console.log('NO EVENTS FOUND IN DATABASE!');
        }

        // Check if there are any issues with the schema
        console.log('\n=== SCHEMA CHECK ===');
        if (events.length > 0) {
            const sample = events[0];
            console.log('Sample event fields:', Object.keys(sample).join(', '));
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

debug();
