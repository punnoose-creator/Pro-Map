const mongoose = require('mongoose');
const Employee = require('../models/Employee');
require('dotenv').config();

const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/makeAdmin.js <email>');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/promap')
  .then(async () => {
    const result = await Employee.findOneAndUpdate(
      { email: email.toLowerCase() },
      { role: 'admin' },
      { new: true }
    );

    if (result) {
      console.log(`✅ Success! ${email} is now an admin.`);
    } else {
      console.log(`❌ Employee with email ${email} not found.`);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
