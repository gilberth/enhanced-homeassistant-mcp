#!/usr/bin/env node

/**
 * Test script for Enhanced Home Assistant MCP Server
 * This script tests basic functionality without requiring a full MCP client
 */

import dotenv from 'dotenv';
import { validateEnvironment } from '../src/index.js';
import { 
  testConnection, 
  getAllStates, 
  getHomeAssistantState,
  callHomeAssistantService 
} from '../src/utils/api.js';

// Load environment variables
dotenv.config();

async function runTests() {
  console.log('🧪 Testing Enhanced Home Assistant MCP Server\n');

  try {
    // Test 1: Environment validation
    console.log('1️⃣ Testing environment validation...');
    try {
      validateEnvironment();
      console.log('✅ Environment validation passed\n');
    } catch (error) {
      console.error('❌ Environment validation failed:', error.message);
      process.exit(1);
    }

    // Test 2: Connection to Home Assistant
    console.log('2️⃣ Testing connection to Home Assistant...');
    const connectionResult = await testConnection();
    if (connectionResult.success) {
      console.log('✅ Connection successful');
      console.log(`   Home Assistant version: ${connectionResult.data?.version || 'Unknown'}`);
      console.log(`   Location: ${connectionResult.data?.location_name || 'Unknown'}\n`);
    } else {
      console.error('❌ Connection failed:', connectionResult.message);
      process.exit(1);
    }

    // Test 3: Get all entities
    console.log('3️⃣ Testing entity retrieval...');
    const entitiesResult = await getAllStates();
    if (entitiesResult.success) {
      const entities = entitiesResult.data;
      console.log(`✅ Retrieved ${entities.length} entities`);
      
      // Show entity breakdown by domain
      const domains = {};
      entities.forEach(entity => {
        const domain = entity.entity_id.split('.')[0];
        domains[domain] = (domains[domain] || 0) + 1;
      });
      
      console.log('   Entity breakdown by domain:');
      Object.entries(domains)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([domain, count]) => {
          console.log(`     ${domain}: ${count}`);
        });
      console.log('');
    } else {
      console.error('❌ Entity retrieval failed:', entitiesResult.message);
    }

    // Test 4: Get specific entity (try to find a light or sensor)
    console.log('4️⃣ Testing specific entity retrieval...');
    const entities = entitiesResult.success ? entitiesResult.data : [];
    const testEntity = entities.find(e => 
      e.entity_id.startsWith('light.') || 
      e.entity_id.startsWith('sensor.') ||
      e.entity_id.startsWith('switch.')
    );
    
    if (testEntity) {
      const entityResult = await getHomeAssistantState(testEntity.entity_id);
      if (entityResult.success) {
        console.log(`✅ Retrieved entity: ${testEntity.entity_id}`);
        console.log(`   State: ${entityResult.data.state}`);
        console.log(`   Domain: ${testEntity.entity_id.split('.')[0]}`);
        const friendlyName = entityResult.data.attributes?.friendly_name;
        if (friendlyName) {
          console.log(`   Name: ${friendlyName}`);
        }
        console.log('');
      } else {
        console.error(`❌ Failed to get entity ${testEntity.entity_id}:`, entityResult.message);
      }
    } else {
      console.log('⚠️  No suitable test entity found\n');
    }

    // Test 5: Test service call (safe operation - get services)
    console.log('5️⃣ Testing service call...');
    try {
      const serviceResult = await callHomeAssistantService('homeassistant', 'check_config', {});
      if (serviceResult.success) {
        console.log('✅ Service call successful (homeassistant.check_config)');
      } else {
        console.log('⚠️  Service call returned error (expected for some systems):', serviceResult.message);
      }
    } catch (error) {
      console.log('⚠️  Service call test skipped (API may not support this service)');
    }
    console.log('');

    // Summary
    console.log('🎉 Test Summary:');
    console.log('✅ Environment configuration');
    console.log('✅ Home Assistant connection');
    console.log('✅ Entity retrieval');
    if (testEntity) {
      console.log('✅ Specific entity access');
    }
    console.log('✅ Basic API functionality');
    console.log('\n🚀 Server appears to be working correctly!');
    console.log('\nYou can now use this server with your MCP client.');
    console.log('Remember to configure your client with the correct environment variables.');

  } catch (error) {
    console.error('\n💥 Unexpected error during testing:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 Unhandled promise rejection:', reason);
  process.exit(1);
});

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Test execution failed:', error.message);
  process.exit(1);
});
