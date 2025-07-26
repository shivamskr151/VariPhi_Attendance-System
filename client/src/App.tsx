import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Typography, Button, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { RootState } from './store';
import { checkAuthStatus } from './store/slices/authSlice';
import { useAppDispatch } from './hooks/useAppDispatch';

// Components
import MainLayout from './components/layout/MainLayout';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './components/dashboard/Dashboard';
import LoadingSpinner from './components/common/LoadingSpinner';
import NotificationSystem from './components/common/NotificationSystem';

// Page Components
import AttendancePage from './components/pages/AttendancePage';
import LeaveManagementPage from './components/pages/LeaveManagementPage';
import PendingLeavesPage from './components/pages/PendingLeavesPage';
import EmployeesPage from './components/pages/EmployeesPage';
import ReportsPage from './components/pages/ReportsPage';
import AdminPanelPage from './components/pages/AdminPanelPage';
import SettingsPage from './components/pages/SettingsPage';
import ProfilePage from './components/pages/ProfilePage';
import InvitationManagementPage from './components/pages/InvitationManagementPage';
import AcceptInvitationPage from './components/pages/AcceptInvitationPage';
import DocumentsPage from './pages/DocumentsPage';

// Types
import { Notification } from './types';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  if (loading) {
    return <LoadingSpinner fullScreen message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout>{children}</MainLayout>;
};

// Create theme with attendance-focused colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { todayAttendance } = useSelector((state: RootState) => state.attendance);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastAttendanceCheck, setLastAttendanceCheck] = useState<Date | null>(null);

  // Check authentication status on app load
  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  // Add notification helper
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    const newNotification = { ...notification, id };
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove notification after duration
    setTimeout(() => {
      removeNotification(id);
    }, notification.duration || 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear session storage when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.removeItem('welcomeNotificationShown');
    }
  }, [isAuthenticated]);

  // Attendance monitoring for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkAttendanceStatus = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const isWorkDay = now.getDay() !== 0 && now.getDay() !== 6; // Not weekend

      if (isWorkDay) {
        // Check if it's time to punch in (9 AM)
        if (currentHour === 9 && currentMinute === 0 && !todayAttendance?.punchIn) {
          addNotification({
            type: 'info',
            title: 'Time to Punch In',
            message: 'It\'s 9:00 AM. Don\'t forget to punch in for the day!',
            duration: 10000,
          });
        }

        // Check if it's time to punch out (5 PM)
        if (currentHour === 17 && currentMinute === 0 && todayAttendance?.punchIn && !todayAttendance?.punchOut) {
          addNotification({
            type: 'info',
            title: 'Time to Punch Out',
            message: 'It\'s 5:00 PM. Remember to punch out for the day!',
            duration: 10000,
          });
        }

        // Check for late arrival (after 9:30 AM)
        if (currentHour === 9 && currentMinute === 30 && !todayAttendance?.punchIn) {
          addNotification({
            type: 'warning',
            title: 'Late Arrival',
            message: 'You haven\'t punched in yet. You may be marked as late.',
            duration: 15000,
          });
        }

        // Check for overtime (after 6 PM)
        if (currentHour === 18 && currentMinute === 0 && todayAttendance?.punchIn && !todayAttendance?.punchOut) {
          addNotification({
            type: 'info',
            title: 'Overtime Alert',
            message: 'You\'re working overtime. Don\'t forget to punch out when you\'re done!',
            duration: 10000,
          });
        }
      }

      setLastAttendanceCheck(now);
    };

    // Check every minute
    const interval = setInterval(checkAttendanceStatus, 60000);
    
    // Initial check
    checkAttendanceStatus();

    return () => clearInterval(interval);
  }, [isAuthenticated, user, todayAttendance, addNotification]);

  // Welcome notification on login
  useEffect(() => {
    if (isAuthenticated && user && notifications.length === 0) {
      // Check if welcome notification has been shown this session
      const welcomeShown = sessionStorage.getItem('welcomeNotificationShown');
      
      if (!welcomeShown) {
        const hour = new Date().getHours();
        let greeting = 'Good Morning';
        if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
        else if (hour >= 17) greeting = 'Good Evening';

        addNotification({
          type: 'success',
          title: `Welcome back, ${user.firstName}!`,
          message: `${greeting}! Your attendance dashboard is ready.`,
          duration: 5000,
        });
        
        // Mark as shown for this session
        sessionStorage.setItem('welcomeNotificationShown', 'true');
      }
    }
  }, [isAuthenticated, user, addNotification]);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoadingSpinner fullScreen message="Loading application..." />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications}
        onRemove={removeNotification}
      />

      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaves"
          element={
            <ProtectedRoute>
              <LeaveManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pending-leaves"
          element={
            <ProtectedRoute>
              <PendingLeavesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invitations"
          element={
            <ProtectedRoute>
              <InvitationManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route 
          path="*" 
          element={
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom>
                404 - Page Not Found
              </Typography>
              <Typography variant="body1" gutterBottom>
                The page you're looking for doesn't exist.
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => window.location.href = '/dashboard'}
                sx={{ mt: 2 }}
              >
                Go to Dashboard
              </Button>
            </Box>
          } 
        />
      </Routes>
    </ThemeProvider>
  );
};

export default App; 