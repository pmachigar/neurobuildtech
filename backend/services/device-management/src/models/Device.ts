import mongoose, { Schema, Document } from 'mongoose';

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
}

export enum SensorType {
  LD2410 = 'LD2410',
  PIR = 'PIR',
  MQ134 = 'MQ134',
}

export interface ISensor {
  type: SensorType;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface IDevice extends Document {
  deviceId: string;
  deviceType: string;
  name: string;
  description?: string;
  location?: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
  sensors: ISensor[];
  status: DeviceStatus;
  apiKey: string;
  metadata: Record<string, any>;
  configVersion: number;
  config: Record<string, any>;
  configHistory: Array<{
    version: number;
    config: Record<string, any>;
    timestamp: Date;
    updatedBy?: string;
  }>;
  lastSeen?: Date;
  connectionStats: {
    totalConnections: number;
    lastConnectedAt?: Date;
    lastDisconnectedAt?: Date;
    uptimeSeconds: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SensorSchema = new Schema<ISensor>({
  type: {
    type: String,
    enum: Object.values(SensorType),
    required: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  config: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

const DeviceSchema = new Schema<IDevice>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceType: {
      type: String,
      required: true,
      default: 'ESP32-S3',
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    location: {
      name: String,
      latitude: Number,
      longitude: Number,
    },
    sensors: {
      type: [SensorSchema],
      required: true,
      validate: {
        validator: function (sensors: ISensor[]) {
          return sensors.length > 0;
        },
        message: 'At least one sensor is required',
      },
    },
    status: {
      type: String,
      enum: Object.values(DeviceStatus),
      default: DeviceStatus.OFFLINE,
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    configVersion: {
      type: Number,
      default: 1,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    configHistory: [
      {
        version: Number,
        config: Schema.Types.Mixed,
        timestamp: Date,
        updatedBy: String,
      },
    ],
    lastSeen: {
      type: Date,
    },
    connectionStats: {
      totalConnections: {
        type: Number,
        default: 0,
      },
      lastConnectedAt: Date,
      lastDisconnectedAt: Date,
      uptimeSeconds: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

DeviceSchema.index({ status: 1, lastSeen: -1 });
DeviceSchema.index({ 'location.name': 1 });

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);
