import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const ProfilePage: React.FC = () => {
  const { user, loading, error } = useSelector((state: RootState) => state.auth);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Profile
        </Typography>
        <Typography>Loading user data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Profile
        </Typography>
        <Typography color="error">Error loading profile: {error}</Typography>
      </Box>
    );
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
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Welcome, {user.firstName} {user.lastName}!
          </Typography>
          <Typography variant="body1">
            Employee ID: {user.employeeId}
          </Typography>
          <Typography variant="body1">
            Email: {user.email}
          </Typography>
          <Typography variant="body1">
            Department: {user.department}
          </Typography>
          <Typography variant="body1">
            Position: {user.position}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfilePage; 