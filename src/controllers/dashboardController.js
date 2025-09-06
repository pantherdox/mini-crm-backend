const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Task = require('../models/Task');
const mongoose = require('mongoose');

exports.stats = async (req, res, next) => {
  try {
    // Create filters based on user role
    const userId = req.user.role === 'agent' ? new mongoose.Types.ObjectId(req.user.id) : null;
    const leadFilter = req.user.role === 'agent' ? { assignedAgent: userId, archived: false } : { archived: false };
    const customerFilter = req.user.role === 'agent' ? { owner: userId } : {};
    const taskFilter = req.user.role === 'agent' ? { owner: userId } : {};

    const [leadStatusAgg, totalCustomers, myOpenTasks, leadsPerDay] = await Promise.all([
      Lead.aggregate([
        { $match: leadFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Customer.countDocuments(customerFilter),
      Task.countDocuments({ ...taskFilter, status: { $in: ['Open','In Progress'] } }),
      Lead.aggregate([
        { 
          $match: { 
            ...leadFilter, 
            createdAt: { $gte: new Date(Date.now() - 14*24*60*60*1000) } 
          } 
        },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const leadStatus = leadStatusAgg.reduce((acc, cur) => (acc[cur._id] = cur.count, acc), {});

    // Overdue tasks
    const overdueTasks = await Task.countDocuments({ ...taskFilter, dueDate: { $lt: new Date() }, status: { $ne: 'Done' } });

    res.json({
      leadStatus,
      totalCustomers,
      myOpenTasks,
      leadsPerDay,
      overdueTasks
    });
  } catch (e) { next(e); }
};
