// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

print('Starting MongoDB initialization...');

// Switch to the attendance_system database
db = db.getSiblingDB('attendance_system');

// Create collections with proper indexes
print('Creating collections and indexes...');

// Employees collection
db.createCollection('employees');
db.employees.createIndex({ "email": 1 }, { unique: true });
db.employees.createIndex({ "employeeId": 1 }, { unique: true });
db.employees.createIndex({ "department": 1 });
db.employees.createIndex({ "status": 1 });

// Attendance collection
db.createCollection('attendance');
db.attendance.createIndex({ "employeeId": 1, "date": 1 }, { unique: true });
db.attendance.createIndex({ "date": 1 });
db.attendance.createIndex({ "employeeId": 1 });
db.attendance.createIndex({ "status": 1 });

// Leaves collection
db.createCollection('leaves');
db.leaves.createIndex({ "employeeId": 1, "startDate": 1 });
db.leaves.createIndex({ "status": 1 });
db.leaves.createIndex({ "type": 1 });

// Documents collection
db.createCollection('documents');
db.documents.createIndex({ "employeeId": 1 });
db.documents.createIndex({ "type": 1 });
db.documents.createIndex({ "uploadDate": 1 });

// Holidays collection
db.createCollection('holidays');
db.holidays.createIndex({ "date": 1 }, { unique: true });
db.holidays.createIndex({ "year": 1 });

// Security audit logs collection
db.createCollection('securityauditlogs');
db.securityauditlogs.createIndex({ "timestamp": 1 });
db.securityauditlogs.createIndex({ "userId": 1 });
db.securityauditlogs.createIndex({ "action": 1 });

// System configuration collection
db.createCollection('systemconfigs');
db.systemconfigs.createIndex({ "key": 1 }, { unique: true });

// Security settings collection
db.createCollection('securitysettings');
db.securitysettings.createIndex({ "key": 1 }, { unique: true });

print('MongoDB initialization completed successfully!'); 