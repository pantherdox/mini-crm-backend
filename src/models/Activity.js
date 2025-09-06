const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., lead_created, lead_updated, lead_converted, customer_note_added, task_created, etc.
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  entityType: { type: String, required: true }, // Lead / Customer / Task / User
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  message: { type: String, required: true },
  meta: { type: Object }
}, { timestamps: true });

ActivitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);
