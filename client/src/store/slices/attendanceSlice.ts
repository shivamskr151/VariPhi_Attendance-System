import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Attendance, AttendanceFilter, Location } from '../../types';
import { attendanceAPI } from '../../services/api';

interface AttendanceState {
  todayAttendance: Attendance | null;
  attendanceHistory: Attendance[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
  summary: {
    totalDays: number;
    totalHours: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
  } | null;
}

const initialState: AttendanceState = {
  todayAttendance: null,
  attendanceHistory: [],
  loading: false,
  error: null,
  pagination: null,
  summary: null,
};

// Async thunks
export const punchIn = createAsyncThunk(
  'attendance/punchIn',
  async (data: { location: Location; device?: string; notes?: string }, { rejectWithValue }) => {
    try {
      const response = await attendanceAPI.punchIn(data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Punch in failed');
    }
  }
);

export const punchOut = createAsyncThunk(
  'attendance/punchOut',
  async (data: { location: Location; device?: string; notes?: string }, { rejectWithValue }) => {
    try {
      const response = await attendanceAPI.punchOut(data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Punch out failed');
    }
  }
);

export const getTodayAttendance = createAsyncThunk(
  'attendance/getToday',
  async (_, { rejectWithValue }) => {
    try {
      const response = await attendanceAPI.getToday();
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to get today\'s attendance');
    }
  }
);

export const getAttendanceHistory = createAsyncThunk(
  'attendance/getHistory',
  async (filters: AttendanceFilter = {}, { rejectWithValue }) => {
    try {
      const response = await attendanceAPI.getHistory(filters);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to get attendance history');
    }
  }
);

export const updateAttendance = createAsyncThunk(
  'attendance/update',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await attendanceAPI.update(id, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to update attendance');
    }
  }
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAttendanceHistory: (state) => {
      state.attendanceHistory = [];
      state.pagination = null;
      state.summary = null;
    },
    setTodayAttendance: (state, action: PayloadAction<Attendance>) => {
      state.todayAttendance = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Punch In
      .addCase(punchIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(punchIn.fulfilled, (state, action) => {
        state.loading = false;
        state.todayAttendance = action.payload.attendance;
        state.error = null;
      })
      .addCase(punchIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Punch Out
      .addCase(punchOut.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(punchOut.fulfilled, (state, action) => {
        state.loading = false;
        state.todayAttendance = action.payload.attendance;
        state.error = null;
      })
      .addCase(punchOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get Today Attendance
      .addCase(getTodayAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTodayAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.todayAttendance = action.payload.attendance;
        state.error = null;
      })
      .addCase(getTodayAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get Attendance History
      .addCase(getAttendanceHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAttendanceHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceHistory = action.payload.attendance;
        state.pagination = action.payload.pagination;
        state.summary = action.payload.summary;
        state.error = null;
      })
      .addCase(getAttendanceHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update Attendance
      .addCase(updateAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAttendance.fulfilled, (state, action) => {
        state.loading = false;
        // Update the attendance in history if it exists
        const index = state.attendanceHistory.findIndex(
          (att) => att._id === action.payload._id
        );
        if (index !== -1) {
          state.attendanceHistory[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearAttendanceHistory, setTodayAttendance } = attendanceSlice.actions;
export default attendanceSlice.reducer; 