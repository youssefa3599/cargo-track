// ============================================
// USER TYPES
// ============================================

/**
 * User roles in the system
 * ADMIN: Full access (add, edit, delete)
 * STAFF: View only, cannot delete
 */


/**
 * User in database
 */
export interface IUser extends Document {
  email: string;
  password: string;
  companyId: string;      // ✅ Add this
  companyName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff'
}

// ============================================
// PRODUCT TYPES
// ============================================

/**
 * Product in catalog
 */
export interface IProduct {
  _id: string;
  name: string;               // e.g., "Dell Laptop"
  hsCode: string;             // 6 digits for customs (e.g., "847130")
  unitPrice: number;          // USD
  description?: string;
  userId: string;             // Who created it
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SHIPMENT TYPES
// ============================================

/**
 * Import = bringing goods IN
 * Export = sending goods OUT
 */
export enum ShipmentType {
  IMPORT = 'import',
  EXPORT = 'export'
}

/**
 * Shipment workflow:
 * PENDING → IN_TRANSIT → AT_CUSTOMS → CLEARED → DELIVERED
 */
export enum ShipmentStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  AT_CUSTOMS = 'at_customs',
  CLEARED = 'cleared',
  DELIVERED = 'delivered'
}

/**
 * Product within a shipment
 * Price is stored at time of shipment (in case product price changes later)
 */
export interface ShipmentProduct {
  productId: string;
  quantity: number;
  unitPrice: number;          // USD at time of shipment
}

/**
 * Shipment in database
 */
export interface IShipment {
  _id: string;
  userId: string;
  type: ShipmentType;
  status: ShipmentStatus;
  products: ShipmentProduct[];
  supplierCustomerName: string;
  originCountry: string;
  destinationCountry: string;
  shippingDate: Date;
  expectedArrivalDate: Date;
  containerNumber?: string;
  shippingCost: number;       // USD
  
  // AUTO-CALCULATED FIELDS
  totalProductCost: number;
  insuranceCost: number;      // 2% of product cost
  customsDuty: number;        // Based on HS codes
  vat: number;                // 14% of (product + shipping + duty)
  totalLandedCost: number;    // Total including all fees
  landedCostPerUnit: number;  // Cost per unit after fees
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// HS CODE TYPES
// ============================================

/**
 * HS Code with duty percentage
 * Example: Electronics = 10% duty
 */
export interface HSCode {
  code: string;               // 6 digits (e.g., "847130")
  description: string;        // e.g., "Laptops"
  dutyPercentage: number;     // e.g., 10 = 10%
}

// ============================================
// FINANCIAL CALCULATION TYPES
// ============================================

/**
 * Detailed cost breakdown for a shipment
 */
export interface CostBreakdown {
  productCost: number;
  shippingCost: number;
  insurance: number;
  customsDuty: number;
  vat: number;
  totalLandedCost: number;
  landedCostPerUnit: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Standard API response
 * All routes return this format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}