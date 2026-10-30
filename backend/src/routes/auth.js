const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { AppError, asyncHandler } = require('../utils/errors');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
    const ok = user && (await bcrypt.compare(req.body.password, user.password));
    if (!ok) throw new AppError(401, 'Invalid credentials');

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: publicUser(user) });
  })
);

router.get('/me', protect, (req, res) => res.json(publicUser(req.user)));

module.exports = router;
