import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useNotifications } from '../../hooks/useNotifications';
import { api } from '../../services/api';
import { SelectChangeEvent } from '@mui/material';

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  role: string;
  invitationExpires?: string;
  invitationAccepted: boolean;
}

interface InvitationFormData {
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  role: string;
  phone: string;
}

const InvitationManagementPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { addNotification } = useNotifications();
  
  const [invitations, setInvitations] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [formData, setFormData] = useState<InvitationFormData>({
    email: '',
    firstName: '',
    lastName: '',
    department: '',
    position: '',
    role: 'employee',
    phone: ''
  });
  const [bulkData, setBulkData] = useState<string>('');
  const [errors, setErrors] = useState<Partial<InvitationFormData>>({});

  const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Management'];
  const roles = ['employee', 'manager', 'admin'];

  useEffect(() => {
    fetchPendingInvitations();
    
    // Set up periodic refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchPendingInvitations();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  const fetchPendingInvitations = async () => {
    try {
      setLoading(true);
      // Add timestamp to prevent caching
      const response = await api.get(`/invitations/pending?t=${Date.now()}`);
      setInvitations(response.data.data.invitations);
      setLastUpdated(new Date());
      
      // Log invitation counts for debugging
      console.log('Invitations loaded:', {
        total: response.data.data.totalCount,
        active: response.data.data.activeCount,
        expired: response.data.data.expiredCount
      });
    } catch (error) {
      console.error('Failed to fetch pending invitations:', error);
      addNotification({ type: 'error', message: 'Failed to fetch pending invitations' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof InvitationFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [field]: event.target.value as string
    });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: undefined
      });
    }
  };

  const handleSelectChange = (field: keyof InvitationFormData) => (
    event: SelectChangeEvent<string>
  ) => {
    setFormData({
      ...formData,
      [field]: event.target.value as string
    });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: undefined
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<InvitationFormData> = {};

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.position) newErrors.position = 'Position is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSending(true);
      const response = await api.post('/invitations/send', formData);
      
      const message = response.data.data.emailStatus === 'skipped' 
        ? 'Employee created successfully, but email invitation was not sent (email not configured)'
        : response.data.data.emailStatus === 'failed'
        ? 'Employee created successfully, but email invitation failed to send'
        : 'Invitation sent successfully!';
      
      addNotification({ type: 'success', message });
      setDialogOpen(false);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        department: '',
        position: '',
        role: 'employee',
        phone: ''
      });
      fetchPendingInvitations();
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to send invitation'
      });
    } finally {
      setSending(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkData.trim()) {
      addNotification({ type: 'error', message: 'Please enter employee data' });
      return;
    }

    try {
      setSending(true);
      
      // Parse CSV-like data
      const lines = bulkData.trim().split('\n');
      const employees = lines.map(line => {
        const [email, firstName, lastName, department, position, role = 'employee', phone = ''] = 
          line.split(',').map(field => field.trim());
        
        return { email, firstName, lastName, department, position, role, phone };
      }).filter(emp => emp.email && emp.firstName && emp.lastName && emp.department && emp.position);

      if (employees.length === 0) {
        addNotification({ type: 'error', message: 'No valid employee data found' });
        return;
      }

      const response = await api.post('/invitations/send-bulk', { employees });
      
      const { successful, failed } = response.data.data;
      // Check if any emails were skipped or failed
      const skippedEmails = successful.filter((s: any) => s.emailStatus === 'skipped').length;
      const failedEmails = successful.filter((s: any) => s.emailStatus === 'failed').length;
      const sentEmails = successful.filter((s: any) => s.emailStatus !== 'skipped' && s.emailStatus !== 'failed').length;
      
      let message = `Created ${successful.length} employees successfully`;
      if (sentEmails > 0) message += `, ${sentEmails} invitations sent`;
      if (skippedEmails > 0) message += `, ${skippedEmails} emails skipped (not configured)`;
      if (failedEmails > 0) message += `, ${failedEmails} emails failed`;
      if (failed.length > 0) message += `, ${failed.length} employees failed`;
      
      addNotification({
        type: 'success',
        message
      });
      
      setBulkDialogOpen(false);
      setBulkData('');
      fetchPendingInvitations();
    } catch (error: any) {
      console.error('Failed to send bulk invitations:', error);
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to send bulk invitations'
      });
    } finally {
      setSending(false);
    }
  };

  const handleResendInvitation = async (employeeId: string) => {
    try {
      const response = await api.post(`/invitations/resend/${employeeId}`);
      const message = response.data.data.emailStatus === 'skipped' 
        ? 'Invitation updated successfully, but email was not sent (email not configured)'
        : response.data.data.emailStatus === 'failed'
        ? 'Invitation updated successfully, but email failed to send'
        : 'Invitation resent successfully!';
      
      addNotification({ type: 'success', message });
      fetchPendingInvitations();
    } catch (error: any) {
      console.error('Failed to resend invitation:', error);
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to resend invitation'
      });
    }
  };

  const handleDeleteInvitation = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this invitation? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/invitations/${employeeId}`);
      addNotification({ type: 'success', message: 'Invitation deleted successfully' });
      fetchPendingInvitations();
    } catch (error: any) {
      console.error('Failed to delete invitation:', error);
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete invitation'
      });
    }
  };



  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return 'No expiry set';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const isExpired = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Invitation Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Send Invitation
          </Button>
          <Button
            variant="outlined"
            startIcon={<EmailIcon />}
            onClick={() => setBulkDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Bulk Invite
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6">
              Pending Invitations ({invitations.length})
            </Typography>
            {lastUpdated && (
              <Typography variant="caption" color="textSecondary">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Typography>
            )}
          </Box>

        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : invitations.length === 0 ? (
          <Alert severity="info">
            No pending invitations found.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation._id}>
                    <TableCell>
                      {invitation.firstName} {invitation.lastName}
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        {invitation.employeeId}
                      </Typography>
                    </TableCell>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>{invitation.department}</TableCell>
                    <TableCell>{invitation.position}</TableCell>
                    <TableCell>
                      <Chip 
                        label={invitation.role} 
                        size="small" 
                        color={invitation.role === 'admin' ? 'error' : invitation.role === 'manager' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {isExpired(invitation.invitationExpires) ? (
                          <ScheduleIcon color="error" sx={{ mr: 1 }} />
                        ) : (
                          <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                        )}
                        {formatExpiryDate(invitation.invitationExpires)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {invitation.invitationAccepted ? (
                        <Chip label="Accepted" color="success" size="small" />
                      ) : isExpired(invitation.invitationExpires) ? (
                        <Chip label="Expired" color="error" size="small" />
                      ) : (
                        <Chip label="Pending" color="warning" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Resend invitation">
                          <IconButton
                            onClick={() => handleResendInvitation(invitation._id)}
                            disabled={invitation.invitationAccepted}
                            size="small"
                          >
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete invitation">
                          <IconButton
                            onClick={() => handleDeleteInvitation(invitation._id)}
                            disabled={invitation.invitationAccepted}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Single Invitation Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Invitation</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                error={!!errors.firstName}
                helperText={errors.firstName}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                error={!!errors.lastName}
                helperText={errors.lastName}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                error={!!errors.email}
                helperText={errors.email}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone (Optional)"
                value={formData.phone}
                onChange={handleInputChange('phone')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!errors.department}>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department}
                  onChange={handleSelectChange('department')}
                  label="Department"
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Position"
                value={formData.position}
                onChange={handleInputChange('position')}
                error={!!errors.position}
                helperText={errors.position}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  onChange={handleSelectChange('role')}
                  label="Role"
                >
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>{role}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={sending}
            startIcon={sending ? <CircularProgress size={20} /> : <EmailIcon />}
          >
            {sending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Invitation Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Bulk Send Invitations</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Enter employee data in CSV format: email, firstName, lastName, department, position, role (optional), phone (optional)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={10}
            label="Employee Data"
            value={bulkData}
            onChange={(e) => setBulkData(e.target.value)}
            placeholder="john.doe@company.com, John, Doe, IT, Developer, employee, +1234567890&#10;jane.smith@company.com, Jane, Smith, HR, Manager, manager, +1234567891"
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkSubmit} 
            variant="contained" 
            disabled={sending}
            startIcon={sending ? <CircularProgress size={20} /> : <EmailIcon />}
          >
            {sending ? 'Sending...' : 'Send Bulk Invitations'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvitationManagementPage; 