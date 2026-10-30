const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../utils/errors');

const protect = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError(401, 'No token provided');

  const decoded = jwt.verify(token, process.env.JWT_SECRET); // JWT errors -> 401 via error handler
  const user = await User.findById(decoded.id).select('-password');
  if (!user) throw new AppError(401, 'User not found');

  req.user = user;
  next();
});

const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : next(new AppError(403, 'Admin access required'));

module.exports = { protect, adminOnly };
