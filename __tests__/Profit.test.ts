/**
 * 💰 PROFIT CALCULATION TESTS
 *
 * Tests the profit/margin logic that lives in the Shipment model pre-save hook.
 * These are extracted here as pure functions so they can be tested without a DB.
 *
 * Why this matters: profit is what you report to your business.
 * A bug here means wrong numbers on every shipment dashboard.
 *
 * Run: npm run test:unit
 */

// ============================================================================
// Pure profit calculation helpers
// (mirrors the logic in models/Shipment.ts pre-save hook)
// ============================================================================

function calculateProfit(customerPayment: number, totalCost: number): number {
  return Math.round((customerPayment - totalCost) * 100) / 100;
}

function calculateProfitMargin(profit: number, customerPayment: number): number {
  if (customerPayment <= 0) return 0;
  return Math.round((profit / customerPayment) * 100 * 100) / 100;
}

function calculateCustomerPaymentFromMarkup(totalCost: number, markupPercentage: number): number {
  return Math.round(totalCost * (1 + markupPercentage / 100) * 100) / 100;
}

// ============================================================================
// PROFIT CALCULATIONS
// ============================================================================

describe('💰 Profit Calculations', () => {

  describe('calculateProfit', () => {

    test('CRITICAL: Standard profit calculation', () => {
      // Customer pays $5000, your cost is $3180.60 → profit = $1819.40
      const profit = calculateProfit(5000, 3180.60);
      expect(profit).toBeCloseTo(1819.40, 2);
    });

    test('CRITICAL: Negative profit when undercharging customer', () => {
      // You charged less than it cost — you are losing money
      const profit = calculateProfit(2000, 3180.60);
      expect(profit).toBeLessThan(0);
      expect(profit).toBeCloseTo(-1180.60, 2);
    });

    test('Zero profit when charging exactly cost price', () => {
      const profit = calculateProfit(3180.60, 3180.60);
      expect(profit).toBe(0);
    });

    test('EDGE CASE: Zero customer payment', () => {
      const profit = calculateProfit(0, 3180.60);
      expect(profit).toBeLessThan(0);
    });
  });

  describe('calculateProfitMargin', () => {

    test('CRITICAL: Standard margin calculation', () => {
      // $1819.40 profit on $5000 payment = 36.39%
      const margin = calculateProfitMargin(1819.40, 5000);
      expect(margin).toBeCloseTo(36.39, 1);
    });

    test('CRITICAL: 15% markup gives correct margin', () => {
      // If you mark up by 15%, your margin should be ~13.04%
      // (margin ≠ markup — margin is profit/revenue, markup is profit/cost)
      const cost = 3180.60;
      const payment = calculateCustomerPaymentFromMarkup(cost, 15);
      const profit = calculateProfit(payment, cost);
      const margin = calculateProfitMargin(profit, payment);
      expect(margin).toBeCloseTo(13.04, 1);
    });

    test('CRITICAL: Zero customerPayment does not cause divide-by-zero', () => {
      const margin = calculateProfitMargin(500, 0);
      expect(margin).toBe(0);
      expect(isFinite(margin)).toBe(true);
    });

    test('Negative margin on loss-making shipment', () => {
      const profit = calculateProfit(2000, 3180.60); // -1180.60
      const margin = calculateProfitMargin(profit, 2000);
      expect(margin).toBeLessThan(0);
    });

    test('100% margin when cost is zero (edge case)', () => {
      const margin = calculateProfitMargin(1000, 1000);
      expect(margin).toBe(100);
    });
  });

  describe('calculateCustomerPaymentFromMarkup', () => {

    test('CRITICAL: 15% markup on $3180.60 cost', () => {
      // Standard service markup
      const payment = calculateCustomerPaymentFromMarkup(3180.60, 15);
      expect(payment).toBeCloseTo(3657.69, 2);
    });

    test('Zero markup returns cost price', () => {
      const payment = calculateCustomerPaymentFromMarkup(3180.60, 0);
      expect(payment).toBeCloseTo(3180.60, 2);
    });

    test('100% markup doubles the cost', () => {
      const payment = calculateCustomerPaymentFromMarkup(1000, 100);
      expect(payment).toBe(2000);
    });

    test('EDGE CASE: Zero cost returns zero payment', () => {
      const payment = calculateCustomerPaymentFromMarkup(0, 15);
      expect(payment).toBe(0);
    });
  });

  // ============================================================================
  // INTEGRATION: Full profit flow
  // ============================================================================

  describe('Full profit flow (cost → markup → profit → margin)', () => {

    test('CRITICAL: Complete flow with real shipment numbers', () => {
      const totalCost = 3180.60;         // from calculateShipmentCosts
      const markupPercentage = 15;

      const customerPayment = calculateCustomerPaymentFromMarkup(totalCost, markupPercentage);
      const profit = calculateProfit(customerPayment, totalCost);
      const margin = calculateProfitMargin(profit, customerPayment);

      // Customer pays more than cost
      expect(customerPayment).toBeGreaterThan(totalCost);

      // Profit is positive
      expect(profit).toBeGreaterThan(0);

      // Margin is between 0-100%
      expect(margin).toBeGreaterThan(0);
      expect(margin).toBeLessThan(100);

      // Profit + cost = customerPayment (accounting check)
      expect(profit + totalCost).toBeCloseTo(customerPayment, 2);
    });

    test('CRITICAL: Profit consistency check — profit + cost must equal payment', () => {
      // This is the fundamental accounting equation for your business
      const cases = [
        { cost: 1000, markup: 10 },
        { cost: 5000, markup: 20 },
        { cost: 250.75, markup: 15 },
      ];

      cases.forEach(({ cost, markup }) => {
        const payment = calculateCustomerPaymentFromMarkup(cost, markup);
        const profit = calculateProfit(payment, cost);
        expect(profit + cost).toBeCloseTo(payment, 1);
      });
    });
  });
});