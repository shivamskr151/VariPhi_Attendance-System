import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Chip,
  Alert,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  TrendingUp,
  TrendingDown,
  AccessTime,
  CheckCircle,
  Cancel,
  Warning,
  Weekend,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getAttendanceHistory } from '../../store/slices/attendanceSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';

interface ChartData {
  day: string;
  hours: number;
  status: string;
  date: string;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday?: boolean;
  holidayName?: string;
}

type TimeRange = 'week' | 'month' | 'quarter' | 'year';

const AttendanceChart: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { attendanceHistory, loading, summary, error } = useSelector((state: RootState) => state.attendance);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Calculate date range based on selected time period
  const { startDate, endDate, dateLabels } = useMemo(() => {
    const today = new Date(currentDate);
    let start: Date;
    let end: Date = new Date(today);
    let labels: string[] = [];

    switch (timeRange) {
      case 'week':
        // Office week: Monday to Saturday, Sunday is weekend
        start = new Date(today);
        // Set to Monday
        start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        end = new Date(start);
        end.setDate(start.getDate() + 5); // End on Saturday
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        break;
      
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const daysInMonth = end.getDate();
        labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
        break;
      
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        labels = months.slice(quarter * 3, (quarter + 1) * 3);
        break;
      
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        break;
      
      default:
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      dateLabels: labels,
    };
  }, [timeRange, currentDate]);

  // Fetch attendance data when date range changes
  useEffect(() => {
    if (user) {
      console.log('Fetching attendance data:', { startDate, endDate, timeRange });
      dispatch(getAttendanceHistory({ startDate, endDate }));
    }
  }, [dispatch, user, startDate, endDate]);

  // Process attendance data for chart
  const processChartData = useCallback(() => {
    const today = new Date();
    const processedData: ChartData[] = [];

    if (timeRange === 'week') {
      // Weekly view - show each day of the week (Mon-Sat office, Sun weekend)
      const startOfWeek = new Date(currentDate);
      // Set to Monday
      startOfWeek.setDate(currentDate.getDate() - ((currentDate.getDay() + 6) % 7));
      dateLabels.forEach((label, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        const dateStr = date.toISOString().split('T')[0];
        const attendance = attendanceHistory?.find(a => a.date === dateStr);
        const isToday = today.toDateString() === date.toDateString();
        // Only Sunday is weekend
        const isWeekend = date.getDay() === 0;
        processedData.push({
          day: label,
          hours: attendance?.totalHours || 0,
          status: attendance?.status || 'absent',
          date: dateStr,
          isToday,
          isWeekend,
        });
      });
    } else if (timeRange === 'month') {
      // Monthly view - show each day of the month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      dateLabels.forEach((day) => {
        const date = new Date(startOfMonth);
        date.setDate(parseInt(day));
        const dateStr = date.toISOString().split('T')[0];
        
        const attendance = attendanceHistory?.find(a => a.date === dateStr);
        const isToday = today.toDateString() === date.toDateString();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        processedData.push({
          day,
          hours: attendance?.totalHours || 0,
          status: attendance?.status || 'absent',
          date: dateStr,
          isToday,
          isWeekend,
        });
      });
    } else if (timeRange === 'quarter') {
      // Quarterly view - show each month of the quarter
      const quarter = Math.floor(currentDate.getMonth() / 3);
      const startOfQuarter = new Date(currentDate.getFullYear(), quarter * 3, 1);
      
      dateLabels.forEach((month, index) => {
        const monthDate = new Date(startOfQuarter);
        monthDate.setMonth(startOfQuarter.getMonth() + index);
        
        // Calculate total hours for the month
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        const monthAttendance = attendanceHistory?.filter(a => {
          const attendanceDate = new Date(a.date);
          return attendanceDate >= monthStart && attendanceDate <= monthEnd;
        }) || [];
        
        const totalHours = monthAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0);
        const isCurrentMonth = monthDate.getMonth() === today.getMonth() && monthDate.getFullYear() === today.getFullYear();
        
        processedData.push({
          day: month,
          hours: totalHours,
          status: monthAttendance.length > 0 ? 'present' : 'absent',
          date: monthDate.toISOString().split('T')[0],
          isToday: isCurrentMonth,
          isWeekend: false,
        });
      });
    } else if (timeRange === 'year') {
      // Yearly view - show each month of the year
      dateLabels.forEach((month, index) => {
        const monthDate = new Date(currentDate.getFullYear(), index, 1);
        
        // Calculate total hours for the month
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        const monthAttendance = attendanceHistory?.filter(a => {
          const attendanceDate = new Date(a.date);
          return attendanceDate >= monthStart && attendanceDate <= monthEnd;
        }) || [];
        
        const totalHours = monthAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0);
        const isCurrentMonth = monthDate.getMonth() === today.getMonth() && monthDate.getFullYear() === today.getFullYear();
        
        processedData.push({
          day: month,
          hours: totalHours,
          status: monthAttendance.length > 0 ? 'present' : 'absent',
          date: monthDate.toISOString().split('T')[0],
          isToday: isCurrentMonth,
          isWeekend: false,
        });
      });
    }
    
    return processedData;
  }, [attendanceHistory, timeRange, currentDate, dateLabels]);

  // Update chart data when attendance history changes
  useEffect(() => {
    const processedData = processChartData();
    setChartData(processedData);
  }, [processChartData]);

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
      case 'leave':
        return theme.palette.secondary.main;
      default:
        return theme.palette.grey[300];
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

  const getMaxHours = () => {
    if (!chartData?.length) return 8;
    const maxHours = Math.max(...chartData.map(d => d.hours));
    return maxHours > 0 ? maxHours : 8; // Default to 8 hours if no data
  };

  const formatHours = (hours: number) => {
    if (hours === 0) return '0h';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
  };

  const formatDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (timeRange === 'week') {
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    } else if (timeRange === 'month') {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (timeRange === 'quarter') {
      return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
    } else {
      return start.getFullYear().toString();
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (timeRange) {
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'quarter':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 3 : -3));
        break;
      case 'year':
        newDate.setFullYear(currentDate.getFullYear() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getTotalHours = () => chartData?.reduce((sum, day) => sum + day.hours, 0) || 0;
  
  const getAverageHours = () => {
    const daysWithHours = chartData?.filter(d => d.hours > 0).length || 1;
    return getTotalHours() / daysWithHours;
  };

  const getAttendanceRate = () => {
    if (!chartData?.length) return 0;
    const presentDays = chartData.filter(d => d.status === 'present').length;
    return (presentDays / chartData.length) * 100;
  };

  const getStatusCounts = () => {
    const counts: { [key: string]: number } = {};
    chartData?.forEach(day => {
      counts[day.status] = (counts[day.status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading attendance data: {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header with controls */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            >
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="quarter">Quarter</MenuItem>
              <MenuItem value="year">Year</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="body2" color="text.secondary">
            {formatDateRange()}
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title="Previous period">
            <IconButton size="small" onClick={() => navigateDate('prev')}>
              <ChevronLeft />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Go to today">
            <IconButton size="small" onClick={goToToday}>
              <CalendarToday />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Next period">
            <IconButton size="small" onClick={() => navigateDate('next')}>
              <ChevronRight />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Summary stats */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Chip
          icon={<TrendingUp />}
          label={`Total: ${formatHours(getTotalHours())}`}
          color="primary"
          variant="outlined"
        />
        <Chip
          icon={<TrendingDown />}
          label={`Avg: ${formatHours(getAverageHours())}`}
          color="secondary"
          variant="outlined"
        />
        <Chip
          label={`Rate: ${getAttendanceRate().toFixed(1)}%`}
          color={getAttendanceRate() >= 80 ? "success" : "error"}
          variant="outlined"
        />
      </Box>

      {/* Loading state */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      )}

      {/* Chart */}
      {!loading && (
        <>
          {/* Chart */}
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'flex-end',
              gap: timeRange === 'month' ? 0.5 : 1,
              mt: 2,
              overflowX: timeRange === 'month' ? 'auto' : 'visible',
            }}
          >
            {chartData?.map((dayData, index) => {
              const maxHours = getMaxHours();
              const heightPercentage = maxHours > 0 ? (dayData.hours / maxHours) * 100 : 0;
              
              return (
                <Box
                  key={`${dayData.day}-${index}`}
                  sx={{
                    flex: timeRange === 'month' ? 'none' : 1,
                    minWidth: timeRange === 'month' ? 20 : 'auto',
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
                      backgroundColor: dayData.isWeekend ? theme.palette.grey[400] : getStatusColor(dayData.status),
                      borderRadius: 1,
                      minHeight: 20,
                      position: 'relative',
                      border: dayData.isToday ? `2px solid ${theme.palette.primary.main}` : 'none',
                      opacity: dayData.isWeekend ? 0.6 : 1,
                      '&:hover': {
                        opacity: 0.8,
                        cursor: 'pointer',
                        transform: 'scale(1.05)',
                        transition: 'all 0.2s ease-in-out',
                      },
                    }}
                    title={`${dayData.day}: ${formatHours(dayData.hours)} - ${dayData.status}${dayData.isWeekend ? ' (Weekend)' : ''}`}
                  />
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      fontWeight: dayData.isToday ? 'bold' : 'normal',
                      color: dayData.isToday ? theme.palette.primary.main : 'text.secondary',
                      fontSize: timeRange === 'month' ? '0.7rem' : '0.75rem',
                    }}
                  >
                    {dayData.day}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          
          {/* Dynamic legend based on actual data */}
          <Box display="flex" justifyContent="center" gap={2} mt={2} flexWrap="wrap">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Box key={status} display="flex" alignItems="center" gap={0.5}>
                <Box sx={{ width: 12, height: 12, backgroundColor: getStatusColor(status), borderRadius: 1 }} />
                <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                  {status} ({count})
                </Typography>
              </Box>
            ))}
            {chartData?.some(d => d.isWeekend) && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box sx={{ width: 12, height: 12, backgroundColor: theme.palette.grey[400], borderRadius: 1, opacity: 0.6 }} />
                <Typography variant="caption">Weekend</Typography>
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default AttendanceChart; 