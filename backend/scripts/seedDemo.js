const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const LocationPing = require('../models/LocationPing');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/promap';

const demoEmployees = [
  { fullName: 'Ahmed Al-Rashid', employeeId: 'EMP-001', email: 'ahmed@promap.ae', department: 'Sales', role: 'employee', password: 'password123', phone: '0501234567' },
  { fullName: 'Sarah Connor', employeeId: 'EMP-002', email: 'sarah@promap.ae', department: 'Pre-Sales', role: 'employee', password: 'password123', phone: '0501234568' },
  { fullName: 'John Smith', employeeId: 'EMP-003', email: 'john@promap.ae', department: 'Project Engineering', role: 'employee', password: 'password123', phone: '0501234569' }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    // Create Admin
    let admin = await Employee.findOne({ email: 'admin@promap.ae' });
    if (!admin) {
      admin = await Employee.create({
        fullName: 'System Admin',
        employeeId: 'ADM-001',
        email: 'admin@promap.ae',
        password: 'admin@02',
        department: 'Other',
        role: 'admin'
      });
      console.log('Admin user created');
    } else {
      admin.password = 'admin@02';
      admin.role = 'admin';
      await admin.save();
      console.log('Admin user updated');
    }

    // Create Demo Employees and their location pings
    const today = new Date();
    today.setHours(8, 0, 0, 0); // Start at 8 AM today

    for (const data of demoEmployees) {
      let emp = await Employee.findOne({ email: data.email });
      if (!emp) {
        emp = await Employee.create(data);
        console.log(`Created employee: ${emp.fullName}`);
      }

      // Clear old pings for this employee to prevent duplicates
      await LocationPing.deleteMany({ employee: emp._id });

      // Generate 15 fake GPS pings across Dubai
      const pings = [];
      let currentLat = 25.0500 + Math.random() * 0.2; // Start somewhere around Dubai
      let currentLng = 55.1500 + Math.random() * 0.2;
      let currentTime = new Date(today);

      for (let i = 0; i < 15; i++) {
        pings.push({
          employee: emp._id,
          latitude: currentLat,
          longitude: currentLng,
          accuracy: 10,
          speed: Math.random() * 60,
          heading: Math.random() * 360,
          createdAt: new Date(currentTime)
        });

        // Move slightly for next ping (approx 1-3km)
        currentLat += (Math.random() - 0.2) * 0.02;
        currentLng += (Math.random() - 0.2) * 0.02;
        // Advance time by 30 mins
        currentTime = new Date(currentTime.getTime() + 30 * 60000);
      }

      await LocationPing.insertMany(pings);
      console.log(`Inserted ${pings.length} pings for ${emp.fullName}`);
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
