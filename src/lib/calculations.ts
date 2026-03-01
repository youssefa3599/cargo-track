/**
 * Financial Calculations Library - UPDATED WITH WEIGHT-BASED SHIPPING
 * All the cost calculation logic for shipments
 */

export interface ProductCalculation {
  productId: string;
  productName: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  totalProductCost: number;
  dutyPercentage: number;
  dutyAmount: number;
}

export interface ShipmentCostBreakdown {
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
  products: ProductCalculation[];
}

/**
 * 🆕 Calculate shipping cost based on weight
 * @param weight Total shipment weight in kg
 * @param ratePerKg Rate per kilogram (default: $2.50/kg)
 * @returns Calculated shipping cost in USD
 */
export function calculateShippingCostByWeight(
  weight: number,
  ratePerKg: number = 2.5
): number {
  console.log('  🔧 calculateShippingCostByWeight() called');
  console.log('     Weight:', weight, 'kg');
  console.log('     Rate per kg: $', ratePerKg);
  
  if (weight <= 0) {
    console.warn('     ⚠️  Warning: Weight is 0 or negative, returning base rate of $50');
    return 50; // Minimum shipping cost
  }
  
  // Tiered pricing (more realistic)
  let shippingCost = 0;
  
  if (weight <= 10) {
    // Small packages: $50 base rate
    shippingCost = 50;
    console.log('     📦 Small package (≤10kg): Base rate $50');
  } else if (weight <= 50) {
    // Medium packages: $50 + $3/kg over 10kg
    shippingCost = 50 + (weight - 10) * 3;
    console.log('     📦 Medium package (10-50kg): $50 + $', ((weight - 10) * 3).toFixed(2));
  } else if (weight <= 100) {
    // Large packages: $170 + $2.5/kg over 50kg
    shippingCost = 170 + (weight - 50) * 2.5;
    console.log('     📦 Large package (50-100kg): $170 + $', ((weight - 50) * 2.5).toFixed(2));
  } else {
    // Extra large: $295 + $2/kg over 100kg
    shippingCost = 295 + (weight - 100) * 2;
    console.log('     📦 Extra large (>100kg): $295 + $', ((weight - 100) * 2).toFixed(2));
  }
  
  console.log('     ✅ Shipping Cost:', shippingCost);
  return shippingCost;
}

/**
 * 🆕 Calculate shipping cost with volumetric weight consideration
 * @param actualWeight Actual weight in kg
 * @param dimensions Box dimensions in cm
 * @param ratePerKg Rate per kilogram
 * @returns Calculated shipping cost using chargeable weight
 */
export function calculateShippingCostVolumetric(
  actualWeight: number,
  dimensions: { length: number; width: number; height: number } | null,
  ratePerKg: number = 2.5
): number {
  console.log('  🔧 calculateShippingCostVolumetric() called');
  console.log('     Actual Weight:', actualWeight, 'kg');
  console.log('     Dimensions:', dimensions || 'not provided');
  
  let chargeableWeight = actualWeight;
  
  // Calculate volumetric weight if dimensions provided
  if (dimensions && dimensions.length > 0 && dimensions.width > 0 && dimensions.height > 0) {
    // Standard volumetric divisor for air freight
    const volumetricWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;
    console.log('     Volumetric Weight:', volumetricWeight.toFixed(2), 'kg');
    console.log('     (', dimensions.length, '×', dimensions.width, '×', dimensions.height, '/ 5000)');
    
    // Use whichever is higher
    chargeableWeight = Math.max(actualWeight, volumetricWeight);
    
    if (chargeableWeight === volumetricWeight) {
      console.log('     💡 Using volumetric weight (higher)');
    } else {
      console.log('     💡 Using actual weight (higher)');
    }
  }
  
  console.log('     Chargeable Weight:', chargeableWeight.toFixed(2), 'kg');
  
  // Use tiered pricing
  return calculateShippingCostByWeight(chargeableWeight, ratePerKg);
}

/**
 * Calculate total product cost
 */
export function calculateProductCost(
  products: Array<{ quantity: number; unitPrice: number }>
): number {
  console.log('  🔧 calculateProductCost() called');
  console.log('     Input:', products.length, 'products');
  
  const total = products.reduce((total, product, idx) => {
    const itemCost = product.quantity * product.unitPrice;
    console.log(`     [${idx}] qty=${product.quantity} × price=${product.unitPrice} = ${itemCost}`);
    return total + itemCost;
  }, 0);
  
  console.log('     ✅ Product Cost Total:', total);
  return total;
}

