// models/Shipment.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// INTERFACES
// ============================================

/**
 * Status history entry interface
 */
export interface IStatusHistory {
  status: 'pending' | 'in-transit' | 'customs' | 'delivered' | 'cancelled';
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
  notes?: string;
  location?: string;
}

/**
 * Product calculation details
 */
export interface IProductCalculation {
  productId: string;
  productName: string;
  hsCode?: string;
  quantity: number;
  unitPrice: number;
  totalProductCost: number;
  dutyPercentage: number;
  dutyAmount: number;
}

/**
 * Cost breakdown interface
 */
export interface ICostBreakdown {
  productCost: number;
  shippingCost: number;
  insuranceCost: number;
  insurancePercentage: number;
  totalDuty: number;
  vat: number;
  vatPercentage: number;
  totalLandedCost: number;
  totalLandedCostEGP: number;
  totalQuantity: number;
  costPerUnit: number;
  costPerUnitEGP: number;
  exchangeRate: number;
  products: IProductCalculation[];
}

/**
 * Dimensions interface
 */
export interface IDimensions {
  length: number;
  width: number;
  height: number;
}

/**
 * Main Shipment interface
 */
export interface IShipment extends Document {
  companyName: string;
  companyId?: string;
  shipmentId: string;
  origin: string;
  destination: string;
  shippingDate: Date;
  estimatedArrival: Date;
  status: 'pending' | 'in-transit' | 'customs' | 'delivered' | 'cancelled';
  products: Array<{
    productId: mongoose.Types.ObjectId;
    quantity: number;
  }>;
  createdBy: mongoose.Types.ObjectId;
  statusHistory: IStatusHistory[];
  
  // ✨ Financial fields
  shippingCost?: number;
  exchangeRate?: number;
  currency?: string;
  insurancePercentage?: number;
  vatPercentage?: number;
  costBreakdown?: ICostBreakdown;
  
  // 💰 Revenue & Profit fields (UPDATED)
  customerPayment?: number;        // What customer pays you (in USD or currency)
  serviceMarkup?: number;           // Service fee % (e.g., 15 = 15%)
  profit?: number;                  // Your profit (customerPayment - totalCost)
  companyProfit?: number;           // Alias for profit (backward compatibility)
  profitMargin?: number;            // Calculated: (profit / customerPayment) * 100
  
  // 📊 Individual cost breakdown fields (ADDED)
  totalCost?: number;               // Total cost before markup
  customsDuty?: number;             // Customs duty amount
  insurance?: number;               // Insurance cost
  vat?: number;                     // VAT amount
  
  // Customer/Supplier fields
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  supplierId?: mongoose.Types.ObjectId;
  supplierName?: string;
  
