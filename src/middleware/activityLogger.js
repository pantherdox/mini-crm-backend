const Activity = require('../models/Activity');

async function logActivity({ type, actor, entityType, entityId, message, meta = {} }) {
  try {
    await Activity.create({ type, actor, entityType, entityId, message, meta });
  } catch (e) {
    console.error('Activity log failed', e.message);
  }
}

module.exports = { logActivity };
