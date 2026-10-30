// Usage: npm run seed   (wipes tickets, creates demo users + ~40 demo tickets)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const ensureAdmin = require('./utils/ensureAdmin');
const { PRIORITIES, STATUSES, CATEGORIES, canTransition } = require('./constants');

const TITLES = [
  'Cannot log in', 'Invoice shows wrong amount', 'Dark mode request', 'Page loads slowly', 'Password reset email missing',
  'Export to CSV fails', 'Update billing address', 'Notification spam', 'Profile photo not saving', 'Add SSO support',
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/support_tickets');
  const admin = await ensureAdmin();

  const password = await bcrypt.hash('user123', 10);
  const people = [];
  for (const [name, email] of [['Asha Rao', 'asha@demo.com'], ['Ravi Kumar', 'ravi@demo.com']]) {
    people.push((await User.findOne({ email })) || (await User.create({ name, email, password, role: 'user' })));
  }

  await Ticket.deleteMany({});
  const day = 24 * 60 * 60 * 1000;
  const docs = Array.from({ length: 40 }, (_, i) => {
    const createdAt = new Date(Date.now() - (i % 30) * day - i * 3600 * 1000);
    const status = STATUSES[(i * 7) % 4];
    const assignee = i % 3 === 0 ? null : people[i % 2]._id;
    const history = [{ type: 'created', to: 'Open', by: admin._id, at: createdAt }];
    let current = 'Open';
    for (const step of ['In Progress', 'Resolved', 'Closed']) {
      if (current === status) break;
      if (canTransition(current, step)) {
        history.push({ type: 'status', from: current, to: step, by: admin._id, at: new Date(createdAt.getTime() + day / 2) });
        current = step;
      }
    }
    return {
      title: `${TITLES[i % TITLES.length]} #${i + 1}`,
      description: 'Seeded demo ticket with enough text to look realistic in the table.',
      category: CATEGORIES[i % CATEGORIES.length],
      priority: PRIORITIES[(i * 3) % 4],
      status: current,
      assignee,
      createdBy: admin._id,
      createdAt,
      history,
    };
  });
  await Ticket.create(docs);

  console.log(`🌱 Seeded ${docs.length} tickets. Users: asha@demo.com / ravi@demo.com (password: user123)`);
  await mongoose.disconnect();
})();
