const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
const Leave = require('./models/Leave');

// Sample data
const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Management'];
const positions = {
  'IT': ['Software Engineer', 'Senior Developer', 'DevOps Engineer', 'QA Engineer', 'Tech Lead'],
  'HR': ['HR Specialist', 'HR Manager', 'Recruiter', 'Benefits Coordinator'],
  'Finance': ['Accountant', 'Financial Analyst', 'Finance Manager', 'Bookkeeper'],
  'Marketing': ['Marketing Specialist', 'Marketing Manager', 'Content Creator', 'SEO Specialist'],
  'Sales': ['Sales Representative', 'Sales Manager', 'Account Executive', 'Business Development'],
  'Operations': ['Operations Manager', 'Operations Specialist', 'Project Coordinator'],
  'Management': ['CEO', 'CTO', 'CFO', 'COO', 'Department Head']
};

const sampleEmployees = [
  {
    employeeId: 'EMP001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@company.com',
    password: 'password123',
    phone: '+1-555-0101',
    department: 'IT',
    position: 'Senior Developer',
    role: 'admin',
    hireDate: new Date('2022-01-15'),
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    emergencyContact: {
      name: 'Jane Smith',
      relationship: 'Spouse',
      phone: '+1-555-0102'
    }
  },
  {
    employeeId: 'EMP002',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@company.com',
    password: 'password123',
    phone: '+1-555-0103',
    department: 'HR',
    position: 'HR Manager',
    role: 'manager',
    hireDate: new Date('2021-08-20'),
    address: {
      street: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    },
    emergencyContact: {
      name: 'Mike Johnson',
      relationship: 'Spouse',
      phone: '+1-555-0104'
    }
  },
  {
    employeeId: 'EMP003',
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.brown@company.com',
    password: 'password123',
    phone: '+1-555-0105',
    department: 'Finance',
    position: 'Financial Analyst',
    role: 'employee',
    hireDate: new Date('2023-03-10'),
    address: {
      street: '789 Pine Rd',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA'
    },
    emergencyContact: {
      name: 'Lisa Brown',
      relationship: 'Sister',
      phone: '+1-555-0106'
    }
  },
  {
    employeeId: 'EMP004',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@company.com',
    password: 'password123',
    phone: '+1-555-0107',
    department: 'Marketing',
    position: 'Marketing Specialist',
    role: 'employee',
    hireDate: new Date('2022-11-05'),
    address: {
      street: '321 Elm St',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA'
    },
    emergencyContact: {
      name: 'David Davis',
      relationship: 'Father',
      phone: '+1-555-0108'
    }
  },
  {
    employeeId: 'EMP005',
    firstName: 'David',
    lastName: 'Wilson',
    email: 'david.wilson@company.com',
    password: 'password123',
    phone: '+1-555-0109',
    department: 'Sales',
    position: 'Sales Manager',
    role: 'manager',
    hireDate: new Date('2021-12-01'),
    address: {
      street: '654 Maple Dr',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      country: 'USA'
    },
    emergencyContact: {
      name: 'Rachel Wilson',
      relationship: 'Spouse',
      phone: '+1-555-0110'
    }
  },
  {
    employeeId: 'EMP006',
    firstName: 'Lisa',
    lastName: 'Anderson',
    email: 'lisa.anderson@company.com',
    password: 'password123',
    phone: '+1-555-0111',
    department: 'IT',
    position: 'QA Engineer',
    role: 'employee',
    hireDate: new Date('2023-06-15'),
    address: {
      street: '987 Cedar Ln',
      city: 'Austin',
      state: 'TX',
      zipCode: '73301',
      country: 'USA'
    },
    emergencyContact: {
      name: 'Tom Anderson',
      relationship: 'Brother',
      phone: '+1-555-0112'
    }
  },
  {
    employeeId: 'EMP007',
    firstName: 'Robert',
    lastName: 'Taylor',
    email: 'robert.taylor@company.com',
    password: 'password123',
    phone: '+1-555-0113',
    department: 'Operations',
    position: 'Operations Manager',
    role: 'manager',
    hireDate: new Date('2022-04-20'),
    address: {
      street: '147 Birch Way',
      city: 'Denver',
      state: 'CO',
      zipCode: '80201',
      country: 'USA'
    },
    emergencyContact: {
      name: 'Maria Taylor',
      relationship: 'Spouse',
      phone: '+1-555-0114'
    }
  },
  {
    employeeId: 'EMP008',
    firstName: 'Jennifer',
    lastName: 'Martinez',
    email: 'jennifer.martinez@company.com',
    password: 'password123',
    phone: '+1-555-0115',
    department: 'Finance',
    position: 'Accountant',
    role: 'employee',
    hireDate: new Date('2023-01-30'),
    address: {
      street: '258 Spruce Ct',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85001',
      country: 'USA'
    },
    emergencyContact: {
      name: 'Carlos Martinez',
      relationship: 'Husband',
      phone: '+1-555-0116'
    }
  }
];

