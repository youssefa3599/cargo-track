import { z } from 'zod';
import { UserRole } from '@/types';

// ============================================
// USER VALIDATION SCHEMAS
// ============================================

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required'),
  
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
  
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name is too long'),
  
  role: z
    .nativeEnum(UserRole)
    .default(UserRole.STAFF)
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required'),
  
  password: z
    .string()
    .min(1, 'Password is required')
});

export const updateUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
  
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name is too long')
    .optional(),
  
  role: z
    .nativeEnum(UserRole)
    .optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'Password is too long')
});

// ============================================
// PRODUCT VALIDATION SCHEMAS
// ============================================

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Product name is too long'),
  
  hsCode: z
    .string()
    .length(6, 'HS Code must be exactly 6 digits')
    .regex(/^\d+$/, 'HS Code must contain only numbers'),
  
  unitPrice: z
    .number()
    .positive('Unit price must be positive')
    .max(1000000000, 'Unit price is too high'),
  
  dutyPercentage: z
    .number()
    .min(0, 'Duty percentage cannot be negative')
    .max(100, 'Duty percentage cannot exceed 100')
    .default(0),
  
  description: z
    .string()
    .max(1000, 'Description is too long')
    .optional(),
  
  // ✅ ADDED: Image fields
  imageUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  
  imagePublicId: z
    .string()
    .optional()
    .or(z.literal(''))
});

export const updateProductSchema = productSchema.partial();

// ============================================
// SHIPMENT VALIDATION SCHEMAS
// ============================================

export const shipmentSchema = z.object({
  shipmentId: z
    .string()
    .min(1, 'Shipment ID is required')
    .max(100, 'Shipment ID is too long'),
  
  origin: z
    .string()
    .min(1, 'Origin is required')
    .max(200, 'Origin is too long'),
  
  destination: z
    .string()
    .min(1, 'Destination is required')
    .max(200, 'Destination is too long'),
  
  shippingDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid shipping date format',
    }),
  
  estimatedArrival: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid estimated arrival date format',
    }),
  
  shippingCost: z
    .number()
    .min(0, 'Shipping cost cannot be negative')
    .default(0),
  
  status: z
    .enum(['pending', 'in-transit', 'customs', 'delivered', 'cancelled'])
    .optional()
    .default('pending'),
  
  products: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z
          .number()
          .int('Quantity must be an integer')
          .min(1, 'Quantity must be at least 1')
          .max(1000000, 'Quantity is too high'),
      })
    )
    .min(1, 'At least one product is required')
    .max(100, 'Too many products in one shipment'),
});

export const updateShipmentSchema = z.object({
  status: z.enum(['pending', 'in-transit', 'customs', 'delivered', 'cancelled']),
});

export const statusUpdateSchema = z.object({
  status: z.enum(['pending', 'in-transit', 'customs', 'delivered', 'cancelled']),
  notes: z.string()
    .max(500, 'Notes must be 500 characters or less')
    .optional()
});

// ============================================
// HS CODE VALIDATION SCHEMAS
// ============================================

export const hsCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'HS Code must be exactly 6 digits')
    .regex(/^\d+$/, 'HS Code must contain only numbers'),
  
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description is too long'),
  
  category: z
    .string()
    .min(1, 'Category is required')
    .max(100, 'Category is too long'),
  
  dutyPercentage: z
    .number()
    .min(0, 'Duty percentage cannot be negative')
    .max(100, 'Duty percentage cannot exceed 100'),
});

// ============================================
// SETTINGS VALIDATION SCHEMAS
// ============================================

export const exchangeRateSchema = z.object({
  usdToEgp: z
    .number()
    .positive('Exchange rate must be positive')
    .max(1000, 'Exchange rate seems too high'),
});

export const taxRatesSchema = z.object({
  vat: z
    .number()
    .min(0, 'VAT rate cannot be negative')
    .max(100, 'VAT rate cannot exceed 100')
    .optional(),
  
  insurance: z
    .number()
    .min(0, 'Insurance rate cannot be negative')
    .max(100, 'Insurance rate cannot exceed 100')
    .optional(),
});

// ============================================
// STATUS TRANSITION VALIDATION
// ============================================

const STATUS_TRANSITIONS: Record<string, string[]> = {
  'pending': ['in-transit', 'cancelled'],
  'in-transit': ['customs', 'delivered', 'cancelled'],
  'customs': ['delivered', 'cancelled'],
  'delivered': [],
  'cancelled': []
};

export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  if (currentStatus === newStatus) {
    return true;
  }
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

export function getAllowedNextStatuses(currentStatus: string): string[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

export function isFinalStatus(status: string): boolean {
  return status === 'delivered' || status === 'cancelled';
}

// ============================================
// TYPES
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ShipmentInput = z.infer<typeof shipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
export type HSCodeInput = z.infer<typeof hsCodeSchema>;
export type ExchangeRateInput = z.infer<typeof exchangeRateSchema>;
export type TaxRatesInput = z.infer<typeof taxRatesSchema>;