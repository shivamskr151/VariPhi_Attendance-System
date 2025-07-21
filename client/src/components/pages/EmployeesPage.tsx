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
  Fab,
  Tooltip,
  Avatar,
  IconButton,
  InputAdornment,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Add,
  Refresh,
  FilterList,
  Search,
  Edit,
  Delete,
  Visibility,
  Person,
  Email,
  Phone,
  Business,
  Work,
  CalendarToday,
  CheckCircle,
  Cancel,
  AdminPanelSettings,
  SupervisorAccount,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { User, EmployeeFilter } from '../../types';
import { employeeAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

const EmployeesPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { loading } = useSelector((state: RootState) => state.employee);

  const [employees, setEmployees] = useState<User[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states
  const [filters, setFilters] = useState<EmployeeFilter>({
    department: '',
    role: '',
    isActive: true,
  });

  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    position: '',
    role: 'employee' as 'employee' | 'manager' | 'admin',
    manager: null as string | null,
    hireDate: new Date().toISOString().split('T')[0], // Set today's date as default
    isActive: true,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
    },
    leaveBalance: {
      annual: 20,
      sick: 10,
      personal: 5,
      maternity: 0,
      paternity: 0,
    },
    workSchedule: {
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'UTC',
    },
  });

  useEffect(() => {
    fetchEmployees();
  }, [filters]);

  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.department) params.append('department', filters.department);
      if (filters.role) params.append('role', filters.role);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (searchTerm) params.append('search', searchTerm);

      const response = await employeeAPI.getAll(Object.fromEntries(params));
      if (response.data.success) {
        setEmployees(Array.isArray(response.data.data.employees) ? response.data.data.employees : []);
      } else {
        setEmployees([]);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch employees');
      setEmployees([]);
    }
  };

  const handleAddEmployee = async () => {
    // Clear any previous errors
    setError(null);
    
    // Validate required fields
    const requiredFields = {
      firstName: employeeForm.firstName,
      lastName: employeeForm.lastName,
      email: employeeForm.email,
      password: employeeForm.password,
      phone: employeeForm.phone,
      department: employeeForm.department,
      position: employeeForm.position,
      hireDate: employeeForm.hireDate
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || value.trim() === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Validate password length
    if (employeeForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employeeForm.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate phone number
    if (employeeForm.phone.length < 10) {
      setError('Phone number must be at least 10 digits');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Sending employee data:', employeeForm);
      
      // Check if user is authenticated
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Authentication required. Please log in again.');
        window.location.href = '/login';
        return;
      }

      const response = await employeeAPI.create(employeeForm);
      console.log('Response:', response.data);
      
      if (response.data.success) {
        setSuccess('Employee added successfully!');
        setShowAddDialog(false);
        resetForm();
        fetchEmployees();
      } else {
        setError(response.data.message || 'Failed to add employee');
      }
    } catch (error: any) {
      console.error('Error adding employee:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (error.response?.status === 400) {
        // Handle validation errors
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          const validationMessages = error.response.data.errors.map((err: any) => err.msg).join(', ');
          setError(`Validation errors: ${validationMessages}`);
        } else {
          setError(error.response.data.message || 'Invalid data provided');
        }
      } else if (error.response?.status === 409) {
        setError('An employee with this email already exists');
      } else if (error.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(error.response?.data?.message || 'Failed to add employee. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    setIsSubmitting(true);
    try {
      const response = await employeeAPI.update(selectedEmployee._id, employeeForm);
      if (response.data.success) {
        setSuccess('Employee updated successfully!');
        setShowEditDialog(false);
        resetForm();
        fetchEmployees();
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        // Handle validation errors
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          const validationMessages = error.response.data.errors.map((err: any) => err.msg).join(', ');
          setError(`Validation errors: ${validationMessages}`);
        } else {
          setError(error.response.data.message || 'Invalid data provided');
        }
      } else {
        setError(error.response?.data?.message || 'Failed to update employee');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;

    try {
      const response = await employeeAPI.delete(employeeId);
      if (response.data.success) {
        setSuccess('Employee deleted successfully!');
        fetchEmployees();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete employee');
    }
  };

  const handleToggleActive = async (employeeId: string, isActive: boolean) => {
    try {
      const response = await employeeAPI.activate(employeeId, isActive);
      if (response.data.success) {
        setSuccess(`Employee ${isActive ? 'activated' : 'deactivated'} successfully!`);
        fetchEmployees();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update employee status');
    }
  };

  const resetForm = () => {
    setEmployeeForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      department: '',
      position: '',
      role: 'employee',
      manager: null,
      hireDate: new Date().toISOString().split('T')[0], // Set today's date as default
      isActive: true,
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
      },
      leaveBalance: {
        annual: 20,
        sick: 10,
        personal: 5,
        maternity: 0,
        paternity: 0,
      },
      workSchedule: {
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'UTC',
      },
    });
  };

  const handleEditEmployee = (employee: User) => {
    setSelectedEmployee(employee);
    setEmployeeForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      password: '', // Password is not shown when editing
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      role: employee.role,
      manager: employee.manager || null,
      hireDate: employee.hireDate.split('T')[0],
      isActive: employee.isActive,
      address: employee.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
      emergencyContact: employee.emergencyContact || {
        name: '',
        relationship: '',
        phone: '',
      },
      leaveBalance: employee.leaveBalance,
      workSchedule: employee.workSchedule,
    });
    setShowEditDialog(true);
  };

  const handleViewEmployee = (employee: User) => {
    setSelectedEmployee(employee);
    setShowViewDialog(true);
  };

  const getRoleChip = (role: string) => {
    const roleConfig = {
      admin: { color: 'error' as const, icon: <AdminPanelSettings /> },
      manager: { color: 'warning' as const, icon: <SupervisorAccount /> },
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const canManageEmployees = () => {
    return user?.role === 'admin' || user?.role === 'manager';
  };

  const filteredEmployees = (employees || []).filter(employee => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        employee.firstName.toLowerCase().includes(searchLower) ||
        employee.lastName.toLowerCase().includes(searchLower) ||
        employee.email.toLowerCase().includes(searchLower) ||
        employee.employeeId.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {user?.role === 'manager' ? 'Team Management' : 'Employee Management'}
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{ mr: 1 }}
          >
            Filters
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchEmployees}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          {canManageEmployees() && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowAddDialog(true)}
            >
              {user?.role === 'manager' ? 'Add Team Member' : 'Add Employee'}
            </Button>
          )}
        </Box>
      </Box>

      {error && <ErrorAlert error={error} onClose={() => setError(null)} />}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Search Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search employees by name, email, or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={filters.department}
                  label="Department"
                  onChange={(e) =>
                    setFilters({ ...filters, department: e.target.value })
                  }
                >
                  <MenuItem value="">All Departments</MenuItem>
                  <MenuItem value="Engineering">Engineering</MenuItem>
                  <MenuItem value="Marketing">Marketing</MenuItem>
                  <MenuItem value="Sales">Sales</MenuItem>
                  <MenuItem value="HR">HR</MenuItem>
                  <MenuItem value="Finance">Finance</MenuItem>
                  <MenuItem value="Operations">Operations</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={filters.role}
                  label="Role"
                  onChange={(e) =>
                    setFilters({ ...filters, role: e.target.value })
                  }
                >
                  <MenuItem value="">All Roles</MenuItem>
                  <MenuItem value="employee">Employee</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.isActive === undefined ? '' : filters.isActive.toString()}
                  label="Status"
                  onChange={(e) =>
                    setFilters({ ...filters, isActive: e.target.value === 'true' })
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                onClick={() =>
                  setFilters({
                    department: '',
                    role: '',
                    isActive: true,
                  })
                }
                fullWidth
              >
                Reset Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Employee List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {user?.role === 'manager' ? 'Team Members' : 'Employees'} ({filteredEmployees.length})
          </Typography>
          {filteredEmployees.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {user?.role === 'manager' ? 'No team members found' : 'No employees found'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm ? 'Try adjusting your search terms' : user?.role === 'manager' ? 'Start by adding team members or adjust your filters' : 'Start by adding employees or adjust your filters'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Employee ID</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Position</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Hire Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2 }}>
                            {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">
                              {employee.firstName} {employee.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {employee.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{employee.employeeId}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>{getRoleChip(employee.role)}</TableCell>
                      <TableCell>{getStatusChip(employee.isActive)}</TableCell>
                      <TableCell>{formatDate(employee.hireDate)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewEmployee(employee)}
                          >
                            <Visibility />
                          </IconButton>
                          {canManageEmployees() && (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => handleEditEmployee(employee)}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteEmployee(employee._id)}
                              >
                                <Delete />
                              </IconButton>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={employee.isActive}
                                    onChange={(e) =>
                                      handleToggleActive(employee._id, e.target.checked)
                                    }
                                    size="small"
                                  />
                                }
                                label=""
                              />
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{user?.role === 'manager' ? 'Add New Team Member' : 'Add New Employee'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                value={employeeForm.firstName}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, firstName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={employeeForm.lastName}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={employeeForm.email}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, email: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={employeeForm.password}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, password: e.target.value })
                }
                required
                helperText="Minimum 6 characters"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={employeeForm.phone}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, phone: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Department</InputLabel>
                <Select
                  value={employeeForm.department}
                  label="Department"
                  onChange={(e) =>
                    setEmployeeForm({ ...employeeForm, department: e.target.value })
                  }
                >
                  <MenuItem value="">Select Department</MenuItem>
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
                value={employeeForm.position}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, position: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={employeeForm.role}
                  label="Role"
                  onChange={(e) =>
                    setEmployeeForm({ ...employeeForm, role: e.target.value as any })
                  }
                >
                  <MenuItem value="employee">Employee</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hire Date"
                type="date"
                value={employeeForm.hireDate}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, hireDate: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddEmployee}
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} /> : 'Add Employee'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{user?.role === 'manager' ? 'Edit Team Member' : 'Edit Employee'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                value={employeeForm.firstName}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, firstName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={employeeForm.lastName}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={employeeForm.email}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, email: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={employeeForm.phone}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, phone: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Department"
                value={employeeForm.department}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, department: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Position"
                value={employeeForm.position}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, position: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={employeeForm.role}
                  label="Role"
                  onChange={(e) =>
                    setEmployeeForm({ ...employeeForm, role: e.target.value as any })
                  }
                >
                  <MenuItem value="employee">Employee</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hire Date"
                type="date"
                value={employeeForm.hireDate}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, hireDate: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateEmployee}
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} /> : 'Update Employee'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Employee Dialog */}
      <Dialog
        open={showViewDialog}
        onClose={() => setShowViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Employee Details</DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ width: 80, height: 80, mr: 2 }}>
                    {selectedEmployee.firstName.charAt(0)}{selectedEmployee.lastName.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h5">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {selectedEmployee.position} • {selectedEmployee.department}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Employee ID: {selectedEmployee.employeeId}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Contact Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemAvatar>
                      <Email />
                    </ListItemAvatar>
                    <ListItemText primary="Email" secondary={selectedEmployee.email} />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Phone />
                    </ListItemAvatar>
                    <ListItemText primary="Phone" secondary={selectedEmployee.phone} />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Work Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemAvatar>
                      <Business />
                    </ListItemAvatar>
                    <ListItemText primary="Department" secondary={selectedEmployee.department} />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Work />
                    </ListItemAvatar>
                    <ListItemText primary="Position" secondary={selectedEmployee.position} />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <CalendarToday />
                    </ListItemAvatar>
                    <ListItemText primary="Hire Date" secondary={formatDate(selectedEmployee.hireDate)} />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Leave Balance
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                      <Typography variant="h4" color="primary.contrastText">
                        {selectedEmployee.leaveBalance?.annual || 0}
                      </Typography>
                      <Typography variant="body2" color="primary.contrastText">
                        Annual Leave
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="h4" color="warning.contrastText">
                        {selectedEmployee.leaveBalance?.sick || 0}
                      </Typography>
                      <Typography variant="body2" color="warning.contrastText">
                        Sick Leave
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="h4" color="info.contrastText">
                        {selectedEmployee.leaveBalance?.personal || 0}
                      </Typography>
                      <Typography variant="body2" color="info.contrastText">
                        Personal Leave
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                      <Typography variant="h4" color="success.contrastText">
                        {selectedEmployee.leaveBalance?.maternity || 0}
                      </Typography>
                      <Typography variant="body2" color="success.contrastText">
                        Maternity Leave
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      {canManageEmployees() && (
        <Tooltip title={user?.role === 'manager' ? 'Add Team Member' : 'Add Employee'}>
          <Fab
            color="primary"
            aria-label="add employee"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setShowAddDialog(true)}
          >
            <Add />
          </Fab>
        </Tooltip>
      )}
    </Box>
  );
};

export default EmployeesPage; 