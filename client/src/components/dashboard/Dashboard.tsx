import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  useTheme,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Schedule,
  EventNote,
  People,
  TrendingUp,
  AccessTime,
  CheckCircle,
  Cancel,
  Warning,
  Refresh,
  Work,
  Weekend,
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
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  const { user, loading: authLoading } = useSelector((state: RootState) => state.auth);
  const { todayAttendance, attendanceHistory, loading: attendanceLoading, error: attendanceError } = useSelector((state: RootState) => state.attendance);
  const { currentEmployee, teamMembers, loading: employeeLoading, error: employeeError } = useSelector((state: RootState) => state.employee);
  const { leaves, loading: leaveLoading } = useSelector((state: RootState) => state.leave);

  useEffect(() => {
    if (user) {
      refreshDashboard();
    }
  }, [user]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-refresh dashboard data every 5 minutes
  useEffect(() => {
    if (!user) return;
    
    const refreshTimer = setInterval(() => {
      refreshDashboard();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(refreshTimer);
  }, [user]);

  const refreshDashboard = async () => {
    if (!user) return;
    
    try {
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
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    }
  };

  const loading = authLoading || attendanceLoading || employeeLoading || leaveLoading;
  const error = attendanceError || employeeError;

  if (loading && !user) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorAlert error={error} />;
  }

  if (!user) {
    return <ErrorAlert error="User not found" />;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getWorkStatus = () => {
    if (!todayAttendance) return 'Not Started';
    if (todayAttendance.punchIn && !todayAttendance.punchOut) return 'Working';
    if (todayAttendance.punchOut) return 'Completed';
    return todayAttendance.status;
  };

  const getWorkStatusColor = (status: string) => {
    switch (status) {
      case 'Working':
        return 'success';
      case 'Completed':
        return 'info';
      case 'Not Started':
        return 'default';
      case 'late':
        return 'warning';
      case 'absent':
        return 'error';
      default:
        return 'primary';
    }
  };

  const getTotalWorkHours = () => {
    if (!attendanceHistory?.length) return 0;
    return attendanceHistory.reduce((total, record) => total + (record.totalHours || 0), 0);
  };

  const getAverageWorkHours = () => {
    if (!attendanceHistory?.length) return 0;
    const totalHours = getTotalWorkHours();
    return totalHours / attendanceHistory.length;
  };

  const getAttendanceRate = () => {
    if (!attendanceHistory?.length) return 0;
    const presentDays = attendanceHistory.filter(record => record.status === 'present').length;
    return (presentDays / attendanceHistory.length) * 100;
  };

  const getPendingLeavesCount = () => {
    return leaves?.filter(leave => leave.status === 'pending').length || 0;
  };

  const getTeamSize = () => {
    return teamMembers?.length || 0;
  };

  return (
    <Box>
      {/* Header Section */}
      <Box mb={3}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="h4" component="h1">
            {getGreeting()}, {user.firstName}!
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Typography>
            <Tooltip title="Refresh Dashboard">
              <IconButton onClick={refreshDashboard} size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Welcome to your attendance dashboard. Here's what's happening today.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Current time: {getCurrentTime()}
        </Typography>
      </Box>

      {/* Quick Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Today's Status
                  </Typography>
                  <Typography variant="h5" component="h2">
                    {getWorkStatus()}
                  </Typography>
                  {todayAttendance?.status && (
                    <Chip
                      label={todayAttendance.status.toUpperCase()}
                      color={getWorkStatusColor(todayAttendance.status) as any}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
                <Schedule color="primary" sx={{ fontSize: 40 }} />
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
                    Work Hours
                  </Typography>
                  <Typography variant="h5" component="h2">
                    {todayAttendance?.totalHours ? `${todayAttendance.totalHours.toFixed(1)}h` : '0h'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg: {getAverageWorkHours().toFixed(1)}h/day
                  </Typography>
                </Box>
                <AccessTime color="primary" sx={{ fontSize: 40 }} />
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
                    Leave Balance
                  </Typography>
                  <Typography variant="h5" component="h2">
                    {currentEmployee?.leaveBalance ?
                      Object.values(currentEmployee.leaveBalance).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0)
                      : 0} days
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getPendingLeavesCount()} pending requests
                  </Typography>
                </Box>
                <EventNote color="primary" sx={{ fontSize: 40 }} />
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
                    Team Members
                  </Typography>
                  <Typography variant="h5" component="h2">
                    {getTeamSize()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.role === 'admin' || user.role === 'manager' ? 'Manage team' : 'View team'}
                  </Typography>
                </Box>
                <People color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Stats Row */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Hours (30d)
                  </Typography>
                  <Typography variant="h6" component="h3">
                    {getTotalWorkHours().toFixed(1)}h
                  </Typography>
                </Box>
                <Work color="secondary" sx={{ fontSize: 32 }} />
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
                    {getAttendanceRate().toFixed(1)}%
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
                    Work Days
                  </Typography>
                  <Typography variant="h6" component="h3">
                    {attendanceHistory?.filter(r => r.status === 'present').length || 0}
                  </Typography>
                </Box>
                <CheckCircle color="info" sx={{ fontSize: 32 }} />
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
                    Leave Days
                  </Typography>
                  <Typography variant="h6" component="h3">
                    {leaves?.filter(l => l.status === 'approved').length || 0}
                  </Typography>
                </Box>
                <Weekend color="warning" sx={{ fontSize: 32 }} />
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
                <Typography variant="h6" gutterBottom>
                  Attendance Overview
                </Typography>
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
    </Box>
  );
};

export default Dashboard; 