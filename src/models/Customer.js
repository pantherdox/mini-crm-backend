const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  company: { type: String, default: '', index: true },
  email: { type: String, lowercase: true, index: true },
  phone: { type: String, index: true },
  notes: [NoteSchema],
  tags: [{ type: String, index: true }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  deals: [{ title: String, value: Number, stage: String }]
}, { timestamps: true });

CustomerSchema.index({ name: 'text', email: 'text', phone: 'text', company: 'text' });

module.exports = mongoose.model('Customer', CustomerSchema);
