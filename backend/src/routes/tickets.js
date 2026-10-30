const express = require('express');
const { z } = require('zod');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { validate, validateObjectId, OBJECT_ID } = require('../middleware/validate');
const { AppError, asyncHandler } = require('../utils/errors');
const { PRIORITIES, STATUSES, CATEGORIES, TRANSITIONS, canTransition } = require('../constants');

const router = express.Router();
router.use(protect);

/* ----------------------------- validation ----------------------------- */

const title = z.string().trim().min(3, 'Title must be at least 3 characters').max(120, 'Title is too long');
const description = z.string().trim().min(5, 'Description must be at least 5 characters').max(2000);
const priority = z.enum(PRIORITIES);
const category = z.enum(CATEGORIES);
const objectId = z.string().regex(OBJECT_ID, 'Invalid id');

const createTicketSchema = z
  .object({
    title,
    description,
    category,
    priority: priority.default('Medium'),
    assignee: objectId.nullable().optional(),
  })
  .strict();

const updateTicketSchema = z
  .object({ title, description, priority, category })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, 'Provide at least one field to update');

const statusSchema = z.object({ status: z.enum(STATUSES) }).strict();
const assigneeSchema = z.object({ assignee: objectId.nullable() }).strict();

// "a,b,c" -> ['a','b','c'], each value checked against an allowed list
const csvOf = (allowed) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []))
    .pipe(z.array(z.enum(allowed)));

const csvAssignee = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []))
  .pipe(z.array(z.string().refine((v) => v === 'unassigned' || OBJECT_ID.test(v), 'Invalid assignee')));

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'priority', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().max(100).optional(),
  status: csvOf(STATUSES),
  priority: csvOf(PRIORITIES),
  category: csvOf(CATEGORIES),
  assignee: csvAssignee,
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date');

const analyticsQuerySchema = z
  .object({ from: isoDate.optional(), to: isoDate.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: '"from" must be on or before "to"', path: ['from'] });

/* ------------------------------- helpers ------------------------------ */

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const loadDetail = (id) =>
  Ticket.findById(id)
    .select('-priorityRank -__v')
    .populate('assignee', 'name email')
    .populate('createdBy', 'name email')
    .populate('history.by', 'name');

async function findTicket(id) {
  const ticket = await Ticket.findById(id);
  if (!ticket) throw new AppError(404, 'Ticket not found');
  return ticket;
}

const sameId = (a, b) => a && b && String(a) === String(b);

function assertCanModify(user, ticket) {
  const allowed = user.role === 'admin' || sameId(ticket.createdBy, user._id) || sameId(ticket.assignee, user._id);
  if (!allowed) throw new AppError(403, 'You can only modify tickets you created or are assigned to');
}

async function resolveAssignee(id) {
  if (!id) return null;
  const user = await User.findById(id).select('name');
  if (!user) throw new AppError(400, 'Assignee does not exist');
  return user;
}

/* -------------------------------- routes ------------------------------ */

// GET /api/tickets/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD  (dates are UTC, inclusive)
router.get(
  '/analytics',
  validate(analyticsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { from, to } = req.validQuery;
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) match.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
    }

    const group = (field) => Ticket.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
    const [statusRaw, priorityRaw] = await Promise.all([group('status'), group('priority')]);

    const fill = (keys, raw) => keys.map((k) => ({ name: k, count: raw.find((r) => r._id === k)?.count ?? 0 }));
    const byStatus = fill(STATUSES, statusRaw);
    const byPriority = fill(PRIORITIES, priorityRaw);
    const pick = (arr, name) => arr.find((x) => x.name === name).count;

    res.json({
      range: { from: from ?? null, to: to ?? null },
      total: byStatus.reduce((sum, x) => sum + x.count, 0),
      open: pick(byStatus, 'Open'),
      resolved: pick(byStatus, 'Resolved'),
      critical: pick(byPriority, 'Critical'),
      byStatus,
      byPriority,
    });
  })
);

