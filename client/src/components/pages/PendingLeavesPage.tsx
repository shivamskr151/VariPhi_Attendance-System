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
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Refresh,
  FilterList,
  EventNote,
  Person,
  Schedule,
  Warning,
  PriorityHigh,
  TrendingUp,
  AccessTime,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { 
  getPendingLeaves, 
  approveLeave, 
  clearError 
} from '../../store/slices/leaveSlice';
import { Leave } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationSystem from '../common/NotificationSystem';

const PendingLeavesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { pendingLeaves, loading, error: leaveError } = useSelector((state: RootState) => state.leave);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingLeave, setProcessingLeave] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [previousCount, setPreviousCount] = useState(0);

  const { notifications, addNotification, removeNotification } = useNotifications();

  // Filters
  const [filters, setFilters] = useState({
    leaveType: '',
    priority: '',
    department: '',
  });

  useEffect(() => {
    if (user) {
      fetchPendingLeaves();
    }
  }, [dispatch, user, filters]);

  // Auto-refresh every 30 seconds for pending leaves
  useEffect(() => {
    if (!user) return;
    
    const refreshTimer = setInterval(() => {
      fetchPendingLeaves();
    }, 30 * 1000); // 30 seconds

    return () => clearInterval(refreshTimer);
  }, [user]);

  const fetchPendingLeaves = async () => {
    try {
      await dispatch(getPendingLeaves(filters)).unwrap();
      setLastRefresh(new Date());
      
      // Check for new leave requests
      if (previousCount > 0 && pendingLeaves.length > previousCount) {
        const newCount = pendingLeaves.length - previousCount;
        addNotification({
          type: 'info',
          title: 'New Leave Requests',
          message: `${newCount} new leave request${newCount > 1 ? 's' : ''} received.`,
          duration: 4000,
        });
      }
      setPreviousCount(pendingLeaves.length);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch pending leaves');
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    setProcessingLeave(leaveId);
    try {
      await dispatch(approveLeave({ id: leaveId, action: 'approve' })).unwrap();
      setSuccess('Leave request approved successfully!');
      addNotification({
        type: 'success',
        title: 'Leave Approved',
        message: 'Leave request has been approved successfully.',
        duration: 3000,
      });
      fetchPendingLeaves();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to approve leave request');
      addNotification({
        type: 'error',
        title: 'Approval Failed',
        message: 'Failed to approve leave request. Please try again.',
        duration: 5000,
      });
    } finally {
      setProcessingLeave(null);
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
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
      addNotification({
        type: 'warning',
        title: 'Leave Rejected',
        message: 'Leave request has been rejected.',
        duration: 3000,
      });
      fetchPendingLeaves();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to reject leave request');
      addNotification({
        type: 'error',
        title: 'Rejection Failed',
        message: 'Failed to reject leave request. Please try again.',
        duration: 5000,
      });
    } finally {
      setProcessingLeave(null);
    }
  };

  const openRejectDialog = (leave: Leave) => {
    setSelectedLeave(leave);
    setShowRejectDialog(true);
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      pending: { color: 'warning' as const, icon: <Warning /> },
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
        icon={priority === 'urgent' ? <PriorityHigh /> : undefined}
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

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEmployeeName = (employee: any) => {
    if (typeof employee === 'string') return 'Unknown Employee';
    if (!employee || typeof employee !== 'object') return 'Unknown Employee';
    return `${employee.firstName || 'Unknown'} ${employee.lastName || 'Employee'}`;
  };

  const getEmployeeId = (employee: any) => {
    if (typeof employee === 'string') return 'N/A';
    if (!employee || typeof employee !== 'object') return 'N/A';
    return employee.employeeId || 'N/A';
  };

  const getDepartment = (employee: any) => {
    if (typeof employee === 'string') return 'N/A';
    if (!employee || typeof employee !== 'object') return 'N/A';
    return employee.department || 'N/A';
  };

  const filteredLeaves = pendingLeaves.filter(leave => {
    if (filters.leaveType && leave.leaveType !== filters.leaveType) return false;
    if (filters.priority && leave.priority !== filters.priority) return false;
    if (filters.department && getDepartment(leave.employee) !== filters.department) return false;
    return true;
  });

  // Statistics calculations
  const getPendingStatistics = () => {
    const totalPending = pendingLeaves.length;
    const urgentRequests = pendingLeaves.filter(l => l.priority === 'urgent').length;
    const highPriorityRequests = pendingLeaves.filter(l => l.priority === 'high').length;
    const totalDays = pendingLeaves.reduce((sum, l) => sum + l.totalDays, 0);

    return {
      totalPending,
      urgentRequests,
      highPriorityRequests,
      totalDays,
    };
  };

  const stats = getPendingStatistics();

  if (loading && pendingLeaves.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Pending Leave Requests
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setFilters({ leaveType: '', priority: '', department: '' })}
          >
            Clear Filters
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchPendingLeaves}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
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
                    Total Pending
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {stats.totalPending}
                  </Typography>
                </Box>
                <EventNote color="warning" sx={{ fontSize: 40 }} />
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
                    Urgent Requests
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {stats.urgentRequests}
                  </Typography>
                </Box>
                <PriorityHigh color="error" sx={{ fontSize: 40 }} />
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
                    High Priority
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {stats.highPriorityRequests}
                  </Typography>
                </Box>
                <TrendingUp color="error" sx={{ fontSize: 40 }} />
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
                <Schedule color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Leave Type</InputLabel>
                <Select
                  value={filters.leaveType}
                  label="Leave Type"
                  onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  label="Priority"
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={filters.department}
                  label="Department"
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  <MenuItem value="Engineering">Engineering</MenuItem>
                  <MenuItem value="Marketing">Marketing</MenuItem>
                  <MenuItem value="Sales">Sales</MenuItem>
                  <MenuItem value="HR">HR</MenuItem>
                  <MenuItem value="Finance">Finance</MenuItem>
                  <MenuItem value="Operations">Operations</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  {filteredLeaves.length} pending request(s)
                </Typography>
                {loading && <CircularProgress size={16} />}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Pending Leaves Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Pending Requests
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
          {filteredLeaves.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <EventNote sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No pending leave requests
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All leave requests have been processed
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Leave Type</TableCell>
                    <TableCell>Dates</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Requested On</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLeaves.map((leave) => (
                    <TableRow key={leave._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                            <Person />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {getEmployeeName(leave.employee)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {getEmployeeId(leave.employee)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                        </Typography>
                        {leave.isHalfDay && (
                          <Typography variant="caption" color="text.secondary">
                            Half day ({leave.halfDayType})
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {leave.totalDays} day(s)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {getPriorityChip(leave.priority)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getDepartment(leave.employee)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDateTime(leave.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedLeave(leave);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Button
                            size="small"
                            color="success"
                            variant="contained"
                            disabled={processingLeave === leave._id}
                            onClick={() => handleApproveLeave(leave._id)}
                            startIcon={processingLeave === leave._id ? <CircularProgress size={16} /> : <CheckCircle />}
                          >
                            {processingLeave === leave._id ? 'Processing...' : 'Approve'}
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            disabled={processingLeave === leave._id}
                            onClick={() => openRejectDialog(leave)}
                            startIcon={<Cancel />}
                          >
                            Reject
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Leave Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Leave Request Details
          {selectedLeave && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Requested by {getEmployeeName(selectedLeave.employee)}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedLeave && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Employee Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Name:</strong> {getEmployeeName(selectedLeave.employee)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>ID:</strong> {getEmployeeId(selectedLeave.employee)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Department:</strong> {getDepartment(selectedLeave.employee)}
                  </Typography>
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Leave Details
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Type:</strong> {selectedLeave.leaveType.charAt(0).toUpperCase() + selectedLeave.leaveType.slice(1)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Duration:</strong> {selectedLeave.totalDays} day(s)
                  </Typography>
                  <Typography variant="body2">
                    <strong>Half Day:</strong> {selectedLeave.isHalfDay ? 'Yes' : 'No'}
                    {selectedLeave.isHalfDay && selectedLeave.halfDayType && ` (${selectedLeave.halfDayType})`}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Priority:</strong> {selectedLeave.priority.charAt(0).toUpperCase() + selectedLeave.priority.slice(1)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Dates
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Start Date:</strong> {formatDate(selectedLeave.startDate)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>End Date:</strong> {formatDate(selectedLeave.endDate)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Requested On:</strong> {formatDateTime(selectedLeave.createdAt)}
                  </Typography>
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Reason
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {selectedLeave.reason}
                </Typography>

                {selectedLeave.emergencyContact && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      Emergency Contact
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {selectedLeave.emergencyContact.name} - {selectedLeave.emergencyContact.phone}
                      <br />
                      Relationship: {selectedLeave.emergencyContact.relationship}
                    </Typography>
                  </>
                )}

                {selectedLeave.workHandover && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      Work Handover
                    </Typography>
                    <Typography variant="body2">
                      {selectedLeave.workHandover}
                    </Typography>
                  </>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
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
    </Box>
  );
};

export default PendingLeavesPage; 