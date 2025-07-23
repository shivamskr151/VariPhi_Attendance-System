import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { api } from '../../services/api';

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  role: string;
}

const AcceptInvitationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addNotification } = useNotifications();
  
  const [token, setToken] = useState<string>('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      verifyToken(tokenFromUrl);
    } else {
      setError('No invitation token found in URL');
      setVerifying(false);
    }
  }, [searchParams]);

  const verifyToken = async (invitationToken: string) => {
    try {
      setVerifying(true);
      const response = await api.get(`/invitations/verify/${invitationToken}`);
      setEmployee(response.data.data.employee);
      setError('');
    } catch (error: any) {
      console.error('Failed to verify invitation token:', error);
      setError(error.response?.data?.message || 'Invalid or expired invitation token');
    } finally {
      setVerifying(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors({
        ...formErrors,
        [field]: ''
      });
    }
  };

  const validateForm = (): boolean => {
    console.log('validateForm called');
    console.log('Current form data:', formData);
    
    const errors = {
      password: '',
      confirmPassword: ''
    };

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    console.log('Validation errors:', errors);
    setFormErrors(errors);
    const isValid = !errors.password && !errors.confirmPassword;
    console.log('Form is valid:', isValid);
    return isValid;
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called');
    console.log('Form data:', formData);
    console.log('Token:', token);
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Sending request to /invitations/accept');
      
      const response = await api.post('/invitations/accept', {
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });
      
      console.log('Response received:', response.data);

      addNotification({
        type: 'success',
        message: 'Account set up successfully! You can now log in.'
      });

      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      console.error('Error response:', error.response?.data);
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to set up account'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.50'
        }}
      >
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6">Verifying invitation...</Typography>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.50'
        }}
      >
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" color="error" gutterBottom>
            Invitation Error
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
          >
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!employee) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.50'
        }}
      >
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" color="error" gutterBottom>
            Invalid Invitation
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Unable to load invitation details.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
          >
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        p: 2
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 500, width: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Welcome to Attendance System
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Complete your account setup to get started
          </Typography>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Your Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Name
                </Typography>
                <Typography variant="body1">
                  {employee.firstName} {employee.lastName}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Employee ID
                </Typography>
                <Typography variant="body1">
                  {employee.employeeId}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {employee.email}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Department
                </Typography>
                <Typography variant="body1">
                  {employee.department}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Position
                </Typography>
                <Typography variant="body1">
                  {employee.position}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Role
                </Typography>
                <Chip 
                  label={employee.role} 
                  color={employee.role === 'admin' ? 'error' : employee.role === 'manager' ? 'warning' : 'default'}
                  size="small"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Divider sx={{ my: 3 }} />

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <Typography variant="h6" gutterBottom>
            Set Your Password
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Create a secure password for your account
          </Typography>

          <TextField
            fullWidth
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            error={!!formErrors.password}
            helperText={formErrors.password || 'Minimum 6 characters'}
            sx={{ mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            error={!!formErrors.confirmPassword}
            helperText={formErrors.confirmPassword}
            sx={{ mb: 3 }}
            required
          />

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              By setting up your account, you agree to use the Attendance System responsibly 
              and in accordance with company policies.
            </Typography>
          </Alert>

          <Button
            fullWidth
            variant="contained"
            size="large"
            type="submit"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <LockIcon />}
            sx={{ 
              '&:disabled': { 
                backgroundColor: 'grey.400',
                color: 'white'
              }
            }}
          >
            {submitting ? 'Setting up account...' : 'Complete Account Setup'}
          </Button>
        </form>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="textSecondary">
            Already have an account?{' '}
            <Button
              variant="text"
              size="small"
              onClick={() => navigate('/login')}
            >
              Sign in here
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default AcceptInvitationPage; 