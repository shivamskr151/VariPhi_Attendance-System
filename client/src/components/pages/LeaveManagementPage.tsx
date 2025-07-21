import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Fab,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  IconButton,
} from '@mui/material';
import {
  Add,
  Refresh,
  FilterList,
  ExpandMore,
  EventNote,
  CheckCircle,
  Cancel,
  Pending,
  Warning,
  TrendingUp,
  TrendingDown,
  CalendarToday,
  AccessTime,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { 
  getLeaveHistory, 
  requestLeave, 
  approveLeave, 
  clearError 
} from '../../store/slices/leaveSlice';
import { getCurrentEmployee } from '../../store/slices/employeeSlice';
import { Leave, LeaveRequestForm, LeaveFilter } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

const LeaveManagementPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { leaves, loading, error: leaveError } = useSelector((state: RootState) => state.leave);
  const { currentEmployee, loading: employeeLoading } = useSelector((state: RootState) => state.employee);

  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingLeave, setProcessingLeave] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Filter states
  const [filters, setFilters] = useState<LeaveFilter>({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: '',
    leaveType: '',
  });

  // Form states
  const [leaveForm, setLeaveForm] = useState<LeaveRequestForm>({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayType: 'morning',
    priority: 'medium',
  });

  useEffect(() => {
    if (user) {
      fetchLeaves();
      dispatch(getCurrentEmployee());
    }
  }, [dispatch, user, filters]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!user) return;
    
    const refreshTimer = setInterval(() => {
      fetchLeaves();
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(refreshTimer);
  }, [user]);

  const fetchLeaves = async () => {
    try {
      await dispatch(getLeaveHistory(filters)).unwrap();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  };

  const handleSubmitLeaveRequest = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      dispatch(clearError());
      return;
    }

    // Validate reason length
    if (leaveForm.reason.length < 10) {
      dispatch(clearError());
      return;
    }

    // Validate dates
    const startDate = new Date(leaveForm.startDate);
    const endDate = new Date(leaveForm.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      dispatch(clearError());
      return;
    }

    if (endDate < startDate) {
      dispatch(clearError());
      return;
    }

    // Check for overlapping leaves
    if (checkForOverlappingLeaves(leaveForm.startDate, leaveForm.endDate)) {
      dispatch(clearError());
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(requestLeave(leaveForm)).unwrap();
      setSuccess('Leave request submitted successfully!');
      setShowRequestDialog(false);
      resetForm();
      fetchLeaves();
    } catch (error: any) {
      console.error('Leave request error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    setProcessingLeave(leaveId);
    try {
      await dispatch(approveLeave({ id: leaveId, action: 'approve' })).unwrap();
      setSuccess('Leave request approved successfully!');
      fetchLeaves();
    } catch (error: any) {
      console.error('Error approving leave:', error);
    } finally {
      setProcessingLeave(null);
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    if (!rejectionReason.trim()) {
      return;
    }

    setProcessingLeave(leaveId);
    try {
      await dispatch(approveLeave({ 
        id: leaveId, 
        action: 'reject', 
        rejectionReason: rejectionReason.trim() 
      })).unwrap();
      setSuccess('Leave request rejected successfully!');
      setShowRejectDialog(false);
      setRejectionReason('');
      fetchLeaves();
    } catch (error: any) {
      console.error('Error rejecting leave:', error);
    } finally {
      setProcessingLeave(null);
    }
  };

  const openRejectDialog = (leave: Leave) => {
    setSelectedLeave(leave);
    setShowRejectDialog(true);
  };

  const resetForm = () => {
    setLeaveForm({
      leaveType: 'annual',
      startDate: '',
      endDate: '',
      reason: '',
      isHalfDay: false,
      halfDayType: 'morning',
      priority: 'medium',
    });
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      pending: { color: 'warning', icon: <Pending /> },
      approved: { color: 'success', icon: <CheckCircle /> },
      rejected: { color: 'error', icon: <Cancel /> },
      cancelled: { color: 'default', icon: <Warning /> },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Chip
        icon={config.icon}
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={config.color as any}
        size="small"
      />
    );
  };

  const getPriorityChip = (priority: string) => {
    const priorityConfig = {
      low: { color: 'success' as const },
      medium: { color: 'warning' as const },
      high: { color: 'error' as const },
      urgent: { color: 'error' as const },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return (
      <Chip
        label={priority.charAt(0).toUpperCase() + priority.slice(1)}
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

  const canApprove = (leave: Leave) => {
    return user?.role === 'admin' || user?.role === 'manager';
  };

  const checkForOverlappingLeaves = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return leaves.some(leave => {
      if (leave.status === 'cancelled' || leave.status === 'rejected') {
        return false;
      }
      
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      
      return (start <= leaveEnd && end >= leaveStart);
    });
  };

  // Statistics calculations
  const getLeaveStatistics = () => {
    const totalLeaves = leaves.length;
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
    const approvedLeaves = leaves.filter(l => l.status === 'approved').length;
    const rejectedLeaves = leaves.filter(l => l.status === 'rejected').length;
    const totalDays = leaves.reduce((sum, l) => sum + l.totalDays, 0);
    const approvedDays = leaves
      .filter(l => l.status === 'approved')
      .reduce((sum, l) => sum + l.totalDays, 0);

    return {
      totalLeaves,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      totalDays,
      approvedDays,
      approvalRate: totalLeaves > 0 ? (approvedLeaves / totalLeaves) * 100 : 0,
    };
  };

  const stats = getLeaveStatistics();
  const leaveBalance = currentEmployee?.leaveBalance || {
    annual: 0,
    sick: 0,
    personal: 0,
    maternity: 0,
    paternity: 0,
  };

  if (loading && leaves.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Leave Management
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchLeaves}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowRequestDialog(true)}
            >
              Request Leave
            </Button>
          </Box>
        </Box>

        {leaveError && (
          <Alert severity="error" onClose={() => dispatch(clearError())} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="medium">
              {leaveError}
            </Typography>
            {leaveError.includes('overlapping') && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Please check your existing leave requests and choose different dates.
              </Typography>
            )}
            {leaveError.includes('Insufficient') && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Please check your leave balance or contact HR for assistance.
              </Typography>
            )}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Statistics Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Requests
                    </Typography>
                    <Typography variant="h4" component="h2">
                      {stats.totalLeaves}
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
                      Pending
                    </Typography>
                    <Typography variant="h4" component="h2">
                      {stats.pendingLeaves}
                    </Typography>
                  </Box>
                  <Pending color="warning" sx={{ fontSize: 40 }} />
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
                      Approval Rate
                    </Typography>
                    <Typography variant="h4" component="h2">
                      {stats.approvalRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <TrendingUp color="success" sx={{ fontSize: 40 }} />
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
                      Total Days
                    </Typography>
                    <Typography variant="h4" component="h2">
                      {stats.totalDays}
                    </Typography>
                  </Box>
                  <CalendarToday color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Leave Balance Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Leave Balance
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="primary.contrastText">
                    {leaveBalance.annual}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    Annual Leave
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="warning.contrastText">
                    {leaveBalance.sick}
                  </Typography>
                  <Typography variant="body2" color="warning.contrastText">
                    Sick Leave
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="info.contrastText">
                    {leaveBalance.personal}
                  </Typography>
                  <Typography variant="body2" color="info.contrastText">
                    Personal Leave
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="success.contrastText">
                    {leaveBalance.maternity}
                  </Typography>
                  <Typography variant="body2" color="success.contrastText">
                    Maternity Leave
                  </Typography>
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
              <Grid item xs={12} md={2}>
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
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Leave Type</InputLabel>
                  <Select
                    value={filters.leaveType}
                    label="Leave Type"
                    onChange={(e) =>
                      setFilters({ ...filters, leaveType: e.target.value })
                    }
                  >
                    <MenuItem value="">All</MenuItem>
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
                <Button
                  variant="outlined"
                  onClick={() =>
                    setFilters({
                      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0],
                      endDate: new Date().toISOString().split('T')[0],
                      status: '',
                      leaveType: '',
                    })
                  }
                  fullWidth
                >
                  Reset
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Leave History */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Leave History
              </Typography>
              {loading && (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Updating...
                  </Typography>
                </Box>
              )}
            </Box>
            {leaves.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <EventNote sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No leave requests found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Start by requesting a leave or adjust your filters
                </Typography>
              </Box>
            ) : (
              leaves.map((leave) => (
                <Accordion key={leave._id} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item xs={12} sm={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <EventNote sx={{ mr: 1 }} />
                          <Typography variant="subtitle1">
                            {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <Typography variant="body2">
                          {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <Typography variant="body2">
                          {leave.totalDays} day(s)
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        {getStatusChip(leave.status)}
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        {getPriorityChip(leave.priority)}
                      </Grid>
                      <Grid item xs={12} sm={1}>
                        {canApprove(leave) && leave.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              color="success"
                              disabled={processingLeave === leave._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveLeave(leave._id);
                              }}
                            >
                              {processingLeave === leave._id ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              disabled={processingLeave === leave._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openRejectDialog(leave);
                              }}
                            >
                              Reject
                            </Button>
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Reason
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {leave.reason}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Details
                        </Typography>
                        <Box>
                          <Typography variant="body2">
                            <strong>Half Day:</strong> {leave.isHalfDay ? 'Yes' : 'No'}
                            {leave.isHalfDay && leave.halfDayType && ` (${leave.halfDayType})`}
                          </Typography>
                          {leave.emergencyContact && (
                            <Typography variant="body2">
                              <strong>Emergency Contact:</strong> {leave.emergencyContact.name} - {leave.emergencyContact.phone}
                            </Typography>
                          )}
                          {leave.workHandover && (
                            <Typography variant="body2">
                              <strong>Work Handover:</strong> {leave.workHandover}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </CardContent>
        </Card>

        {/* Leave Request Dialog */}
        <Dialog
          open={showRequestDialog}
          onClose={() => setShowRequestDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Request Leave
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Please ensure your dates don't conflict with existing leave requests
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Leave Type</InputLabel>
                  <Select
                    value={leaveForm.leaveType}
                    label="Leave Type"
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, leaveType: e.target.value as any })
                    }
                  >
                    <MenuItem value="annual">Annual Leave ({user?.leaveBalance?.annual || 0} days available)</MenuItem>
                    <MenuItem value="sick">Sick Leave ({user?.leaveBalance?.sick || 0} days available)</MenuItem>
                    <MenuItem value="personal">Personal Leave ({user?.leaveBalance?.personal || 0} days available)</MenuItem>
                    <MenuItem value="maternity">Maternity Leave ({user?.leaveBalance?.maternity || 0} days available)</MenuItem>
                    <MenuItem value="paternity">Paternity Leave ({user?.leaveBalance?.paternity || 0} days available)</MenuItem>
                    <MenuItem value="bereavement">Bereavement Leave</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={leaveForm.priority}
                    label="Priority"
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, priority: e.target.value as any })
                    }
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Start Date"
                  value={leaveForm.startDate ? new Date(leaveForm.startDate) : null}
                  onChange={(date) =>
                    setLeaveForm({
                      ...leaveForm,
                      startDate: date ? date.toISOString().split('T')[0] : '',
                    })
                  }
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="End Date"
                  value={leaveForm.endDate ? new Date(leaveForm.endDate) : null}
                  onChange={(date) =>
                    setLeaveForm({
                      ...leaveForm,
                      endDate: date ? date.toISOString().split('T')[0] : '',
                    })
                  }
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={leaveForm.isHalfDay}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, isHalfDay: e.target.checked })
                      }
                    />
                  }
                  label="Half Day"
                />
              </Grid>
              {leaveForm.isHalfDay && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Half Day Type</InputLabel>
                    <Select
                      value={leaveForm.halfDayType}
                      label="Half Day Type"
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, halfDayType: e.target.value as any })
                      }
                    >
                      <MenuItem value="morning">Morning</MenuItem>
                      <MenuItem value="afternoon">Afternoon</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Reason"
                  value={leaveForm.reason}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, reason: e.target.value })
                  }
                  required
                  helperText={`${leaveForm.reason.length}/10 characters minimum`}
                  error={leaveForm.reason.length > 0 && leaveForm.reason.length < 10}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Work Handover (Optional)"
                  value={leaveForm.workHandover || ''}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, workHandover: e.target.value })
                  }
                  placeholder="Describe any pending work or handover responsibilities"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitLeaveRequest}
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={20} /> : 'Submit Request'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reject Leave Dialog */}
        <Dialog
          open={showRejectDialog}
          onClose={() => setShowRejectDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Reject Leave Request</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Please provide a reason for rejecting this leave request:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              error={!rejectionReason.trim()}
              helperText={!rejectionReason.trim() ? 'Rejection reason is required' : ''}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => selectedLeave && handleRejectLeave(selectedLeave._id)}
              disabled={!rejectionReason.trim() || processingLeave === selectedLeave?._id}
            >
              {processingLeave === selectedLeave?._id ? 'Processing...' : 'Reject'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Floating Action Button */}
        <Tooltip title="Request Leave">
          <Fab
            color="primary"
            aria-label="request leave"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setShowRequestDialog(true)}
          >
            <Add />
          </Fab>
        </Tooltip>
      </Box>
    </LocalizationProvider>
  );
};

export default LeaveManagementPage; 