/**
 * Calculate insurance cost (percentage of product cost)
 * 📌 INDUSTRY STANDARD: 1-3% of product value (typically 2%)
 */
export function calculateInsurance(
  productCost: number,
  insurancePercentage: number
): number {
  console.log('  🔧 calculateInsurance() called');
  console.log('     Product Cost:', productCost);
  console.log('     Insurance %:', insurancePercentage);
  console.log('     📌 Industry standard: 1-3% (you\'re using', insurancePercentage, '%)');
  
  const insurance = (productCost * insurancePercentage) / 100;
  console.log('     Calculation:', productCost, '×', insurancePercentage, '/ 100 =', insurance);
  console.log('     ✅ Insurance Cost:', insurance);
  return insurance;
}

/**
 * Calculate customs duty for a single product
 */
export function calculateProductDuty(
  quantity: number,
  unitPrice: number,
  dutyPercentage: number
): number {
  const productValue = quantity * unitPrice;
  const duty = (productValue * dutyPercentage) / 100;
  console.log(`     Duty calc: (${quantity} × ${unitPrice}) × ${dutyPercentage}% = ${duty}`);
  return duty;
}

/**
 * Calculate total customs duty for all products
 */
export function calculateTotalDuty(
  products: Array<{
    quantity: number;
    unitPrice: number;
    dutyPercentage: number;
  }>
): number {
  console.log('  🔧 calculateTotalDuty() called');
  console.log('     Products:', products.length);
  
  const total = products.reduce((total, product, idx) => {
    console.log(`     [${idx}] Calculating duty...`);
    const duty = calculateProductDuty(
      product.quantity,
      product.unitPrice,
      product.dutyPercentage
    );
    return total + duty;
  }, 0);
  
  console.log('     ✅ Total Duty:', total);
  return total;
}

/**
 * Calculate VAT (tax on: product cost + shipping + insurance + duty)
 */
export function calculateVAT(
  productCost: number,
  shippingCost: number,
  insuranceCost: number,
  totalDuty: number,
  vatPercentage: number
): number {
  console.log('  🔧 calculateVAT() called');
  console.log('     Product Cost:', productCost);
  console.log('     Shipping Cost:', shippingCost, '← MUST BE INCLUDED!');
  console.log('     Insurance Cost:', insuranceCost);
  console.log('     Total Duty:', totalDuty);
  console.log('     VAT %:', vatPercentage);
  
  const taxableAmount = productCost + shippingCost + insuranceCost + totalDuty;
  console.log('     Taxable Amount:', taxableAmount);
  console.log('     Calculation:', productCost, '+', shippingCost, '+', insuranceCost, '+', totalDuty, '=', taxableAmount);
  
  const vat = (taxableAmount * vatPercentage) / 100;
  console.log('     VAT Calculation:', taxableAmount, '×', vatPercentage, '/ 100 =', vat);
  console.log('     ✅ VAT:', vat);
  
  if (shippingCost === 0) {
    console.error('     🚨 WARNING: Shipping cost is 0! VAT will be incorrect!');
  }
  
  return vat;
}

/**
 * Calculate total landed cost
 */
export function calculateTotalLandedCost(
  productCost: number,
  shippingCost: number,
  insuranceCost: number,
  totalDuty: number,
  vat: number
): number {
  console.log('  🔧 calculateTotalLandedCost() called');
  console.log('     Product Cost:', productCost);
  console.log('     Shipping Cost:', shippingCost, '← CRITICAL!');
  console.log('     Insurance Cost:', insuranceCost);
  console.log('     Total Duty:', totalDuty);
  console.log('     VAT:', vat);
  
  const total = productCost + shippingCost + insuranceCost + totalDuty + vat;
  
  console.log('     Calculation:');
  console.log('       ', productCost);
  console.log('       +', shippingCost, '(shipping)');
  console.log('       +', insuranceCost, '(insurance)');
  console.log('       +', totalDuty, '(duty)');
  console.log('       +', vat, '(vat)');
  console.log('       ─────────────');
  console.log('       =', total);
  console.log('     ✅ Total Landed Cost:', total);
  
  if (shippingCost === 0 || !shippingCost) {
    console.error('     🚨 BUG: Shipping cost is', shippingCost, '- total will be wrong!');
  }
  
  if (total === productCost) {
    console.error('     🚨 CRITICAL BUG: Total equals product cost!');
    console.error('     Nothing was added! Check all inputs!');
  }
  
  return total;
}

