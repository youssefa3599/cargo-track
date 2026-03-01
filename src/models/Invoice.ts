// src/models/Invoice.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Invoice Line Item Interface - UPDATED with duty fields
 */
export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
  duty?: number;
  dutyPercentage?: number;
}

/**
 * Cost Breakdown Interface - NEW
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
  exchangeRate: number;
}

/**
 * Instance methods interface
 */
export interface IInvoiceMethods {
  calculateTotals(): number;
  markAsSent(): void;
  markAsPaid(): void;
}

/**
 * Static methods interface
 */
export interface IInvoiceStatics {
  generateInvoiceNumber(): Promise<string>;
}

/**
 * Invoice Interface - Enhanced for Hybrid Approach with Cost Breakdown
 */
export interface IInvoice extends Document {
  invoiceNumber: string;
  shipmentId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail?: string;
  companyId: string;
  companyName: string;
  generatedBy: mongoose.Types.ObjectId;
  generatedAt: Date;
  
  // Invoice Items - UPDATED
  lineItems: IInvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  shippingCost: number;
  insuranceCost: number; // NEW
  dutyCost: number; // NEW
  discount: number;
  totalAmount: number;
  totalAmountEGP: number; // NEW
  
  // Currency & Payment
  currency: string;
  exchangeRate?: number;
  
  // Cost Breakdown - NEW
  costBreakdown: ICostBreakdown;
  
  // Status & Workflow (ENHANCED)
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  
  // Dates
  dueDate?: Date;
  sentDate?: Date;
  paidDate?: Date;
  
  // Additional Info
  notes?: string;
  terms?: string;
  pdfPath?: string;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy?: mongoose.Types.ObjectId;
}

// Create combined model type
export type InvoiceModel = Model<IInvoice, {}, IInvoiceMethods> & IInvoiceStatics;

/**
 * Invoice Line Item Schema - UPDATED
 */
const InvoiceLineItemSchema = new Schema({
  description: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  category: {
    type: String,
    required: true,
  },
  duty: {
    type: Number,
    min: 0,
  },
  dutyPercentage: {
    type: Number,
    min: 0,
    max: 100,
  },
}, { _id: false });

/**
 * Cost Breakdown Schema - NEW
 */
