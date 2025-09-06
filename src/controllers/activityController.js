const Activity = require('../models/Activity');
const mongoose = require('mongoose');

exports.list = async (req, res, next) => {
  try {
    // Filter activities based on user role
    const filter = {};
    if (req.user.role === 'agent') {
      // Agents can only see their own activities
      filter.actor = new mongoose.Types.ObjectId(req.user.id);
    }
    // Admins can see all activities (no filter)
    
    const items = await Activity.find(filter).sort({ createdAt: -1 }).limit(10)
      .populate('actor', 'name role');
    res.json(items);
  } catch (e) { next(e); }
};
