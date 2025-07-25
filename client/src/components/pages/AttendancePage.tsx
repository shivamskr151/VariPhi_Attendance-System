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
import { getAttendanceHistory } from '../../store/slices/attendanceSlice';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import { holidaysAPI } from '../../services/api';
import { Holiday } from '../../types';

const AttendancePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { attendanceHistory, loading, error: attendanceError } = useSelector((state: RootState) => state.attendance);

  // Debug logging
  useEffect(() => {
    console.log('AttendancePage - Redux state:', {
      attendanceHistory: attendanceHistory?.length || 0,
      loading,
      attendanceError,
      user: user ? `User: ${user.firstName} ${user.lastName} (${user.employeeId})` : 'No user',
      isAuthenticated: !!user,
      accessToken: localStorage.getItem('accessToken') ? 'Token exists' : 'No token'
    });
  }, [attendanceHistory, loading, attendanceError, user]);

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

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);
  const [holidaysError, setHolidaysError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAttendanceData();
      getCurrentLocation();
      checkCurrentAttendance();
    } else {
      console.log('No user logged in, skipping attendance data fetch');
    }
  }, [filters, user]);

  useEffect(() => {
    setHolidaysLoading(true);
    holidaysAPI.getHolidays()
      .then(res => setHolidays(res.data.data))
      .catch(err => setHolidaysError(err.response?.data?.message || 'Failed to load holidays'))
      .finally(() => setHolidaysLoading(false));
  }, []);

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
      if (!user) {
        console.log('No user logged in, cannot check current attendance');
        return;
      }

      console.log('Checking current attendance...');
      const response = await api.get('/attendance/today');
      console.log('Today\'s attendance response:', response.data);
      
      if (response.data.success && response.data.data) {
        setCurrentAttendance(response.data.data.attendance || null);
        console.log('Current attendance set:', response.data.data.attendance);
      } else {
        setCurrentAttendance(null);
      }
    } catch (error: any) {
      console.error('Error checking current attendance:', error);
      setCurrentAttendance(null);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      if (!user) {
        console.log('No user logged in, cannot fetch attendance data');
        return;
      }

      console.log('Fetching attendance data with filters:', filters);
      console.log('Current user:', user);
      
      // Use Redux action instead of direct API call
      const result = await dispatch(getAttendanceHistory(filters));
      console.log('Redux dispatch result:', result);
      
    } catch (error: any) {
      console.error('Error fetching attendance data:', error);
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

  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to view attendance history
        </Typography>
      </Box>
    );
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

        {(error || attendanceError) && (
          <ErrorAlert 
            error={error || attendanceError} 
            onClose={() => {
              setError(null);
              // Note: attendanceError is handled by Redux, so we don't clear it here
            }} 
          />
        )}
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
                    {currentAttendance.punchIn?.time ? (
                      <Typography variant="body1" gutterBottom>
                        Punched in at: {formatTime(currentAttendance.punchIn.time)}
                      </Typography>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        Not punched in yet
                      </Typography>
                    )}
                    {currentAttendance.punchOut?.time && (
                      <Typography variant="body1">
                        Punched out at: {formatTime(currentAttendance.punchOut.time)}
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
                  {!currentAttendance?.punchOut?.time ? (
                    currentAttendance?.punchIn?.time ? (
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

        {/* Upcoming Holidays */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Upcoming Holidays
            </Typography>
            {holidaysLoading ? (
              <CircularProgress size={24} />
            ) : holidaysError ? (
              <Alert severity="error">{holidaysError}</Alert>
            ) : holidays.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No holidays found.
              </Typography>
            ) : (
              <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                {holidays
                  .filter(h => new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)))
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 5)
                  .map((holiday: Holiday) => (
                    <li key={holiday._id || holiday.date + holiday.name} style={{ marginBottom: 8 }}>
                      <Typography variant="body1" component="span" sx={{ fontWeight: 500 }}>
                        {new Date(holiday.date).toLocaleDateString()} - {holiday.name}
                      </Typography>
                      {holiday.description && (
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                          ({holiday.description})
                        </Typography>
                      )}
                    </li>
                  ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Attendance History */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Attendance History
            </Typography>
            
            {/* Debug info */}
            <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Records: {attendanceHistory?.length || 0} | 
                Loading: {loading ? 'Yes' : 'No'} | 
                Error: {attendanceError || 'None'}
              </Typography>
            </Box>
            
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
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
                    {attendanceHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No attendance records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendanceHistory.map((attendance) => (
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
            )}
          </CardContent>
        </Card>

        {/* Floating Action Button for Quick Punch */}
        <Tooltip title="Quick Punch">
          <Fab
            color="primary"
            aria-label="quick punch"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
                            onClick={currentAttendance?.punchOut?.time ? handlePunchIn : handlePunchOut}
            disabled={isPunching}
          >
            {isPunching ? (
              <CircularProgress size={24} color="inherit" />
                          ) : currentAttendance?.punchOut?.time ? (
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