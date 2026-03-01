//C:\Users\youss\Downloads\cargo-track\src\lib\api.ts

import axios from 'axios';
import Cookies from 'js-cookie';

// ==================== TYPES ====================
export interface User {
  id: string;
  email: string;
  companyName: string;
  role: 'admin' | 'staff' | 'user';
  createdAt?: string;
}

interface LoginData {
  email: string;
  password: string;
}

// In @/lib/api
export interface RegisterData {
  email: string;
  password: string;
  name: string;
  companyName?: string; // ← add the ?
  role?: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

// ==================== API INSTANCE ====================
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('token');
      Cookies.remove('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================
export const authAPI = {
  login: (data: LoginData) => 
    api.post<AuthResponse>('/auth/login', data),
  
  register: (data: RegisterData) => 
    api.post<AuthResponse>('/auth/register', data),
  
  getCurrentUser: () => 
    api.get<User>('/auth/me'),
  
  refreshToken: () => 
    api.post<AuthResponse>('/auth/refresh'),
};

// ==================== SHIPMENT API ====================
export const shipmentAPI = {
  getAll: () => 
    api.get('/shipments'),
  
  getById: (id: string) => 
    api.get(`/shipments/${id}`),
  
  create: (data: any) => 
    api.post('/shipments', data),
  
  update: (id: string, data: any) => 
    api.put(`/shipments/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/shipments/${id}`),
};

// ==================== CUSTOMER API ====================
export const customerAPI = {
  getAll: () => 
    api.get('/customers'),
  
  getById: (id: string) => 
    api.get(`/customers/${id}`),
  
  create: (data: any) => 
    api.post('/customers', data),
  
  update: (id: string, data: any) => 
    api.put(`/customers/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/customers/${id}`),
};



// ==========================================
// Dashboard API - Add this section to the bottom of your api.ts
// ==========================================

export interface DashboardStats {
  totalShipments: number;
  inTransit: number;
  atCustoms: number;
  totalValue: number; // in EGP
}

export interface RecentShipment {
  id: string;
  containerNumber: string | null;
  type: 'import' | 'export';
  status: string;
  origin: string;
  destination: string;
  shippingDate: string;
  customerName: string | null;
  totalLandedCost: number;
}

export const dashboardAPI = {
  // Get dashboard statistics
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  // Get recent shipments
  getRecentShipments: async (limit: number = 5): Promise<RecentShipment[]> => {
    const response = await api.get('/shipments', {
      params: {
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    });
    return response.data.shipments || response.data;
  },
};
// ==================== EXPORT ====================
export default api;


// ==================== PRODUCT API ====================
export const productAPI = {
  getAll: () => 
    api.get('/products'),
  
  getById: (id: string) => 
    api.get(`/products/${id}`),
  
  create: (data: any) => 
    api.post('/products', data),
  
  update: (id: string, data: any) => 
    api.put(`/products/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/products/${id}`),
};