require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const LocationPing = require('./models/LocationPing');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/promap').then(async () => {
  const demoEmails = ['ahmed@promap.ae', 'sarah@promap.ae', 'john@promap.ae'];
  const employees = await Employee.find({ email: { $in: demoEmails } });
  for (const e of employees) {
    await LocationPing.deleteMany({ employee: e._id });
    await Employee.deleteOne({ _id: e._id });
    console.log('Deleted', e.email);
  }
  console.log('Done');
  process.exit(0);
});
