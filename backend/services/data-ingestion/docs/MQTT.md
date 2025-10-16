# MQTT Documentation

## Overview

The Data Ingestion Service subscribes to MQTT topics to receive sensor data from ESP32 devices. This document describes the MQTT topic structure, payload format, and best practices.

## Connection Details

### Default Configuration

- **Broker URL**: `mqtt://localhost:1883`
- **Protocol**: MQTT v3.1.1 or v5.0
- **QoS**: 1 (at least once delivery)
- **Clean Session**: true
- **Keep Alive**: 60 seconds

### TLS/SSL Configuration (Production)

```
mqtt://broker.example.com:8883
```

Use TLS certificates for secure communication in production.

## Topic Structure

### Topic Hierarchy

```
neurobuild/sensors/{device_id}/{topic}
```

Where:
- `neurobuild` - Namespace/prefix
- `sensors` - Category
- `{device_id}` - Unique device identifier (e.g., `esp32-001`)
- `{topic}` - Data type topic

### Available Topics

| Topic Pattern | Description | Example |
|--------------|-------------|---------|
| `neurobuild/sensors/{device_id}/data` | All sensor data | `neurobuild/sensors/esp32-001/data` |
| `neurobuild/sensors/{device_id}/ld2410` | LD2410 presence data only | `neurobuild/sensors/esp32-001/ld2410` |
| `neurobuild/sensors/{device_id}/pir` | PIR motion data only | `neurobuild/sensors/esp32-001/pir` |
| `neurobuild/sensors/{device_id}/mq134` | MQ134 gas data only | `neurobuild/sensors/esp32-001/mq134` |

### Wildcard Subscriptions

The service subscribes to:
- `neurobuild/sensors/+/data`
- `neurobuild/sensors/+/ld2410`
- `neurobuild/sensors/+/pir`
- `neurobuild/sensors/+/mq134`

## Payload Format

### Complete Payload (All Sensors)

```json
{
  "device_id": "esp32-001",
  "timestamp": "2025-10-16T18:33:58Z",
  "sensors": {
    "ld2410": {
      "presence": true,
      "distance": 150,
      "energy": 75
    },
    "pir": {
      "motion_detected": true
    },
    "mq134": {
      "gas_concentration": 250,
      "unit": "ppm"
    }
  }
}
```

### Single Sensor Payload (PIR Only)

```json
{
  "device_id": "esp32-001",
  "timestamp": "2025-10-16T18:33:58Z",
  "sensors": {
    "pir": {
      "motion_detected": true
    }
  }
}
```

### Minimal Valid Payload

```json
{
  "device_id": "esp32-001",
  "timestamp": "2025-10-16T18:33:58Z",
  "sensors": {
    "pir": {
      "motion_detected": false
    }
  }
}
```

## QoS Levels

### Recommended QoS Levels

| QoS | Description | Use Case |
|-----|-------------|----------|
| 0 | At most once | High-frequency, non-critical data |
| 1 | At least once | **Recommended for sensor data** |
| 2 | Exactly once | Critical data (higher overhead) |

We recommend **QoS 1** for sensor data as it provides a good balance between reliability and performance.

## Retained Messages

### When to Use Retained Messages

- Device status updates
- Configuration changes
- Last known state

### When NOT to Use Retained Messages

- Regular sensor readings (high frequency)
- Time-series data
- Event-driven data

Example:
```javascript
// Regular sensor reading - DO NOT retain
client.publish(topic, payload, { qos: 1, retain: false });

// Device status - CAN retain
client.publish('neurobuild/sensors/esp32-001/status', 
               '{"online": true}', 
               { qos: 1, retain: true });
```

## ESP32 Examples

### Arduino/PlatformIO - Complete Example

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT configuration
const char* mqtt_server = "mqtt.example.com";
const int mqtt_port = 1883;
const char* mqtt_user = "username";  // Optional
const char* mqtt_pass = "password";  // Optional
const char* device_id = "esp32-001";

WiFiClient espClient;
PubSubClient client(espClient);

// NTP configuration for accurate timestamps
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;
const int daylightOffset_sec = 0;

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  setupWiFi();
  
  // Initialize NTP
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
}

void setupWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected");
  Serial.println(WiFi.localIP());
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    
    // Attempt to connect
    if (client.connect(device_id, mqtt_user, mqtt_pass)) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds");
      delay(5000);
    }
  }
}

String getISOTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    return "";
  }
  
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

void publishSensorData(bool presence, int distance, int energy, 
                       bool motion, float gasConcentration) {
  StaticJsonDocument<512> doc;
  
  // Required fields
  doc["device_id"] = device_id;
  doc["timestamp"] = getISOTimestamp();
  
  // Sensors
  JsonObject sensors = doc.createNestedObject("sensors");
  
  // LD2410 data
  JsonObject ld2410 = sensors.createNestedObject("ld2410");
  ld2410["presence"] = presence;
  ld2410["distance"] = distance;
  ld2410["energy"] = energy;
  
  // PIR data
  JsonObject pir = sensors.createNestedObject("pir");
  pir["motion_detected"] = motion;
  
  // MQ134 data
  JsonObject mq134 = sensors.createNestedObject("mq134");
  mq134["gas_concentration"] = gasConcentration;
  mq134["unit"] = "ppm";
  
  // Serialize to string
  char buffer[512];
  serializeJson(doc, buffer);
  
  // Publish
  char topic[100];
  snprintf(topic, sizeof(topic), "neurobuild/sensors/%s/data", device_id);
  
  if (client.publish(topic, buffer, false)) {
    Serial.println("Data published successfully");
  } else {
    Serial.println("Failed to publish data");
  }
}

