const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo, app, User, Ticket, admin, member, adminToken, memberToken;

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const api = {
  get: (path, token = adminToken) => request(app).get(`/api${path}`).set(auth(token)),
  post: (path, body, token = adminToken) => request(app).post(`/api${path}`).set(auth(token)).send(body),
  patch: (path, body, token = adminToken) => request(app).patch(`/api${path}`).set(auth(token)).send(body),
  del: (path, token = adminToken) => request(app).delete(`/api${path}`).set(auth(token)),
};
const login = async (email) =>
  (await request(app).post('/api/auth/login').send({ email, password: 'secret123' })).body.token;

const validTicket = (over = {}) => ({ title: 'Printer is broken', description: 'It prints blank pages', category: 'Bug', ...over });
const makeTicket = (over = {}) =>
  Ticket.create({ title: 'Sample ticket', description: 'Sample description', category: 'Bug', createdBy: admin._id, ...over });

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = require('../src/app');
  User = require('../src/models/User');
  Ticket = require('../src/models/Ticket');

  const password = await bcrypt.hash('secret123', 4);
  admin = await User.create({ name: 'Admin', email: 'admin@test.com', password, role: 'admin' });
  member = await User.create({ name: 'Member', email: 'member@test.com', password, role: 'user' });
  adminToken = await login('admin@test.com');
  memberToken = await login('member@test.com');
});

