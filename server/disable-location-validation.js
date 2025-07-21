#!/usr/bin/env node

/**
 * Quick script to disable location validation
 * Run this script to temporarily disable location validation for testing/development
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

try {
  // Read current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update or add LOCATION_VALIDATION_ENABLED
  if (envContent.includes('LOCATION_VALIDATION_ENABLED=')) {
    envContent = envContent.replace(
      /LOCATION_VALIDATION_ENABLED=.*/,
      'LOCATION_VALIDATION_ENABLED=false'
    );
  } else {
    envContent += '\nLOCATION_VALIDATION_ENABLED=false\n';
  }
  
  // Write back to .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Location validation has been disabled!');
  console.log('📝 LOCATION_VALIDATION_ENABLED=false has been added to your .env file');
  console.log('🔄 Restart your server for changes to take effect');
  console.log('');
  console.log('💡 To re-enable location validation later, set LOCATION_VALIDATION_ENABLED=true in your .env file');
  
} catch (error) {
  console.error('❌ Error updating .env file:', error.message);
  console.log('');
  console.log('🔧 Manual fix: Add this line to your server/.env file:');
  console.log('LOCATION_VALIDATION_ENABLED=false');
} 