/**
 * Convert USD to EGP
 */
export function convertToEGP(amountUSD: number, exchangeRate: number): number {
  console.log('  🔧 convertToEGP() called');
  console.log('     Amount USD:', amountUSD);
  console.log('     Exchange Rate:', exchangeRate);
  const egp = amountUSD * exchangeRate;
  console.log('     Result:', amountUSD, '×', exchangeRate, '=', egp, 'EGP');
  return egp;
}

/**
 * Calculate cost per unit
 */
export function calculateCostPerUnit(
  totalCost: number,
  totalQuantity: number
): number {
  if (totalQuantity === 0) return 0;
  const perUnit = totalCost / totalQuantity;
  console.log('  🔧 calculateCostPerUnit():', totalCost, '/', totalQuantity, '=', perUnit);
  return perUnit;
}

/**
 * Main function: Calculate complete shipment cost breakdown
 * 
 * 🆕 UPDATED: Now supports both manual and weight-based shipping cost
 * 
 * @param products Array of products with details
 * @param shippingCostOrWeight Either manual shipping cost OR weight for auto-calculation
 * @param exchangeRate USD to EGP exchange rate
 * @param insurancePercentage Insurance percentage (typically 2%)
 * @param vatPercentage VAT percentage (typically 14%)
 * @param useWeightBased If true, treat shippingCostOrWeight as weight
 * @param dimensions Optional dimensions for volumetric weight
 */
