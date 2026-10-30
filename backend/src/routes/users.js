const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { AppError, asyncHandler } = require('../utils/errors');

const router = express.Router();
router.use(protect);

const createUserSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
    email: z.string().trim().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(72),
    role: z.enum(['admin', 'user']).default('user'),
  })
  .strict();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await User.find().select('name email role').sort('name'));
  })
);

router.post(
  '/',
  adminOnly,
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    if (await User.exists({ email: email.toLowerCase() })) throw new AppError(409, 'Email already exists');

    const user = await User.create({ name, email, role, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  })
);

module.exports = router;
