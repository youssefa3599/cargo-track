// src/types/supplier.ts

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Supplier {
  _id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: Address;
  country: string;
  paymentTerms: 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60' | 'COD' | 'Prepaid';
  rating?: number;
  taxId?: string;
  website?: string;
  notes?: string;
  companyId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: Address;
  country: string;
  paymentTerms: string;
  rating?: number;
  taxId?: string;
  website?: string;
  notes?: string;
  isActive?: boolean;
}

export interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  averageRating: number;
  suppliersByCountry: Array<{
    country: string;
    count: number;
  }>;
}