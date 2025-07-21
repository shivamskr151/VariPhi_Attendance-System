import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  Typography,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
} from '@mui/icons-material';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
}

interface NotificationSystemProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onRemove,
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle />;
      case 'error':
        return <Error />;
      case 'warning':
        return <Warning />;
      case 'info':
        return <Info />;
      default:
        return <Info />;
    }
  };

  return (
    <>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration || 5000}
          onClose={() => onRemove(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: 8 }}
        >
          <Alert
            onClose={() => onRemove(notification.id)}
            severity={notification.type}
            icon={getIcon(notification.type)}
            sx={{ width: '100%', minWidth: 300 }}
          >
            {notification.title && (
              <AlertTitle sx={{ fontWeight: 'bold' }}>
                {notification.title}
              </AlertTitle>
            )}
            <Typography variant="body2">
              {notification.message}
            </Typography>
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default NotificationSystem; 