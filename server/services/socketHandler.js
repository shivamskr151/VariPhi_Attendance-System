// Socket.io handler for real-time communication

const socketHandler = (io, socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join user to their personal room
  socket.on('join', (data) => {
    if (data.employeeId) {
      socket.join(`employee_${data.employeeId}`);
      console.log(`Employee ${data.employeeId} joined their room`);
    }
  });

  // Join admin room
  socket.on('join_admin', (data) => {
    if (data.role === 'admin') {
      socket.join('admin_room');
      console.log('Admin joined admin room');
    }
  });

  // Join manager room
  socket.on('join_manager', (data) => {
    if (data.role === 'manager') {
      socket.join('manager_room');
      console.log('Manager joined manager room');
    }
  });

  // Handle attendance updates
  socket.on('attendance_update', (data) => {
    // Notify relevant users about attendance update
    if (data.employeeId) {
      // Notify the employee
      io.to(`employee_${data.employeeId}`).emit('attendance_updated', {
        type: 'attendance_update',
        data: data.attendance
      });

      // Notify managers and admins
      io.to('manager_room').emit('attendance_update', {
        type: 'attendance_update',
        employeeId: data.employeeId,
        data: data.attendance
      });

      io.to('admin_room').emit('attendance_update', {
        type: 'attendance_update',
        employeeId: data.employeeId,
        data: data.attendance
      });
    }
  });

  // Handle leave request updates
  socket.on('leave_request_update', (data) => {
    // Notify relevant users about leave request update
    if (data.employeeId) {
      // Notify the employee
      io.to(`employee_${data.employeeId}`).emit('leave_request_updated', {
        type: 'leave_request_update',
        data: data.leave
      });

      // Notify managers and admins
      io.to('manager_room').emit('leave_request_update', {
        type: 'leave_request_update',
        employeeId: data.employeeId,
        data: data.leave
      });

      io.to('admin_room').emit('leave_request_update', {
        type: 'leave_request_update',
        employeeId: data.employeeId,
        data: data.leave
      });
    }
  });

  // Handle new leave request
  socket.on('new_leave_request', (data) => {
    // Notify managers and admins about new leave request
    io.to('manager_room').emit('new_leave_request', {
      type: 'new_leave_request',
      data: data.leave
    });

    io.to('admin_room').emit('new_leave_request', {
      type: 'new_leave_request',
      data: data.leave
    });
  });

  // Handle employee status changes
  socket.on('employee_status_change', (data) => {
    // Notify admins about employee status changes
    io.to('admin_room').emit('employee_status_changed', {
      type: 'employee_status_change',
      data: data.employee
    });
  });

  // Handle system health monitoring requests
  socket.on('request_system_health', (data) => {
    if (data.role === 'admin') {
      // Admin can request system health updates
      socket.join('system_health_room');
      console.log('Admin joined system health monitoring room');
    }
  });

  // Handle real-time notifications
  socket.on('send_notification', (data) => {
    const { recipientId, notification } = data;
    
    if (recipientId) {
      // Send to specific employee
      io.to(`employee_${recipientId}`).emit('notification', {
        type: 'notification',
        data: notification
      });
    } else {
      // Broadcast to all connected users
      io.emit('notification', {
        type: 'notification',
        data: notification
      });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    socket.broadcast.to(`employee_${data.employeeId}`).emit('user_typing', {
      type: 'typing_start',
      employeeId: data.employeeId
    });
  });

  socket.on('typing_stop', (data) => {
    socket.broadcast.to(`employee_${data.employeeId}`).emit('user_typing', {
      type: 'typing_stop',
      employeeId: data.employeeId
    });
  });

  // Handle presence updates
  socket.on('presence_update', (data) => {
    const { employeeId, status } = data;
    
    // Update presence for the employee
    socket.employeeId = employeeId;
    socket.presenceStatus = status;

    // Notify relevant users about presence change
    io.to('manager_room').emit('presence_update', {
      type: 'presence_update',
      employeeId,
      status
    });

    io.to('admin_room').emit('presence_update', {
      type: 'presence_update',
      employeeId,
      status
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Update presence status to offline
    if (socket.employeeId) {
      io.to('manager_room').emit('presence_update', {
        type: 'presence_update',
        employeeId: socket.employeeId,
        status: 'offline'
      });

      io.to('admin_room').emit('presence_update', {
        type: 'presence_update',
        employeeId: socket.employeeId,
        status: 'offline'
      });
    }
  });

  // Handle error
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
};

// Helper function to emit attendance update
const emitAttendanceUpdate = (io, employeeId, attendance) => {
  io.emit('attendance_update', {
    type: 'attendance_update',
    employeeId,
    data: attendance
  });
};

// Helper function to emit leave request update
const emitLeaveRequestUpdate = (io, employeeId, leave) => {
  io.emit('leave_request_update', {
    type: 'leave_request_update',
    employeeId,
    data: leave
  });
};

// Helper function to emit new leave request
const emitNewLeaveRequest = (io, leave) => {
  io.to('manager_room').emit('new_leave_request', {
    type: 'new_leave_request',
    data: leave
  });

  io.to('admin_room').emit('new_leave_request', {
    type: 'new_leave_request',
    data: leave
  });
};

// Helper function to emit notification
const emitNotification = (io, recipientId, notification) => {
  if (recipientId) {
    io.to(`employee_${recipientId}`).emit('notification', {
      type: 'notification',
      data: notification
    });
  } else {
    io.emit('notification', {
      type: 'notification',
      data: notification
    });
  }
};

// Helper function to get connected users count
const getConnectedUsersCount = (io) => {
  return io.engine.clientsCount;
};

// Helper function to get connected employees
const getConnectedEmployees = (io) => {
  const connectedEmployees = [];
  
  io.sockets.sockets.forEach((socket) => {
    if (socket.employeeId) {
      connectedEmployees.push({
        employeeId: socket.employeeId,
        status: socket.presenceStatus || 'online',
        socketId: socket.id
      });
    }
  });
  
  return connectedEmployees;
};

// Helper function to emit system health updates
const emitSystemHealthUpdate = (io, systemMetrics) => {
  io.to('system_health_room').emit('system_health_update', {
    type: 'system_health_update',
    data: systemMetrics,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  socketHandler,
  emitAttendanceUpdate,
  emitLeaveRequestUpdate,
  emitNewLeaveRequest,
  emitNotification,
  getConnectedUsersCount,
  getConnectedEmployees,
  emitSystemHealthUpdate
}; 