// GET /api/tickets  — server-side search, filters, sorting, pagination
router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, sortBy, order, search, status, priority, category, assignee } = req.validQuery;

    const filter = {};
    const and = [];
    if (status.length) filter.status = { $in: status };
    if (priority.length) filter.priority = { $in: priority };
    if (category.length) filter.category = { $in: category };
    if (assignee.length) {
      const ids = assignee.filter((a) => a !== 'unassigned');
      const or = [];
      if (ids.length) or.push({ assignee: { $in: ids } });
      if (assignee.includes('unassigned')) or.push({ assignee: null });
      and.push({ $or: or });
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      and.push({ $or: [{ title: rx }, { description: rx }] });
    }
    if (and.length) filter.$and = and;

    const dir = order === 'asc' ? 1 : -1;
    const sort = { [sortBy === 'priority' ? 'priorityRank' : sortBy]: dir, _id: dir }; // _id keeps paging stable

    const [data, total] = await Promise.all([
      Ticket.find(filter)
        .select('-history -priorityRank -__v')
        .populate('assignee', 'name email')
        .populate('createdBy', 'name')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Ticket.countDocuments(filter),
    ]);

    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  })
);

// POST /api/tickets
router.post(
  '/',
  validate(createTicketSchema),
  asyncHandler(async (req, res) => {
    const { assignee, ...data } = req.body;
    const history = [{ type: 'created', to: 'Open', by: req.user._id }];

    let assigneeUser = null;
    if (assignee) {
      if (req.user.role !== 'admin') throw new AppError(403, 'Only admins can assign tickets');
      assigneeUser = await resolveAssignee(assignee);
      history.push({ type: 'assignee', from: 'Unassigned', to: assigneeUser.name, by: req.user._id });
    }

    const ticket = await Ticket.create({ ...data, assignee: assigneeUser?._id ?? null, createdBy: req.user._id, history });
    res.status(201).json(await loadDetail(ticket._id));
  })
);

// GET /api/tickets/:id  (includes full history for the activity timeline)
router.get(
  '/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const ticket = await loadDetail(req.params.id);
    if (!ticket) throw new AppError(404, 'Ticket not found');
    res.json(ticket);
  })
);

// GET /api/tickets/:id/history
router.get(
  '/:id/history',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const ticket = await loadDetail(req.params.id);
    if (!ticket) throw new AppError(404, 'Ticket not found');
    res.json(ticket.history);
  })
);

// PATCH /api/tickets/:id  — edit title / description / priority / category
router.patch(
  '/:id',
  validateObjectId(),
  validate(updateTicketSchema),
  asyncHandler(async (req, res) => {
    const ticket = await findTicket(req.params.id);
    assertCanModify(req.user, ticket);

    const changed = Object.keys(req.body).filter((k) => ticket[k] !== req.body[k]);
    if (changed.length) {
      changed.forEach((k) => (ticket[k] = req.body[k]));
      ticket.history.push({ type: 'updated', note: `Updated ${changed.join(', ')}`, by: req.user._id });
      await ticket.save();
    }
    res.json(await loadDetail(ticket._id));
  })
);

// PATCH /api/tickets/:id/status  — validated transition + history entry
router.patch(
  '/:id/status',
  validateObjectId(),
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const ticket = await findTicket(req.params.id);
    assertCanModify(req.user, ticket);

    const { status } = req.body;
    if (ticket.status === status) throw new AppError(400, `Ticket is already ${status}`);
    if (!canTransition(ticket.status, status)) {
      throw new AppError(
        409,
        `Invalid status transition: ${ticket.status} → ${status}. Allowed: ${TRANSITIONS[ticket.status].join(', ')}`
      );
    }

    ticket.history.push({ type: 'status', from: ticket.status, to: status, by: req.user._id });
    ticket.status = status;
    await ticket.save();
    res.json(await loadDetail(ticket._id));
  })
);

// PATCH /api/tickets/:id/assignee  — admin only; { assignee: userId | null }
router.patch(
  '/:id/assignee',
  adminOnly,
  validateObjectId(),
  validate(assigneeSchema),
  asyncHandler(async (req, res) => {
    const ticket = await findTicket(req.params.id);
    const next = await resolveAssignee(req.body.assignee);

    if (!sameId(ticket.assignee, next?._id) && (ticket.assignee || next)) {
      const prev = ticket.assignee ? await User.findById(ticket.assignee).select('name') : null;
      ticket.history.push({
        type: 'assignee',
        from: prev?.name ?? 'Unassigned',
        to: next?.name ?? 'Unassigned',
        by: req.user._id,
      });
      ticket.assignee = next?._id ?? null;
      await ticket.save();
    }
    res.json(await loadDetail(ticket._id));
  })
);

// DELETE /api/tickets/:id  — admin only
router.delete(
  '/:id',
  adminOnly,
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const deleted = await Ticket.findByIdAndDelete(req.params.id);
    if (!deleted) throw new AppError(404, 'Ticket not found');
    res.json({ message: 'Ticket deleted' });
  })
);

module.exports = router;