const CostBreakdownSchema = new Schema({
  productCost: {
    type: Number,
    required: true,
    min: 0,
  },
  shippingCost: {
    type: Number,
    required: true,
    min: 0,
  },
  insuranceCost: {
    type: Number,
    required: true,
    min: 0,
  },
  insurancePercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  totalDuty: {
    type: Number,
    required: true,
    min: 0,
  },
  vat: {
    type: Number,
    required: true,
    min: 0,
  },
  vatPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  totalLandedCost: {
    type: Number,
    required: true,
    min: 0,
  },
  totalLandedCostEGP: {
    type: Number,
    required: true,
    min: 0,
  },
  exchangeRate: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

/**
 * Invoice Schema - Enhanced
 */
const InvoiceSchema = new Schema<IInvoice, InvoiceModel, IInvoiceMethods>(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
      required: [true, 'Shipment ID is required'],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    companyId: {
      type: String, // Custom company ID (not ObjectId)
      required: [true, 'Company ID is required'],
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Generator user ID is required'],
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    
    // Line Items - UPDATED
    lineItems: {
      type: [InvoiceLineItemSchema],
      required: true,
      validate: {
        validator: function(items: IInvoiceLineItem[]) {
          return items && items.length > 0;
        },
        message: 'Invoice must have at least one line item'
      }
    },
    
    // Financial Details - UPDATED with new fields
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    insuranceCost: { // NEW
      type: Number,
      default: 0,
      min: 0,
    },
    dutyCost: { // NEW
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    totalAmountEGP: { // NEW
      type: Number,
      required: [true, 'Total amount in EGP is required'],
      min: [0, 'Total amount in EGP cannot be negative'],
    },
    
    // Currency
    currency: {
      type: String,
      required: true,
      default: 'USD',
      enum: ['USD', 'EGP', 'EUR', 'GBP'],
      uppercase: true,
    },
    exchangeRate: {
      type: Number,
      min: 0,
    },
    
    // Cost Breakdown - NEW
    costBreakdown: {
      type: CostBreakdownSchema,
      required: true,
    },
    
    // Status - ENHANCED for Hybrid Workflow
    status: {
      type: String,
      required: true,
      enum: {
        values: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
        message: '{VALUE} is not a valid invoice status'
      },
      default: 'draft',
      index: true,
    },
    
    // Important Dates
    dueDate: {
      type: Date,
    },
    sentDate: {
      type: Date,
    },
    paidDate: {
      type: Date,
    },
    
    // Additional Information
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    terms: {
      type: String,
      maxlength: [2000, 'Terms cannot exceed 2000 characters'],
      default: 'Payment due within 30 days',
    },
    pdfPath: {
      type: String,
      trim: true,
    },
    
    // Audit Trail
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for faster queries
InvoiceSchema.index({ companyId: 1, status: 1, createdAt: -1 });
InvoiceSchema.index({ companyId: 1, customerName: 1 });
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ shipmentId: 1 }, { unique: true }); // One invoice per shipment

// Virtual for checking if invoice is editable (only drafts can be edited)
InvoiceSchema.virtual('isEditable').get(function() {
  return this.status === 'draft';
});

// Virtual for checking if overdue
InvoiceSchema.virtual('isOverdue').get(function() {
  if (this.status === 'paid' || this.status === 'cancelled') {
    return false;
  }
  if (this.dueDate && this.status === 'sent') {
    return new Date() > this.dueDate;
  }
  return false;
});

// Pre-save hook to auto-update overdue status
InvoiceSchema.pre('save', function(next) {
  // Auto-update to overdue if past due date
  if (this.status === 'sent' && this.dueDate && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  next();
});

// Method to calculate totals with proper typing
InvoiceSchema.methods.calculateTotals = function(this: IInvoice): number {
  // Calculate subtotal from line items
  this.subtotal = this.lineItems.reduce((sum: number, item: IInvoiceLineItem) => sum + item.total, 0);
  
  // Calculate tax
  this.taxAmount = (this.subtotal * this.taxRate) / 100;
  
  // Calculate total (now includes insurance and duty costs)
  this.totalAmount = this.subtotal + this.taxAmount + this.shippingCost + this.insuranceCost + this.dutyCost - this.discount;
  
  return this.totalAmount;
};

// Method to mark as sent
InvoiceSchema.methods.markAsSent = function(this: IInvoice): void {
  if (this.status === 'draft') {
    this.status = 'sent';
    this.sentDate = new Date();
    
    // Set due date if not already set (default 30 days)
    if (!this.dueDate) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      this.dueDate = dueDate;
    }
  }
};

// Method to mark as paid
InvoiceSchema.methods.markAsPaid = function(this: IInvoice): void {
  if (this.status === 'sent' || this.status === 'overdue') {
    this.status = 'paid';
    this.paidDate = new Date();
  }
};

// Static method to generate invoice number
InvoiceSchema.statics.generateInvoiceNumber = async function(this: InvoiceModel): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Format: INV-YYYYMMDD-XXXX
  const prefix = `INV-${year}${month}${day}`;
  
  // Find the latest invoice for today
  const latestInvoice = await this.findOne({
    invoiceNumber: { $regex: `^${prefix}` }
  }).sort({ invoiceNumber: -1 });
  
  let sequence = 1;
  if (latestInvoice) {
    const lastSequence = parseInt(latestInvoice.invoiceNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }
  
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
};

// Ensure virtuals are included in JSON
InvoiceSchema.set('toJSON', { virtuals: true });
InvoiceSchema.set('toObject', { virtuals: true });

// Prevent model recompilation with proper typing
const Invoice: InvoiceModel =
  (mongoose.models.Invoice as InvoiceModel) || mongoose.model<IInvoice, InvoiceModel>('Invoice', InvoiceSchema);

export default Invoice;