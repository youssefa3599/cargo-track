// src/models/Product.ts
import { Schema, model, models, Types } from 'mongoose';

// 1. Define the interface
export interface IProduct {
  _id: Types.ObjectId; // 👈 Explicitly include _id
  name: string;
  description?: string;
  hsCode: string;
  unitPrice: number;
  dutyPercentage: number;
  imageUrl?: string;
  imagePublicId?: string;
  userId: string;
  createdBy?: string;
  companyName: string;
  companyId: string;
  supplierId: string | null; // or Types.ObjectId if you use ObjectId references
  createdAt: Date;
  updatedAt: Date;
}

// 2. Create schema with generic typing
const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    hsCode: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    dutyPercentage: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    userId: { type: String, required: true },
    createdBy: { type: String },
    companyName: { type: String, required: true },
    companyId: { type: String },

    // 👇 You said this is critical
    supplierId: {
      type: String, // ⚠️ Keep as String if you store IDs as strings
      ref: 'Supplier',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 3. Export model
const Product = models.Product || model<IProduct>('Product', ProductSchema);
export default Product;