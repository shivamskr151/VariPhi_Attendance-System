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
  twoFactorEnabled?: boolean;
  preferences?: UserPreferences;
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
  twoFactorCode?: string;
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

// Preferences Types
export interface PreferenceOption {
  value: string | number | boolean;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface PreferenceField {
  key: string;
  label: string;
  description?: string;
  type: 'select' | 'switch' | 'number' | 'text' | 'time' | 'multiselect' | 'color' | 'slider';
  options?: PreferenceOption[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue: any;
  validation?: {
    required?: boolean;
    pattern?: string;
    message?: string;
  };
  dependsOn?: {
    field: string;
    value: any;
  };
  category: string;
  subcategory?: string;
  icon?: string;
  advanced?: boolean;
}

export interface PreferenceCategory {
  key: string;
  label: string;
  description?: string;
  icon: string;
  subcategories?: Array<{
    key: string;
    label: string;
    description?: string;
  }>;
}

export interface UserPreferences {
  // General Settings
  language: string;
  theme: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  numberFormat: string;
  
  // Display Settings
  dashboardLayout: string;
  sidebarCollapsed: boolean;
  compactMode: boolean;
  showTooltips: boolean;
  animationsEnabled: boolean;
  highContrast: boolean;
  fontSize: number;
  
  // Notification Settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  browserNotifications: boolean;
  soundEnabled: boolean;
  notificationSound: string;
  
  // Attendance Settings
  attendanceReminders: boolean;
  reminderTime: string;
  autoBreakDeduction: boolean;
  breakDuration: number;
  overtimeNotifications: boolean;
  lateArrivalNotifications: boolean;
  earlyDepartureNotifications: boolean;
  weekendReminders: boolean;
  holidayReminders: boolean;
  
  // Leave Settings
  leaveNotifications: boolean;
  leaveApprovalNotifications: boolean;
  leaveRejectionNotifications: boolean;
  leaveBalanceReminders: boolean;
  lowBalanceThreshold: number;
  autoSubmitLeaveRequests: boolean;
  
  // Report Settings
  weeklyReports: boolean;
  monthlyReports: boolean;
  reportFormat: string;
  reportDelivery: string;
  includeCharts: boolean;
  reportLanguage: string;
  
  // Privacy Settings
  profileVisibility: string;
  shareAttendanceData: boolean;
  shareLeaveData: boolean;
  allowManagerAccess: boolean;
  twoFactorReminders: boolean;
  
  // Advanced Settings
  enableBetaFeatures: boolean;
  enableDebugMode: boolean;
  dataRetentionPeriod: number;
  autoLogout: boolean;
  autoLogoutTime: number;
  sessionTimeout: number;
  
  // Mobile Settings
  locationTracking: boolean;
  backgroundSync: boolean;
  offlineMode: boolean;
  biometricLogin: boolean;
  quickActions: string[];
  
  // Integration Settings
  calendarSync: boolean;
  calendarProvider: string;
  slackIntegration: boolean;
  teamsIntegration: boolean;
  webhookUrl: string;
  
  // Accessibility Settings
  screenReader: boolean;
  keyboardNavigation: boolean;
  reducedMotion: boolean;
  colorBlindMode: string;
  largeText: boolean;
  
  // Custom Settings (extensible)
  customSettings: Record<string, any>;
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

// Holiday Type
export interface Holiday {
  _id?: string; // MongoDB document ID, optional for frontend creation
  date: string; // ISO date string
  name: string;
  description?: string;
} 