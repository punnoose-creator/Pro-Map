require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('../models/Employee');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fieldiq';

async function deleteEmployees() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const namesToDelete = ['Anurag', 'Jay'];
    
    // Find and delete employees whose fullName contains these names (case-insensitive)
    const result = await Employee.deleteMany({
      fullName: { $regex: new RegExp(namesToDelete.join('|'), 'i') }
    });

    console.log(`Successfully deleted ${result.deletedCount} employees.`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error deleting employees:', err.message);
    process.exit(1);
  }
}

deleteEmployees();
