const express = require('express');
const Holiday = require('../models/Holiday');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/holidays - List all holidays
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const holidays = await Holiday.find().sort({ date: 1 });
  res.json({ success: true, data: holidays });
}));

// POST /api/holidays - Create a new holiday (admin only)
router.post('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { date, name, description } = req.body;
  if (!date || !name) {
    return res.status(400).json({ success: false, message: 'Date and name are required.' });
  }
  const holiday = new Holiday({ date, name, description });
  await holiday.save();
  res.status(201).json({ success: true, data: holiday });
}));

// PUT /api/holidays/:id - Update a holiday (admin only)
router.put('/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, name, description } = req.body;
  const holiday = await Holiday.findByIdAndUpdate(
    id,
    { date, name, description },
    { new: true, runValidators: true }
  );
  if (!holiday) {
    return res.status(404).json({ success: false, message: 'Holiday not found.' });
  }
  res.json({ success: true, data: holiday });
}));

// DELETE /api/holidays/:id - Delete a holiday (admin only)
router.delete('/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const holiday = await Holiday.findByIdAndDelete(id);
  if (!holiday) {
    return res.status(404).json({ success: false, message: 'Holiday not found.' });
  }
  res.json({ success: true, message: 'Holiday deleted.' });
}));

module.exports = router; 