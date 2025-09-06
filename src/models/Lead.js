const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  email: { type: String, lowercase: true, index: true },
  phone: { type: String, index: true },
  status: { type: String, enum: ['New','In Progress','Closed Won','Closed Lost'], default: 'New', index: true },
  source: { type: String, default: 'Unknown', index: true },
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  archived: { type: Boolean, default: false, index: true },
  history: [{
    action: String,
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    meta: Object
  }]
}, { timestamps: true });

LeadSchema.index({ name: 'text', email: 'text', phone: 'text', source: 'text' });

module.exports = mongoose.model('Lead', LeadSchema);
