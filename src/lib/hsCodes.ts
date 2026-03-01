// lib/hsCodes.ts

/**
 * HS Code to Customs Duty Percentage Mapping
 * Based on Egyptian customs tariffs (simplified)
 */

export interface HSCodeInfo {
  code: string;
  category: string;
  description: string;
  dutyPercentage: number;
}

/**
 * Lookup table for HS codes and their duty percentages
 */
export const HS_CODE_DUTIES: Record<string, HSCodeInfo> = {
  // Electronics (Chapter 85)
  '851712': {
    code: '851712',
    category: 'Electronics',
    description: 'Smartphones and mobile phones',
    dutyPercentage: 10,
  },
  '851762': {
    code: '851762',
    category: 'Electronics',
    description: 'Machines for reception, conversion and transmission',
    dutyPercentage: 10,
  },
  '847130': {
    code: '847130',
    category: 'Electronics',
    description: 'Portable computers (laptops)',
    dutyPercentage: 5,
  },
  '852872': {
    code: '852872',
    category: 'Electronics',
    description: 'Television receivers',
    dutyPercentage: 15,
  },

  // Textiles (Chapter 62)
  '620342': {
    code: '620342',
    category: 'Textiles',
    description: 'Men\'s trousers of cotton',
    dutyPercentage: 20,
  },
  '620520': {
    code: '620520',
    category: 'Textiles',
    description: 'Men\'s shirts of cotton',
    dutyPercentage: 20,
  },
  '621142': {
    code: '621142',
    category: 'Textiles',
    description: 'Women\'s garments of cotton',
    dutyPercentage: 20,
  },

  // Footwear (Chapter 64)
  '640399': {
    code: '640399',
    category: 'Footwear',
    description: 'Sports footwear',
    dutyPercentage: 30,
  },

  // Food Products (Chapter 09)
  '090111': {
    code: '090111',
    category: 'Food',
    description: 'Coffee, not roasted',
    dutyPercentage: 5,
  },
  '090240': {
    code: '090240',
    category: 'Food',
    description: 'Black tea',
    dutyPercentage: 5,
  },

  // Furniture (Chapter 94)
  '940330': {
    code: '940330',
    category: 'Furniture',
    description: 'Wooden furniture for offices',
    dutyPercentage: 15,
  },
  '940360': {
    code: '940360',
    category: 'Furniture',
    description: 'Other wooden furniture',
    dutyPercentage: 15,
  },

  // Toys (Chapter 95)
  '950300': {
    code: '950300',
    category: 'Toys',
    description: 'Toys and models',
    dutyPercentage: 20,
  },

  // Vehicles (Chapter 87)
  '870323': {
    code: '870323',
    category: 'Vehicles',
    description: 'Automobiles (1500-3000cc)',
    dutyPercentage: 40,
  },

  // Machinery (Chapter 84)
  '841989': {
    code: '841989',
    category: 'Machinery',
    description: 'Industrial machinery',
    dutyPercentage: 5,
  },

  // Plastics (Chapter 39)
  '392010': {
    code: '392010',
    category: 'Plastics',
    description: 'Plastic plates and sheets',
    dutyPercentage: 10,
  },

  // Cosmetics (Chapter 33)
  '330499': {
    code: '330499',
    category: 'Cosmetics',
    description: 'Beauty and makeup preparations',
    dutyPercentage: 20,
  },
};

/**
 * Get duty percentage for a given HS code
 * @param hsCode - 6-digit HS code
 * @returns Duty percentage (0 if not found)
 */
export function getDutyPercentage(hsCode: string): number {
  const info = HS_CODE_DUTIES[hsCode];
  return info ? info.dutyPercentage : 0;
}

/**
 * Get full HS code information
 * @param hsCode - 6-digit HS code
 * @returns HS code info or null
 */
export function getHSCodeInfo(hsCode: string): HSCodeInfo | null {
  return HS_CODE_DUTIES[hsCode] || null;
}

/**
 * Check if HS code exists in lookup table
 * @param hsCode - 6-digit HS code
 * @returns true if code exists
 */
export function isValidHSCode(hsCode: string): boolean {
  return hsCode in HS_CODE_DUTIES;
}

/**
 * Get all HS codes by category
 * @param category - Category name
 * @returns Array of HS code info
 */
export function getHSCodesByCategory(category: string): HSCodeInfo[] {
  return Object.values(HS_CODE_DUTIES).filter(
    (info) => info.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get all available categories
 * @returns Array of unique categories
 */
export function getAllCategories(): string[] {
  const categories = Object.values(HS_CODE_DUTIES).map((info) => info.category);
  return Array.from(new Set(categories)).sort();
}

/**
 * Search HS codes by description
 * @param searchTerm - Search term
 * @returns Array of matching HS code info
 */
export function searchHSCodes(searchTerm: string): HSCodeInfo[] {
  const term = searchTerm.toLowerCase();
  return Object.values(HS_CODE_DUTIES).filter(
    (info) =>
      info.description.toLowerCase().includes(term) ||
      info.code.includes(term) ||
      info.category.toLowerCase().includes(term)
  );
}