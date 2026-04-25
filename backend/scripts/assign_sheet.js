const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function assignSheet() {
  const identifier = process.argv[2]; // Email or Name
  const sheetUrlOrId = process.argv[3];

  if (!identifier || !sheetUrlOrId) {
    console.log('Usage: node scripts/assign_sheet.js <email_or_name> <sheet_url_or_id>');
    process.exit(1);
  }

  // Extract ID from URL if provided
  let sheetId = sheetUrlOrId;
  const match = sheetUrlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    sheetId = match[1];
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const employee = await Employee.findOneAndUpdate(
      { 
        $or: [
          { email: identifier.toLowerCase() },
          { fullName: identifier }
        ]
      },
      { googleSheetId: sheetId },
      { new: true }
    );

    if (employee) {
      console.log(`✅ Success! Assigned sheet ${sheetId} to ${employee.fullName} (${employee.email})`);
    } else {
      console.log(`❌ Employee "${identifier}" not found.`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

assignSheet();
