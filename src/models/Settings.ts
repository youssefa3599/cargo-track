import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Settings Interface
 * Global application settings per company
 */
export interface ISettings extends Document {
  companyName: string;
  exchangeRates: {
    usdToEgp: number;
    lastUpdated: Date;
    updatedBy: mongoose.Types.ObjectId;
  };
  taxRates: {
    vat: number; // VAT percentage (default 14% for Egypt)
    insurance: number; // Insurance percentage (default 2%)
  };
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      unique: true,
      trim: true,
      index: true,
    },
    exchangeRates: {
      usdToEgp: {
        type: Number,
        required: true,
        default: 30.9, // Default exchange rate
        min: [0, 'Exchange rate must be positive'],
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    taxRates: {
      vat: {
        type: Number,
        required: true,
        default: 14, // 14% VAT in Egypt
        min: [0, 'VAT rate cannot be negative'],
        max: [100, 'VAT rate cannot exceed 100'],
      },
      insurance: {
        type: Number,
        required: true,
        default: 2, // 2% insurance
        min: [0, 'Insurance rate cannot be negative'],
        max: [100, 'Insurance rate cannot exceed 100'],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for company lookup
SettingsSchema.index({ companyName: 1 });

const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;