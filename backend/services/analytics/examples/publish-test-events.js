/**
 * Example script to publish test sensor events to MQTT
 * 
 * Usage:
 *   node examples/publish-test-events.js
 */

const mqtt = require('mqtt');

// Connect to MQTT broker
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  // Publish test events at intervals
  let counter = 0;
  
  setInterval(() => {
    counter++;
    
    // MQ134 Gas Sensor Event
    if (counter % 3 === 0) {
      const gasEvent = {
        device_id: 'sensor_gas_01',
        sensor_type: 'mq134',
        gas_concentration: Math.random() > 0.9 ? 550 : 100 + Math.random() * 200,
        timestamp: new Date().toISOString(),
        location: 'room_101'
      };
      
      client.publish('sensors/gas/sensor_gas_01', JSON.stringify(gasEvent));
      console.log('Published gas sensor event:', gasEvent.gas_concentration);
    }
    
    // LD2410 Presence Sensor Event
    if (counter % 5 === 0) {
      const presenceEvent = {
        device_id: 'sensor_presence_01',
        sensor_type: 'ld2410',
        value: Math.random() > 0.5 ? 1 : 0,
        presence: Math.random() > 0.5,
        timestamp: new Date().toISOString(),
        location: 'room_101'
      };
      
      client.publish('sensors/presence/sensor_presence_01', JSON.stringify(presenceEvent));
      console.log('Published presence sensor event:', presenceEvent.value);
    }
    
    // PIR Motion Sensor Event
    if (counter % 7 === 0) {
      const motionEvent = {
        device_id: 'sensor_motion_01',
        sensor_type: 'pir',
        value: Math.random() > 0.6 ? 1 : 0,
        motion: Math.random() > 0.6,
        timestamp: new Date().toISOString(),
        location: 'room_101'
      };
      
      client.publish('sensors/motion/sensor_motion_01', JSON.stringify(motionEvent));
      console.log('Published motion sensor event:', motionEvent.value);
    }
    
    // Temperature Sensor Event
    if (counter % 10 === 0) {
      const tempEvent = {
        device_id: 'sensor_temp_01',
        sensor_type: 'temperature',
        temperature: 20 + Math.random() * 10,
        value: 20 + Math.random() * 10,
        timestamp: new Date().toISOString(),
        location: 'room_101'
      };
      
      client.publish('sensors/temperature/sensor_temp_01', JSON.stringify(tempEvent));
      console.log('Published temperature sensor event:', tempEvent.temperature.toFixed(2));
    }
    
  }, 2000); // Publish every 2 seconds
});

client.on('error', (error) => {
  console.error('MQTT Error:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  client.end();
  process.exit(0);
});