void publishPIROnly(bool motion) {
  StaticJsonDocument<256> doc;
  
  doc["device_id"] = device_id;
  doc["timestamp"] = getISOTimestamp();
  
  JsonObject sensors = doc.createNestedObject("sensors");
  JsonObject pir = sensors.createNestedObject("pir");
  pir["motion_detected"] = motion;
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  char topic[100];
  snprintf(topic, sizeof(topic), "neurobuild/sensors/%s/pir", device_id);
  
  client.publish(topic, buffer, false);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Handle incoming messages if needed
  Serial.print("Message received on topic: ");
  Serial.println(topic);
}

void loop() {
  // Ensure MQTT connection
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  // Read sensors and publish (example)
  // Replace with actual sensor reading code
  bool presence = true;
  int distance = 150;
  int energy = 75;
  bool motion = true;
  float gasConcentration = 250.5;
  
  publishSensorData(presence, distance, energy, motion, gasConcentration);
  
  delay(5000); // Publish every 5 seconds
}
```

### Simplified PIR-Only Example

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* device_id = "esp32-pir-01";
const char* mqtt_server = "mqtt.example.com";

WiFiClient espClient;
PubSubClient client(espClient);

const int PIR_PIN = 4;

void publishMotion(bool detected) {
  StaticJsonDocument<256> doc;
  doc["device_id"] = device_id;
  doc["timestamp"] = "2025-10-16T18:33:58Z"; // Use NTP for real timestamp
  
  JsonObject sensors = doc.createNestedObject("sensors");
  JsonObject pir = sensors.createNestedObject("pir");
  pir["motion_detected"] = detected;
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  char topic[100];
  snprintf(topic, sizeof(topic), "neurobuild/sensors/%s/pir", device_id);
  
  client.publish(topic, buffer);
}

void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  bool motion = digitalRead(PIR_PIN);
  publishMotion(motion);
  
  delay(1000);
}
```

## Python Examples

### Basic Publisher

```python
import paho.mqtt.client as mqtt
import json
import time
from datetime import datetime

class SensorPublisher:
    def __init__(self, broker, port, device_id):
        self.broker = broker
        self.port = port
        self.device_id = device_id
        self.client = mqtt.Client(client_id=device_id)
        
        # Set callbacks
        self.client.on_connect = self.on_connect
        self.client.on_publish = self.on_publish
        
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"Connected to MQTT broker")
        else:
            print(f"Connection failed with code {rc}")
    
    def on_publish(self, client, userdata, mid):
        print(f"Message {mid} published")
    
    def connect(self):
        self.client.connect(self.broker, self.port, 60)
        self.client.loop_start()
    
    def publish_sensor_data(self, sensor_data):
        payload = {
            "device_id": self.device_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "sensors": sensor_data
        }
        
        topic = f"neurobuild/sensors/{self.device_id}/data"
        result = self.client.publish(topic, json.dumps(payload), qos=1)
        
        return result.mid
    
    def disconnect(self):
        self.client.loop_stop()
        self.client.disconnect()

# Usage
publisher = SensorPublisher("localhost", 1883, "esp32-001")
publisher.connect()

while True:
    sensor_data = {
        "ld2410": {
            "presence": True,
            "distance": 150,
            "energy": 75
        },
        "pir": {
            "motion_detected": True
        }
    }
    
    publisher.publish_sensor_data(sensor_data)
    time.sleep(5)
```

### Advanced Publisher with Retry Logic

