import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQrSession extends Document {
  sessionId: string;
  licenseKey: string;
  status: "pending" | "completed" | "expired";
  imageUrl?: string;
  imageName?: string;
  imageSize?: number;
  uploadedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
}

const QrSessionSchema = new Schema<IQrSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  licenseKey: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "expired"],
    default: "pending",
    index: true,
  },
  imageUrl: {
    type: String,
  },
  imageName: {
    type: String,
  },
  imageSize: {
    type: Number,
  },
  uploadedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Auto-delete expired sessions after 1 hour
QrSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

// Prevent model recompilation in development
export const QrSession: Model<IQrSession> =
  mongoose.models.QrSession ||
  mongoose.model<IQrSession>("QrSession", QrSessionSchema);
