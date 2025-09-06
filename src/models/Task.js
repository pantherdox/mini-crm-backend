const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  dueDate: { type: Date, required: true, index: true },
  status: { type: String, enum: ['Open','In Progress','Done'], default: 'Open', index: true },
  priority: { type: String, enum: ['Low','Medium','High'], default: 'Medium', index: true },
  relatedType: { type: String, enum: ['Lead','Customer'], required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
