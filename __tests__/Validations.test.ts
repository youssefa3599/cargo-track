/**
 * 🛡️ VALIDATION TESTS
 *
 * Covers the business rules enforced by Zod schemas and status transition logic.
 * A validation bug is silent — bad data gets saved, wrong duties get applied,
 * invoices go out with incorrect totals.
 *
 * Run: npm run test:unit (after updating script to include this file)
 */

import {
  hsCodeSchema,
  exchangeRateSchema,
  shipmentSchema,
  productSchema,
  isValidStatusTransition,
  isFinalStatus,
  getAllowedNextStatuses,
} from '@/lib/validations';

// ============================================================================
// STATUS TRANSITIONS
// ============================================================================

describe('🚦 Status Transitions', () => {

  describe('isValidStatusTransition', () => {

    test('CRITICAL: Cannot reopen a delivered shipment', () => {
      expect(isValidStatusTransition('delivered', 'in-transit')).toBe(false);
      expect(isValidStatusTransition('delivered', 'pending')).toBe(false);
      expect(isValidStatusTransition('delivered', 'customs')).toBe(false);
    });

    test('CRITICAL: Cannot reopen a cancelled shipment', () => {
      expect(isValidStatusTransition('cancelled', 'pending')).toBe(false);
      expect(isValidStatusTransition('cancelled', 'in-transit')).toBe(false);
      expect(isValidStatusTransition('cancelled', 'delivered')).toBe(false);
    });

    test('Valid forward transitions work', () => {
      expect(isValidStatusTransition('pending', 'in-transit')).toBe(true);
      expect(isValidStatusTransition('in-transit', 'customs')).toBe(true);
      expect(isValidStatusTransition('customs', 'delivered')).toBe(true);
    });

    test('Cancellation is allowed from any active status', () => {
      expect(isValidStatusTransition('pending', 'cancelled')).toBe(true);
      expect(isValidStatusTransition('in-transit', 'cancelled')).toBe(true);
      expect(isValidStatusTransition('customs', 'cancelled')).toBe(true);
    });

    test('Same status transition is always allowed', () => {
      expect(isValidStatusTransition('pending', 'pending')).toBe(true);
      expect(isValidStatusTransition('in-transit', 'in-transit')).toBe(true);
      expect(isValidStatusTransition('delivered', 'delivered')).toBe(true);
      expect(isValidStatusTransition('cancelled', 'cancelled')).toBe(true);
    });

    test('EDGE CASE: Unknown status returns false', () => {
      expect(isValidStatusTransition('unknown', 'pending')).toBe(false);
      expect(isValidStatusTransition('pending', 'unknown' as any)).toBe(false);
    });
  });

  describe('isFinalStatus', () => {

    test('delivered and cancelled are final', () => {
      expect(isFinalStatus('delivered')).toBe(true);
      expect(isFinalStatus('cancelled')).toBe(true);
    });

    test('active statuses are not final', () => {
      expect(isFinalStatus('pending')).toBe(false);
      expect(isFinalStatus('in-transit')).toBe(false);
      expect(isFinalStatus('customs')).toBe(false);
    });
  });

  describe('getAllowedNextStatuses', () => {

    test('pending can move to in-transit or cancelled', () => {
      const allowed = getAllowedNextStatuses('pending');
      expect(allowed).toContain('in-transit');
      expect(allowed).toContain('cancelled');
      expect(allowed).not.toContain('delivered');
    });

    test('delivered has no allowed next statuses', () => {
      expect(getAllowedNextStatuses('delivered')).toHaveLength(0);
    });

    test('cancelled has no allowed next statuses', () => {
      expect(getAllowedNextStatuses('cancelled')).toHaveLength(0);
    });
  });
});

// ============================================================================
// HS CODE VALIDATION
// ============================================================================

