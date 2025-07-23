import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  socket: any | null;
  systemHealth: any | null;
}

const initialState: SocketState = {
  connected: false,
  connecting: false,
  error: null,
  socket: null,
  systemHealth: null,
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    connect: (state) => {
      state.connecting = true;
      state.error = null;
    },
    connectSuccess: (state, action: PayloadAction<any>) => {
      state.connected = true;
      state.connecting = false;
      state.socket = action.payload;
      state.error = null;
    },
    connectFailure: (state, action: PayloadAction<string>) => {
      state.connected = false;
      state.connecting = false;
      state.error = action.payload;
      state.socket = null;
    },
    disconnect: (state) => {
      state.connected = false;
      state.connecting = false;
      state.socket = null;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateSystemHealth: (state, action: PayloadAction<any>) => {
      state.systemHealth = action.payload;
    },
  },
});

export const {
  connect,
  connectSuccess,
  connectFailure,
  disconnect,
  setError,
  clearError,
  updateSystemHealth,
} = socketSlice.actions;

export default socketSlice.reducer; 