import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Login,
  Logout,
  Schedule,
  LocationOn,
  Refresh,
  CheckCircle,
  Warning,
  Cancel,
  AccessTime,
  Weekend,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { punchIn, punchOut, getTodayAttendance } from '../../store/slices/attendanceSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';

const AttendanceCard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { todayAttendance, loading, error } = useSelector((state: RootState) => state.attendance);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isPunching, setIsPunching] = useState(false);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-refresh today's attendance every 30 seconds
  useEffect(() => {
    if (user) {
      dispatch(getTodayAttendance());
      
      const interval = setInterval(() => {
        dispatch(getTodayAttendance());
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [dispatch, user]);

  const getCurrentLocation = useCallback((): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Unable to retrieve your location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, []);

  const getDeviceType = (): 'web' | 'mobile' | 'tablet' => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      return 'mobile';
    }
    if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    }
    return 'web';
  };

  const handlePunchIn = async () => {
    try {
      setIsPunching(true);
      setLocationError(null);
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      
      await dispatch(punchIn({
        location: currentLocation,
        device: getDeviceType(),
      })).unwrap();
    } catch (error: any) {
      setLocationError(error.message || 'Failed to punch in');
    } finally {
      setIsPunching(false);
    }
  };

  const handlePunchOut = async () => {
    try {
      setIsPunching(true);
      setLocationError(null);
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      
      await dispatch(punchOut({
        location: currentLocation,
        device: getDeviceType(),
      })).unwrap();
    } catch (error: any) {
      setLocationError(error.message || 'Failed to punch out');
    } finally {
      setIsPunching(false);
    }
  };

  const handleRefresh = () => {
    dispatch(getTodayAttendance());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'success';
      case 'absent':
        return 'error';
      case 'late':
        return 'warning';
      case 'half-day':
        return 'info';
      case 'leave':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle fontSize="small" />;
      case 'late':
        return <Warning fontSize="small" />;
      case 'absent':
        return <Cancel fontSize="small" />;
      case 'half-day':
        return <AccessTime fontSize="small" />;
      case 'leave':
        return <Weekend fontSize="small" />;
      default:
        return <AccessTime fontSize="small" />;
    }
  };

  const formatTime = (time: any) => {
    if (!time) return '';
    const date = typeof time === 'string' ? new Date(time) : time;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (startTime: any, endTime: any) => {
    if (!startTime || !endTime) return '';
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const hours = Math.floor(diffHours);
    const minutes = Math.floor((diffHours - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  const getWorkProgress = () => {
    if (!todayAttendance?.punchIn) return 0;
    
    // Work hours: 9:00 AM to 6:00 PM (9 hours)
    const workStart = new Date(todayAttendance.punchIn.time);
    const workEnd = new Date(workStart);
    workEnd.setHours(9, 0, 0, 0); // Set to 9:00 AM
    if (workStart.getHours() >= 9) {
      workEnd.setHours(18, 0, 0, 0); // Set to 6:00 PM
    } else {
      // If punched in before 9:00 AM, still count until 6:00 PM
      workEnd.setHours(18, 0, 0, 0);
    }
    const now = new Date();
    const totalWorkTime = 9 * 60 * 60 * 1000; // 9 hours in ms
    const elapsedTime = Math.max(0, Math.min(now.getTime() - workStart.getTime(), totalWorkTime));
    if (elapsedTime <= 0) return 0;
    if (elapsedTime >= totalWorkTime) return 100;
    return (elapsedTime / totalWorkTime) * 100;
  };

  const isWorkDay = () => {
    const day = currentTime.getDay();
    // Office days: Monday (1) to Saturday (6), Sunday (0) is weekend
    return day !== 0;
  };

  const canPunchIn = () => {
    if (!isWorkDay()) return false;
    if (todayAttendance?.punchIn && !todayAttendance?.punchOut) return false;
    return true;
  };

  const canPunchOut = () => {
    return todayAttendance?.punchIn && !todayAttendance?.punchOut;
  };

  const isWithinWorkingHours = () => {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Working hours: 9:00 AM (540 minutes) to 6:00 PM (1080 minutes)
    const workStartMinutes = 9 * 60; // 9:00 AM
    const workEndMinutes = 18 * 60;  // 6:00 PM
    
    return currentTimeInMinutes >= workStartMinutes && currentTimeInMinutes <= workEndMinutes;
  };

  const getWorkingHoursStatus = () => {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    if (currentTimeInMinutes < 9 * 60) {
      return { status: 'before', message: 'Working hours start at 9:00 AM' };
    } else if (currentTimeInMinutes > 18 * 60) {
      return { status: 'after', message: 'Working hours ended at 6:00 PM' };
    } else {
      return { status: 'within', message: 'Within working hours (9:00 AM - 6:00 PM)' };
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" component="h2">
            Today's Attendance
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            {todayAttendance?.status && (
              <Chip
                icon={getStatusIcon(todayAttendance.status)}
                label={todayAttendance.status.toUpperCase()}
                color={getStatusColor(todayAttendance.status) as any}
                size="small"
              />
            )}
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={handleRefresh} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Current Time */}
        <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
          <Typography variant="h4" component="div" color="primary">
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </Typography>
        </Box>

        {/* Working Hours Status */}
        {isWorkDay() && (
          <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
            {(() => {
              const workingStatus = getWorkingHoursStatus();
              const color = workingStatus.status === 'within' ? 'success' : 'warning';
              return (
                <Chip
                  icon={<AccessTime />}
                  label={workingStatus.message}
                  color={color as any}
                  size="small"
                  variant="outlined"
                />
              );
            })()}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {locationError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {locationError}
          </Alert>
        )}

        {/* Work Progress */}
        {todayAttendance?.punchIn && !todayAttendance?.punchOut && (
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Work Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getWorkProgress().toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={getWorkProgress()} 
              color="primary"
            />
          </Box>
        )}

        <Box display="flex" flexDirection="column" gap={2}>
          {todayAttendance?.punchIn && (
            <Box display="flex" alignItems="center" gap={1}>
              <Login color="success" />
              <Typography variant="body2">
                Punch In: {formatTime(todayAttendance.punchIn.time)}
              </Typography>
            </Box>
          )}

          {todayAttendance?.punchOut && (
            <Box display="flex" alignItems="center" gap={1}>
              <Logout color="error" />
              <Typography variant="body2">
                Punch Out: {formatTime(todayAttendance.punchOut.time)}
              </Typography>
            </Box>
          )}

          {todayAttendance?.punchIn && todayAttendance?.punchOut && (
            <Box display="flex" alignItems="center" gap={1}>
              <Schedule color="primary" />
              <Typography variant="body2">
                Duration: {formatDuration(todayAttendance.punchIn.time, todayAttendance.punchOut.time)}
              </Typography>
            </Box>
          )}

          {todayAttendance?.totalHours && (
            <Box display="flex" alignItems="center" gap={1}>
              <Schedule color="primary" />
              <Typography variant="body2">
                Total Hours: {todayAttendance.totalHours.toFixed(2)} hours
              </Typography>
            </Box>
          )}

          {location && (
            <Box display="flex" alignItems="center" gap={1}>
              <LocationOn color="action" />
              <Typography variant="body2">
                Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Typography>
            </Box>
          )}

          {!isWorkDay() && (
            <Alert severity="info" icon={<Weekend />}>
              Weekend - No attendance required
            </Alert>
          )}
        </Box>
      </CardContent>

      <Divider />

      <CardActions>
        {!isWorkDay() ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', width: '100%' }}>
            Weekend - Enjoy your day off!
          </Typography>
        ) : !todayAttendance?.punchIn ? (
          <Tooltip 
            title={!isWithinWorkingHours() ? 'Punch in is only allowed during working hours (9:00 AM - 6:00 PM)' : ''}
            placement="top"
          >
            <span>
              <Button
                variant="contained"
                color="success"
                startIcon={<Login />}
                onClick={handlePunchIn}
                disabled={loading || isPunching || !isWithinWorkingHours()}
                fullWidth
              >
                {isPunching ? <CircularProgress size={20} /> : 'Punch In'}
              </Button>
            </span>
          </Tooltip>
        ) : !todayAttendance?.punchOut ? (
          <Button
            variant="contained"
            color="error"
            startIcon={<Logout />}
            onClick={handlePunchOut}
            disabled={loading || isPunching}
            fullWidth
          >
            {isPunching ? <CircularProgress size={20} /> : 'Punch Out'}
          </Button>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', width: '100%' }}>
            Day completed! Check your attendance history for details.
          </Typography>
        )}
      </CardActions>
    </Card>
  );
};

export default AttendanceCard; 