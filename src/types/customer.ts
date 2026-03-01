// types/customer.ts

export interface Customer {
  _id: string;
  companyName: string;
  name: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  type: 'customer' | 'supplier' | 'both';
  taxId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CustomerType = 'customer' | 'supplier' | 'both';