describe('📦 HS Code Validation', () => {

  const validHsCode = {
    code: '851712',
    description: 'Smartphones and mobile phones',
    category: 'Electronics',
    dutyPercentage: 10,
  };

  test('CRITICAL: Valid 6-digit numeric HS code passes', () => {
    const result = hsCodeSchema.safeParse(validHsCode);
    expect(result.success).toBe(true);
  });

  test('CRITICAL: 5-digit code is rejected', () => {
    const result = hsCodeSchema.safeParse({ ...validHsCode, code: '85171' });
    expect(result.success).toBe(false);
  });

  test('CRITICAL: 7-digit code is rejected', () => {
    const result = hsCodeSchema.safeParse({ ...validHsCode, code: '8517123' });
    expect(result.success).toBe(false);
  });

  test('CRITICAL: Letters in HS code are rejected', () => {
    const result = hsCodeSchema.safeParse({ ...validHsCode, code: '8517AB' });
    expect(result.success).toBe(false);
  });

  test('CRITICAL: Duty percentage over 100 is rejected', () => {
    const result = hsCodeSchema.safeParse({ ...validHsCode, dutyPercentage: 150 });
    expect(result.success).toBe(false);
  });

  test('Negative duty percentage is rejected', () => {
    const result = hsCodeSchema.safeParse({ ...validHsCode, dutyPercentage: -5 });
    expect(result.success).toBe(false);
  });

  test('Zero duty percentage is valid (duty-free goods)', () => {
    const result = hsCodeSchema.safeParse({ ...validHsCode, dutyPercentage: 0 });
    expect(result.success).toBe(true);
  });

  test('Missing description is rejected', () => {
    const { description, ...withoutDescription } = validHsCode;
    const result = hsCodeSchema.safeParse(withoutDescription);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// EXCHANGE RATE VALIDATION
// ============================================================================

describe('💱 Exchange Rate Validation', () => {

  test('CRITICAL: Zero exchange rate is rejected', () => {
    // A zero rate would make all EGP amounts = 0 on every invoice
    const result = exchangeRateSchema.safeParse({ usdToEgp: 0 });
    expect(result.success).toBe(false);
  });

  test('CRITICAL: Negative exchange rate is rejected', () => {
    const result = exchangeRateSchema.safeParse({ usdToEgp: -30 });
    expect(result.success).toBe(false);
  });

  test('CRITICAL: Unrealistically high rate is rejected', () => {
    // Catches typos like entering 3000 instead of 30 — would 100x every invoice
    const result = exchangeRateSchema.safeParse({ usdToEgp: 1500 });
    expect(result.success).toBe(false);
  });

  test('Valid realistic rate passes', () => {
    const result = exchangeRateSchema.safeParse({ usdToEgp: 50 });
    expect(result.success).toBe(true);
  });

  test('EDGE CASE: String rate is rejected', () => {
    const result = exchangeRateSchema.safeParse({ usdToEgp: '50' });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// SHIPMENT VALIDATION
// ============================================================================

describe('🚢 Shipment Validation', () => {

  const validShipment = {
    shipmentId: 'SHP-001',
    origin: 'Shanghai, China',
    destination: 'Cairo, Egypt',
    shippingDate: '2025-01-01',
    estimatedArrival: '2025-02-01',
    products: [{ productId: 'abc123', quantity: 10 }],
  };

  test('Valid shipment passes', () => {
    const result = shipmentSchema.safeParse(validShipment);
    expect(result.success).toBe(true);
  });

  test('CRITICAL: Empty products array is rejected', () => {
    // A shipment with no products would calculate $0 for everything
    const result = shipmentSchema.safeParse({ ...validShipment, products: [] });
    expect(result.success).toBe(false);
  });

  test('CRITICAL: Product quantity of 0 is rejected', () => {
    const result = shipmentSchema.safeParse({
      ...validShipment,
      products: [{ productId: 'abc123', quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  test('CRITICAL: Negative quantity is rejected', () => {
    const result = shipmentSchema.safeParse({
      ...validShipment,
      products: [{ productId: 'abc123', quantity: -5 }],
    });
    expect(result.success).toBe(false);
  });

  test('CRITICAL: Missing origin is rejected', () => {
    const { origin, ...withoutOrigin } = validShipment;
    const result = shipmentSchema.safeParse(withoutOrigin);
    expect(result.success).toBe(false);
  });

  test('CRITICAL: Missing destination is rejected', () => {
    const { destination, ...withoutDestination } = validShipment;
    const result = shipmentSchema.safeParse(withoutDestination);
    expect(result.success).toBe(false);
  });

  test('Invalid date format is rejected', () => {
    const result = shipmentSchema.safeParse({
      ...validShipment,
      shippingDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  test('Negative shipping cost is rejected', () => {
    const result = shipmentSchema.safeParse({
      ...validShipment,
      shippingCost: -100,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// PRODUCT VALIDATION
// ============================================================================

describe('🏷️ Product Validation', () => {

  const validProduct = {
    name: 'Smartphone',
    hsCode: '851712',
    unitPrice: 299.99,
    dutyPercentage: 10,
  };

  test('Valid product passes', () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  test('CRITICAL: Zero unit price is rejected', () => {
    const result = productSchema.safeParse({ ...validProduct, unitPrice: 0 });
    expect(result.success).toBe(false);
  });

  test('CRITICAL: Negative unit price is rejected', () => {
    const result = productSchema.safeParse({ ...validProduct, unitPrice: -50 });
    expect(result.success).toBe(false);
  });

  test('CRITICAL: HS code must be exactly 6 digits', () => {
    const result = productSchema.safeParse({ ...validProduct, hsCode: '12345' });
    expect(result.success).toBe(false);
  });

  test('Duty percentage of 0 is valid', () => {
    const result = productSchema.safeParse({ ...validProduct, dutyPercentage: 0 });
    expect(result.success).toBe(true);
  });

  test('Duty percentage over 100 is rejected', () => {
    const result = productSchema.safeParse({ ...validProduct, dutyPercentage: 101 });
    expect(result.success).toBe(false);
  });

  test('Missing product name is rejected', () => {
    const { name, ...withoutName } = validProduct;
    const result = productSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });
});