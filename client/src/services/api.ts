import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simple request interceptor to add auth token from localStorage
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        
        try {
          const response = await api.post('/auth/refresh', { refreshToken });
          const newToken = response.data.data?.accessToken;
          
          if (newToken) {
            localStorage.setItem('accessToken', newToken);
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return api(error.config);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
      
      // If refresh failed or no refresh token, redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// API service functions
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  logout: () => api.post('/auth/logout'),
  
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  
  me: () => api.get('/auth/me'),
  
  changePassword: (passwords: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', passwords),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
};

export const attendanceAPI = {
  punchIn: (data: { location: any; device?: string; notes?: string }) =>
    api.post('/attendance/punch-in', data),
  
  punchOut: (data: { location: any; device?: string; notes?: string }) =>
    api.post('/attendance/punch-out', data),
  
  getToday: () => api.get('/attendance/today'),
  
  getHistory: (params?: any) => api.get('/attendance/history', { params }),
  
  getById: (id: string) => api.get(`/attendance/${id}`),
  
  update: (id: string, data: any) => api.put(`/attendance/${id}`, data),
};

export const leaveAPI = {
  request: (data: any) => api.post('/leaves/request', data),
  
  getAll: (params?: any) => api.get('/leaves', { params }),
  
  getHistory: (params?: any) => api.get('/leaves/history', { params }),
  
  getPending: (params?: any) => api.get('/leaves/pending', { params }),
  
  approve: (id: string, data: { action: string; rejectionReason?: string }) =>
    api.put(`/leaves/${id}/approve`, data),
  
  cancel: (id: string) => api.put(`/leaves/${id}/cancel`),
  
  getById: (id: string) => api.get(`/leaves/${id}`),
};

export const employeeAPI = {
  getAll: (params?: any) => api.get('/employees', { params }),
  
  getMe: () => api.get('/employees/me'),
  
  getTeam: () => api.get('/employees/team'),
  
  getById: (id: string) => api.get(`/employees/${id}`),
  
  create: (data: any) => api.post('/employees', data),
  
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  
  delete: (id: string) => api.delete(`/employees/${id}`),
  
  activate: (id: string, isActive: boolean) =>
    api.put(`/employees/${id}/activate`, { isActive }),
  
  updateLeaveBalance: (id: string, leaveBalance: any) =>
    api.put(`/employees/${id}/leave-balance`, { leaveBalance }),
  
  updateProfilePicture: (id: string, formData: FormData) =>
    api.put(`/employees/${id}/profile-picture`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  deleteProfilePicture: (id: string) =>
    api.delete(`/employees/${id}/profile-picture`),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  
  getAttendanceReport: (params?: any) =>
    api.get('/admin/attendance-report', { params }),
  
  getLeaveReport: (params?: any) =>
    api.get('/admin/leave-report', { params }),
  
  getEmployeeReport: (params?: any) =>
    api.get('/admin/employee-report', { params }),
  
  getAnalytics: (params?: any) =>
    api.get('/admin/analytics', { params }),
  
  getSystemStats: () => api.get('/admin/system-stats'),
  
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  
  createUser: (userData: any) => api.post('/admin/users', userData),
  
  updateUser: (userId: string, userData: any) => api.put(`/admin/users/${userId}`, userData),
  
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),
  
  toggleUserStatus: (userId: string, isActive: boolean) => 
    api.patch(`/admin/users/${userId}/status`, { isActive }),
  
  getSettings: () => api.get('/admin/settings'),
  
  updateSettings: (settings: any) => api.put('/admin/settings', settings),
  
  getOfficeLocation: () => api.get('/admin/office-location'),
  
  updateOfficeLocation: (locationData: any) => api.put('/admin/office-location', locationData),
  
  createBackup: () => api.post('/admin/backup'),
  
  restoreSystem: () => api.post('/admin/restore'),
};

export { api }; 