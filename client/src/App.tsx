import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Typography, Button } from '@mui/material';
import { RootState } from './store';
import { checkAuthStatus } from './store/slices/authSlice';
import { useAppDispatch } from './hooks/useAppDispatch';

// Components
import MainLayout from './components/layout/MainLayout';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './components/dashboard/Dashboard';
import LoadingSpinner from './components/common/LoadingSpinner';

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

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Check authentication status on app load
    dispatch(checkAuthStatus());
  }, [dispatch]);



  if (loading) {
    return <LoadingSpinner fullScreen message="Loading application..." />;
  }

  return (
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
  );
};

export default App; 