  // Tracking & Logistics fields
  trackingNumber?: string;
  carrier?: string;
  weight?: number;
  dimensions?: IDimensions;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  currentLocation?: string;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SCHEMA DEFINITION
// ============================================

const ShipmentSchema = new Schema<IShipment>(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      index: true,
      trim: true,
    },
    companyId: {
      type: String,
      index: true,
      trim: true,
    },
    shipmentId: {
      type: String,
      required: [true, 'Shipment ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    origin: {
      type: String,
      required: [true, 'Origin is required'],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
    },
    shippingDate: {
      type: Date,
      required: [true, 'Shipping date is required'],
    },
    estimatedArrival: {
      type: Date,
      required: [true, 'Estimated arrival date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'in-transit', 'customs', 'delivered', 'cancelled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'pending',
    },
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: [true, 'Product ID is required'],
        },
        quantity: {
          type: Number,
          required: [true, 'Quantity is required'],
          min: [1, 'Quantity must be at least 1'],
        },
        _id: false,
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
    },
    // Status history tracking
    statusHistory: [
      {
        status: {
          type: String,
          enum: ['pending', 'in-transit', 'customs', 'delivered', 'cancelled'],
          required: true,
        },
        changedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
          required: true,
        },
        notes: {
          type: String,
          maxlength: 500,
        },
        location: {
          type: String,
          trim: true,
          maxlength: 200,
        },
        _id: false,
      },
    ],
    
    // ✨ Financial fields
    shippingCost: {
      type: Number,
      min: [0, 'Shipping cost cannot be negative'],
    },
    exchangeRate: {
      type: Number,
      min: [0, 'Exchange rate cannot be negative'],
      default: 50,
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EGP', 'EUR', 'GBP'],
      uppercase: true,
    },
    insurancePercentage: {
      type: Number,
      min: [0, 'Insurance percentage cannot be negative'],
      default: 2,
    },
    vatPercentage: {
      type: Number,
      min: [0, 'VAT percentage cannot be negative'],
      default: 14,
    },
    costBreakdown: {
      type: Schema.Types.Mixed,
      default: null,
    },
    
    // 💰 Revenue & Profit fields (UPDATED)
    customerPayment: {
      type: Number,
      min: [0, 'Customer payment cannot be negative'],
    },
    serviceMarkup: {
      type: Number,
      min: [0, 'Service markup cannot be negative'],
      max: [100, 'Service markup cannot exceed 100%'],
      default: 15,
    },
    profit: {
      type: Number,
    },
    companyProfit: {
      type: Number,
    },
    profitMargin: {
      type: Number,
    },
    
    // 📊 Individual cost breakdown fields (ADDED)
    totalCost: {
      type: Number,
      min: [0, 'Total cost cannot be negative'],
    },
    customsDuty: {
      type: Number,
      min: [0, 'Customs duty cannot be negative'],
    },
    insurance: {
      type: Number,
      min: [0, 'Insurance cannot be negative'],
    },
    vat: {
      type: Number,
      min: [0, 'VAT cannot be negative'],
    },
    
    // Customer/Supplier fields
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    supplierName: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    
    // Tracking & Logistics fields
    trackingNumber: {
      type: String,
      trim: true,
      uppercase: true,
      // unique + sparse: MongoDB skips null values in the index, so nulls don't
      // conflict with each other — but two shipments with the SAME non-null
      // tracking number will correctly be rejected with a duplicate key error.
      unique: true,
      sparse: true,
    },
    carrier: {
      type: String,
      enum: {
        values: ['FedEx', 'UPS', 'DHL', 'USPS', 'Maersk', 'Other'],
        message: '{VALUE} is not a valid carrier',
      },
      trim: true,
    },
    weight: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
    },
    dimensions: {
      length: {
        type: Number,
        min: [0, 'Length cannot be negative'],
      },
      width: {
        type: Number,
        min: [0, 'Width cannot be negative'],
      },
      height: {
        type: Number,
        min: [0, 'Height cannot be negative'],
      },
      _id: false,
    },
    estimatedDelivery: {
      type: Date,
    },
    actualDelivery: {
      type: Date,
    },
    currentLocation: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    notes: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

ShipmentSchema.index({ companyName: 1, status: 1 });
ShipmentSchema.index({ companyName: 1, shippingDate: -1 });
ShipmentSchema.index({ companyId: 1, status: 1 });
ShipmentSchema.index({ customerId: 1 });
ShipmentSchema.index({ supplierId: 1 });
ShipmentSchema.index({ currentLocation: 1 });

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Guard against duplicate trackingNumber at the application layer.
 * The sparse unique index handles DB-level enforcement, but this gives
 * a clear error message before the save attempt hits MongoDB.
 */
ShipmentSchema.pre('save', async function (next) {
  if (this.trackingNumber && this.isModified('trackingNumber')) {
    const existing = await mongoose.models.Shipment?.findOne({
      trackingNumber: this.trackingNumber,
      _id: { $ne: this._id },
    });
    if (existing) {
      return next(new Error(`Tracking number "${this.trackingNumber}" is already assigned to shipment ${existing.shipmentId}`));
    }
  }
  next();
});

