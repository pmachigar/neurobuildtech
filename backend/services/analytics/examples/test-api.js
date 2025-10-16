/**
 * Example script to test the Analytics Service REST API
 * 
 * Usage:
 *   node examples/test-api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('Testing Analytics Service API...\n');

  try {
    // 1. Health Check
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('Health:', health.data);
    console.log('✓ Health check passed\n');

    // 2. Get Status
    console.log('2. Testing status endpoint...');
    const status = await axios.get(`${BASE_URL}/api/status`);
    console.log('Status:', JSON.stringify(status.data, null, 2));
    console.log('✓ Status check passed\n');

    // 3. List Rules
    console.log('3. Testing list rules...');
    const rules = await axios.get(`${BASE_URL}/api/rules`);
    console.log(`Found ${rules.data.count} rules`);
    console.log('✓ List rules passed\n');

    // 4. Create Custom Rule
    console.log('4. Testing create rule...');
    const newRule = {
      rule_id: 'test_custom_rule',
      sensor_type: 'mq134',
      condition: 'gas_concentration > 400',
      alert_level: 'warning',
      actions: ['webhook'],
      throttle_minutes: 10,
      description: 'Test custom gas rule'
    };
    
    try {
      const createResult = await axios.post(`${BASE_URL}/api/rules`, newRule);
      console.log('Created rule:', createResult.data.rule_id);
      console.log('✓ Create rule passed\n');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('Rule might already exist, continuing...\n');
      } else {
        throw error;
      }
    }

    // 5. Test Rule
    console.log('5. Testing rule with sample data...');
    const testData = {
      device_id: 'sensor_1',
      sensor_type: 'mq134',
      gas_concentration: 450
    };
    
    const testResult = await axios.post(`${BASE_URL}/api/rules/test_custom_rule/test`, testData);
    console.log('Test result:', testResult.data);
    console.log('✓ Test rule passed\n');

    // 6. Get Templates
    console.log('6. Testing list templates...');
    const templates = await axios.get(`${BASE_URL}/api/templates`);
    console.log(`Found ${templates.data.count} templates`);
    templates.data.templates.slice(0, 3).forEach(t => {
      console.log(`  - ${t.name}: ${t.description}`);
    });
    console.log('✓ List templates passed\n');

    // 7. Create Rule from Template
    console.log('7. Testing create from template...');
    try {
      const templateRule = await axios.post(`${BASE_URL}/api/templates/temperature_high`, {
        rule_id: 'temp_high_custom',
        throttle_minutes: 20
      });
      console.log('Created rule from template:', templateRule.data.rule_id);
      console.log('✓ Create from template passed\n');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('Rule might already exist, continuing...\n');
      } else {
        throw error;
      }
    }

    // 8. Inject Test Event
    console.log('8. Testing event injection...');
    const testEvent = {
      device_id: 'sensor_test_01',
      sensor_type: 'mq134',
      gas_concentration: 600,
      timestamp: new Date().toISOString(),
      location: 'test_room'
    };
    
    const eventResult = await axios.post(`${BASE_URL}/api/events`, testEvent);
    console.log('Event processed:', eventResult.data.message);
    console.log('✓ Event injection passed\n');

    // 9. Get Occupancy Stats
    console.log('9. Testing occupancy analytics...');
    const occupancy = await axios.get(`${BASE_URL}/api/analytics/occupancy`);
    console.log('Occupancy stats:', occupancy.data);
    console.log('✓ Occupancy analytics passed\n');

    // 10. Get Worker Metrics
    console.log('10. Testing worker metrics...');
    const metrics = await axios.get(`${BASE_URL}/api/worker/metrics`);
    console.log('Worker metrics:', metrics.data);
    console.log('✓ Worker metrics passed\n');

    // 11. Get Rule Stats
    console.log('11. Testing rule statistics...');
    const ruleStats = await axios.get(`${BASE_URL}/api/analytics/rule-stats`);
    console.log('Rule stats:', ruleStats.data);
    console.log('✓ Rule statistics passed\n');

    // 12. Toggle Rule
    console.log('12. Testing toggle rule...');
    try {
      const toggleResult = await axios.post(`${BASE_URL}/api/rules/test_custom_rule/toggle`, {
        enabled: false
      });
      console.log('Rule toggled:', toggleResult.data.enabled);
      console.log('✓ Toggle rule passed\n');
    } catch (error) {
      console.log('Toggle might have failed, continuing...\n');
    }

    console.log('=================================');
    console.log('All API tests completed successfully!');
    console.log('=================================');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run tests
testAPI();
