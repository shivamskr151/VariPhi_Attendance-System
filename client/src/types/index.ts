// User/Employee Types
export interface User {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  role: 'employee' | 'manager' | 'admin';
  manager?: string;
  hireDate: string;
  isActive: boolean;
  profilePicture?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  leaveBalance: {
    annual: number;
    sick: number;
    personal: number;
    maternity: number;
    paternity: number;
  };
  workSchedule: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
  lastLogin?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Attendance Types
export interface Attendance {
  _id: string;
  employee: string | User;
  date: string;
  punchIn: {
    time: string;
    location: {
      latitude: number;
      longitude: number;
      address?: string;
      accuracy?: number;
    };
    device: 'web' | 'mobile' | 'tablet';
    ipAddress?: string;
    userAgent?: string;
  };
  punchOut?: {
    time: string;
    location: {
      latitude: number;
      longitude: number;
      address?: string;
      accuracy?: number;
    };
    device: 'web' | 'mobile' | 'tablet';
    ipAddress?: string;
    userAgent?: string;
  };
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave';
  notes?: string;
  isRemote: boolean;
  approvedBy?: string | User;
  approvedAt?: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

// Current Attendance Response Type (from /attendance/today endpoint)
export interface CurrentAttendance {
  _id: string;
  employee: string | User;
  date: string;
  punchIn?: {
    time: string;
    location: {
      latitude: number;
      longitude: number;
      address?: string;
      accuracy?: number;
    };
    device: 'web' | 'mobile' | 'tablet';
    ipAddress?: string;
    userAgent?: string;
  };
  punchOut?: {
    time: string;
    location: {
      latitude: number;
      longitude: number;
      address?: string;
      accuracy?: number;
    };
    device: 'web' | 'mobile' | 'tablet';
    ipAddress?: string;
    userAgent?: string;
  };
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave';
  notes?: string;
  isRemote: boolean;
  approvedBy?: string | User;
  approvedAt?: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

// Leave Types
export interface Leave {
  _id: string;
  employee: string | User;
  leaveType: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'bereavement' | 'other';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string | User;
  approvedAt?: string;
  rejectionReason?: string;
  attachments?: Array<{
    filename: string;
    originalName: string;
    path: string;
    uploadedAt: string;
  }>;
  isHalfDay: boolean;
  halfDayType?: 'morning' | 'afternoon';
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  workHandover?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

// Location Types
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface LeaveRequestForm {
  leaveType: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'bereavement' | 'other';
  startDate: string;
  endDate: string;
  reason: string;
  isHalfDay: boolean;
  halfDayType?: 'morning' | 'afternoon';
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  workHandover?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AttendanceForm {
  location: Location;
  device: 'web' | 'mobile' | 'tablet';
  notes?: string;
}

// Dashboard Types
export interface DashboardStats {
  overview: {
    totalEmployees: number;
    newEmployeesThisMonth: number;
    pendingLeaves: number;
    approvedLeavesThisMonth: number;
  };
  todayAttendance: {
    present?: number;
    absent?: number;
    late?: number;
  };
  departmentStats: Array<{
    _id: string;
    count: number;
  }>;
  recentActivities: {
    attendance: Attendance[];
    leaves: Leave[];
  };
}

// Report Types
export interface AttendanceReport {
  attendance: Attendance[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    totalRecords: number;
    totalHours: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    averageHours: number;
  };
  dailyStats: Array<{
    _id: string;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    totalHours: number;
  }>;
}

export interface LeaveReport {
  leaves: Leave[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    totalRequests: number;
    totalDays: number;
    approvedRequests: number;
    rejectedRequests: number;
    pendingRequests: number;
    averageDays: number;
  };
  leaveTypeStats: Array<{
    _id: string;
    count: number;
    totalDays: number;
    approvedCount: number;
  }>;
}

// Socket Types
export interface SocketMessage {
  type: string;
  data?: any;
  employeeId?: string;
}

// UI Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
}

export interface LoadingState {
  [key: string]: boolean;
}

// Filter Types
export interface AttendanceFilter {
  startDate?: string;
  endDate?: string;
  status?: string;
  employeeId?: string;
}

export interface LeaveFilter {
  startDate?: string;
  endDate?: string;
  status?: string;
  leaveType?: string;
  employeeId?: string;
}

export interface EmployeeFilter {
  department?: string;
  role?: string;
  isActive?: boolean;
  search?: string;
} 