```python
import paho.mqtt.client as mqtt
import json
import time
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RobustSensorPublisher:
    def __init__(self, broker, port, device_id, username=None, password=None):
        self.broker = broker
        self.port = port
        self.device_id = device_id
        self.connected = False
        
        self.client = mqtt.Client(client_id=device_id)
        
        if username and password:
            self.client.username_pw_set(username, password)
        
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_publish = self.on_publish
        
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.connected = True
            logger.info("Connected to MQTT broker")
        else:
            logger.error(f"Connection failed with code {rc}")
    
    def on_disconnect(self, client, userdata, rc):
        self.connected = False
        logger.warning("Disconnected from MQTT broker")
        
    def on_publish(self, client, userdata, mid):
        logger.debug(f"Message {mid} published")
    
    def connect(self, retry_count=5):
        for attempt in range(retry_count):
            try:
                self.client.connect(self.broker, self.port, 60)
                self.client.loop_start()
                
                # Wait for connection
                timeout = 10
                start = time.time()
                while not self.connected and (time.time() - start) < timeout:
                    time.sleep(0.1)
                
                if self.connected:
                    return True
                    
            except Exception as e:
                logger.error(f"Connection attempt {attempt + 1} failed: {e}")
                time.sleep(2 ** attempt)
        
        return False
    
    def publish_sensor_data(self, sensor_data, retry_count=3):
        if not self.connected:
            logger.warning("Not connected, attempting to reconnect...")
            if not self.connect():
                raise Exception("Failed to connect to MQTT broker")
        
        payload = {
            "device_id": self.device_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "sensors": sensor_data
        }
        
        topic = f"neurobuild/sensors/{self.device_id}/data"
        
        for attempt in range(retry_count):
            try:
                result = self.client.publish(topic, json.dumps(payload), qos=1)
                result.wait_for_publish(timeout=5)
                
                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    return result.mid
                    
            except Exception as e:
                logger.error(f"Publish attempt {attempt + 1} failed: {e}")
                time.sleep(1)
        
        raise Exception("Failed to publish after retries")
    
    def disconnect(self):
        self.client.loop_stop()
        self.client.disconnect()

# Usage
publisher = RobustSensorPublisher(
    "mqtt.example.com", 
    1883, 
    "esp32-001",
    username="user",
    password="pass"
)

if publisher.connect():
    try:
        while True:
            sensor_data = {
                "pir": {
                    "motion_detected": True
                }
            }
            
            try:
                message_id = publisher.publish_sensor_data(sensor_data)
                logger.info(f"Published message {message_id}")
            except Exception as e:
                logger.error(f"Failed to publish: {e}")
            
            time.sleep(5)
            
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        publisher.disconnect()
```

## Best Practices

### 1. Connection Management

- Use persistent connections
- Implement automatic reconnection
- Set appropriate keep-alive intervals (60 seconds recommended)

### 2. Message Publishing

- Use QoS 1 for sensor data
- Don't retain regular sensor readings
- Keep payloads under 4KB
- Publish at reasonable intervals (not more than 1Hz per sensor)

### 3. Topic Naming

- Use consistent device IDs
- Follow the defined topic structure
- Don't create custom topics without coordination

### 4. Error Handling

- Implement retry logic with exponential backoff
- Log all errors for debugging
- Monitor connection status

### 5. Timestamps

- Use NTP for accurate time synchronization
- Always use UTC timestamps
- Format: ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)

### 6. Data Quality

- Validate data before publishing
- Handle sensor read errors gracefully
- Don't publish invalid or incomplete data

## Troubleshooting

### Connection Issues

**Problem**: Client can't connect to broker

```bash
# Test broker connectivity
mosquitto_sub -h localhost -p 1883 -t "test" -v

# Test with authentication
mosquitto_sub -h broker.example.com -p 1883 -u username -P password -t "test"
```

**Solution**:
- Verify broker is running
- Check firewall rules
- Verify credentials
- Check network connectivity

### Message Not Received

**Problem**: Messages published but not received by service

```bash
# Subscribe to all sensor topics
mosquitto_sub -h localhost -t "neurobuild/sensors/#" -v
```

**Solution**:
- Verify topic structure matches expected format
- Check payload is valid JSON
- Verify QoS level
- Check service logs

### Invalid Payload

**Problem**: Service rejects messages

**Solution**:
- Validate JSON structure
- Ensure all required fields present
- Check data types and ranges
- Review validation errors in service logs

## Monitoring

### Subscribe to Topics for Monitoring

```bash
# Monitor all sensor data
mosquitto_sub -h localhost -t "neurobuild/sensors/+/data" -v

# Monitor specific device
mosquitto_sub -h localhost -t "neurobuild/sensors/esp32-001/#" -v

# Monitor specific sensor type
mosquitto_sub -h localhost -t "neurobuild/sensors/+/pir" -v
```

### Message Rate Monitoring

Monitor message rates to detect issues:

```bash
# Count messages per minute
mosquitto_sub -h localhost -t "neurobuild/sensors/#" -v | pv -l -i 60 > /dev/null
```

## Security Considerations

### Production Deployment

1. **Use TLS/SSL**
   ```
   mqtts://broker.example.com:8883
   ```

2. **Enable Authentication**
   - Use strong passwords
   - Implement username/password auth
   - Consider certificate-based auth

3. **Implement ACLs**
   - Restrict devices to their own topics
   - Read-only access where appropriate

4. **Network Security**
   - Use VPN or private networks
   - Implement rate limiting
   - Monitor for suspicious activity

## Performance Tuning

### Optimal Settings

- **Keep-Alive**: 60 seconds
- **QoS**: 1 (at least once)
- **Clean Session**: true
- **Max Payload Size**: 4KB
- **Publishing Rate**: Max 1 message/second per sensor

### Reducing Bandwidth

1. Publish only changed values
2. Use appropriate sampling rates
3. Compress payloads if needed
4. Batch multiple readings (use HTTP batch endpoint)

## Support

For issues and questions:
- Check service logs: `docker-compose logs -f data-ingestion`
- Review MQTT broker logs
- Test with `mosquitto_pub` and `mosquitto_sub`
- Create an issue in the GitHub repository
