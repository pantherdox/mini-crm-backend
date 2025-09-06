const Task = require('../models/Task');
const { getPagination } = require('../utils/pagination');
const { logActivity } = require('../middleware/activityLogger');
const mongoose = require('mongoose');

exports.list = async (req, res, next) => {
  try {
    const { owner, status, due } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.user.role === 'agent') filter.owner = new mongoose.Types.ObjectId(req.user.id);
    else if (owner) filter.owner = new mongoose.Types.ObjectId(owner);
    if (status) filter.status = status;
    if (due) {
      if (due === 'overdue') {
        filter.dueDate = { $lt: new Date() };
        filter.status = { $ne: 'Done' };
      } else if (due === 'today') {
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(); end.setHours(23,59,59,999);
        filter.dueDate = { $gte: start, $lte: end };
      } else if (due.startsWith('before:')) {
        const d = new Date(due.split(':')[1]);
        filter.dueDate = { $lte: d };
      } else if (due.startsWith('after:')) {
        const d = new Date(due.split(':')[1]);
        filter.dueDate = { $gte: d };
      }
    }
    const [items, total] = await Promise.all([
      Task.find(filter).sort({ dueDate: 1 }).limit(limit).skip(skip),
      Task.countDocuments(filter)
    ]);
    res.json({ page, limit, total, items });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = req.body;
    if (req.user.role === 'agent') data.owner = new mongoose.Types.ObjectId(req.user.id);
    const task = await Task.create(data);
    await logActivity({
      type: 'task_created',
      actor: req.user.id,
      entityType: 'Task',
      entityId: task._id,
      message: `Task created: ${task.title}`
    });
    res.status(201).json(task);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.user.role === 'agent' && String(task.owner) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    Object.assign(task, req.body);
    await task.save();
    await logActivity({
      type: 'task_updated',
      actor: req.user.id,
      entityType: 'Task',
      entityId: task._id,
      message: `Task updated: ${task.title}`
    });
    res.json(task);
  } catch (e) { next(e); }
};
