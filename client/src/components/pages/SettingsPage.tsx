import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Person,
  Security,
  Notifications,
  Settings,
  Edit,
  Save,
  Cancel,
  Visibility,
  VisibilityOff,
  Email,
  Phone,
  LocationOn,
  Work,
  CalendarToday,
  Lock,
  NotificationsActive,
  Language,
  Palette,
  Download,
  Upload,
  Delete,
  ExpandMore,
  PhotoCamera,
  CheckCircle,
  Warning,
  Info,
  Schedule,
  EventNote,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { updateProfilePicture, checkAuthStatus, changePassword } from '../../store/slices/authSlice';
import { User } from '../../types';
import { api } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import { authAPI } from '../../services/api';
import PreferencesPanel from '../common/PreferencesPanel';
import { PREFERENCE_CATEGORIES, PREFERENCE_FIELDS, DEFAULT_PREFERENCES } from '../../config/preferencesConfig';
import { UserPreferences } from '../../types';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const SettingsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useAppDispatch();

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Profile States
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      zipCode: user?.address?.zipCode || '',
      country: user?.address?.country || '',
    },
    emergencyContact: {
      name: user?.emergencyContact?.name || '',
      relationship: user?.emergencyContact?.relationship || '',
      phone: user?.emergencyContact?.phone || '',
    },
  });

  // Security States
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Preferences States
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    // Initialize with default preferences and merge with user preferences if available
    const userPrefs = (user as any)?.preferences || {};
    return { ...DEFAULT_PREFERENCES, ...userPrefs };
  });
  const [showAdvancedPreferences, setShowAdvancedPreferences] = useState(false);

  // Account States
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<null | { qrCodeDataURL: string; secret: string }>(null);
  const [twoFactorStep, setTwoFactorStep] = useState<'idle' | 'setup' | 'verify' | 'disabling'>('idle');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || '',
        },
        emergencyContact: {
          name: user.emergencyContact?.name || '',
          relationship: user.emergencyContact?.relationship || '',
          phone: user.emergencyContact?.phone || '',
        },
      });

      // Update preferences when user data changes
      const userPrefs = (user as any)?.preferences || {};
      setPreferences(prev => ({ ...prev, ...userPrefs }));
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const response = await api.put('/users/profile', profileForm);
      if (response.data.success) {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (securityForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await dispatch(changePassword({
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword,
      })).unwrap();
      
      setSuccess('Password changed successfully!');
      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      setError(error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    setLoading(true);
    try {
      const response = await api.put('/users/preferences', preferences);
      if (response.data.success) {
        setSuccess('Preferences updated successfully!');
        // Refresh user data to get updated preferences
        dispatch(checkAuthStatus());
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update preferences';
      const validationErrors = error.response?.data?.errors;
      
      if (validationErrors && Array.isArray(validationErrors)) {
        setError(`Validation errors: ${validationErrors.join(', ')}`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesChange = (newPreferences: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  const handleResetPreferences = async (categories?: string[]) => {
    setLoading(true);
    try {
      const response = await api.post('/users/preferences/reset', { categories });
      if (response.data.success) {
        setPreferences(response.data.data.preferences);
        setSuccess('Preferences reset successfully!');
        dispatch(checkAuthStatus());
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to reset preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await api.get('/users/export-data', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user-data-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess('Data exported successfully!');
    } catch (error: any) {
      setError('Failed to export data');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion');
      return;
    }

    setLoading(true);
    try {
      const response = await api.delete('/users/account');
      if (response.data.success) {
        setSuccess('Account deleted successfully!');
        // Redirect to login or handle logout
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('profilePicture', file);

    setLoading(true);
    try {
      const response = await api.put('/users/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.data.success) {
        setSuccess('Profile picture updated successfully!');
        // Update the user state with new profile picture
        if (response.data.data?.profilePicture) {
          dispatch(updateProfilePicture(response.data.data.profilePicture));
          // Refresh user data to ensure consistency
          dispatch(checkAuthStatus());
        }
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!user?.profilePicture) return;

    if (!window.confirm('Are you sure you want to delete your profile picture?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.delete('/users/profile-picture');
      if (response.data.success) {
        setSuccess('Profile picture deleted successfully!');
        dispatch(updateProfilePicture(''));
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleStart2FASetup = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const res = await authAPI.setup2FA();
      setTwoFactorSetup(res.data.data);
      setTwoFactorStep('setup');
    } catch (e: any) {
      setTwoFactorError(e.response?.data?.message || 'Failed to start 2FA setup');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FASetup = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      await authAPI.verify2FASetup(twoFactorCode);
      setTwoFactorEnabled(true);
      setTwoFactorStep('idle');
      setTwoFactorSuccess('Two-Factor Authentication enabled!');
      setTwoFactorSetup(null);
      setTwoFactorCode('');
    } catch (e: any) {
      setTwoFactorError(e.response?.data?.message || 'Invalid 2FA code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      await authAPI.disable2FA(twoFactorCode);
      setTwoFactorEnabled(false);
      setTwoFactorStep('idle');
      setTwoFactorSuccess('Two-Factor Authentication disabled.');
      setTwoFactorCode('');
    } catch (e: any) {
      setTwoFactorError(e.response?.data?.message || 'Invalid 2FA code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Debug: Log user data
  console.log('SettingsPage - User data:', user);
  console.log('SettingsPage - Profile picture URL:', user?.profilePicture ? `http://localhost:5001${user.profilePicture}` : 'No profile picture');

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Button
          variant="outlined"
          onClick={() => dispatch(checkAuthStatus())}
          disabled={loading}
        >
          Refresh Profile
        </Button>
      </Box>

      {error && <ErrorAlert error={error} onClose={() => setError(null)} />}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Profile Overview Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ position: 'relative', mr: 3 }}>
              <Avatar
                sx={{ width: 80, height: 80 }}
                src={user?.profilePicture ? `http://localhost:5001/api/users/profile-picture/${user.profilePicture.split('/').pop()}` : undefined}
                onError={(e) => {
                  console.error('Failed to load profile picture:', user?.profilePicture);
                  console.error('Full URL:', `http://localhost:5001/api/users/profile-picture/${user?.profilePicture?.split('/').pop()}`);
                }}
              >
                {getInitials(user?.firstName || '', user?.lastName || '')}
              </Avatar>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="profile-picture-upload"
                type="file"
                onChange={handleProfilePictureUpload}
                aria-label="Upload profile picture"
                title="Upload profile picture"
              />
              <label htmlFor="profile-picture-upload">
                <IconButton
                  component="span"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                  size="small"
                >
                  <PhotoCamera />
                </IconButton>
              </label>
              {user?.profilePicture && (
                <IconButton
                  onClick={handleDeleteProfilePicture}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'error.dark' },
                  }}
                  size="small"
                >
                  <Delete />
                </IconButton>
              )}
            </Box>
            <Box>
              <Typography variant="h5">
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {user?.position} • {user?.department}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Employee ID: {user?.employeeId}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="settings tabs"
        >
          <Tab
            icon={<Person />}
            label="Profile"
            iconPosition="start"
          />
          <Tab
            icon={<Security />}
            label="Security"
            iconPosition="start"
          />
          <Tab
            icon={<Notifications />}
            label="Preferences"
            iconPosition="start"
          />
          <Tab
            icon={<Settings />}
            label="Account"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Profile Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Profile Information</Typography>
          <Box>
            {isEditing ? (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={() => setIsEditing(false)}
                  sx={{ mr: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleUpdateProfile}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={20} /> : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Personal Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profileForm.firstName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, firstName: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profileForm.lastName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, lastName: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, email: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, phone: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Address Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Street Address"
                      value={profileForm.address.street}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, street: e.target.value },
                        })
                      }
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="City"
                      value={profileForm.address.city}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, city: e.target.value },
                        })
                      }
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="State"
                      value={profileForm.address.state}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, state: e.target.value },
                        })
                      }
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="ZIP Code"
                      value={profileForm.address.zipCode}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, zipCode: e.target.value },
                        })
                      }
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Country"
                      value={profileForm.address.country}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, country: e.target.value },
                        })
                      }
                      disabled={!isEditing}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Emergency Contact
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Contact Name"
                      value={profileForm.emergencyContact.name}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          emergencyContact: { ...profileForm.emergencyContact, name: e.target.value },
                        })
                      }
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Relationship"
                      value={profileForm.emergencyContact.relationship}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          emergencyContact: { ...profileForm.emergencyContact, relationship: e.target.value },
                        })
                      }
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Contact Phone"
                      value={profileForm.emergencyContact.phone}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          emergencyContact: { ...profileForm.emergencyContact, phone: e.target.value },
                        })
                      }
                      disabled={!isEditing}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Security Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Security Settings
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Change Password
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Current Password"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={securityForm.currentPassword}
                      onChange={(e) =>
                        setSecurityForm({ ...securityForm, currentPassword: e.target.value })
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                              }
                            >
                              {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="New Password"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={securityForm.newPassword}
                      onChange={(e) =>
                        setSecurityForm({ ...securityForm, newPassword: e.target.value })
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                              }
                            >
                              {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Confirm New Password"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={securityForm.confirmPassword}
                      onChange={(e) =>
                        setSecurityForm({ ...securityForm, confirmPassword: e.target.value })
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                              }
                            >
                              {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<Lock />}
                      onClick={handleChangePassword}
                      disabled={loading}
                      fullWidth
                    >
                      {loading ? <CircularProgress size={20} /> : 'Change Password'}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 2FA Section in Security Tab */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Two-Factor Authentication
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </Typography>
                {twoFactorSuccess && <Alert severity="success" sx={{ mb: 2 }}>{twoFactorSuccess}</Alert>}
                {twoFactorError && <Alert severity="error" sx={{ mb: 2 }}>{twoFactorError}</Alert>}
                {twoFactorEnabled ? (
                  <>
                    <Alert severity="success" sx={{ mb: 2 }}>2FA is enabled on your account.</Alert>
                    {twoFactorStep === 'disabling' ? (
                      <>
                        <TextField
                          label="Enter 2FA code to disable"
                          value={twoFactorCode}
                          onChange={e => setTwoFactorCode(e.target.value)}
                          fullWidth
                          sx={{ mb: 2 }}
                        />
                        <Button
                          variant="contained"
                          color="error"
                          onClick={handleDisable2FA}
                          disabled={twoFactorLoading}
                        >
                          {twoFactorLoading ? <CircularProgress size={20} /> : 'Disable 2FA'}
                        </Button>
                        <Button
                          variant="text"
                          onClick={() => { setTwoFactorStep('idle'); setTwoFactorCode(''); }}
                          sx={{ ml: 2 }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => { setTwoFactorStep('disabling'); setTwoFactorCode(''); }}
                      >
                        Disable 2FA
                      </Button>
                    )}
                  </>
                ) : twoFactorStep === 'setup' && twoFactorSetup ? (
                  <>
                    <Typography gutterBottom>Scan this QR code with your authenticator app:</Typography>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <img src={twoFactorSetup.qrCodeDataURL} alt="2FA QR Code" style={{ maxWidth: 200 }} />
                    </Box>
                    <TextField
                      label="Enter 6-digit code from app"
                      value={twoFactorCode}
                      onChange={e => setTwoFactorCode(e.target.value)}
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleVerify2FASetup}
                      disabled={twoFactorLoading}
                    >
                      {twoFactorLoading ? <CircularProgress size={20} /> : 'Verify & Enable 2FA'}
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => { setTwoFactorStep('idle'); setTwoFactorSetup(null); setTwoFactorCode(''); }}
                      sx={{ ml: 2 }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<Security />}
                    onClick={handleStart2FASetup}
                    disabled={twoFactorLoading}
                  >
                    {twoFactorLoading ? <CircularProgress size={20} /> : 'Enable 2FA'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Preferences Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Preferences</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showAdvancedPreferences}
                  onChange={(e) => setShowAdvancedPreferences(e.target.checked)}
                  size="small"
                />
              }
              label="Show Advanced"
              sx={{ mr: 2 }}
            />
            <Button
              variant="outlined"
              onClick={() => handleResetPreferences()}
              disabled={loading}
              size="small"
            >
              Reset All
            </Button>
          </Box>
        </Box>

        <PreferencesPanel
          preferences={preferences}
          onPreferencesChange={handlePreferencesChange}
          onSave={handleUpdatePreferences}
          loading={loading}
          error={error}
          success={success}
          categories={PREFERENCE_CATEGORIES}
          fields={PREFERENCE_FIELDS}
          showAdvanced={showAdvancedPreferences}
        />
      </TabPanel>

      {/* Account Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" gutterBottom>
          Account Management
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Data Export
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Download a copy of your personal data including attendance records, leave history, and profile information.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleExportData}
                >
                  Export My Data
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Account Deletion
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Account Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Account Created
                    </Typography>
                    <Typography variant="body1">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Last Login
                    </Typography>
                    <Typography variant="body1">
                      {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Email Verified
                    </Typography>
                    <Typography variant="body1">
                      {user?.emailVerified ? (
                        <Chip icon={<CheckCircle />} label="Verified" color="success" size="small" />
                      ) : (
                        <Chip icon={<Warning />} label="Not Verified" color="warning" size="small" />
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Account Status
                    </Typography>
                    <Typography variant="body1">
                      {user?.isActive ? (
                        <Chip icon={<CheckCircle />} label="Active" color="success" size="small" />
                      ) : (
                        <Chip icon={<Cancel />} label="Inactive" color="error" size="small" />
                      )}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Delete Account Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              This action cannot be undone. All your data including attendance records, leave history, and profile information will be permanently deleted.
            </Typography>
          </Alert>
          <TextField
            fullWidth
            label="Type 'DELETE' to confirm"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder="DELETE"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={deleteConfirmation !== 'DELETE' || loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage; 