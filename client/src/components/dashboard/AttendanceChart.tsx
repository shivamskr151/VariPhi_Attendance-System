import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getAttendanceHistory } from '../../store/slices/attendanceSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';

interface WeeklyData {
  day: string;
  hours: number;
  status: string;
  date: string;
}

const AttendanceChart: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { attendanceHistory, loading } = useSelector((state: RootState) => state.attendance);
  const { user } = useSelector((state: RootState) => state.auth);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);

  useEffect(() => {
    if (user) {
      // Get attendance for the current week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
      
      const endDate = today.toISOString().split('T')[0];
      const startDate = startOfWeek.toISOString().split('T')[0];
      
      dispatch(getAttendanceHistory({ startDate, endDate }));
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (attendanceHistory?.length > 0) {
      // Process attendance data for the week
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      const weekData: WeeklyData[] = daysOfWeek.map((day, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        const dateStr = date.toISOString().split('T')[0];
        
        const attendance = attendanceHistory.find(a => a.date === dateStr);
        
        return {
          day,
          hours: attendance?.totalHours || 0,
          status: attendance?.status || 'absent',
          date: dateStr,
        };
      });
      
      setWeeklyData(weekData);
    } else {
      // Set default week data when no attendance history
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      const weekData: WeeklyData[] = daysOfWeek.map((day, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        const dateStr = date.toISOString().split('T')[0];
        
        return {
          day,
          hours: 0,
          status: 'absent',
          date: dateStr,
        };
      });
      
      setWeeklyData(weekData);
    }
  }, [attendanceHistory]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return theme.palette.success.main;
      case 'late':
        return theme.palette.warning.main;
      case 'absent':
        return theme.palette.error.main;
      case 'half-day':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[300];
    }
  };

  const getMaxHours = () => {
    if (!weeklyData?.length) return 8;
    return Math.max(...weeklyData.map(d => d.hours), 8); // Default to 8 hours if no data
  };

  const formatHours = (hours: number) => {
    if (hours === 0) return '0h';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Weekly attendance overview
      </Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 1,
              mt: 2,
            }}
          >
            {weeklyData?.map((dayData, index) => {
              const maxHours = getMaxHours();
              const heightPercentage = maxHours > 0 ? (dayData.hours / maxHours) * 100 : 0;
              const isToday = new Date().toDateString() === new Date(dayData.date).toDateString();
              
              return (
                <Box
                  key={dayData.day}
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      height: `${Math.max(heightPercentage, 5)}%`,
                      backgroundColor: getStatusColor(dayData.status),
                      borderRadius: 1,
                      minHeight: 20,
                      position: 'relative',
                      border: isToday ? `2px solid ${theme.palette.primary.main}` : 'none',
                      '&:hover': {
                        opacity: 0.8,
                        cursor: 'pointer',
                      },
                    }}
                    title={`${dayData.day}: ${formatHours(dayData.hours)} - ${dayData.status}`}
                  />
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      fontWeight: isToday ? 'bold' : 'normal',
                      color: isToday ? theme.palette.primary.main : 'text.secondary'
                    }}
                  >
                    {dayData.day}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          
          <Box display="flex" justifyContent="space-between" mt={2} px={1}>
            <Typography variant="caption" color="text.secondary">
              Total: {formatHours(weeklyData?.reduce((sum, day) => sum + day.hours, 0) || 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Avg: {formatHours((weeklyData?.reduce((sum, day) => sum + day.hours, 0) || 0) / Math.max(weeklyData?.filter(d => d.hours > 0).length || 1, 1))}
            </Typography>
          </Box>
          
          <Box display="flex" justifyContent="center" gap={2} mt={2}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Box sx={{ width: 12, height: 12, backgroundColor: theme.palette.success.main, borderRadius: 1 }} />
              <Typography variant="caption">Present</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Box sx={{ width: 12, height: 12, backgroundColor: theme.palette.warning.main, borderRadius: 1 }} />
              <Typography variant="caption">Late</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Box sx={{ width: 12, height: 12, backgroundColor: theme.palette.error.main, borderRadius: 1 }} />
              <Typography variant="caption">Absent</Typography>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default AttendanceChart; 