afterEach(async () => {
  await Ticket.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('auth', () => {
  test('rejects requests without a token', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(401);
  });

  test('rejects an invalid token', async () => {
    const res = await request(app).get('/api/tickets').set(auth('not-a-token'));
    expect(res.status).toBe(401);
  });

  test('rejects wrong credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('login validates input', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});

describe('ticket validation', () => {
  test('missing required fields -> 400 with field errors', async () => {
    const res = await api.post('/tickets', { description: 'only a description' });
    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'category']));
  });

  test('invalid priority -> 400', async () => {
    const res = await api.post('/tickets', validTicket({ priority: 'Urgent' }));
    expect(res.status).toBe(400);
  });

  test('cannot set status or createdBy on create (unknown keys rejected)', async () => {
    const res = await api.post('/tickets', validTicket({ status: 'Closed' }));
    expect(res.status).toBe(400);
  });

  test('empty patch body -> 400', async () => {
    const t = await makeTicket();
    const res = await api.patch(`/tickets/${t._id}`, {});
    expect(res.status).toBe(400);
  });

  test('malformed id -> 400, unknown id -> 404', async () => {
    expect((await api.get('/tickets/123')).status).toBe(400);
    expect((await api.get(`/tickets/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
    expect((await api.patch(`/tickets/${new mongoose.Types.ObjectId()}`, { title: 'Valid title' })).status).toBe(404);
  });

  test('unknown route -> JSON 404', async () => {
    const res = await api.get('/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});

describe('ticket CRUD & permissions', () => {
  test('create returns 201, defaults and a "created" history entry', async () => {
    const res = await api.post('/tickets', validTicket(), memberToken);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'Open', priority: 'Medium', assignee: null });
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0].type).toBe('created');
  });

  test('creator can edit own ticket and edit is logged', async () => {
    const created = await api.post('/tickets', validTicket(), memberToken);
    const res = await api.patch(`/tickets/${created.body._id}`, { priority: 'High' }, memberToken);
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('High');
    expect(res.body.history.at(-1).type).toBe('updated');
  });

  test('non-creator user cannot edit someone else\'s ticket', async () => {
    const t = await makeTicket(); // created by admin
    const res = await api.patch(`/tickets/${t._id}`, { title: 'Hijacked title' }, memberToken);
    expect(res.status).toBe(403);
  });

  test('only admins can delete', async () => {
    const t = await makeTicket();
    expect((await api.del(`/tickets/${t._id}`, memberToken)).status).toBe(403);
    expect((await api.del(`/tickets/${t._id}`)).status).toBe(200);
    expect((await api.del(`/tickets/${t._id}`)).status).toBe(404);
  });
});

describe('status transitions & history', () => {
  test.each([
    ['Open', 'In Progress'],
    ['In Progress', 'Resolved'],
    ['Resolved', 'Closed'],
    ['Closed', 'Open'],
  ])('%s -> %s is allowed', async (from, to) => {
    const t = await makeTicket({ status: from });
    const res = await api.patch(`/tickets/${t._id}/status`, { status: to });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(to);
  });

  test.each([
    ['Open', 'Resolved'],
    ['Resolved', 'Open'],
    ['Closed', 'Resolved'],
    ['Closed', 'In Progress'],
    ['In Progress', 'Closed'],
  ])('%s -> %s is rejected with 409 and status is unchanged', async (from, to) => {
    const t = await makeTicket({ status: from });
    const res = await api.patch(`/tickets/${t._id}/status`, { status: to });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/invalid status transition/i);
    expect((await Ticket.findById(t._id)).status).toBe(from);
  });

  test('same status -> 400, unknown status -> 400', async () => {
    const t = await makeTicket();
    expect((await api.patch(`/tickets/${t._id}/status`, { status: 'Open' })).status).toBe(400);
    expect((await api.patch(`/tickets/${t._id}/status`, { status: 'Done' })).status).toBe(400);
  });

  test('history records previous status, new status and timestamp', async () => {
    const created = await api.post('/tickets', validTicket());
    await api.patch(`/tickets/${created.body._id}/status`, { status: 'In Progress' });
    await api.patch(`/tickets/${created.body._id}/status`, { status: 'Resolved' });

    const res = await api.get(`/tickets/${created.body._id}/history`);
    expect(res.status).toBe(200);
    const changes = res.body.filter((h) => h.type === 'status');
    expect(changes.map((h) => [h.from, h.to])).toEqual([
      ['Open', 'In Progress'],
      ['In Progress', 'Resolved'],
    ]);
    changes.forEach((h) => {
      expect(new Date(h.at).getTime()).not.toBeNaN();
      expect(h.by.name).toBe('Admin');
    });
  });
});

describe('assignment', () => {
  test('non-admin cannot assign', async () => {
    const t = await makeTicket({ createdBy: member._id });
    const res = await api.patch(`/tickets/${t._id}/assignee`, { assignee: String(member._id) }, memberToken);
    expect(res.status).toBe(403);
  });

  test('admin can assign and unassign; both are logged', async () => {
    const t = await makeTicket();
    let res = await api.patch(`/tickets/${t._id}/assignee`, { assignee: String(member._id) });
    expect(res.status).toBe(200);
    expect(res.body.assignee.name).toBe('Member');

    res = await api.patch(`/tickets/${t._id}/assignee`, { assignee: null });
    expect(res.body.assignee).toBeNull();
    const logs = res.body.history.filter((h) => h.type === 'assignee');
    expect(logs.map((h) => [h.from, h.to])).toEqual([
      ['Unassigned', 'Member'],
      ['Member', 'Unassigned'],
    ]);
  });

  test('assigning a non-existent user -> 400', async () => {
    const t = await makeTicket();
    const res = await api.patch(`/tickets/${t._id}/assignee`, { assignee: String(new mongoose.Types.ObjectId()) });
    expect(res.status).toBe(400);
  });
});

describe('listing: search, filters, sorting, pagination', () => {
  const specs = Array.from({ length: 25 }, (_, i) => ({
    title: `Ticket ${String(i + 1).padStart(2, '0')}`,
    description: 'Seeded for list tests',
    category: ['Bug', 'Feature', 'Billing'][i % 3],
    priority: ['Low', 'Medium', 'High', 'Critical'][i % 4],
    status: i % 2 === 0 ? 'Open' : 'In Progress',
    assignee: i % 5 === 0 ? 'member' : null,
  }));

  beforeEach(async () => {
    await Ticket.create(specs.map((s) => ({ ...s, assignee: s.assignee ? member._id : null, createdBy: admin._id })));
  });

  test('defaults: page 1, limit 10, newest first, with pagination metadata', async () => {
    const res = await api.get('/tickets');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.pagination).toEqual({ page: 1, limit: 10, total: 25, totalPages: 3 });
  });

  test('last page holds the remainder and pages never overlap', async () => {
    const p1 = await api.get('/tickets?page=1&limit=10');
    const p3 = await api.get('/tickets?page=3&limit=10');
    const p4 = await api.get('/tickets?page=4&limit=10');
    expect(p3.body.data).toHaveLength(5);
    expect(p4.body.data).toHaveLength(0);
    const ids1 = p1.body.data.map((t) => t._id);
    expect(p3.body.data.some((t) => ids1.includes(t._id))).toBe(false);
  });

  test('filters combine (status + priority) and pagination counts only matches', async () => {
    const expected = specs.filter((s) => s.status === 'Open' && s.priority === 'High');
    const res = await api.get('/tickets?status=Open&priority=High&limit=2&page=1');
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(expected.length);
    expect(res.body.pagination.totalPages).toBe(Math.ceil(expected.length / 2));
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    res.body.data.forEach((t) => {
      expect(t.status).toBe('Open');
      expect(t.priority).toBe('High');
    });
  });

  test('filtered pages are consistent across pages', async () => {
    const expected = specs.filter((s) => s.category === 'Bug');
    const seen = new Set();
    for (let page = 1; page <= Math.ceil(expected.length / 3); page += 1) {
      const res = await api.get(`/tickets?category=Bug&limit=3&page=${page}`);
      res.body.data.forEach((t) => {
        expect(t.category).toBe('Bug');
        seen.add(t._id);
      });
    }
    expect(seen.size).toBe(expected.length);
  });

  test('multiple values per filter (comma separated)', async () => {
    const expected = specs.filter((s) => ['Low', 'Critical'].includes(s.priority));
    const res = await api.get('/tickets?priority=Low,Critical&limit=100');
    expect(res.body.pagination.total).toBe(expected.length);
  });

  test('assignee filter: specific user, unassigned, and both', async () => {
    const assigned = specs.filter((s) => s.assignee).length;
    expect((await api.get(`/tickets?assignee=${member._id}&limit=100`)).body.pagination.total).toBe(assigned);
    expect((await api.get('/tickets?assignee=unassigned&limit=100')).body.pagination.total).toBe(25 - assigned);
    expect((await api.get(`/tickets?assignee=unassigned,${member._id}&limit=100`)).body.pagination.total).toBe(25);
  });

  test('search is case-insensitive and combines with filters', async () => {
    const one = await api.get('/tickets?search=ticket 07');
    expect(one.body.pagination.total).toBe(1);
    expect(one.body.data[0].title).toBe('Ticket 07');

    const none = await api.get('/tickets?search=ticket 07&status=Closed');
    expect(none.body.pagination.total).toBe(0);
  });

  test('regex characters in search are treated literally', async () => {
    const res = await api.get('/tickets?search=(');
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(0);
  });

  test('sorting by title and by priority rank', async () => {
    const byTitle = await api.get('/tickets?sortBy=title&order=asc&limit=3');
    expect(byTitle.body.data.map((t) => t.title)).toEqual(['Ticket 01', 'Ticket 02', 'Ticket 03']);

    const byPriority = await api.get('/tickets?sortBy=priority&order=desc&limit=100');
    const ranks = byPriority.body.data.map((t) => ({ Low: 1, Medium: 2, High: 3, Critical: 4 })[t.priority]);
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    expect(byPriority.body.data[0].priority).toBe('Critical');
  });

  test.each([
    ['limit=1000'],
    ['limit=0'],
    ['page=0'],
    ['status=Bogus'],
    ['sortBy=password'],
    ['assignee=not-an-id'],
  ])('invalid query "%s" -> 400', async (qs) => {
    const res = await api.get(`/tickets?${qs}`);
    expect(res.status).toBe(400);
  });
});

describe('analytics', () => {
  test('counts come from the database and are zero-filled', async () => {
    await Ticket.create([
      { title: 'A ticket', description: 'desc desc', category: 'Bug', createdBy: admin._id, status: 'Open', priority: 'Critical' },
      { title: 'B ticket', description: 'desc desc', category: 'Bug', createdBy: admin._id, status: 'Resolved', priority: 'Low' },
      { title: 'C ticket', description: 'desc desc', category: 'Bug', createdBy: admin._id, status: 'Resolved', priority: 'Critical' },
    ]);
    const res = await api.get('/tickets/analytics');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 3, open: 1, resolved: 2, critical: 2 });
    expect(res.body.byStatus).toContainEqual({ name: 'Closed', count: 0 });
    expect(res.body.byPriority).toHaveLength(4);
  });

  test('date range filter (inclusive, YYYY-MM-DD)', async () => {
    const base = { description: 'desc desc', category: 'Bug', createdBy: admin._id };
    await Ticket.create([
      { ...base, title: 'Jan one', createdAt: new Date('2026-01-10T10:00:00Z') },
      { ...base, title: 'Jan two', createdAt: new Date('2026-01-31T23:00:00Z') },
      { ...base, title: 'Feb one', createdAt: new Date('2026-02-05T10:00:00Z') },
    ]);
    expect((await api.get('/tickets/analytics?from=2026-01-01&to=2026-01-31')).body.total).toBe(2);
    expect((await api.get('/tickets/analytics?from=2026-02-01')).body.total).toBe(1);
    expect((await api.get('/tickets/analytics?to=2026-01-10')).body.total).toBe(1);
  });

  test('invalid or reversed range -> 400', async () => {
    expect((await api.get('/tickets/analytics?from=yesterday')).status).toBe(400);
    expect((await api.get('/tickets/analytics?from=2026-03-01&to=2026-02-01')).status).toBe(400);
  });
});
