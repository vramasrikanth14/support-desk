const express = require('express');
const cors = require('cors');
const { protect } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');
const { PRIORITIES, STATUSES, CATEGORIES, TRANSITIONS } = require('./constants');

const app = express();

const origins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Enums + allowed transitions, so the frontend never hardcodes business rules.
app.get('/api/meta', protect, (req, res) =>
  res.json({ priorities: PRIORITIES, statuses: STATUSES, categories: CATEGORIES, transitions: TRANSITIONS })
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tickets', require('./routes/tickets'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
