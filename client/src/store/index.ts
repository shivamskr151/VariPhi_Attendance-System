import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import attendanceReducer from './slices/attendanceSlice';
import leaveReducer from './slices/leaveSlice';
import employeeReducer from './slices/employeeSlice';
import socketReducer from './slices/socketSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    attendance: attendanceReducer,
    leave: leaveReducer,
    employee: employeeReducer,
    socket: socketReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['socket/connect', 'socket/disconnect'],
        ignoredPaths: ['socket.socket'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 