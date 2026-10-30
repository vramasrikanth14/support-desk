const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];
const CATEGORIES = ['Bug', 'Feature', 'Billing', 'Account', 'General'];

const PRIORITY_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };

// Allowed status transitions: current status -> statuses it may move to.
const TRANSITIONS = {
  Open: ['In Progress', 'Closed'],
  'In Progress': ['Open', 'Resolved'],
  Resolved: ['In Progress', 'Closed'],
  Closed: ['Open'], // re-open
};

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

module.exports = { PRIORITIES, STATUSES, CATEGORIES, PRIORITY_RANK, TRANSITIONS, canTransition };
