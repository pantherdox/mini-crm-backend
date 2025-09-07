const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  type: { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  message: { type: String, required: true },
  meta: { type: Object }
}, { timestamps: true });

ActivitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);