// Generate attendance data for the last 30 days
function generateAttendanceData(employees) {
  const attendanceData = [];
  const today = new Date();
  
  employees.forEach(employee => {
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      // Randomly skip some days (sick days, personal days)
      if (Math.random() < 0.05) continue;
      
      const punchInHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM
      const punchInMinute = Math.floor(Math.random() * 60);
      const punchOutHour = 17 + Math.floor(Math.random() * 2); // 5-6 PM
      const punchOutMinute = Math.floor(Math.random() * 60);
      
      const punchInTime = new Date(date);
      punchInTime.setHours(punchInHour, punchInMinute, 0, 0);
      
      const punchOutTime = new Date(date);
      punchOutTime.setHours(punchOutHour, punchOutMinute, 0, 0);
      
      // Determine status based on punch-in time
      let status = 'present';
      if (punchInHour > 9) {
        status = 'late';
      }
      
      attendanceData.push({
        employee: employee._id,
        date: date,
        punchIn: {
          time: punchInTime,
          location: {
            latitude: 40.7128 + (Math.random() - 0.5) * 0.01,
            longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
            address: 'Remote Location',
            accuracy: 10 + Math.random() * 20
          },
          device: ['web', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        punchOut: {
          time: punchOutTime,
          location: {
            latitude: 40.7128 + (Math.random() - 0.5) * 0.01,
            longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
            address: 'Remote Location',
            accuracy: 10 + Math.random() * 20
          },
          device: ['web', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        status: status,
        isRemote: true,
        isApproved: true
      });
    }
  });
  
  return attendanceData;
}

// Generate leave data
function generateLeaveData(employees) {
  const leaveData = [];
  const leaveTypes = ['annual', 'sick', 'personal', 'maternity', 'paternity'];
  const reasons = [
    'Family vacation',
    'Medical appointment',
    'Personal emergency',
    'Wedding ceremony',
    'Conference attendance',
    'Home renovation',
    'Mental health day',
    'Child care',
    'Religious holiday',
    'Moving to new house'
  ];
  
  employees.forEach(employee => {
    // Generate 1-3 leave requests per employee
    const numLeaves = 1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numLeaves; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 60) + 7); // Future dates
      
      const duration = 1 + Math.floor(Math.random() * 5); // 1-5 days
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration - 1);
      
      const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
      const status = ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)];
      
      const leave = {
        employee: employee._id,
        leaveType: leaveType,
        startDate: startDate,
        endDate: endDate,
        totalDays: duration,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        status: status,
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      };
      
      // Add approval info for approved/rejected leaves
      if (status !== 'pending') {
        const managers = employees.filter(emp => emp.role === 'manager' || emp.role === 'admin');
        if (managers.length > 0) {
          leave.approvedBy = managers[Math.floor(Math.random() * managers.length)]._id;
          leave.approvedAt = new Date();
        }
      }
      
      leaveData.push(leave);
    }
  });
  
  return leaveData;
}

// Main seeding function
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGODB_URI_PROD);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Employee.deleteMany({});
    await Attendance.deleteMany({});
    await Leave.deleteMany({});
    console.log('✅ Existing data cleared');
    
    // Create employees
    console.log('👥 Creating employees...');
    const createdEmployees = [];
    
    for (const employeeData of sampleEmployees) {
      const employee = new Employee(employeeData);
      await employee.save();
      createdEmployees.push(employee);
      console.log(`✅ Created employee: ${employee.firstName} ${employee.lastName} (${employee.employeeId})`);
    }
    
    // Set manager relationships
    const managers = createdEmployees.filter(emp => emp.role === 'manager' || emp.role === 'admin');
    const regularEmployees = createdEmployees.filter(emp => emp.role === 'employee');
    
    for (const employee of regularEmployees) {
      const manager = managers[Math.floor(Math.random() * managers.length)];
      employee.manager = manager._id;
      await employee.save();
    }
    
    console.log('✅ Manager relationships set');
    
    // Generate and create attendance data
    console.log('📊 Creating attendance records...');
    const attendanceData = generateAttendanceData(createdEmployees);
    
    for (const attendance of attendanceData) {
      const attendanceRecord = new Attendance(attendance);
      await attendanceRecord.save();
    }
    
    console.log(`✅ Created ${attendanceData.length} attendance records`);
    
    // Generate and create leave data
    console.log('🏖️ Creating leave requests...');
    const leaveData = generateLeaveData(createdEmployees);
    
    for (const leave of leaveData) {
      const leaveRecord = new Leave(leave);
      await leaveRecord.save();
    }
    
    console.log(`✅ Created ${leaveData.length} leave requests`);
    
    // Display summary
    console.log('\n📋 Seeding Summary:');
    console.log(`   👥 Employees: ${createdEmployees.length}`);
    console.log(`   📊 Attendance Records: ${attendanceData.length}`);
    console.log(`   🏖️ Leave Requests: ${leaveData.length}`);
    
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Email: john.smith@company.com');
    console.log('   Password: password123');
    console.log('   Role: Admin');
    
    console.log('\n✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase }; 