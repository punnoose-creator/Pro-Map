const mongoose = require('mongoose');
const Employee = require('../models/Employee');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

const employees = [
  { 
    fullName: 'Baseer', 
    employeeId: 'ELV-0044', 
    email: 'baseer@vigil.ae', 
    department: 'Sales', 
    password: 'FieldIQ@123', 
    googleSheetId: '1tLZKuOU2S2JxHqPqZBm3eExMkYSOqt1pDXdA5dBIZaM' 
  },
  { 
    fullName: 'Deepesh', 
    employeeId: 'ELV-0045', 
    email: 'deepesh@vigil.ae', 
    department: 'Sales', 
    password: 'FieldIQ@123', 
    googleSheetId: '1EXkahDJr6y0Clsjew7AFBRUcLsZoz1GG9kAhriOZuks' 
  },
  { 
    fullName: 'Geetha', 
    employeeId: 'ELV-0046', 
    email: 'geetha@vigil.ae', 
    department: 'Sales', 
    password: 'FieldIQ@123', 
    googleSheetId: '1OEc3zsh8vashDpZLGM56jLWYoLkNJWD-1ZjkCtaKmhw' 
  },
  { 
    fullName: 'Shan', 
    employeeId: 'ELV-0047', 
    email: 'shan@vigil.ae', 
    department: 'Sales', 
    password: 'FieldIQ@123', 
    googleSheetId: '106Jzgz1XBifkydQxnYCOkJEJd6m0Q-iiyK3LyAHMgSw' 
  }
];

async function migrate() {
  try {
    console.log('Connecting to Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // 1. Create/Update Admin
    let admin = await Employee.findOne({ email: 'admin@promap.ae' });
    if (!admin) {
      await Employee.create({
        fullName: 'System Admin',
        employeeId: 'ADM-001',
        email: 'admin@promap.ae',
        password: 'admin@02',
        department: 'Other',
        role: 'admin'
      });
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // 2. Create/Update Employees
    for (const data of employees) {
      const existing = await Employee.findOne({ email: data.email });
      if (!existing) {
        await Employee.create(data);
        console.log(`✅ Created employee: ${data.fullName}`);
      } else {
        existing.googleSheetId = data.googleSheetId;
        existing.employeeId = data.employeeId;
        await existing.save();
        console.log(`ℹ️ Updated employee: ${data.fullName}`);
      }
    }

    console.log('\n🚀 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

migrate();
