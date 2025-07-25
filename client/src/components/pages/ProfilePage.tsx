import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  IconButton,
  Chip,
  Divider,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../store';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import NotificationSystem from '../common/NotificationSystem';
import { useNotifications } from '../../hooks/useNotifications';
import { api } from '../../services/api';
import { updateProfilePicture, checkAuthStatus } from '../../store/slices/authSlice';
import { PhotoCamera, Delete, CheckCircle, Warning, Email, Phone, Work, CalendarToday, LocationOn, Person, VerifiedUser } from '@mui/icons-material';

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
};

const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, loading, error } = useSelector((state: RootState) => state.auth);
  const [picLoading, setPicLoading] = useState(false);
  const [picError, setPicError] = useState<string | null>(null);
  const { notifications, addNotification, removeNotification } = useNotifications();

  // Profile picture upload logic
  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPicError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPicError('File size must be less than 5MB');
      return;
    }
    const formData = new FormData();
    formData.append('profilePicture', file);
    setPicLoading(true);
    try {
      const response = await api.put('/users/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        addNotification({ type: 'success', message: 'Profile picture updated successfully!' });
        if (response.data.data?.profilePicture) {
          dispatch(updateProfilePicture(response.data.data.profilePicture));
          dispatch(checkAuthStatus());
        }
      }
    } catch (error: any) {
      setPicError(error.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setPicLoading(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!user?.profilePicture) return;
    if (!window.confirm('Are you sure you want to delete your profile picture?')) return;
    setPicLoading(true);
    try {
      const response = await api.delete('/users/profile-picture');
      if (response.data.success) {
        addNotification({ type: 'success', message: 'Profile picture deleted successfully!' });
        dispatch(updateProfilePicture(''));
        dispatch(checkAuthStatus());
      }
    } catch (error: any) {
      setPicError(error.response?.data?.message || 'Failed to delete profile picture');
    } finally {
      setPicLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading user data..." />;
  }

  if (error) {
    return <ErrorAlert error={error} />;
  }

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Profile
        </Typography>
        <Typography>No user data available. Please log in.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <NotificationSystem notifications={notifications} onRemove={removeNotification} />
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      {picError && <ErrorAlert error={picError} onClose={() => setPicError(null)} />}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <Box sx={{ position: 'relative', width: 100, height: 100, mx: 'auto' }}>
                <Avatar
                  sx={{ width: 100, height: 100, fontSize: 40 }}
                  src={user.profilePicture ? `http://localhost:5001/api/users/profile-picture/${user.profilePicture.split('/').pop()}` : undefined}
                >
                  {getInitials(user.firstName, user.lastName)}
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
                  <Tooltip title="Upload profile picture">
                    <span>
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
                        disabled={picLoading}
                      >
                        <PhotoCamera />
                      </IconButton>
                    </span>
                  </Tooltip>
                </label>
                {user.profilePicture && (
                  <Tooltip title="Delete profile picture">
                    <span>
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
                        disabled={picLoading}
                      >
                        <Delete />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                {picLoading && (
                  <CircularProgress size={32} sx={{ position: 'absolute', top: 34, left: 34, zIndex: 2 }} />
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={9}>
              <Typography variant="h5" gutterBottom>
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                <Person fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                {user.position} • {user.department}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Employee ID: {user.employeeId}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  icon={user.isActive ? <CheckCircle /> : <Warning />}
                  label={user.isActive ? 'Active' : 'Inactive'}
                  color={user.isActive ? 'success' : 'warning'}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  icon={user.emailVerified ? <VerifiedUser /> : <Warning />}
                  label={user.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                  color={user.emailVerified ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Personal Information</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                <Email fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                {user.email}
              </Typography>
              {user.phone && (
                <Typography variant="body1" gutterBottom>
                  <Phone fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {user.phone}
                </Typography>
              )}
              {user.address && (
                <Typography variant="body1" gutterBottom>
                  <LocationOn fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {user.address.street}, {user.address.city}, {user.address.state}, {user.address.zipCode}, {user.address.country}
                </Typography>
              )}
              {user.emergencyContact && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Emergency Contact</Typography>
                  <Typography variant="body2">{user.emergencyContact.name} ({user.emergencyContact.relationship}) - {user.emergencyContact.phone}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Employment Details</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                <Work fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <CalendarToday fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Hire Date: {user.hireDate ? new Date(user.hireDate).toLocaleDateString() : 'N/A'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Leave Balance</Typography>
              <Divider sx={{ mb: 2 }} />
              {user.leaveBalance && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Chip label={`Annual: ${user.leaveBalance.annual}`} color="primary" />
                  <Chip label={`Sick: ${user.leaveBalance.sick}`} color="secondary" />
                  <Chip label={`Personal: ${user.leaveBalance.personal}`} color="info" />
                  <Chip label={`Maternity: ${user.leaveBalance.maternity}`} color="success" />
                  <Chip label={`Paternity: ${user.leaveBalance.paternity}`} color="warning" />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Work Schedule</Typography>
              <Divider sx={{ mb: 2 }} />
              {user.workSchedule && (
                <>
                  <Typography variant="body1" gutterBottom>
                    Start Time: {user.workSchedule.startTime}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    End Time: {user.workSchedule.endTime}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    Timezone: {user.workSchedule.timezone}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage; 