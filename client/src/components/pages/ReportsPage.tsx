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
  Tabs,
  Tab,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Refresh,
  FilterList,
  Download,
  Assessment,
  Schedule,
  EventNote,
  CheckCircle,
  Cancel,
  Warning,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { AttendanceReport, LeaveReport } from '../../types';
import { api } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ReportsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Attendance Report States
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReport | null>(null);
  const [attendanceFilters, setAttendanceFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    department: '',
    employeeId: '',
  });

  // Leave Report States
  const [leaveReport, setLeaveReport] = useState<LeaveReport | null>(null);
  const [leaveFilters, setLeaveFilters] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    department: '',
    leaveType: '',
    status: '',
  });

  useEffect(() => {
    if (tabValue === 0) {
      fetchAttendanceReport();
    } else if (tabValue === 1) {
      fetchLeaveReport();
    }
  }, [tabValue, attendanceFilters, leaveFilters]);

  const fetchAttendanceReport = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching attendance report with filters:', attendanceFilters);
      
      const params = new URLSearchParams();
      if (attendanceFilters.startDate) params.append('startDate', attendanceFilters.startDate);
      if (attendanceFilters.endDate) params.append('endDate', attendanceFilters.endDate);
      if (attendanceFilters.department) params.append('department', attendanceFilters.department);
      if (attendanceFilters.employeeId) params.append('employeeId', attendanceFilters.employeeId);

      console.log('API URL:', `/reports/attendance?${params}`);
      
      const response = await api.get(`/reports/attendance?${params}`);
      console.log('Attendance report response:', response.data);
      
      if (response.data.success) {
        setAttendanceReport(response.data.data);
        console.log('Attendance report set:', response.data.data);
      } else {
        console.error('API returned success: false:', response.data);
        setError(response.data.message || 'Failed to fetch attendance report');
      }
    } catch (error: any) {
      console.error('Error fetching attendance report:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message || 
                          error.message || 
                          'Failed to fetch attendance report';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveReport = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching leave report with filters:', leaveFilters);
      
      const params = new URLSearchParams();
      if (leaveFilters.startDate) params.append('startDate', leaveFilters.startDate);
      if (leaveFilters.endDate) params.append('endDate', leaveFilters.endDate);
      if (leaveFilters.department) params.append('department', leaveFilters.department);
      if (leaveFilters.leaveType) params.append('leaveType', leaveFilters.leaveType);
      if (leaveFilters.status) params.append('status', leaveFilters.status);

      console.log('API URL:', `/reports/leaves?${params}`);
      
      const response = await api.get(`/reports/leaves?${params}`);
      console.log('Leave report response:', response.data);
      
      if (response.data.success) {
        setLeaveReport(response.data.data);
        console.log('Leave report set:', response.data.data);
      } else {
        console.error('API returned success: false:', response.data);
        setError(response.data.message || 'Failed to fetch leave report');
      }
    } catch (error: any) {
      console.error('Error fetching leave report:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message || 
                          error.message || 
                          'Failed to fetch leave report';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (type: 'attendance' | 'leave') => {
    try {
      const params = new URLSearchParams();
      if (type === 'attendance') {
        if (attendanceFilters.startDate) params.append('startDate', attendanceFilters.startDate);
        if (attendanceFilters.endDate) params.append('endDate', attendanceFilters.endDate);
        if (attendanceFilters.department) params.append('department', attendanceFilters.department);
        if (attendanceFilters.employeeId) params.append('employeeId', attendanceFilters.employeeId);
      } else {
        if (leaveFilters.startDate) params.append('startDate', leaveFilters.startDate);
        if (leaveFilters.endDate) params.append('endDate', leaveFilters.endDate);
        if (leaveFilters.department) params.append('department', leaveFilters.department);
        if (leaveFilters.leaveType) params.append('leaveType', leaveFilters.leaveType);
        if (leaveFilters.status) params.append('status', leaveFilters.status);
      }

      const response = await api.get(`/reports/${type}/export?${params}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully!`);
    } catch (error: any) {
      setError(`Failed to export ${type} report`);
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      present: { color: 'success' as const, icon: <CheckCircle /> },
      absent: { color: 'error' as const, icon: <Cancel /> },
      late: { color: 'warning' as const, icon: <Warning /> },
      'half-day': { color: 'info' as const, icon: <Schedule /> },
      leave: { color: 'default' as const, icon: <EventNote /> },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.present;
    return (
      <Chip
        icon={config.icon}
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={config.color}
        size="small"
      />
    );
  };

  const getLeaveStatusChip = (status: string) => {
    const statusConfig = {
      pending: { color: 'warning' as const, icon: <Schedule /> },
      approved: { color: 'success' as const, icon: <CheckCircle /> },
      rejected: { color: 'error' as const, icon: <Cancel /> },
      cancelled: { color: 'default' as const, icon: <Warning /> },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Chip
        icon={config.icon}
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={config.color}
        size="small"
      />
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateAttendanceRate = (present: number, total: number) => {
    return total > 0 ? Math.round((present / total) * 100) : 0;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Reports & Analytics
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExportReport(tabValue === 0 ? 'attendance' : 'leave')}
              sx={{ mr: 1 }}
            >
              Export Report
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={tabValue === 0 ? fetchAttendanceReport : fetchLeaveReport}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="medium">
              {error}
            </Typography>
            {error.includes('authentication') && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Please log in again to access the reports.
              </Typography>
            )}
            {error.includes('permission') && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                You don't have permission to access this report. Contact your administrator.
              </Typography>
            )}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            aria-label="reports tabs"
          >
            <Tab
              icon={<Assessment />}
              label="Attendance Report"
              iconPosition="start"
            />
            <Tab
              icon={<EventNote />}
              label="Leave Report"
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Attendance Report Tab */}
        <TabPanel value={tabValue} index={0}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
                Loading attendance report...
              </Typography>
            </Box>
          )}
          
          {/* Attendance Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Attendance Report Filters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="Start Date"
                    value={attendanceFilters.startDate ? new Date(attendanceFilters.startDate) : null}
                    onChange={(date) =>
                      setAttendanceFilters({
                        ...attendanceFilters,
                        startDate: date ? date.toISOString().split('T')[0] : '',
                      })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="End Date"
                    value={attendanceFilters.endDate ? new Date(attendanceFilters.endDate) : null}
                    onChange={(date) =>
                      setAttendanceFilters({
                        ...attendanceFilters,
                        endDate: date ? date.toISOString().split('T')[0] : '',
                      })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={attendanceFilters.department}
                      label="Department"
                      onChange={(e) =>
                        setAttendanceFilters({ ...attendanceFilters, department: e.target.value })
                      }
                    >
                      <MenuItem value="">All Departments</MenuItem>
                      <MenuItem value="IT">IT</MenuItem>
                      <MenuItem value="HR">HR</MenuItem>
                      <MenuItem value="Finance">Finance</MenuItem>
                      <MenuItem value="Marketing">Marketing</MenuItem>
                      <MenuItem value="Sales">Sales</MenuItem>
                      <MenuItem value="Operations">Operations</MenuItem>
                      <MenuItem value="Management">Management</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Employee ID</InputLabel>
                    <Select
                      value={attendanceFilters.employeeId}
                      label="Employee ID"
                      onChange={(e) =>
                        setAttendanceFilters({ ...attendanceFilters, employeeId: e.target.value })
                      }
                    >
                      <MenuItem value="">All Employees</MenuItem>
                      {/* Assuming user.department is available or can be derived */}
                      {user?.department && (
                        <MenuItem value={user.department}>{user.department}</MenuItem>
                      )}
                      {/* Add other employees if needed */}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          {attendanceReport && (
            <>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary.main" gutterBottom>
                        {attendanceReport.summary.totalRecords}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Records
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main" gutterBottom>
                        {attendanceReport.summary.presentDays}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Present Days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main" gutterBottom>
                        {attendanceReport.summary.absentDays}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Absent Days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main" gutterBottom>
                        {attendanceReport.summary.averageHours.toFixed(1)}h
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average Hours
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Attendance Rate */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Attendance Rate
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ flex: 1, mr: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={calculateAttendanceRate(
                          attendanceReport.summary.presentDays,
                          attendanceReport.summary.totalRecords
                        )}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {calculateAttendanceRate(
                        attendanceReport.summary.presentDays,
                        attendanceReport.summary.totalRecords
                      )}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Attendance Details */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Attendance Details
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Employee</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Punch In</TableCell>
                          <TableCell>Punch Out</TableCell>
                          <TableCell>Total Hours</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Location</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {!attendanceReport ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography variant="body2" color="text.secondary">
                                Click "Refresh" to load attendance data
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : attendanceReport.attendance.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No attendance records found for the selected period
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          attendanceReport.attendance.map((attendance) => (
                            <TableRow key={attendance._id}>
                              <TableCell>
                                {typeof attendance.employee === 'object'
                                  ? `${attendance.employee.firstName} ${attendance.employee.lastName}`
                                  : attendance.employee}
                              </TableCell>
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
            </>
          )}
        </TabPanel>

        {/* Leave Report Tab */}
        <TabPanel value={tabValue} index={1}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
                Loading leave report...
              </Typography>
            </Box>
          )}
          
          {/* Leave Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leave Report Filters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="Start Date"
                    value={leaveFilters.startDate ? new Date(leaveFilters.startDate) : null}
                    onChange={(date) =>
                      setLeaveFilters({
                        ...leaveFilters,
                        startDate: date ? date.toISOString().split('T')[0] : '',
                      })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="End Date"
                    value={leaveFilters.endDate ? new Date(leaveFilters.endDate) : null}
                    onChange={(date) =>
                      setLeaveFilters({
                        ...leaveFilters,
                        endDate: date ? date.toISOString().split('T')[0] : '',
                      })
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={leaveFilters.department}
                      label="Department"
                      onChange={(e) =>
                        setLeaveFilters({ ...leaveFilters, department: e.target.value })
                      }
                    >
                      <MenuItem value="">All Departments</MenuItem>
                      <MenuItem value="IT">IT</MenuItem>
                      <MenuItem value="HR">HR</MenuItem>
                      <MenuItem value="Finance">Finance</MenuItem>
                      <MenuItem value="Marketing">Marketing</MenuItem>
                      <MenuItem value="Sales">Sales</MenuItem>
                      <MenuItem value="Operations">Operations</MenuItem>
                      <MenuItem value="Management">Management</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Leave Type</InputLabel>
                    <Select
                      value={leaveFilters.leaveType}
                      label="Leave Type"
                      onChange={(e) =>
                        setLeaveFilters({ ...leaveFilters, leaveType: e.target.value })
                      }
                    >
                      <MenuItem value="">All Types</MenuItem>
                      <MenuItem value="annual">Annual</MenuItem>
                      <MenuItem value="sick">Sick</MenuItem>
                      <MenuItem value="personal">Personal</MenuItem>
                      <MenuItem value="maternity">Maternity</MenuItem>
                      <MenuItem value="paternity">Paternity</MenuItem>
                      <MenuItem value="bereavement">Bereavement</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={leaveFilters.status}
                      label="Status"
                      onChange={(e) =>
                        setLeaveFilters({ ...leaveFilters, status: e.target.value })
                      }
                    >
                      <MenuItem value="">All Status</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Leave Summary */}
          {leaveReport && (
            <>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary.main" gutterBottom>
                        {leaveReport.summary.totalRequests}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Requests
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main" gutterBottom>
                        {leaveReport.summary.approvedRequests}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Approved
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main" gutterBottom>
                        {leaveReport.summary.pendingRequests}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main" gutterBottom>
                        {leaveReport.summary.totalDays}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Leave Details */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Leave Details
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Employee</TableCell>
                          <TableCell>Leave Type</TableCell>
                          <TableCell>Start Date</TableCell>
                          <TableCell>End Date</TableCell>
                          <TableCell>Days</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {!leaveReport ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography variant="body2" color="text.secondary">
                                Click "Refresh" to load leave data
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : leaveReport.leaves.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No leave records found for the selected period
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          leaveReport.leaves.map((leave) => (
                            <TableRow key={leave._id}>
                              <TableCell>
                                {typeof leave.employee === 'object'
                                  ? `${leave.employee.firstName} ${leave.employee.lastName}`
                                  : leave.employee}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}
                                  size="small"
                                  color="primary"
                                />
                              </TableCell>
                              <TableCell>{formatDate(leave.startDate)}</TableCell>
                              <TableCell>{formatDate(leave.endDate)}</TableCell>
                              <TableCell>{leave.totalDays}</TableCell>
                              <TableCell>{getLeaveStatusChip(leave.status)}</TableCell>
                              <TableCell>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                  {leave.reason}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabPanel>
      </Box>
    </LocalizationProvider>
  );
};

export default ReportsPage; 