/**
 */
ShipmentSchema.path('estimatedArrival').validate(function (value) {
  if (this.shippingDate && value <= this.shippingDate) {
    throw new Error('Estimated arrival must be after shipping date');
  }
  return true;
}, 'Estimated arrival must be after shipping date');

/**
 * Validate actualDelivery is set when status is delivered
 */
ShipmentSchema.pre('save', function (next) {
  if (this.status === 'delivered' && !this.actualDelivery) {
    this.actualDelivery = new Date();
  }
  next();
});

/**
 * 🔧 FIXED: Calculate profit before saving (only if not already set)
 * This allows frontend to control calculations while providing fallback
 */
ShipmentSchema.pre('save', function (next) {
  // Sync profit and companyProfit (keep both for backward compatibility)
  if (this.profit !== undefined && this.profit !== null) {
    this.companyProfit = this.profit;
  } else if (this.companyProfit !== undefined && this.companyProfit !== null) {
    this.profit = this.companyProfit;
  }
  
  // Calculate profit margin if we have both customerPayment and profit
  if (this.customerPayment && this.customerPayment > 0 && this.profit !== undefined) {
    this.profitMargin = (this.profit / this.customerPayment) * 100;
  }
  
  // FALLBACK: Only auto-calculate if profit is NOT already set
  // This happens when creating shipments via POST (old flow)
  if (this.profit === undefined || this.profit === null) {
    // Try to calculate from customerPayment and totalCost
    if (this.customerPayment && this.totalCost) {
      this.profit = this.customerPayment - this.totalCost;
      this.companyProfit = this.profit;
      
      if (this.customerPayment > 0) {
        this.profitMargin = (this.profit / this.customerPayment) * 100;
      }
    }
    // Try to calculate from costBreakdown (legacy)
    else if (this.customerPayment && this.costBreakdown) {
      const totalCost = this.costBreakdown.totalLandedCost || 0;
      this.profit = this.customerPayment - totalCost;
      this.companyProfit = this.profit;
      
      if (this.customerPayment > 0) {
        this.profitMargin = (this.profit / this.customerPayment) * 100;
      }
    }
    // Calculate customerPayment from serviceMarkup if not provided
    else if (!this.customerPayment && this.serviceMarkup) {
      const totalCost = this.totalCost || this.costBreakdown?.totalLandedCost || 0;
      if (totalCost > 0) {
        this.customerPayment = totalCost * (1 + this.serviceMarkup / 100);
        this.profit = this.customerPayment - totalCost;
        this.companyProfit = this.profit;
        this.profitMargin = this.serviceMarkup;
      }
    }
  }
  
  next();
});

/**
 * Validate estimatedDelivery
 */
ShipmentSchema.path('estimatedDelivery').validate(function (value) {
  if (value && this.shippingDate && value <= this.shippingDate) {
    throw new Error('Estimated delivery must be after shipping date');
  }
  return true;
}, 'Estimated delivery must be after shipping date');

/**
 * Validate actualDelivery
 */
ShipmentSchema.path('actualDelivery').validate(function (value) {
  if (value && this.shippingDate && value < this.shippingDate) {
    throw new Error('Actual delivery cannot be before shipping date');
  }
  return true;
}, 'Actual delivery cannot be before shipping date');

// ============================================
// VIRTUAL FIELDS
// ============================================

/**
 * Virtual for checking if shipment is profitable
 */
ShipmentSchema.virtual('isProfitable').get(function() {
  // ✅ FIXED:
return (this.profit ?? this.companyProfit ?? 0) > 0;
});

// ============================================
// MODEL EXPORT
// ============================================

// Prevent model recompilation in Next.js hot reload
const Shipment: Model<IShipment> =
  (mongoose.models.Shipment as Model<IShipment>) ||
  mongoose.model<IShipment>('Shipment', ShipmentSchema);

export default Shipment;