const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, name: user.name },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}
function signRefreshToken(user) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresIn = process.env.JWT_REFRESH_EXPIRES || '7d';
  const expiresAt = new Date(Date.now() + parseExpiryMs(expiresIn));
  return { token, expiresAt };
}

function parseExpiryMs(s) {
  // naive parser for m,h,d
  const match = String(s).match(/(\d+)([mhd])/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 'm') return n * 60 * 1000;
  if (unit === 'h') return n * 60 * 60 * 1000;
  if (unit === 'd') return n * 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
}

exports.register = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already exists' });
    const user = await User.create({ name, email, password, role: role || 'agent' });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (e) {
    next(e);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    // Check if user is deactivated
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact an administrator.' });
    }
    
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    const accessToken = signAccessToken(user);
    const { token: refreshToken, expiresAt } = signRefreshToken(user);
    await RefreshToken.create({ user: user._id, token: refreshToken, expiresAt });
    res.json({ accessToken, refreshToken, user: { id: user._id, name: user.name, role: user.role } });
  } catch (e) { next(e); }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const stored = await RefreshToken.findOne({ token: refreshToken, revoked: false }).populate('user');
    if (!stored || !stored.user) return res.status(401).json({ message: 'Invalid refresh token' });
    if (stored.expiresAt < new Date()) return res.status(401).json({ message: 'Expired refresh token' });
    const accessToken = signAccessToken(stored.user);
    res.json({ accessToken });
  } catch (e) { next(e); }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.findOneAndUpdate({ token: refreshToken }, { revoked: true });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
};

exports.listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, q } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    
    if (role) filter.role = role;
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') }
      ];
    }
    
    const [users, total] = await Promise.all([
      User.find(filter, 'name email role isActive createdAt')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      User.countDocuments(filter)
    ]);
    
    res.json({
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      items: users
    });
  } catch (e) { next(e); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive, password } = req.body;
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const exists = await User.findOne({ email, _id: { $ne: id } });
      if (exists) return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Update user fields
    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.isActive = isActive !== undefined ? isActive : user.isActive;
    
    // Update password if provided
    if (password && password.trim() !== '') {
      user.password = password;
    }
    
    await user.save();
    
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive });
  } catch (e) { next(e); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Soft delete by setting isActive to false
    user.isActive = false;
    await user.save();
    
    res.json({ ok: true });
  } catch (e) { next(e); }
};

exports.bootstrap = async (req, res, next) => {
  try {
    // Check if any admin users exist
    const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
    
    if (adminCount > 0) {
      return res.status(403).json({ message: 'System already has admin users. Bootstrap is not available.' });
    }
    
    const { name, email, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    // Check if email already exists
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Create the first admin user
    const user = await User.create({ 
      name, 
      email, 
      password, 
      role: 'admin' 
    });
    
    res.status(201).json({ 
      message: 'First admin user created successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (e) {
    next(e);
  }
};

exports.checkBootstrap = async (req, res, next) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
    res.json({ canBootstrap: adminCount === 0 });
  } catch (e) {
    next(e);
  }
};
