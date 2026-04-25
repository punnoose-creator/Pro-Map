const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listEmployees() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const employees = await Employee.find({});
    
    console.log('\nList of Employees:');
    employees.forEach((emp, index) => {
      console.log(`${index + 1}. Name: ${emp.fullName}, ID: ${emp.employeeId}, Email: ${emp.email}, Department: ${emp.department}`);
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listEmployees();
