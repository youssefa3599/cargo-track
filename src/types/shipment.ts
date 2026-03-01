// types/shipment.ts

export enum ShipmentStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in-transit',
  CUSTOMS = 'customs',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

/**
 * Product calculation details for cost breakdown
 */
export interface IProductCalculation {
  productId: string;
  productName: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  totalProductCost: number;
  dutyPercentage: number;
  dutyAmount: number;
}

/**
 * Complete cost breakdown interface
 */
export interface ICostBreakdown {
  // Product costs
  productCost: number;
  
  // Additional costs
  shippingCost: number;
  insuranceCost: number;
  insurancePercentage: number;
  
  // Duties and taxes
  totalDuty: number;
  vat: number;
  vatPercentage: number;
  
  // Totals
  totalLandedCost: number;
  totalLandedCostEGP: number;
  
  // Per unit
  totalQuantity: number;
  costPerUnit: number;
  costPerUnitEGP: number;
  
  // Exchange rate
  exchangeRate: number;
  
  // Product breakdown
  products: IProductCalculation[];
}

export interface Shipment {
  _id: string;
  shipmentId: string;
  trackingNumber?: string;
  origin: string;
  destination: string;
  carrier?: string;
  status: ShipmentStatus;
  weight?: number;
  dimensions?: Dimensions;
  estimatedDelivery?: string;
  actualDelivery?: string;
  customerName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // 💰 FINANCIAL FIELDS - Added for cost calculations
  currency?: string;
  exchangeRate?: number;
  shippingCost?: number;
  costBreakdown?: ICostBreakdown;
}