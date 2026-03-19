/**
 * 💰 Financial Calculations Library
 *
 * Core business logic for cargo shipment cost calculations.
 * Covers shipping, insurance, customs duty, VAT, and total landed cost.
 *
 * All monetary values are in USD unless otherwise stated.
 * Currency: USD → EGP conversions use a caller-supplied exchange rate.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Dimensions {
  length: number; // cm
  width: number;  // cm
  height: number; // cm
}

export interface Product {
  productId: string;
  productName: string;
  hsCode?: string;
  quantity: number;
  unitPrice: number;
  dutyPercentage: number;
}

export interface ProductCostLine {
  productId: string;
  productName: string;
  hsCode?: string;
  quantity: number;
  unitPrice: number;
  dutyPercentage: number;
  totalProductCost: number;
  dutyAmount: number;
}

export interface ShipmentCosts {
  productCost: number;
  shippingCost: number;
  insuranceCost: number;
  totalDuty: number;
  vat: number;
  totalLandedCost: number;
  totalLandedCostEGP: number;
  totalQuantity: number;
  costPerUnit: number;
  products: ProductCostLine[];
}

// ---------------------------------------------------------------------------
// Shipping Cost — Weight-Based
// ---------------------------------------------------------------------------

/**
 * Tiered weight-based shipping cost (USD).
 *
 * Tiers:
 *   0 – 15 kg   →  $50 minimum
 *  16 – 50 kg   →  $50 base  + (weight - 10) × $3.00
 *  51 – 100 kg  →  $170 base + (weight - 50) × $2.50
 * 101+    kg    →  $295 base + (weight - 100) × $2.00
 */
export function calculateShippingCostByWeight(weightKg: number): number {
  const w = Math.max(0, weightKg);

  if (w <= 15) return 50;
  if (w <= 50) return 50 + (w - 10) * 3;
  if (w <= 100) return 170 + (w - 50) * 2.5;
  return 295 + (w - 100) * 2;
}

// ---------------------------------------------------------------------------
// Shipping Cost — Volumetric
// ---------------------------------------------------------------------------

/**
 * Volumetric divisor: cm³ → kg.
 * Industry standard for air/courier: 5 000 cm³ = 1 kg.
 */
const VOLUMETRIC_DIVISOR = 5000;

/**
 * Returns the shipping cost using the greater of actual weight vs volumetric weight.
 * Falls back to weight-only if dimensions are absent or zero.
 */
export function calculateShippingCostVolumetric(
  actualWeightKg: number,
  dimensions: Dimensions | null | undefined
): number {
  if (
    !dimensions ||
    dimensions.length <= 0 ||
    dimensions.width <= 0 ||
    dimensions.height <= 0
  ) {
    return calculateShippingCostByWeight(actualWeightKg);
  }

  const volumetricWeight =
    (dimensions.length * dimensions.width * dimensions.height) /
    VOLUMETRIC_DIVISOR;

  const chargeableWeight = Math.max(actualWeightKg, volumetricWeight);
  return calculateShippingCostByWeight(chargeableWeight);
}

// ---------------------------------------------------------------------------
// Product Cost
// ---------------------------------------------------------------------------

/**
 * Total product cost = Σ (quantity × unitPrice) for each product line.
 */
export function calculateProductCost(
  products: Array<{ quantity: number; unitPrice: number }>
): number {
  const total = products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  return Math.round(total * 100) / 100;
}

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------

/**
 * Insurance cost = productCost × (insurancePercentage / 100).
 */
export function calculateInsurance(
  productCost: number,
  insurancePercentage: number
): number {
  return productCost * (insurancePercentage / 100);
}

// ---------------------------------------------------------------------------
// Customs Duty
// ---------------------------------------------------------------------------

/**
 * Duty for a single product line = quantity × unitPrice × (dutyPercentage / 100).
 */
export function calculateProductDuty(
  quantity: number,
  unitPrice: number,
  dutyPercentage: number
): number {
  return quantity * unitPrice * (dutyPercentage / 100);
}

/**
 * Total duty across all product lines.
 */
export function calculateTotalDuty(
  products: Array<{ quantity: number; unitPrice: number; dutyPercentage: number }>
): number {
  return products.reduce(
    (sum, p) => sum + calculateProductDuty(p.quantity, p.unitPrice, p.dutyPercentage),
    0
  );
}

// ---------------------------------------------------------------------------
// VAT
// ---------------------------------------------------------------------------

/**
 * VAT is charged on the full taxable base:
 *   taxableBase = productCost + shippingCost + insuranceCost + totalDuty
 *   VAT = taxableBase × (vatPercentage / 100)
 *
 * CRITICAL: All four components must be included — omitting any component
 * (especially shipping) is a common and costly mistake.
 */
