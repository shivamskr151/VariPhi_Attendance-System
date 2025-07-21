import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Login,
  Logout,
  Schedule,
  LocationOn,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { punchIn, punchOut } from '../../store/slices/attendanceSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';

const AttendanceCard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { todayAttendance, loading } = useSelector((state: RootState) => state.attendance);
  
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
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
          reject(new Error('Unable to retrieve your location.'));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  };

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
      setLocationError(null);
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      
      await dispatch(punchIn({
        location: currentLocation,
        device: getDeviceType(),
      })).unwrap();
    } catch (error: any) {
      setLocationError(error.message || 'Failed to punch in');
    }
  };

  const handlePunchOut = async () => {
    try {
      setLocationError(null);
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      
      await dispatch(punchOut({
        location: currentLocation,
        device: getDeviceType(),
      })).unwrap();
    } catch (error: any) {
      setLocationError(error.message || 'Failed to punch out');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'success';
      case 'absent':
        return 'error';
      case 'late':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatTime = (time: any) => {
    if (!time) return '';
    const date = typeof time === 'string' ? new Date(time) : time;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" component="h2">
            Today's Attendance
          </Typography>
          {todayAttendance?.status && (
            <Chip
              label={todayAttendance.status.toUpperCase()}
              color={getStatusColor(todayAttendance.status) as any}
              size="small"
            />
          )}
        </Box>

        {locationError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {locationError}
          </Alert>
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

          {todayAttendance?.totalHours && (
            <Box display="flex" alignItems="center" gap={1}>
              <Schedule color="primary" />
              <Typography variant="body2">
                Total Hours: {todayAttendance.totalHours} hours
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
        </Box>
      </CardContent>

      <CardActions>
        {!todayAttendance?.punchIn ? (
          <Button
            variant="contained"
            color="success"
            startIcon={<Login />}
            onClick={handlePunchIn}
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={20} /> : 'Punch In'}
          </Button>
        ) : !todayAttendance?.punchOut ? (
          <Button
            variant="contained"
            color="error"
            startIcon={<Logout />}
            onClick={handlePunchOut}
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={20} /> : 'Punch Out'}
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