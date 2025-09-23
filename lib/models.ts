import mongoose, { Schema, models, model, type Model } from "mongoose";

export type AdminUserDocument = {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

const AdminUserSchema = new Schema<AdminUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
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
    cin: { type: String },
    phone: { type: String },
    level: { type: String, enum: ["الإعدادي", "الثانوي"], required: false },
    subject: { type: String },
    classesCount: { type: Number },
    testsPerTerm: { type: Number },
  },
  { timestamps: true }
);

export type LicenseStatus = "active" | "suspended" | "expired";

export type LicenseDocument = {
  _id: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  key: string; // generated
  allowedDevices: number; // default 1, sometimes 2
  validUntil: Date; // 10 months from creation
  status: LicenseStatus;
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
  },
  { timestamps: true }
);

export type ActivationDocument = {
  _id: mongoose.Types.ObjectId;
  license: mongoose.Types.ObjectId;
  deviceId: string; // fingerprint from client
  userAgent?: string;
  ip?: string;
  activatedAt: Date;
  lastSeenAt?: Date;
  lastIp?: string;
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
  },
  { timestamps: false }
);
ActivationSchema.index({ license: 1, deviceId: 1 }, { unique: true });

export type EventLogDocument = {
  _id: mongoose.Types.ObjectId;
  license?: mongoose.Types.ObjectId;
  teacher?: mongoose.Types.ObjectId;
  type:
    | "license.created"
    | "license.suspended"
    | "license.expired"
    | "activation.created"
    | "activation.rejected"
    | "validation.ok"
    | "validation.failed";
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

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

export const License: Model<LicenseDocument> =
  (models.License as Model<LicenseDocument>) || model("License", LicenseSchema);

export const Activation: Model<ActivationDocument> =
  (models.Activation as Model<ActivationDocument>) ||
  model("Activation", ActivationSchema);

export const EventLog: Model<EventLogDocument> =
  (models.EventLog as Model<EventLogDocument>) ||
  model("EventLog", EventLogSchema);