export function calculateShipmentCosts(
  products: Array<{
    productId: string;
    productName: string;
    hsCode: string;
    quantity: number;
    unitPrice: number;
    dutyPercentage: number;
  }>,
  shippingCostOrWeight: number,
  exchangeRate: number,
  insurancePercentage: number = 2,
  vatPercentage: number = 14,
  useWeightBased: boolean = false,
  dimensions?: { length: number; width: number; height: number } | null
): ShipmentCostBreakdown {
  console.log('\n' + '🔥'.repeat(80));
  console.log('🔥 calculateShipmentCosts() FUNCTION CALLED');
  console.log('🔥'.repeat(80));
  console.log('📥 PARAMETERS RECEIVED:');
  console.log('   products:', products.length, 'items');
  console.log('   shippingCostOrWeight:', shippingCostOrWeight, useWeightBased ? '(weight in kg)' : '(manual cost in USD)');
  console.log('   exchangeRate:', exchangeRate, '(type:', typeof exchangeRate, ')');
  console.log('   insurancePercentage:', insurancePercentage, '(type:', typeof insurancePercentage, ')');
  console.log('   vatPercentage:', vatPercentage, '(type:', typeof vatPercentage, ')');
  console.log('   useWeightBased:', useWeightBased);
  console.log('   dimensions:', dimensions || 'not provided');
  
  // 1. Calculate product cost
  console.log('\n[STEP 1] Calculating product cost...');
  const productCost = calculateProductCost(products);
  
  // 2. Calculate shipping cost (either manual or weight-based)
  console.log('\n[STEP 2] Calculating shipping cost...');
  let shippingCost: number;
  
  if (useWeightBased && shippingCostOrWeight > 0) {
    console.log('   Using WEIGHT-BASED calculation');
    if (dimensions) {
      shippingCost = calculateShippingCostVolumetric(shippingCostOrWeight, dimensions);
    } else {
      shippingCost = calculateShippingCostByWeight(shippingCostOrWeight);
    }
  } else {
    console.log('   Using MANUAL shipping cost');
    shippingCost = Number(shippingCostOrWeight) || 0;
    
    if (typeof shippingCostOrWeight !== 'number') {
      console.error('   🚨 CRITICAL: shippingCost is not a number! Type:', typeof shippingCostOrWeight);
      console.error('   Value:', shippingCostOrWeight);
      console.error('   Converting to number...');
      shippingCost = Number(shippingCostOrWeight) || 0;
      console.log('   Converted to:', shippingCost);
    }
    
    if (shippingCost === 0) {
      console.warn('   ⚠️  WARNING: Shipping cost is 0! This might be intentional or a bug.');
    }
  }
  
  console.log('   ✅ Final Shipping Cost: $', shippingCost);
  
  // 3. Calculate insurance (based on product value)
  console.log('\n[STEP 3] Calculating insurance...');
  const insuranceCost = calculateInsurance(productCost, insurancePercentage);
  
  // 4. Calculate duties for each product
  console.log('\n[STEP 4] Calculating product duties...');
  const productCalculations: ProductCalculation[] = products.map((product, idx) => {
    console.log(`   Processing product [${idx}]: ${product.productName}`);
    const totalProductCost = product.quantity * product.unitPrice;
    const dutyAmount = calculateProductDuty(
      product.quantity,
      product.unitPrice,
      product.dutyPercentage
    );
    
    return {
      productId: product.productId,
      productName: product.productName,
      hsCode: product.hsCode,
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      totalProductCost,
      dutyPercentage: product.dutyPercentage,
      dutyAmount,
    };
  });
  
  // 5. Calculate total duty
  console.log('\n[STEP 5] Calculating total duty...');
  const totalDuty = calculateTotalDuty(products);
  
  // 6. Calculate VAT
  console.log('\n[STEP 6] Calculating VAT...');
  const vat = calculateVAT(
    productCost,
    shippingCost,
    insuranceCost,
    totalDuty,
    vatPercentage
  );
  
  // 7. Calculate total landed cost
  console.log('\n[STEP 7] Calculating total landed cost...');
  const totalLandedCost = calculateTotalLandedCost(
    productCost,
    shippingCost,
    insuranceCost,
    totalDuty,
    vat
  );
  
  // 8. Convert to EGP
  console.log('\n[STEP 8] Converting to EGP...');
  const totalLandedCostEGP = convertToEGP(totalLandedCost, exchangeRate);
  
  // 9. Calculate total quantity
  console.log('\n[STEP 9] Calculating total quantity...');
  const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
  console.log('   Total Quantity:', totalQuantity);
  
  // 10. Calculate per unit costs
  console.log('\n[STEP 10] Calculating per-unit costs...');
  const costPerUnit = calculateCostPerUnit(totalLandedCost, totalQuantity);
  const costPerUnitEGP = convertToEGP(costPerUnit, exchangeRate);
  
  const result = {
    productCost: Number(productCost.toFixed(2)),
    shippingCost: Number(shippingCost.toFixed(2)),
    insuranceCost: Number(insuranceCost.toFixed(2)),
    insurancePercentage,
    totalDuty: Number(totalDuty.toFixed(2)),
    vat: Number(vat.toFixed(2)),
    vatPercentage,
    totalLandedCost: Number(totalLandedCost.toFixed(2)),
    totalLandedCostEGP: Number(totalLandedCostEGP.toFixed(2)),
    totalQuantity,
    costPerUnit: Number(costPerUnit.toFixed(2)),
    costPerUnitEGP: Number(costPerUnitEGP.toFixed(2)),
    exchangeRate,
    products: productCalculations,
  };
  
  console.log('\n' + '✅'.repeat(80));
  console.log('✅ CALCULATION COMPLETE - RETURNING RESULT');
  console.log('✅'.repeat(80));
  console.log('📊 FINAL BREAKDOWN:');
  console.log('   Product Cost:        $', result.productCost);
  console.log('   Shipping Cost:       $', result.shippingCost, useWeightBased ? '(weight-based)' : '(manual)');
  console.log('   Insurance Cost:      $', result.insuranceCost, `(${insurancePercentage}% of product value)`);
  console.log('   Total Duty:          $', result.totalDuty);
  console.log('   VAT:                 $', result.vat);
  console.log('   ──────────────────────────────');
  console.log('   TOTAL LANDED COST:   $', result.totalLandedCost);
  console.log('   TOTAL LANDED COST:   E£', result.totalLandedCostEGP);
  console.log('   ──────────────────────────────');
  console.log('   Cost Per Unit:       $', result.costPerUnit);
  console.log('   Total Quantity:       ', result.totalQuantity);
  console.log('✅'.repeat(80) + '\n');
  
  // Final verification
  if (result.shippingCost === 0) {
    console.error('🚨🚨🚨 FINAL CHECK FAILED: shippingCost in result is 0!');
  }
  if (result.totalLandedCost === result.productCost) {
    console.error('🚨🚨🚨 FINAL CHECK FAILED: Total equals product cost!');
  }
  
  return result;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: 'USD' | 'EGP'): string {
  const symbol = currency === 'USD' ? '$' : 'E£';
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}