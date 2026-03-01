// src/models/Supplier.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplier extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  country: string;
  paymentTerms: string;
  rating?: number;
  taxId?: string;
  website?: string;
  notes?: string;
  companyId: string; // ✅ FIXED: Changed from ObjectId to string
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters']
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true }
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true
    },
    paymentTerms: {
      type: String,
      required: [true, 'Payment terms are required'],
      enum: ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'COD', 'Prepaid'],
      default: 'Net 30'
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    taxId: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    companyId: {
      type: String, // ✅ FIXED: Changed from Schema.Types.ObjectId to String
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
SupplierSchema.index({ companyId: 1, name: 1 });
SupplierSchema.index({ companyId: 1, isActive: 1 });

const Supplier: Model<ISupplier> = 
  mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);

export default Supplier;