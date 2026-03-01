import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * HS Code Interface
 * Harmonized System codes with customs duty rates
 */
export interface IHSCode extends Document {
  code: string;
  description: string;
  category: string;
  dutyPercentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HSCodeSchema = new Schema<IHSCode>(
  {
    code: {
      type: String,
      required: [true, 'HS Code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      length: 6,
      match: [/^\d{6}$/, 'HS Code must be exactly 6 digits'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: 100,
    },
    dutyPercentage: {
      type: Number,
      required: [true, 'Duty percentage is required'],
      min: [0, 'Duty percentage cannot be negative'],
      max: [100, 'Duty percentage cannot exceed 100'],
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups
HSCodeSchema.index({ code: 1 });
HSCodeSchema.index({ category: 1 });
HSCodeSchema.index({ isActive: 1 });

const HSCode: Model<IHSCode> =
  mongoose.models.HSCode || mongoose.model<IHSCode>('HSCode', HSCodeSchema);

export default HSCode;