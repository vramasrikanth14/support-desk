require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const ensureAdmin = require('./utils/ensureAdmin');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/support_tickets';

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not set. Copy .env.example to .env and set a value.');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await ensureAdmin();
    app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  });
