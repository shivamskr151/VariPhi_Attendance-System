import React, { useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Schedule,
  EventNote,
  CheckCircle,
  Warning,
  Login,
  Logout,
  AccessTime,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getAttendanceHistory } from '../../store/slices/attendanceSlice';
import { getLeaveHistory } from '../../store/slices/leaveSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';

const RecentActivityCard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { attendanceHistory, loading: attendanceLoading } = useSelector((state: RootState) => state.attendance);
  const { leaves, loading: leaveLoading } = useSelector((state: RootState) => state.leave);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (user) {
      // Get recent attendance history (last 7 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      dispatch(getAttendanceHistory({ startDate, endDate }));
      dispatch(getLeaveHistory({ startDate, endDate }));
    }
  }, [dispatch, user]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type: string, status?: string) => {
    switch (type) {
      case 'attendance':
        if (status === 'present') return <CheckCircle color="success" />;
        if (status === 'late') return <Warning color="warning" />;
        if (status === 'absent') return <Warning color="error" />;
        return <Schedule color="info" />;
      case 'punchIn':
        return <Login color="success" />;
      case 'punchOut':
        return <Logout color="error" />;
      case 'leave':
        if (status === 'approved') return <CheckCircle color="success" />;
        if (status === 'rejected') return <Warning color="error" />;
        if (status === 'pending') return <AccessTime color="warning" />;
        return <EventNote color="primary" />;
      default:
        return <Schedule color="info" />;
    }
  };

  const getActivityMessage = (item: any, type: string) => {
    if (type === 'attendance') {
      const status = item.status;
      const punchInTime = item.punchIn?.time ? formatTime(item.punchIn.time) : '';
      const punchOutTime = item.punchOut?.time ? formatTime(item.punchOut.time) : '';
      
      if (status === 'present' && punchInTime && punchOutTime) {
        return `Worked from ${punchInTime} to ${punchOutTime}`;
      } else if (status === 'present' && punchInTime) {
        return `Punched in at ${punchInTime}`;
      } else if (status === 'late') {
        return `Late arrival at ${punchInTime}`;
      } else if (status === 'absent') {
        return 'Absent today';
      }
      return `Attendance: ${status}`;
    }
    
    if (type === 'leave') {
      const leaveType = item.leaveType.charAt(0).toUpperCase() + item.leaveType.slice(1);
      const status = item.status;
      const days = item.totalDays;
      
      if (status === 'approved') {
        return `${leaveType} leave approved (${days} day${days > 1 ? 's' : ''})`;
      } else if (status === 'rejected') {
        return `${leaveType} leave rejected`;
      } else if (status === 'pending') {
        return `${leaveType} leave request pending`;
      }
      return `${leaveType} leave: ${status}`;
    }
    
    return 'Activity recorded';
  };

  // Combine and sort activities
  const activities = [
    ...(attendanceHistory || []).map(item => ({
      ...item,
      type: 'attendance',
      timestamp: item.punchIn?.time || item.date,
    })),
    ...(leaves || []).map(item => ({
      ...item,
      type: 'leave',
      timestamp: item.createdAt,
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
   .slice(0, 5);

  const loading = attendanceLoading || leaveLoading;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Recent Activity
        </Typography>
        
        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        ) : activities.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No recent activity
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {activities.map((activity, index) => (
              <React.Fragment key={`${activity.type}-${activity._id || index}`}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getActivityIcon(activity.type, activity.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={getActivityMessage(activity, activity.type)}
                    secondary={formatTimeAgo(activity.timestamp)}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                {index < activities.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityCard; 