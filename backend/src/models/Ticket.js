const mongoose = require('mongoose');
const { PRIORITIES, STATUSES, CATEGORIES, PRIORITY_RANK } = require('../constants');

// One entry per event on a ticket. `status` entries are the status-change history
// (previous status -> new status + timestamp); the other types feed the activity timeline.
const historySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['created', 'status', 'assignee', 'updated'], required: true },
    from: { type: String, default: null },
    to: { type: String, default: null },
    note: { type: String, default: null },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    status: { type: String, enum: STATUSES, default: 'Open' },
    category: { type: String, enum: CATEGORIES, required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    priorityRank: { type: Number }, // numeric copy of priority so "sort by priority" is meaningful
    history: [historySchema],
  },
  { timestamps: true }
);

ticketSchema.pre('validate', function () {
  this.priorityRank = PRIORITY_RANK[this.priority];
});

ticketSchema.index({ status: 1, priority: 1, category: 1, assignee: 1 });
ticketSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
