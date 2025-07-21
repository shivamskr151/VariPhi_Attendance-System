import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Fab,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  FilterList,
  LocationOn,
  Schedule,
  CheckCircle,
  Cancel,
  Warning,
  EventNote,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { Attendance, AttendanceFilter, CurrentAttendance } from '../../types';
import { api } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

const AttendancePage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { loading } = useSelector((state: RootState) => state.attendance);

  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [currentAttendance, setCurrentAttendance] = useState<CurrentAttendance | null>(null);
  const [isPunching, setIsPunching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Filter states
  const [filters, setFilters] = useState<AttendanceFilter>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: '',
  });

  useEffect(() => {
    fetchAttendanceData();
    getCurrentLocation();
    checkCurrentAttendance();
  }, [filters]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please enable location services.');
        }
      );
    }
  };

  const checkCurrentAttendance = async () => {
    try {
      console.log('Checking current attendance...');
      const response = await api.get('/attendance/today');
      console.log('Today\'s attendance response:', response.data);
      
      if (response.data.success && response.data.data) {
        setCurrentAttendance(response.data.data.attendance || null);
        console.log('Current attendance set:', response.data.data.attendance);
      } else {
        console.log('No current attendance found');
        setCurrentAttendance(null);
      }
    } catch (error: any) {
      console.error('Error checking current attendance:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setCurrentAttendance(null);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      console.log('Fetching attendance data with filters:', filters);
      
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status) params.append('status', filters.status);

      console.log('API URL:', `/attendance/history?${params}`);
      
      const response = await api.get(`/attendance/history?${params}`);
      console.log('Attendance API response:', response.data);
      
      if (response.data.success) {
        setAttendanceData(response.data.data.attendance);
        console.log('Attendance data set:', response.data.data.attendance);
      } else {
        console.error('API returned success: false:', response.data);
        setError(response.data.message || 'Failed to fetch attendance data');
      }
    } catch (error: any) {
      console.error('Error fetching attendance data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      setError(error.response?.data?.message || 'Failed to fetch attendance data');
    }
  };

  const handlePunchIn = async () => {
    if (!location) {
      setError('Location is required for punch in');
      return;
    }

    setIsPunching(true);
    try {
      const punchData = {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        device: 'web',
        notes: '',
      };

      const response = await api.post('/attendance/punch-in', punchData);
      if (response.data.success) {
        setCurrentAttendance(response.data.data.attendance || null);
        setSuccess('Successfully punched in!');
        fetchAttendanceData();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to punch in');
    } finally {
      setIsPunching(false);
    }
  };

  const handlePunchOut = async () => {
    if (!location) {
      setError('Location is required for punch out');
      return;
    }

    setIsPunching(true);
    try {
      const punchData = {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        device: 'web',
        notes: '',
      };

      const response = await api.post('/attendance/punch-out', punchData);
      if (response.data.success) {
        setCurrentAttendance(null);
        setSuccess('Successfully punched out!');
        fetchAttendanceData();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to punch out');
    } finally {
      setIsPunching(false);
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      present: { color: 'success', icon: <CheckCircle /> },
      absent: { color: 'error', icon: <Cancel /> },
      late: { color: 'warning', icon: <Warning /> },
      'half-day': { color: 'info', icon: <Schedule /> },
      leave: { color: 'default', icon: <EventNote /> },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.present;
    return (
      <Chip
        icon={config.icon}
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={config.color as any}
        size="small"
      />
    );
  };

  const formatTime = (time: string) => {
    if (!time) return '-';
    try {
      return new Date(time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '-';
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Attendance Management
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ mr: 1 }}
            >
              Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchAttendanceData}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {error && <ErrorAlert error={error} onClose={() => setError(null)} />}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Punch In/Out Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Today's Attendance
            </Typography>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocationOn sx={{ mr: 1, color: location ? 'success.main' : 'error.main' }} />
                  <Typography variant="body2">
                    {location ? 'Location detected' : 'Location not available'}
                  </Typography>
                </Box>
                {currentAttendance ? (
                  <Box>
                    {currentAttendance.punchInTime ? (
                      <Typography variant="body1" gutterBottom>
                        Punched in at: {formatTime(currentAttendance.punchInTime)}
                      </Typography>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        Not punched in yet
                      </Typography>
                    )}
                    {currentAttendance.punchOutTime && (
                      <Typography variant="body1">
                        Punched out at: {formatTime(currentAttendance.punchOutTime)}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body1" color="text.secondary">
                    No active attendance session
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  {!currentAttendance?.punchOutTime ? (
                    currentAttendance?.punchInTime ? (
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<Stop />}
                        onClick={handlePunchOut}
                        disabled={isPunching}
                        size="large"
                      >
                        {isPunching ? <CircularProgress size={20} /> : 'Punch Out'}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PlayArrow />}
                        onClick={handlePunchIn}
                        disabled={isPunching || !location}
                        size="large"
                      >
                        {isPunching ? <CircularProgress size={20} /> : 'Punch In'}
                      </Button>
                    )
                  ) : (
                    <Typography variant="body1" color="success.main">
                      Day completed
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Filters */}
        {showFilters && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Start Date"
                  value={filters.startDate ? new Date(filters.startDate) : null}
                  onChange={(date) =>
                    setFilters({
                      ...filters,
                      startDate: date ? date.toISOString().split('T')[0] : '',
                    })
                  }
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="End Date"
                  value={filters.endDate ? new Date(filters.endDate) : null}
                  onChange={(date) =>
                    setFilters({
                      ...filters,
                      endDate: date ? date.toISOString().split('T')[0] : '',
                    })
                  }
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="present">Present</MenuItem>
                    <MenuItem value="absent">Absent</MenuItem>
                    <MenuItem value="late">Late</MenuItem>
                    <MenuItem value="half-day">Half Day</MenuItem>
                    <MenuItem value="leave">Leave</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant="outlined"
                  onClick={() =>
                    setFilters({
                      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0],
                      endDate: new Date().toISOString().split('T')[0],
                      status: '',
                    })
                  }
                  fullWidth
                >
                  Reset Filters
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Attendance History */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Attendance History
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Punch In</TableCell>
                    <TableCell>Punch Out</TableCell>
                    <TableCell>Total Hours</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceData.map((attendance) => (
                      <TableRow key={attendance._id}>
                        <TableCell>{formatDate(attendance.date)}</TableCell>
                        <TableCell>
                          {attendance.punchIn ? formatTime(attendance.punchIn.time) : '-'}
                        </TableCell>
                        <TableCell>
                          {attendance.punchOut ? formatTime(attendance.punchOut.time) : '-'}
                        </TableCell>
                        <TableCell>
                          {attendance.totalHours ? `${attendance.totalHours}h` : '-'}
                        </TableCell>
                        <TableCell>{getStatusChip(attendance.status)}</TableCell>
                        <TableCell>
                          {attendance.isRemote ? (
                            <Chip label="Remote" size="small" color="info" />
                          ) : (
                            <Chip label="Office" size="small" color="default" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Floating Action Button for Quick Punch */}
        <Tooltip title="Quick Punch">
          <Fab
            color="primary"
            aria-label="quick punch"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={currentAttendance?.punchOutTime ? handlePunchIn : handlePunchOut}
            disabled={isPunching}
          >
            {isPunching ? (
              <CircularProgress size={24} color="inherit" />
            ) : currentAttendance?.punchOutTime ? (
              <PlayArrow />
            ) : (
              <Stop />
            )}
          </Fab>
        </Tooltip>
      </Box>
    </LocalizationProvider>
  );
};

export default AttendancePage; 