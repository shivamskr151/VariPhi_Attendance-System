require('dotenv').config();
const mongoose = require('mongoose');
const SystemConfig = require('./models/SystemConfig');
const Employee = require('./models/Employee');

async function initializeConfig() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system');
    console.log('✅ Connected to MongoDB');

    // Get or create system configuration
    const config = await SystemConfig.getConfig();
    
    // Set default values if they haven't been set
    let updated = false;
    
    if (config.officeLocation.latitude === 0 && config.officeLocation.longitude === 0) {
      config.officeLocation = {
        latitude: parseFloat(process.env.DEFAULT_LOCATION_LAT) || 0,
        longitude: parseFloat(process.env.DEFAULT_LOCATION_LNG) || 0,
        address: 'Office Address',
        city: 'City',
        state: 'State',
        country: 'Country'
      };
      updated = true;
    }
    
    if (config.locationValidation.enabled === false) {
      config.locationValidation = {
        enabled: process.env.LOCATION_VALIDATION_ENABLED === 'true',
        maxDistanceKm: parseFloat(process.env.MAX_DISTANCE_KM) || 100,
        allowRemoteWork: true
      };
      updated = true;
    }

    if (!config.adminContact) {
      config.adminContact = process.env.ADMIN_CONTACT_EMAIL || 'information@variphi.com';
      updated = true;
    }
    if (typeof config.selfRegistrationEnabled !== 'boolean') {
      config.selfRegistrationEnabled = false;
      updated = true;
    }
    
    if (updated) {
      await config.save();
      console.log('✅ System configuration initialized');
    } else {
      console.log('✅ System configuration already exists');
    }
    
    console.log('\n📋 Current Configuration:');
    console.log('Office Location:', config.officeLocation);
    console.log('Location Validation:', config.locationValidation);
    console.log('Working Hours:', config.workingHours);
    
    console.log('\n🔧 To update configuration:');
    console.log('1. Use the admin panel in the web interface');
    console.log('2. Or make API calls to /api/config');
    console.log('3. Or update the .env file and restart the server');
    
  } catch (error) {
    console.error('❌ Error initializing configuration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

async function initializeDatabase() {
  try {
    console.log('🔍 Checking if database needs initialization...');
    
    // Check if any employees exist
    const employeeCount = await Employee.countDocuments();
    
    if (employeeCount === 0) {
      console.log('📦 Database is empty, running seed data...');
      
      // Import and run the seed function
      const { seedDatabase } = require('./seedData');
      await seedDatabase();
      
      console.log('✅ Database initialization completed!');
      console.log('\n🔑 Default Admin Login:');
      console.log('   Email: shivam.kumar@variphi.com');
      console.log('   Password: Variphi@2025');
      console.log('   Role: Admin');
    } else {
      console.log(`✅ Database already has ${employeeCount} employees, skipping initialization.`);
    }
  } catch (error) {
    console.error('❌ Error during database initialization:', error);
    // Don't throw error, let the server continue
  }
}

module.exports = { initializeConfig, initializeDatabase }; 