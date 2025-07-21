import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, EmployeeFilter } from '../../types';
import { employeeAPI } from '../../services/api';

interface EmployeeState {
  employees: User[];
  currentEmployee: User | null;
  teamMembers: User[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
}

const initialState: EmployeeState = {
  employees: [],
  currentEmployee: null,
  teamMembers: [],
  loading: false,
  error: null,
  pagination: null,
};

// Async thunks
export const getAllEmployees = createAsyncThunk(
  'employee/getAll',
  async (filters: EmployeeFilter = {}, { rejectWithValue }) => {
    try {
      const response = await employeeAPI.getAll(filters);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to get employees');
    }
  }
);

export const getCurrentEmployee = createAsyncThunk(
  'employee/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await employeeAPI.getMe();
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to get current employee');
    }
  }
);

export const getTeamMembers = createAsyncThunk(
  'employee/getTeam',
  async (_, { rejectWithValue }) => {
    try {
      const response = await employeeAPI.getTeam();
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to get team members');
    }
  }
);

export const getEmployeeById = createAsyncThunk(
  'employee/getById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await employeeAPI.getById(id);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to get employee');
    }
  }
);

export const updateEmployee = createAsyncThunk(
  'employee/update',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await employeeAPI.update(id, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to update employee');
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  'employee/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await employeeAPI.delete(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to delete employee');
    }
  }
);

export const activateEmployee = createAsyncThunk(
  'employee/activate',
  async ({ id, isActive }: { id: string; isActive: boolean }, { rejectWithValue }) => {
    try {
      const response = await employeeAPI.activate(id, isActive);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to update employee status');
    }
  }
);

export const updateLeaveBalance = createAsyncThunk(
  'employee/updateLeaveBalance',
  async ({ id, leaveBalance }: { id: string; leaveBalance: any }, { rejectWithValue }) => {
    try {
      const response = await employeeAPI.updateLeaveBalance(id, leaveBalance);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to update leave balance');
    }
  }
);

const employeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearEmployees: (state) => {
      state.employees = [];
      state.pagination = null;
    },
    clearTeamMembers: (state) => {
      state.teamMembers = [];
    },
    setCurrentEmployee: (state, action: PayloadAction<User>) => {
      state.currentEmployee = action.payload;
    },
    addEmployee: (state, action: PayloadAction<User>) => {
      state.employees.unshift(action.payload);
    },
    updateEmployeeInList: (state, action: PayloadAction<User>) => {
      const index = state.employees.findIndex(emp => emp._id === action.payload._id);
      if (index !== -1) {
        state.employees[index] = action.payload;
      }
      
      // Also update in team members if it exists
      const teamIndex = state.teamMembers.findIndex(emp => emp._id === action.payload._id);
      if (teamIndex !== -1) {
        state.teamMembers[teamIndex] = action.payload;
      }
      
      // Update current employee if it's the same
      if (state.currentEmployee?._id === action.payload._id) {
        state.currentEmployee = action.payload;
      }
    },
    removeEmployee: (state, action: PayloadAction<string>) => {
      state.employees = state.employees.filter(emp => emp._id !== action.payload);
      state.teamMembers = state.teamMembers.filter(emp => emp._id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Get All Employees
      .addCase(getAllEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload.employees;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(getAllEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get Current Employee
      .addCase(getCurrentEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEmployee = action.payload.employee;
        state.error = null;
      })
      .addCase(getCurrentEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get Team Members
      .addCase(getTeamMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTeamMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.teamMembers = action.payload.employees;
        state.error = null;
      })
      .addCase(getTeamMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get Employee By ID
      .addCase(getEmployeeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getEmployeeById.fulfilled, (state, action) => {
        state.loading = false;
        // Add or update the employee in the array
        const employee = action.payload.employee;
        const index = state.employees.findIndex(emp => emp._id === employee._id);
        if (index !== -1) {
          state.employees[index] = employee;
        } else {
          state.employees.unshift(employee);
        }
        state.error = null;
      })
      .addCase(getEmployeeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update Employee
      .addCase(updateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        const updatedEmployee = action.payload.employee;
        const index = state.employees.findIndex(emp => emp._id === updatedEmployee._id);
        if (index !== -1) {
          state.employees[index] = updatedEmployee;
        }
        
        // Also update in team members if it exists
        const teamIndex = state.teamMembers.findIndex(emp => emp._id === updatedEmployee._id);
        if (teamIndex !== -1) {
          state.teamMembers[teamIndex] = updatedEmployee;
        }
        
        // Update current employee if it's the same
        if (state.currentEmployee?._id === updatedEmployee._id) {
          state.currentEmployee = updatedEmployee;
        }
        state.error = null;
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete Employee
      .addCase(deleteEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload;
        state.employees = state.employees.filter(emp => emp._id !== deletedId);
        state.teamMembers = state.teamMembers.filter(emp => emp._id !== deletedId);
        state.error = null;
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Activate Employee
      .addCase(activateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(activateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        const updatedEmployee = action.payload.employee;
        const index = state.employees.findIndex(emp => emp._id === updatedEmployee._id);
        if (index !== -1) {
          state.employees[index] = updatedEmployee;
        }
        
        // Also update in team members if it exists
        const teamIndex = state.teamMembers.findIndex(emp => emp._id === updatedEmployee._id);
        if (teamIndex !== -1) {
          state.teamMembers[teamIndex] = updatedEmployee;
        }
        state.error = null;
      })
      .addCase(activateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update Leave Balance
      .addCase(updateLeaveBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLeaveBalance.fulfilled, (state, action) => {
        state.loading = false;
        const updatedEmployee = action.payload.employee;
        const index = state.employees.findIndex(emp => emp._id === updatedEmployee._id);
        if (index !== -1) {
          state.employees[index] = updatedEmployee;
        }
        
        // Also update in team members if it exists
        const teamIndex = state.teamMembers.findIndex(emp => emp._id === updatedEmployee._id);
        if (teamIndex !== -1) {
          state.teamMembers[teamIndex] = updatedEmployee;
        }
        
        // Update current employee if it's the same
        if (state.currentEmployee?._id === updatedEmployee._id) {
          state.currentEmployee = updatedEmployee;
        }
        state.error = null;
      })
      .addCase(updateLeaveBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  clearEmployees, 
  clearTeamMembers, 
  setCurrentEmployee, 
  addEmployee, 
  updateEmployeeInList, 
  removeEmployee 
} = employeeSlice.actions;
export default employeeSlice.reducer; 