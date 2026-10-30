const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@demo.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({ name: 'Admin', email, password: await bcrypt.hash(password, 10), role: 'admin' });
    console.log(`👑 Admin created (${email})`);
  }
  return admin;
}

module.exports = ensureAdmin;
