require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('../models/Employee');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fieldiq';

async function listEmployees() {
  try {
    await mongoose.connect(MONGO_URI);
    
    const employees = await Employee.find({}, 'fullName email employeeId department role');
    
    console.log('--- Current Employees ---');
    if (employees.length === 0) {
      console.log('No employees found.');
    } else {
      employees.forEach((emp, i) => {
        console.log(`${i + 1}. ${emp.fullName} (${emp.employeeId}) - ${emp.email} [${emp.role}]`);
      });
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error listing employees:', err.message);
    process.exit(1);
  }
}

listEmployees();
