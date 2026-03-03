// src/models/PendingRegistration.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingRegistration extends Document {
  email: string;
  password: string;
  name: string;
  companyName: string;
  role: 'admin' | 'user';
  token: string;
  expires: Date;
}

const PendingRegistrationSchema = new Schema<IPendingRegistration>({
  email:       { type: String, required: true, unique: true, lowercase: true },
  password:    { type: String, required: true },
  name:        { type: String, required: true },
  companyName: { type: String, required: true },
  role:        { type: String, enum: ['admin', 'user'], default: 'user' },
  token:       { type: String, required: true },
  expires:     { type: Date, required: true },
}, { timestamps: true });

// ✅ Auto-delete after 24h — no cleanup needed
PendingRegistrationSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PendingRegistration ||
  mongoose.model<IPendingRegistration>('PendingRegistration', PendingRegistrationSchema);