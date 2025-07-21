import React from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';

interface ErrorAlertProps {
  error: string | null;
  onClose?: () => void;
  severity?: 'error' | 'warning' | 'info';
  title?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ 
  error, 
  onClose, 
  severity = 'error',
  title 
}) => {
  if (!error) return null;

  return (
    <Box mb={2}>
      <Alert 
        severity={severity} 
        onClose={onClose}
        variant="filled"
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {error}
      </Alert>
    </Box>
  );
};

export default ErrorAlert; 