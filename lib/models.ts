import mongoose, { Schema, models, model, type Model } from "mongoose";

export type AdminUserDocument = {
  _id: mongoose.Types.ObjectId;
  fullName?: string;
  email: string;
  passwordHash: string;
  role: "admin" | "support";
  createdAt: Date;
  updatedAt: Date;
};

const AdminUserSchema = new Schema<AdminUserDocument>(
  {
    fullName: { type: String },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "support"],
      default: "admin",
      index: true,
    },
  },
  { timestamps: true }
);

export type TeacherDocument = {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  cin?: string;
  phone?: string;
  level?: "الإعدادي" | "الثانوي";
  subject?: string;
  classesCount?: number;
  testsPerTerm?: number;
  createdAt: Date;
  updatedAt: Date;
};

const TeacherSchema = new Schema<TeacherDocument>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, index: true },
    cin: { type: String, unique: true, sparse: true, index: true },
    phone: { type: String },
    level: { type: String, enum: ["الإعدادي", "الثانوي"], required: false },
    subject: { type: String },
    classesCount: { type: Number },
    testsPerTerm: { type: Number },
  },
  { timestamps: true }
);

export type LicenseStatus = "active" | "suspended" | "expired";

export type ActivationDocument = {
  _id: mongoose.Types.ObjectId;
  license: mongoose.Types.ObjectId;
  deviceId: string; // fingerprint from client
  userAgent?: string;
  ip?: string;
  activatedAt: Date;
  lastSeenAt?: Date;
  lastIp?: string;
  metadata?: Record<string, unknown>;
};

const ActivationSchema = new Schema<ActivationDocument>(
  {
    license: {
      type: Schema.Types.ObjectId,
      ref: "License",
      required: true,
      index: true,
    },
    deviceId: { type: String, required: true },
    userAgent: { type: String },
    ip: { type: String },
    activatedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date },
    lastIp: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: false }
);
ActivationSchema.index({ license: 1, deviceId: 1 }, { unique: true });

const EventLogSchema = new Schema<EventLogDocument>(
  {
    license: { type: Schema.Types.ObjectId, ref: "License" },
    teacher: { type: Schema.Types.ObjectId, ref: "Teacher" },
    type: { type: String, required: true },
    message: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const AdminUser: Model<AdminUserDocument> =
  (models.AdminUser as Model<AdminUserDocument>) ||
  model("AdminUser", AdminUserSchema);

export const Teacher: Model<TeacherDocument> =
  (models.Teacher as Model<TeacherDocument>) || model("Teacher", TeacherSchema);

export const Activation: Model<ActivationDocument> =
  (models.Activation as Model<ActivationDocument>) ||
  model("Activation", ActivationSchema);

export const EventLog: Model<EventLogDocument> =
  (models.EventLog as Model<EventLogDocument>) ||
  model("EventLog", EventLogSchema);

export type SettingDocument = {
  _id: mongoose.Types.ObjectId;
  key: string;
  value: any;
  updatedAt: Date;
};

const SettingSchema = new Schema<SettingDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: Schema.Types.Mixed,
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const Setting: Model<SettingDocument> =
  (models.Setting as Model<SettingDocument>) || model("Setting", SettingSchema);

// NEW: Usage Tracking Schema
export type UsageDocument = {
  _id: mongoose.Types.ObjectId;
  license: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  operationType: "upload" | "download" | "analysis";
  timestamp: Date;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    rowCount?: number;
    ip?: string;
  };
};

const UsageSchema = new Schema<UsageDocument>(
  {
    license: {
      type: Schema.Types.ObjectId,
      ref: "License",
      required: true,
      index: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    operationType: {
      type: String,
      enum: ["upload", "download", "analysis"],
      required: true,
      default: "upload",
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      fileName: String,
      fileSize: Number,
      rowCount: Number,
      ip: String,
    },
  },
  { timestamps: false }
);

// Compound index for efficient queries
UsageSchema.index({ license: 1, timestamp: -1 });
UsageSchema.index({ teacher: 1, timestamp: -1 });

export const Usage: Model<UsageDocument> =
  (models.Usage as Model<UsageDocument>) || model("Usage", UsageSchema);

// Update License Schema to include usage tracking fields
export type LicenseDocument = {
  _id: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  key: string;
  allowedDevices: number;
  validUntil: Date;
  status: LicenseStatus;
  uploadLimit: number; // NEW: Calculated limit
  uploadCount: number; // NEW: Current usage count
  createdAt: Date;
  updatedAt: Date;
};

const LicenseSchema = new Schema<LicenseDocument>(
  {
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    key: { type: String, required: true, unique: true, index: true },
    allowedDevices: { type: Number, default: 1, min: 1, max: 2 },
    validUntil: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "suspended", "expired"],
      default: "active",
      index: true,
    },
    uploadLimit: { type: Number, required: true, default: 10 }, // NEW
    uploadCount: { type: Number, default: 0, index: true }, // NEW
  },
  { timestamps: true }
);

export const License: Model<LicenseDocument> =
  (models.License as Model<LicenseDocument>) || model("License", LicenseSchema);

// Update EventLog types
export type EventLogDocument = {
  _id: mongoose.Types.ObjectId;
  license?: mongoose.Types.ObjectId;
  teacher?: mongoose.Types.ObjectId;
  type:
    | "license.created"
    | "license.suspended"
    | "license.expired"
    | "license.usage_limit_reached" // NEW
    | "license.usage_warning" // NEW
    | "activation.created"
    | "activation.rejected"
    | "validation.ok"
    | "validation.failed"
    | "upload.success" // NEW
    | "upload.blocked"; // NEW
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};
