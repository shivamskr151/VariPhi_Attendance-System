import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
} from '@mui/material';
import { EventNote, CalendarToday } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const LeaveBalanceCard: React.FC = () => {
  const { currentEmployee } = useSelector((state: RootState) => state.employee);
  
  const leaveBalance = currentEmployee?.leaveBalance || {
    annual: 0,
    sick: 0,
    personal: 0,
    maternity: 0,
    paternity: 0,
  };

  const totalAvailable = Object.values(leaveBalance).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
  const totalAllocated = 25; // Assuming 25 days total allocation
  const usedDays = totalAllocated - totalAvailable;
  const usagePercentage = (usedDays / totalAllocated) * 100;

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'annual':
        return 'primary';
      case 'sick':
        return 'error';
      case 'personal':
        return 'warning';
      case 'maternity':
        return 'secondary';
      case 'paternity':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <EventNote color="primary" />
          <Typography variant="h6" component="h2">
            Leave Balance
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Available leave days
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <Typography variant="h4" component="span">
            {totalAvailable}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            days remaining
          </Typography>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={usagePercentage} 
          sx={{ height: 8, borderRadius: 4, mb: 2 }}
        />
        
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography variant="body2" color="text.secondary">
            Used: {usedDays} days
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total: {totalAllocated} days
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" gap={1}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <CalendarToday sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            Leave Types:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {Object.entries(leaveBalance).map(([type, days]) => (
              <Chip
                key={type}
                label={`${type.charAt(0).toUpperCase() + type.slice(1)}: ${days}`}
                color={getLeaveTypeColor(type) as any}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default LeaveBalanceCard; 