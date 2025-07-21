const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const { authenticateToken } = require('../middleware/auth');

// Get attendance report
router.get('/attendance', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, department, employeeId } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Build filter for aggregation
    const aggregateFilter = {};
    
    if (startDate && endDate) {
      aggregateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Aggregate attendance data
    const attendanceData = await Attendance.aggregate([
      { $match: aggregateFilter },
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      { $unwind: '$employeeData' },
      // Apply department filter after lookup
      ...(department ? [{
        $match: {
          'employeeData.department': department
        }
      }] : []),
      // Apply employee filter after lookup
      ...(employeeId ? [{
        $match: {
          'employeeData._id': mongoose.Types.ObjectId.isValid(employeeId) ? new mongoose.Types.ObjectId(employeeId) : employeeId
        }
      }] : []),
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentDays: {
            $sum: {
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
            }
          },
          absentDays: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
            }
          },
          lateDays: {
            $sum: {
              $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
            }
          },
          totalHours: { $sum: '$totalHours' }
        }
      }
    ]);

    // Get detailed attendance records
    const attendance = await Attendance.find(filter)
      .populate('employee', 'firstName lastName department')
      .sort({ date: -1 })
      .limit(100);

    const summary = attendanceData[0] || {
      totalRecords: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      totalHours: 0
    };

    const averageHours = summary.totalRecords > 0 ? summary.totalHours / summary.totalRecords : 0;

    res.json({
      success: true,
      data: {
        summary: {
          ...summary,
          averageHours
        },
        attendance
      }
    });
  } catch (error) {
    console.error('Error fetching attendance report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch attendance report'
    });
  }
});

// Get leave report
router.get('/leaves', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, department, leaveType, status } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (startDate && endDate) {
      filter.startDate = { $gte: new Date(startDate) };
      filter.endDate = { $lte: new Date(endDate) };
    }
    
    // Build filter for aggregation
    const aggregateFilter = {};
    
    if (startDate && endDate) {
      aggregateFilter.startDate = { $gte: new Date(startDate) };
      aggregateFilter.endDate = { $lte: new Date(endDate) };
    }
    
    if (leaveType) {
      aggregateFilter.leaveType = leaveType;
    }
    
    if (status) {
      aggregateFilter.status = status;
    }

    // Aggregate leave data
    const leaveData = await Leave.aggregate([
      { $match: aggregateFilter },
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      { $unwind: '$employeeData' },
      // Apply department filter after lookup
      ...(department ? [{
        $match: {
          'employeeData.department': department
        }
      }] : []),
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          approvedRequests: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
            }
          },
          pendingRequests: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          rejectedRequests: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
            }
          },
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    // Get detailed leave records
    const leaves = await Leave.find(filter)
      .populate('employee', 'firstName lastName department')
      .sort({ startDate: -1 })
      .limit(100);

    const summary = leaveData[0] || {
      totalRequests: 0,
      approvedRequests: 0,
      pendingRequests: 0,
      rejectedRequests: 0,
      totalDays: 0
    };

    res.json({
      success: true,
      data: {
        summary,
        leaves
      }
    });
  } catch (error) {
    console.error('Error fetching leave report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch leave report'
    });
  }
});

// Export attendance report
router.get('/attendance/export', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, department, employeeId } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (department) {
      filter['employee.department'] = department;
    }
    
    if (employeeId) {
      filter['employee._id'] = employeeId;
    }

    const attendance = await Attendance.find(filter)
      .populate('employee', 'firstName lastName department employeeId')
      .sort({ date: -1 });

    // For now, return JSON. In a real implementation, you'd generate Excel/CSV
    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error exporting attendance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export attendance report'
    });
  }
});

// Export leave report
router.get('/leaves/export', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, department, leaveType, status } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (startDate && endDate) {
      filter.startDate = { $gte: new Date(startDate) };
      filter.endDate = { $lte: new Date(endDate) };
    }
    
    if (department) {
      filter['employee.department'] = department;
    }
    
    if (leaveType) {
      filter.leaveType = leaveType;
    }
    
    if (status) {
      filter.status = status;
    }

    const leaves = await Leave.find(filter)
      .populate('employee', 'firstName lastName department employeeId')
      .sort({ startDate: -1 });

    // For now, return JSON. In a real implementation, you'd generate Excel/CSV
    res.json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Error exporting leave report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export leave report'
    });
  }
});

module.exports = router; 