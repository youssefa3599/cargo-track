// src/models/Customer.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId?: string;
  country?: string;
  notes?: string;
  type: 'customer';
  userId: mongoose.Types.ObjectId;
  companyId: string; // ✅ ADDED - This was missing!
  companyName: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      maxlength: [50, 'Phone cannot exceed 50 characters'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    taxId: {
      type: String,
      trim: true,
      maxlength: [100, 'Tax ID cannot exceed 100 characters'],
      sparse: true,
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: ['customer'],
      required: [true, 'Type is required'],
      default: 'customer',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: String,
      required: true, // ✅ ADDED - This was missing!
    },
    companyName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ FIXED: Removed duplicate indexes to eliminate warnings
// Only use compound indexes, removed individual index: true from fields above

// Compound indexes for efficient queries
CustomerSchema.index({ userId: 1, companyName: 1 });
CustomerSchema.index({ userId: 1, type: 1 });
CustomerSchema.index({ companyId: 1, type: 1 });

// Prevent duplicate emails within the same company
CustomerSchema.index(
  { email: 1, companyId: 1 },
  { unique: true }
);

export default mongoose.models.Customer || 
  mongoose.model<ICustomer>('Customer', CustomerSchema);