export function calculateVAT(
  productCost: number,
  shippingCost: number,
  insuranceCost: number,
  totalDuty: number,
  vatPercentage: number
): number {
  const taxableBase = productCost + shippingCost + insuranceCost + totalDuty;
  return Math.round(taxableBase * (vatPercentage / 100) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Total Landed Cost
// ---------------------------------------------------------------------------

/**
 * Total landed cost = productCost + shippingCost + insuranceCost + totalDuty + vat
 *
 * This is the full amount billed to the customer / the true cost of the shipment.
 */
export function calculateTotalLandedCost(
  productCost: number,
  shippingCost: number,
  insuranceCost: number,
  totalDuty: number,
  vat: number
): number {
  return productCost + shippingCost + insuranceCost + totalDuty + vat;
}

// ---------------------------------------------------------------------------
// Currency Conversion
// ---------------------------------------------------------------------------

/**
 * Convert a USD amount to EGP using the supplied exchange rate.
 */
export function convertToEGP(amountUSD: number, exchangeRate: number): number {
  return amountUSD * exchangeRate;
}

// ---------------------------------------------------------------------------
// Per-Unit Cost
// ---------------------------------------------------------------------------

/**
 * Average cost per unit across the entire shipment.
 * Returns 0 when totalQuantity is 0 to avoid division by zero.
 */
export function calculateCostPerUnit(
  totalCost: number,
  totalQuantity: number
): number {
  if (totalQuantity === 0) return 0;
  // Round to 2 decimal places to avoid floating-point noise
  return Math.round((totalCost / totalQuantity) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Complete Shipment Calculation
// ---------------------------------------------------------------------------

/**
 * One-shot calculation for a full shipment.
 *
 * @param products         Array of product lines with duty percentages.
 * @param shippingInput    Either a manual shipping cost (USD) or weight in kg
 *                         (interpreted based on isWeightBased).
 * @param exchangeRate     USD → EGP rate.
 * @param insurancePercent Insurance rate as a percentage (e.g. 2 = 2%).
 * @param vatPercent       VAT rate as a percentage (e.g. 14 = 14%).
 * @param isWeightBased    When true, shippingInput is treated as weight in kg.
 */
export function calculateShipmentCosts(
  products: Product[],
  shippingInput: number,
  exchangeRate: number,
  insurancePercent: number,
  vatPercent: number,
  isWeightBased: boolean
): ShipmentCosts {
  // 1. Product cost
  const productCost = calculateProductCost(products);

  // 2. Shipping cost
  const shippingCost = isWeightBased
    ? calculateShippingCostByWeight(shippingInput)
    : shippingInput;

  // 3. Insurance
  const insuranceCost = calculateInsurance(productCost, insurancePercent);

  // 4. Customs duty
  const totalDuty = calculateTotalDuty(products);

  // 5. VAT
  const vat = calculateVAT(productCost, shippingCost, insuranceCost, totalDuty, vatPercent);

  // 6. Total landed cost (USD)
  const totalLandedCost = calculateTotalLandedCost(
    productCost,
    shippingCost,
    insuranceCost,
    totalDuty,
    vat
  );

  // 7. Total landed cost (EGP)
  const totalLandedCostEGP = convertToEGP(totalLandedCost, exchangeRate);

  // 8. Totals
  const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
  const costPerUnit = calculateCostPerUnit(totalLandedCost, totalQuantity);

  // 9. Per-product breakdown
  const productLines: ProductCostLine[] = products.map((p) => ({
    productId: p.productId,
    productName: p.productName,
    hsCode: p.hsCode,
    quantity: p.quantity,
    unitPrice: p.unitPrice,
    dutyPercentage: p.dutyPercentage,
    totalProductCost: p.quantity * p.unitPrice,
    dutyAmount: calculateProductDuty(p.quantity, p.unitPrice, p.dutyPercentage),
  }));

  return {
    productCost,
    shippingCost,
    insuranceCost,
    totalDuty,
    vat,
    totalLandedCost,
    totalLandedCostEGP,
    totalQuantity,
    costPerUnit,
    products: productLines,
  };
}

// ---------------------------------------------------------------------------
// Currency Formatting
// ---------------------------------------------------------------------------

/**
 * Format a monetary amount with the correct currency symbol and 2 decimal places.
 *
 * Supported currencies:
 *   USD  →  $1,234.56
 *   EGP  →  E£1,234.56
 */
export function formatCurrency(amount: number, currency: 'USD' | 'EGP'): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (currency === 'EGP') return `E£${formatted}`;
  return `$${formatted}`;
}