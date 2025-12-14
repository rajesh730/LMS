require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI?.substring(0, 30) + '...');
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./models/User.js').default;
    const user = await User.findOne({ email: 'info@ved.com' });
    
    if (user) {
      console.log('\n===== FULL USER DOCUMENT =====');
      console.log(JSON.stringify(user.toObject(), null, 2));
      console.log('\n===== JUST SCHOOLCONFIG =====');
      console.log(JSON.stringify(user.schoolConfig, null, 2));
    } else {
      console.log('User not found');
    }
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

check();
