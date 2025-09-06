const Customer = require('../models/Customer');
const { getPagination } = require('../utils/pagination');
const { logActivity } = require('../middleware/activityLogger');
const mongoose = require('mongoose');

exports.list = async (req, res, next) => {
  try {
    const { q, owner } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.user.role === 'agent') filter.owner = new mongoose.Types.ObjectId(req.user.id);
    else if (owner) filter.owner = new mongoose.Types.ObjectId(owner);
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { company: new RegExp(q, 'i') }
      ];
    }
    const [items, total] = await Promise.all([
      Customer.find(filter).populate('owner', 'name email').sort({ updatedAt: -1 }).limit(limit).skip(skip),
      Customer.countDocuments(filter)
    ]);
    res.json({ page, limit, total, items });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const customer = await Customer.findById(id).populate('owner', 'name email').populate('notes.author', 'name');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (req.user.role === 'agent' && String(customer.owner?._id) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(customer);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = req.body;
    if (req.user.role === 'agent') data.owner = new mongoose.Types.ObjectId(req.user.id);
    const customer = await Customer.create(data);
    await logActivity({
      type: 'customer_created',
      actor: req.user.id,
      entityType: 'Customer',
      entityId: customer._id,
      message: `Customer created: ${customer.name}`
    });
    res.status(201).json(customer);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (req.user.role === 'agent' && String(customer.owner) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    Object.assign(customer, req.body);
    await customer.save();
    await logActivity({
      type: 'customer_updated',
      actor: req.user.id,
      entityType: 'Customer',
      entityId: customer._id,
      message: `Customer updated: ${customer.name}`
    });
    res.json(customer);
  } catch (e) { next(e); }
};

exports.addNote = async (req, res, next) => {
  try {
    const id = req.params.id;
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (req.user.role === 'agent' && String(customer.owner) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const note = { text: req.body.text, author: new mongoose.Types.ObjectId(req.user.id), createdAt: new Date() };
    customer.notes.unshift(note);
    await customer.save();
    await logActivity({
      type: 'customer_note_added',
      actor: req.user.id,
      entityType: 'Customer',
      entityId: customer._id,
      message: `Note added to ${customer.name}`
    });
    res.status(201).json({ note, latest5: customer.notes.slice(0, 5) });
  } catch (e) { next(e); }
};
