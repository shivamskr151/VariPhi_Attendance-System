import React, { useEffect, useState, useCallback } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Skeleton,
  Fab,
  Zoom,
} from '@mui/material';
import {
  Schedule,
  EventNote,
  People,
  TrendingUp,
  AccessTime,
  CheckCircle,
  Refresh,
  Work,
  Weekend,
  Notifications,
  Dashboard as DashboardIcon,
  CalendarToday,
  Warning,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getTodayAttendance, getAttendanceHistory } from '../../store/slices/attendanceSlice';
import { getCurrentEmployee, getTeamMembers } from '../../store/slices/employeeSlice';
import { getLeaveHistory } from '../../store/slices/leaveSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import AttendanceCard from './AttendanceCard';
import LeaveBalanceCard from './LeaveBalanceCard';
import RecentActivityCard from './RecentActivityCard';
import AttendanceChart from './AttendanceChart';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  
  const { user, loading: authLoading } = useSelector((state: RootState) => state.auth);
  const { todayAttendance, attendanceHistory, loading: attendanceLoading, error: attendanceError } = useSelector((state: RootState) => state.attendance);
  const { currentEmployee, teamMembers, loading: employeeLoading, error: employeeError } = useSelector((state: RootState) => state.employee);
  const { leaves, loading: leaveLoading } = useSelector((state: RootState) => state.leave);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Show refresh button after 5 minutes of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRefreshButton(true);
    }, 300000); // 5 minutes

    return () => clearTimeout(timer);
  }, [lastRefresh]);

  const refreshDashboard = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsRefreshing(true);
      await Promise.all([
        dispatch(getTodayAttendance()),
        dispatch(getCurrentEmployee()),
        dispatch(getTeamMembers()),
        dispatch(getAttendanceHistory({ 
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        })),
        dispatch(getLeaveHistory({ 
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }))
      ]);
      setLastRefresh(new Date());
      setShowRefreshButton(false);
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (user) {
      refreshDashboard();
    }
  }, [user, refreshDashboard]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        refreshDashboard();
      }, 300000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [user, refreshDashboard]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getWorkStatus = () => {
    if (!todayAttendance) return 'Not Started';
    if (todayAttendance.punchIn && !todayAttendance.punchOut) return 'Working';
    if (todayAttendance.punchOut) return 'Completed';
    return 'Not Started';
  };

  const getWorkStatusColor = (status: string) => {
    switch (status) {
      case 'Working':
        return 'success';
      case 'Completed':
        return 'primary';
      case 'Not Started':
        return 'default';
      default:
        return 'default';
    }
  };

  const getWorkStatusIcon = (status: string) => {
    switch (status) {
      case 'Working':
        return <Work color="success" />;
      case 'Completed':
        return <CheckCircle color="primary" />;
      case 'Not Started':
        return <Schedule color="action" />;
      default:
        return <Schedule color="action" />;
    }
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <Alert severity="warning">
        Please log in to view your dashboard.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {getGreeting()}, {user.firstName}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            icon={getWorkStatusIcon(getWorkStatus())}
            label={getWorkStatus()}
            color={getWorkStatusColor(getWorkStatus()) as any}
            variant="outlined"
          />
          <Tooltip title="Refresh Dashboard">
            <IconButton 
              onClick={refreshDashboard} 
              disabled={isRefreshing}
              color="primary"
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Display */}
      {(attendanceError || employeeError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {attendanceError || employeeError}
        </Alert>
      )}

      {/* Quick Stats */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Work Streak
                  </Typography>
                  <Typography variant="h6" component="h3">
                    {attendanceHistory?.filter(a => a.status === 'present').length || 0} days
                  </Typography>
                </Box>
                <TrendingUp color="success" sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    This Month
                  </Typography>
                  <Typography variant="h6" component="h3">
                    {attendanceHistory?.filter(a => 
                      new Date(a.date).getMonth() === new Date().getMonth() && 
                      a.status === 'present'
                    ).length || 0} days
                  </Typography>
                </Box>
                <CalendarToday color="primary" sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Late Arrivals
                  </Typography>
                  <Typography variant="h6" component="h3">
                    {attendanceHistory?.filter(a => a.status === 'late').length || 0}
                  </Typography>
                </Box>
                <Warning color="error" sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Attendance Rate
                  </Typography>
                  <Typography variant="h6" component="h3">
                    {attendanceHistory && attendanceHistory.length > 0 
                      ? `${((attendanceHistory.filter(a => a.status === 'present').length / attendanceHistory.length) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </Typography>
                </Box>
                <CheckCircle color="info" sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} lg={8}>
          <Grid container spacing={3}>
            {/* Attendance Card */}
            <Grid item xs={12}>
              <AttendanceCard />
            </Grid>

            {/* Attendance Chart */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <AttendanceChart />
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={3}>
            {/* Leave Balance Card */}
            <Grid item xs={12}>
              <LeaveBalanceCard />
            </Grid>

            {/* Recent Activity */}
            <Grid item xs={12}>
              <RecentActivityCard />
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Floating Refresh Button */}
      <Zoom in={showRefreshButton}>
        <Fab
          color="primary"
          aria-label="refresh"
          onClick={refreshDashboard}
          disabled={isRefreshing}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
        >
          <Refresh />
        </Fab>
      </Zoom>
    </Box>
  );
};

export default Dashboard; 