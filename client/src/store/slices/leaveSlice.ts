import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Leave, LeaveFilter, LeaveRequestForm } from '../../types';
import { leaveAPI } from '../../services/api';

interface LeaveState {
  leaves: Leave[];
  pendingLeaves: Leave[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
  statistics: any;
}

const initialState: LeaveState = {
  leaves: [],
  pendingLeaves: [],
  loading: false,
  error: null,
  pagination: null,
  statistics: null,
};

// Async thunks
export const requestLeave = createAsyncThunk(
  'leave/request',
  async (data: LeaveRequestForm, { rejectWithValue }) => {
    try {
      const response = await leaveAPI.request(data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Leave request failed');
    }
  }
);

export const getLeaveHistory = createAsyncThunk(
  'leave/getHistory',
  async (filters: LeaveFilter = {}, { rejectWithValue }) => {
    try {
      const response = await leaveAPI.getHistory(filters);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to get leave history');
    }
  }
);

export const getPendingLeaves = createAsyncThunk(
  'leave/getPending',
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const response = await leaveAPI.getPending(params);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to get pending leaves');
    }
  }
);

export const approveLeave = createAsyncThunk(
  'leave/approve',
  async ({ id, action, rejectionReason }: { id: string; action: string; rejectionReason?: string }, { rejectWithValue }) => {
    try {
      const response = await leaveAPI.approve(id, { action, rejectionReason });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to process leave request');
    }
  }
);

export const cancelLeave = createAsyncThunk(
  'leave/cancel',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await leaveAPI.cancel(id);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to cancel leave');
    }
  }
);

export const getLeaveById = createAsyncThunk(
  'leave/getById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await leaveAPI.getById(id);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to get leave details');
    }
  }
);

const leaveSlice = createSlice({
  name: 'leave',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearLeaves: (state) => {
      state.leaves = [];
      state.pagination = null;
      state.statistics = null;
    },
    clearPendingLeaves: (state) => {
      state.pendingLeaves = [];
    },
    addLeave: (state, action: PayloadAction<Leave>) => {
      state.leaves.unshift(action.payload);
    },
    updateLeave: (state, action: PayloadAction<Leave>) => {
      const index = state.leaves.findIndex(leave => leave._id === action.payload._id);
      if (index !== -1) {
        state.leaves[index] = action.payload;
      }
      
      // Also update in pending leaves if it exists
      const pendingIndex = state.pendingLeaves.findIndex(leave => leave._id === action.payload._id);
      if (pendingIndex !== -1) {
        state.pendingLeaves[pendingIndex] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Request Leave
      .addCase(requestLeave.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestLeave.fulfilled, (state, action) => {
        state.loading = false;
        state.leaves.unshift(action.payload.leave);
        state.error = null;
      })
      .addCase(requestLeave.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get Leave History
      .addCase(getLeaveHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLeaveHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.leaves = action.payload.leaves;
        state.pagination = action.payload.pagination;
        state.statistics = action.payload.statistics;
        state.error = null;
      })
      .addCase(getLeaveHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get Pending Leaves
      .addCase(getPendingLeaves.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPendingLeaves.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingLeaves = action.payload.leaves;
        state.error = null;
      })
      .addCase(getPendingLeaves.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Approve Leave
      .addCase(approveLeave.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(approveLeave.fulfilled, (state, action) => {
        state.loading = false;
        // Update the leave in both arrays
        const updatedLeave = action.payload.leave;
        const index = state.leaves.findIndex(leave => leave._id === updatedLeave._id);
        if (index !== -1) {
          state.leaves[index] = updatedLeave;
        }
        
        const pendingIndex = state.pendingLeaves.findIndex(leave => leave._id === updatedLeave._id);
        if (pendingIndex !== -1) {
          state.pendingLeaves.splice(pendingIndex, 1);
        }
        state.error = null;
      })
      .addCase(approveLeave.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Cancel Leave
      .addCase(cancelLeave.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelLeave.fulfilled, (state, action) => {
        state.loading = false;
        // Update the leave in the array
        const updatedLeave = action.payload.leave;
        const index = state.leaves.findIndex(leave => leave._id === updatedLeave._id);
        if (index !== -1) {
          state.leaves[index] = updatedLeave;
        }
        state.error = null;
      })
      .addCase(cancelLeave.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get Leave By ID
      .addCase(getLeaveById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLeaveById.fulfilled, (state, action) => {
        state.loading = false;
        // Add or update the leave in the array
        const leave = action.payload.leave;
        const index = state.leaves.findIndex(l => l._id === leave._id);
        if (index !== -1) {
          state.leaves[index] = leave;
        } else {
          state.leaves.unshift(leave);
        }
        state.error = null;
      })
      .addCase(getLeaveById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearLeaves, clearPendingLeaves, addLeave, updateLeave } = leaveSlice.actions;
export default leaveSlice.reducer; 