const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const { getPagination } = require('../utils/pagination');
const { logActivity } = require('../middleware/activityLogger');
const mongoose = require('mongoose');

exports.list = async (req, res, next) => {
  try {
    const { status, q, assignedAgent, archived, showArchived } = req.query;
    const { limit, skip, page } = getPagination(req.query);
    const filter = {};
    if (status) filter.status = status;
    
    // Handle both 'archived' and 'showArchived' parameters for compatibility
    if (typeof archived !== 'undefined') {
      filter.archived = archived === 'true';
    } else if (typeof showArchived !== 'undefined') {
      filter.archived = showArchived === 'true';
    } else {
      // By default, don't show archived leads
      filter.archived = false;
    }
    
    if (req.user.role === 'agent') {
      filter.assignedAgent = new mongoose.Types.ObjectId(req.user.id);
    } else if (assignedAgent) {
      filter.assignedAgent = new mongoose.Types.ObjectId(assignedAgent);
    }
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { source: new RegExp(q, 'i') }
      ];
    }
    const [items, total] = await Promise.all([
      Lead.find(filter).populate('assignedAgent', 'name email').sort({ updatedAt: -1 }).limit(limit).skip(skip),
      Lead.countDocuments(filter)
    ]);
    res.json({ page, limit, total, items });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const lead = await Lead.findById(id).populate('assignedAgent', 'name email');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (req.user.role === 'agent' && String(lead.assignedAgent?._id) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(lead);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = req.body;
    if (req.user.role === 'agent') {
      data.assignedAgent = new mongoose.Types.ObjectId(req.user.id);
    }
    const lead = await Lead.create({
      ...data,
      history: [{ action: 'created', by: new mongoose.Types.ObjectId(req.user.id) }]
    });
    await logActivity({
      type: 'lead_created',
      actor: req.user.id,
      entityType: 'Lead',
      entityId: lead._id,
      message: `Lead created: ${lead.name}`
    });
    res.status(201).json(lead);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (req.user.role === 'agent' && String(lead.assignedAgent) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const prevStatus = lead.status;
    Object.assign(lead, req.body);
    lead.history.push({ action: 'updated', by: new mongoose.Types.ObjectId(req.user.id) });
    await lead.save();
    if (prevStatus !== lead.status) {
      await logActivity({
        type: 'lead_status_changed',
        actor: req.user.id,
        entityType: 'Lead',
        entityId: lead._id,
        message: `Lead status: ${prevStatus} -> ${lead.status}`
      });
    } else {
      await logActivity({
        type: 'lead_updated',
        actor: req.user.id,
        entityType: 'Lead',
        entityId: lead._id,
        message: `Lead updated: ${lead.name}`
      });
    }
    res.json(lead);
  } catch (e) { next(e); }
};

exports.softDelete = async (req, res, next) => {
  try {
    const id = req.params.id;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (req.user.role === 'agent' && String(lead.assignedAgent) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    lead.archived = true;
    lead.history.push({ action: 'archived', by: new mongoose.Types.ObjectId(req.user.id) });
    await lead.save();
    await logActivity({
      type: 'lead_archived',
      actor: req.user.id,
      entityType: 'Lead',
      entityId: lead._id,
      message: `Lead archived: ${lead.name}`
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
};

exports.convert = async (req, res, next) => {
  try {
    const id = req.params.id;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (req.user.role === 'agent' && String(lead.assignedAgent) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const customer = await Customer.create({
      name: lead.name,
      company: '',
      email: lead.email,
      phone: lead.phone,
      owner: lead.assignedAgent || new mongoose.Types.ObjectId(req.user.id),
      tags: ['converted']
    });
    lead.status = 'Closed Won';
    lead.history.push({ action: 'converted', by: new mongoose.Types.ObjectId(req.user.id), meta: { customerId: customer._id } });
    await lead.save();
    await logActivity({
      type: 'lead_converted',
      actor: req.user.id,
      entityType: 'Lead',
      entityId: lead._id,
      message: `Converted to customer: ${lead.name}`,
      meta: { customerId: customer._id }
    });
    res.json({ lead, customer });
  } catch (e) { next(e); }
};

exports.archive = async (req, res, next) => {
  try {
    const id = req.params.id;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (req.user.role === 'agent' && String(lead.assignedAgent) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    lead.archived = true;
    lead.history.push({ action: 'archived', by: new mongoose.Types.ObjectId(req.user.id) });
    await lead.save();
    await logActivity({
      type: 'lead_archived',
      actor: req.user.id,
      entityType: 'Lead',
      entityId: lead._id,
      message: `Lead archived: ${lead.name}`
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
};

exports.unarchive = async (req, res, next) => {
  try {
    const id = req.params.id;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (req.user.role === 'agent' && String(lead.assignedAgent) !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    lead.archived = false;
    lead.history.push({ action: 'unarchived', by: new mongoose.Types.ObjectId(req.user.id) });
    await lead.save();
    await logActivity({
      type: 'lead_unarchived',
      actor: req.user.id,
      entityType: 'Lead',
      entityId: lead._id,
      message: `Lead unarchived: ${lead.name}`
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
};

exports.reassign = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { assignedAgent } = req.body;
    
    // Only admin can reassign leads
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    
    const prevAgent = lead.assignedAgent;
    lead.assignedAgent = new mongoose.Types.ObjectId(assignedAgent);
    lead.history.push({ 
      action: 'reassigned', 
      by: new mongoose.Types.ObjectId(req.user.id), 
      meta: { 
        from: prevAgent, 
        to: assignedAgent 
      } 
    });
    await lead.save();
    
    await logActivity({
      type: 'lead_reassigned',
      actor: req.user.id,
      entityType: 'Lead',
      entityId: lead._id,
      message: `Lead reassigned: ${lead.name}`,
      meta: { from: prevAgent, to: assignedAgent }
    });
    
    const updatedLead = await Lead.findById(id).populate('assignedAgent', 'name email');
    res.json(updatedLead);
  } catch (e) { next(e); }
};
