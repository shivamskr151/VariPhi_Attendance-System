import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AdminPanelSettings,
  People,
  Settings,
  Security,
  Backup,
  Restore,
  Download,
  Upload,
  Refresh,
  Add,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Cancel,
  Warning,
  ExpandMore,
  Dashboard,
  EventNote,
  Schedule,
  Assessment,
  Notifications,
  Email,
  Phone,
  Business,
  Work,
  CalendarToday,
  SupervisedUserCircle,
  Group,
  PersonAdd,
  PersonRemove,
  Lock,
  DataUsage,
  Storage,
  Speed,
  Memory,
  StorageOutlined,
  BackupOutlined,
  RestoreOutlined,
  Timer,
  Person,
  LocationOn,
  Save,
  Info,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { User } from '../../types';
import { adminAPI } from '../../services/api';
import { updateSystemHealth } from '../../store/slices/socketSlice';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminPanelPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { socket, systemHealth } = useSelector((state: RootState) => state.socket);
  const dispatch = useAppDispatch();

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // System Overview States
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalAttendance: 0,
    pendingLeaves: 0,
    systemHealth: 'good',
    storageUsage: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  });

  // User Management States
  const [users, setUsers] = useState<User[]>([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    role: 'employee' as 'employee' | 'manager' | 'admin',
    isActive: true,
  });

  // System Settings States
  const [systemSettings, setSystemSettings] = useState({
    attendanceEnabled: true,
    leaveApprovalRequired: true,
    locationTracking: true,
    emailNotifications: true,
    smsNotifications: false,
    autoApproval: false,
    maxLeaveDays: 30,
    workHours: 8,
    timezone: 'UTC',
  });

  // Security Settings States
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    passwordPolicy: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiry: 90,
    requireStrongPasswords: true,
    lockoutDuration: 15,
    enableAuditLog: true,
  });

  // Security Audit Log States
  const [auditLogs, setAuditLogs] = useState([]);

  // System Configuration States
  const [systemConfig, setSystemConfig] = useState({
    officeLocation: {
      latitude: 0,
      longitude: 0,
      address: 'Office Address',
      city: 'City',
      state: 'State',
      country: 'Country'
    },
    locationValidation: {
      enabled: false,
      maxDistanceKm: 100,
      allowRemoteWork: true
    },
    workingHours: {
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'UTC'
    },
    systemName: 'Attendance System',
    systemVersion: '1.0.0'
  });
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSystemStats();
      fetchUsers();
      fetchSystemSettings();
      fetchSecuritySettings();
      fetchAuditLogs();
      fetchSystemConfig();
    }
  }, [user?.role]);

  // Real-time system health updates
  useEffect(() => {
    if (user?.role === 'admin') {
      // Initial fetch
      fetchSystemHealth();
      
      // Set up interval for real-time updates (every 10 seconds)
      const healthInterval = setInterval(() => {
        fetchSystemHealth();
      }, 10000);

      return () => clearInterval(healthInterval);
    }
  }, [user?.role]);

  // WebSocket system health updates
  useEffect(() => {
    if (socket && user?.role === 'admin') {
      // Join system health monitoring room
      socket.emit('request_system_health', { role: user.role });
      
      // Listen for system health updates
      socket.on('system_health_update', (data: any) => {
        if (data.type === 'system_health_update') {
          dispatch(updateSystemHealth(data.data));
          
          // Update local state with WebSocket data
          setSystemStats(prev => ({
            ...prev,
            systemHealth: data.data.health || 'good',
            storageUsage: data.data.storage || 0,
            memoryUsage: data.data.memory || 0,
            cpuUsage: data.data.cpu || 0,
          }));
        }
      });

      return () => {
        socket.off('system_health_update');
      };
    }
  }, [socket, user?.role, dispatch]);

  const fetchSystemStats = async () => {
    try {
      const response = await adminAPI.getSystemStats();
      if (response.data.success) {
        const data = response.data.data;
        const systemHealth = data.systemHealth;
        
        setSystemStats({
          totalUsers: data.overview?.totalEmployees || 0,
          activeUsers: data.overview?.totalEmployees || 0, // Assuming all employees are active for now
          totalAttendance: data.overview?.totalAttendanceRecords || 0,
          pendingLeaves: data.overview?.pendingLeaves || 0,
          systemHealth: systemHealth?.status || 'good',
          storageUsage: systemHealth?.storage || 0,
          memoryUsage: systemHealth?.memory || 0,
          cpuUsage: systemHealth?.cpu || 0,
        });
      } else {
        setSystemStats(prev => ({ ...prev, systemHealth: 'warning' }));
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch system stats');
      setSystemStats(prev => ({ ...prev, systemHealth: 'critical' }));
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await adminAPI.getSystemHealth();
      if (response.data.success) {
        const data = response.data.data;
        setSystemStats(prev => ({
          ...prev,
          systemHealth: data.health || 'good',
          storageUsage: data.storage || 0,
          memoryUsage: data.memory || 0,
          cpuUsage: data.cpu || 0,
        }));
      }
    } catch (error: any) {
      console.error('Failed to fetch system health:', error);
      setSystemStats(prev => ({ ...prev, systemHealth: 'critical' }));
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getUsers();
      if (response.data.success) {
        setUsers(response.data.data.users || []);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      setLoading(true);
      // Mock data for now - in real app, fetch from API
      setSystemSettings({
        attendanceEnabled: true,
        leaveApprovalRequired: true,
        locationTracking: true,
        emailNotifications: true,
        smsNotifications: false,
        autoApproval: false,
        maxLeaveDays: 30,
        workHours: 8,
        timezone: 'UTC',
      });
    } catch (error: any) {
      setError(error.message || 'Failed to fetch system settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemConfig = async () => {
    try {
      setConfigLoading(true);
      const response = await adminAPI.getSystemConfig();
      if (response.data.success) {
        setSystemConfig(response.data.data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch system configuration');
    } finally {
      setConfigLoading(false);
    }
  };

  const updateSystemConfig = async (configData: any) => {
    try {
      setConfigLoading(true);
      const response = await adminAPI.updateSystemConfig(configData);
      if (response.data.success) {
        setSystemConfig(response.data.data);
        setSuccess('System configuration updated successfully');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update system configuration');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!userForm.firstName || !userForm.lastName || !userForm.email || !userForm.phone || !userForm.department || !userForm.position) {
      setError('Please fill in all required fields (First Name, Last Name, Email, Phone, Department, Position)');
      return;
    }

    setLoading(true);
    try {
      const response = await adminAPI.createUser(userForm);
      if (response.data.success) {
        const defaultPassword = response.data.data.defaultPassword;
        setSuccess(`User added successfully! Default password: ${defaultPassword}`);
        setShowUserDialog(false);
        resetUserForm();
        fetchUsers();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const response = await adminAPI.updateUser(selectedUser._id, userForm);
      if (response.data.success) {
        setSuccess('User updated successfully!');
        setShowUserDialog(false);
        resetUserForm();
        fetchUsers();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await adminAPI.deleteUser(userId);
      if (response.data.success) {
        setSuccess('User deleted successfully!');
        fetchUsers();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await adminAPI.toggleUserStatus(userId, isActive);
      if (response.data.success) {
        setSuccess(`User ${isActive ? 'activated' : 'deactivated'} successfully!`);
        fetchUsers();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleUpdateSystemSettings = async () => {
    try {
      const response = await adminAPI.updateSettings(systemSettings);
      if (response.data.success) {
        setSuccess('System settings updated successfully!');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update system settings');
    }
  };

  const handleUpdateSecuritySettings = async () => {
    try {
      const response = await adminAPI.updateSecuritySettings(securitySettings);
      if (response.data.success) {
        setSuccess('Security settings updated successfully!');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update security settings');
    }
  };

  const fetchSecuritySettings = async () => {
    try {
      const response = await adminAPI.getSecuritySettings();
      if (response.data.success) {
        setSecuritySettings(response.data.data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch security settings');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await adminAPI.getSecurityAuditLog({ limit: 10 });
      if (response.data.success) {
        setAuditLogs(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  const handleBackupSystem = async () => {
    try {
      const response = await adminAPI.createBackup();
      if (response.data.success) {
        setSuccess('System backup created successfully!');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create backup');
    }
  };

  const handleRestoreSystem = async () => {
    if (!window.confirm('Are you sure you want to restore the system? This will overwrite current data.')) return;

    try {
      const response = await adminAPI.restoreSystem();
      if (response.data.success) {
        setSuccess('System restored successfully!');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to restore system');
    }
  };

  const resetUserForm = () => {
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      role: 'employee',
      isActive: true,
    });
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      department: user.department,
      position: user.position,
      role: user.role,
      isActive: user.isActive,
    });
    setShowUserDialog(true);
  };

  const getRoleChip = (role: string) => {
    const roleConfig = {
      admin: { color: 'error' as const, icon: <AdminPanelSettings /> },
      manager: { color: 'warning' as const, icon: <SupervisedUserCircle /> },
      employee: { color: 'primary' as const, icon: <Person /> },
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.employee;
    return (
      <Chip
        icon={config.icon}
        label={role.charAt(0).toUpperCase() + role.slice(1)}
        color={config.color}
        size="small"
      />
    );
  };

  const getStatusChip = (isActive: boolean) => {
    return (
      <Chip
        icon={isActive ? <CheckCircle /> : <Cancel />}
        label={isActive ? 'Active' : 'Inactive'}
        color={isActive ? 'success' : 'error'}
        size="small"
      />
    );
  };

  const getSystemHealthChip = (health: string | undefined) => {
    const healthConfig = {
      good: { color: 'success' as const, icon: <CheckCircle /> },
      warning: { color: 'warning' as const, icon: <Warning /> },
      critical: { color: 'error' as const, icon: <Cancel /> },
    };

    const healthValue = health || 'good';
    const config = healthConfig[healthValue as keyof typeof healthConfig] || healthConfig.good;
    return (
      <Chip
        icon={config.icon}
        label={healthValue.charAt(0).toUpperCase() + healthValue.slice(1)}
        color={config.color}
        size="small"
      />
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h4" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You don't have permission to access the admin panel.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Panel
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchSystemStats}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && <ErrorAlert error={error} onClose={() => setError(null)} />}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* System Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" color="primary.main" gutterBottom>
                {systemStats.totalUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" color="success.main" gutterBottom>
                {systemStats.activeUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Schedule sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" color="info.main" gutterBottom>
                {systemStats.totalAttendance}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Attendance Records
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <EventNote sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" color="warning.main" gutterBottom>
                {systemStats.pendingLeaves}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Leaves
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Health */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              System Health
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Last updated:
              </Typography>
              <Typography variant="body2" color="primary.main">
                {systemHealth?.timestamp ? new Date(systemHealth.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
              </Typography>
            </Box>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                {getSystemHealthChip(systemStats.systemHealth)}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Overall Status
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary.main">
                  {systemStats.storageUsage.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Storage Usage
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={systemStats.storageUsage} 
                    color={systemStats.storageUsage > 80 ? 'error' : systemStats.storageUsage > 60 ? 'warning' : 'primary'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="info.main">
                  {systemStats.memoryUsage.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Memory Usage
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={systemStats.memoryUsage} 
                    color={systemStats.memoryUsage > 80 ? 'error' : systemStats.memoryUsage > 60 ? 'warning' : 'info'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="success.main">
                  {systemStats.cpuUsage.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  CPU Usage
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={systemStats.cpuUsage} 
                    color={systemStats.cpuUsage > 80 ? 'error' : systemStats.cpuUsage > 60 ? 'warning' : 'success'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="admin tabs"
        >
          <Tab
            icon={<People />}
            label="User Management"
            iconPosition="start"
          />
          <Tab
            icon={<Settings />}
            label="System Settings"
            iconPosition="start"
          />
          <Tab
            icon={<Security />}
            label="Security"
            iconPosition="start"
          />
          <Tab
            icon={<Backup />}
            label="Backup & Restore"
            iconPosition="start"
          />
          <Tab
            icon={<LocationOn />}
            label="Office Location"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* User Management Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">User Management</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setSelectedUser(null);
              resetUserForm();
              setShowUserDialog(true);
            }}
          >
            Add User
          </Button>
        </Box>

        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Employee ID</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(users || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    (users || []).map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="subtitle2">
                              {user.firstName} {user.lastName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{user.employeeId}</TableCell>
                        <TableCell>{user.department}</TableCell>
                        <TableCell>{getRoleChip(user.role)}</TableCell>
                        <TableCell>{getStatusChip(user.isActive)}</TableCell>
                        <TableCell>
                          {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Edit User">
                              <IconButton
                                size="small"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Toggle Status">
                              <IconButton
                                size="small"
                                onClick={() => handleToggleUserStatus(user._id, !user.isActive)}
                              >
                                {user.isActive ? <Lock /> : <Lock />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete User">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteUser(user._id)}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* System Settings Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          System Settings
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Attendance Settings
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Schedule />
                    </ListItemIcon>
                    <ListItemText
                      primary="Enable Attendance Tracking"
                      secondary="Allow employees to punch in/out"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={systemSettings.attendanceEnabled}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            attendanceEnabled: e.target.checked,
                          })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <LocationOn />
                    </ListItemIcon>
                    <ListItemText
                      primary="Location Tracking"
                      secondary="Require location for punch in/out"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={systemSettings.locationTracking}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            locationTracking: e.target.checked,
                          })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Work />
                    </ListItemIcon>
                    <ListItemText
                      primary="Work Hours"
                      secondary="Standard work hours per day"
                    />
                    <TextField
                      type="number"
                      value={systemSettings.workHours}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          workHours: parseInt(e.target.value),
                        })
                      }
                      size="small"
                      sx={{ width: 80 }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Leave Settings
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <EventNote />
                    </ListItemIcon>
                    <ListItemText
                      primary="Require Leave Approval"
                      secondary="Managers must approve leave requests"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={systemSettings.leaveApprovalRequired}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            leaveApprovalRequired: e.target.checked,
                          })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle />
                    </ListItemIcon>
                    <ListItemText
                      primary="Auto Approval"
                      secondary="Automatically approve leave requests"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={systemSettings.autoApproval}
                        onChange={(e) =>
                          setSystemSettings({
                            ...systemSettings,
                            autoApproval: e.target.checked,
                          })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarToday />
                    </ListItemIcon>
                    <ListItemText
                      primary="Max Leave Days"
                      secondary="Maximum leave days per request"
                    />
                    <TextField
                      type="number"
                      value={systemSettings.maxLeaveDays}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          maxLeaveDays: parseInt(e.target.value),
                        })
                      }
                      size="small"
                      sx={{ width: 80 }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleUpdateSystemSettings}
                sx={{ mr: 1 }}
              >
                Save Settings
              </Button>
              <Button
                variant="outlined"
                onClick={fetchSystemSettings}
              >
                Reset
              </Button>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Security Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          Security Settings
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Authentication
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Security />
                    </ListItemIcon>
                    <ListItemText
                      primary="Two-Factor Authentication"
                      secondary="Require 2FA for all users"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={securitySettings.twoFactorAuth}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            twoFactorAuth: e.target.checked,
                          })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Lock />
                    </ListItemIcon>
                    <ListItemText
                      primary="Password Policy"
                      secondary="Enforce strong passwords"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={securitySettings.passwordPolicy}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            passwordPolicy: e.target.checked,
                          })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Security />
                    </ListItemIcon>
                    <ListItemText
                      primary="Require Strong Passwords"
                      secondary="Minimum 8 characters with complexity"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={securitySettings.requireStrongPasswords}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            requireStrongPasswords: e.target.checked,
                          })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Timer />
                    </ListItemIcon>
                    <ListItemText
                      primary="Session Timeout"
                      secondary="Auto-logout after inactivity"
                    />
                    <ListItemSecondaryAction>
                      <TextField
                        type="number"
                        value={securitySettings.sessionTimeout}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            sessionTimeout: parseInt(e.target.value),
                          })
                        }
                        size="small"
                        sx={{ width: 80 }}
                        InputProps={{
                          endAdornment: <Typography variant="caption">min</Typography>,
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Warning />
                    </ListItemIcon>
                    <ListItemText
                      primary="Max Login Attempts"
                      secondary="Maximum failed login attempts before lockout"
                    />
                    <ListItemSecondaryAction>
                      <TextField
                        type="number"
                        value={securitySettings.maxLoginAttempts}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            maxLoginAttempts: parseInt(e.target.value),
                          })
                        }
                        size="small"
                        sx={{ width: 80 }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarToday />
                    </ListItemIcon>
                    <ListItemText
                      primary="Password Expiry"
                      secondary="Days until password expires"
                    />
                    <ListItemSecondaryAction>
                      <TextField
                        type="number"
                        value={securitySettings.passwordExpiry}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            passwordExpiry: parseInt(e.target.value),
                          })
                        }
                        size="small"
                        sx={{ width: 80 }}
                        InputProps={{
                          endAdornment: <Typography variant="caption">days</Typography>,
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Lock />
                    </ListItemIcon>
                    <ListItemText
                      primary="Lockout Duration"
                      secondary="Minutes to lock account after failed attempts"
                    />
                    <ListItemSecondaryAction>
                      <TextField
                        type="number"
                        value={securitySettings.lockoutDuration}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            lockoutDuration: parseInt(e.target.value),
                          })
                        }
                        size="small"
                        sx={{ width: 80 }}
                        InputProps={{
                          endAdornment: <Typography variant="caption">min</Typography>,
                        }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Assessment />
                    </ListItemIcon>
                    <ListItemText
                      primary="Audit Logging"
                      secondary="Enable security audit logging"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={securitySettings.enableAuditLog}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            enableAuditLog: e.target.checked,
                          })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Security Notifications
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Email />
                    </ListItemIcon>
                    <ListItemText
                      primary="Security Alerts"
                      secondary="Email notifications for security events"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={securitySettings.enableAuditLog}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            enableAuditLog: e.target.checked,
                          })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Warning />
                    </ListItemIcon>
                    <ListItemText
                      primary="Failed Login Alerts"
                      secondary="Notify admins of failed login attempts"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={securitySettings.enableAuditLog}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            enableAuditLog: e.target.checked,
                          })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Security />
                    </ListItemIcon>
                    <ListItemText
                      primary="Account Lockout Alerts"
                      secondary="Notify when accounts are locked"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={securitySettings.enableAuditLog}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            enableAuditLog: e.target.checked,
                          })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Security Audit Log
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Recent security events and activities
                </Typography>
                <List>
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          {log.eventType === 'LOGIN_FAILED' && <Warning color="warning" />}
                          {log.eventType === 'LOGIN_SUCCESS' && <CheckCircle color="success" />}
                          {log.eventType === 'PASSWORD_CHANGED' && <Security color="info" />}
                          {log.eventType === 'ACCOUNT_LOCKED' && <Warning color="error" />}
                          {log.eventType === 'ADMIN_ACTION' && <AdminPanelSettings color="primary" />}
                          {log.eventType === 'SUSPICIOUS_ACTIVITY' && <Warning color="error" />}
                          {!['LOGIN_FAILED', 'LOGIN_SUCCESS', 'PASSWORD_CHANGED', 'ACCOUNT_LOCKED', 'ADMIN_ACTION', 'SUSPICIOUS_ACTIVITY'].includes(log.eventType) && <Security color="info" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={`${log.eventType.replace(/_/g, ' ')} - ${log.userEmail || 'Unknown'}`}
                          secondary={`${new Date(log.timestamp).toLocaleString()} • IP: ${log.ipAddress}`}
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText
                        primary="No security events found"
                        secondary="Security audit log is empty"
                      />
                    </ListItem>
                  )}
                </List>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button variant="outlined" startIcon={<Download />}>
                    Export Audit Log
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleUpdateSecuritySettings}
            sx={{ mr: 1 }}
          >
            Save Security Settings
          </Button>
          <Button
            variant="outlined"
            onClick={fetchSecuritySettings}
          >
            Reset
          </Button>
        </Box>
      </TabPanel>

      {/* Backup & Restore Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" gutterBottom>
          Backup & Restore
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Backup
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Create a backup of all system data including users, attendance records, and settings.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Backup />}
                  onClick={handleBackupSystem}
                  fullWidth
                >
                  Create Backup
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Restore
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Restore system from a previous backup. This will overwrite current data.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Restore />}
                  onClick={handleRestoreSystem}
                  fullWidth
                  color="warning"
                >
                  Restore System
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Backups
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <BackupOutlined />
                    </ListItemIcon>
                    <ListItemText
                      primary="Backup - 2024-01-15 14:30"
                      secondary="Full system backup"
                    />
                    <Button size="small" variant="outlined">
                      Download
                    </Button>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <BackupOutlined />
                    </ListItemIcon>
                    <ListItemText
                      primary="Backup - 2024-01-10 09:15"
                      secondary="Full system backup"
                    />
                    <Button size="small" variant="outlined">
                      Download
                    </Button>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* User Dialog */}
      <Dialog
        open={showUserDialog}
        onClose={() => setShowUserDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                value={userForm.firstName}
                onChange={(e) =>
                  setUserForm({ ...userForm, firstName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={userForm.lastName}
                onChange={(e) =>
                  setUserForm({ ...userForm, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={userForm.phone}
                onChange={(e) =>
                  setUserForm({ ...userForm, phone: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Department</InputLabel>
                <Select
                  value={userForm.department}
                  label="Department"
                  onChange={(e) =>
                    setUserForm({ ...userForm, department: e.target.value })
                  }
                >
                  <MenuItem value="IT">IT</MenuItem>
                  <MenuItem value="HR">HR</MenuItem>
                  <MenuItem value="Finance">Finance</MenuItem>
                  <MenuItem value="Marketing">Marketing</MenuItem>
                  <MenuItem value="Sales">Sales</MenuItem>
                  <MenuItem value="Operations">Operations</MenuItem>
                  <MenuItem value="Management">Management</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Position"
                value={userForm.position}
                onChange={(e) =>
                  setUserForm({ ...userForm, position: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={userForm.role}
                  label="Role"
                  onChange={(e) =>
                    setUserForm({ ...userForm, role: e.target.value as any })
                  }
                >
                  <MenuItem value="employee">Employee</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={userForm.isActive}
                    onChange={(e) =>
                      setUserForm({ ...userForm, isActive: e.target.checked })
                    }
                  />
                }
                label="Active User"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUserDialog(false)}>Cancel</Button>
          <Button
            onClick={selectedUser ? handleUpdateUser : handleAddUser}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : (selectedUser ? 'Update User' : 'Add User')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Office Location Tab */}
      <TabPanel value={tabValue} index={4}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Office Location Configuration</Typography>
        </Box>

        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure the office location coordinates and maximum allowed distance for attendance tracking.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Office Latitude"
                  type="number"
                  value={systemConfig.officeLocation.latitude}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      officeLocation: {
                        ...systemConfig.officeLocation,
                        latitude: parseFloat(e.target.value) || 0
                      }
                    })
                  }
                  inputProps={{ step: 0.000001, min: -90, max: 90 }}
                  helperText="Latitude must be between -90 and 90"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Office Longitude"
                  type="number"
                  value={systemConfig.officeLocation.longitude}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      officeLocation: {
                        ...systemConfig.officeLocation,
                        longitude: parseFloat(e.target.value) || 0
                      }
                    })
                  }
                  inputProps={{ step: 0.000001, min: -180, max: 180 }}
                  helperText="Longitude must be between -180 and 180"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Maximum Distance (km)"
                  type="number"
                  value={systemConfig.locationValidation.maxDistanceKm}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      locationValidation: {
                        ...systemConfig.locationValidation,
                        maxDistanceKm: parseFloat(e.target.value) || 0
                      }
                    })
                  }
                  inputProps={{ min: 0, step: 1 }}
                  helperText="Maximum allowed distance from office for attendance"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemConfig.locationValidation.enabled}
                      onChange={(e) =>
                        setSystemConfig({
                          ...systemConfig,
                          locationValidation: {
                            ...systemConfig.locationValidation,
                            enabled: e.target.checked
                          }
                        })
                      }
                    />
                  }
                  label="Enable Location Validation"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={() => updateSystemConfig(systemConfig)}
                disabled={configLoading}
                startIcon={configLoading ? <CircularProgress size={20} /> : <Save />}
              >
                {configLoading ? 'Updating...' : 'Update System Configuration'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  // Set to a common location (e.g., London)
                  setSystemConfig({
                    ...systemConfig,
                    officeLocation: {
                      ...systemConfig.officeLocation,
                      latitude: 51.5074,
                      longitude: -0.1278,
                    },
                    locationValidation: {
                      ...systemConfig.locationValidation,
                      maxDistanceKm: 100,
                      enabled: true,
                    }
                  });
                }}
              >
                Reset to Default
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  // Disable location validation
                  setSystemConfig({
                    ...systemConfig,
                    locationValidation: {
                      ...systemConfig.locationValidation,
                      enabled: false,
                    }
                  });
                }}
              >
                Disable Location Validation
              </Button>
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Current Office Location:</strong> {systemConfig.officeLocation.latitude.toFixed(6)}, {systemConfig.officeLocation.longitude.toFixed(6)}
                <br />
                <strong>Maximum Distance:</strong> {systemConfig.locationValidation.maxDistanceKm} km
                <br />
                <strong>Location Validation:</strong> {systemConfig.locationValidation.enabled ? 'Enabled' : 'Disabled'}
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
};

export default AdminPanelPage; 