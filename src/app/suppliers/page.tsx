// src/app/suppliers/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import * as LucideIcons from 'lucide-react';

// Import animated components
import {
  AnimatedPage,
  AnimatedCard,
  Alert,
  TableSkeleton,
  EmptyState
} from '@/components/animated';

const Truck = LucideIcons.Truck as any;
const SearchIcon = LucideIcons.Search as any;
const Plus = LucideIcons.Plus as any;
const Loader2 = LucideIcons.Loader2 as any;

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface Supplier {
  _id: string;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SuppliersPage() {
  const router = useRouter();
  const { token, isAuthenticated, user } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchSuppliers();
    }
  }, [isAuthenticated, token]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/suppliers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError(
            `Access denied. Your role (${user?.role}) may not have permission to view suppliers.`
          );
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to fetch suppliers');
        }
        return;
      }

      const data = await response.json();
      let suppliersList: Supplier[] = [];

      if (Array.isArray(data)) {
        suppliersList = data;
      } else if (Array.isArray(data.suppliers)) {
        suppliersList = data.suppliers;
      } else if (Array.isArray(data.data)) {
        suppliersList = data.data;
      } else {
        setError('Unexpected data format received from server');
        return;
      }

      setSuppliers(suppliersList);
    } catch (err: any) {
      setError('An error occurred while fetching suppliers');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: Address): string => {
    if (!address) return 'N/A';
    if (typeof address === 'string') return address;
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean);
    
    return parts.join(', ') || 'N/A';
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    const search = searchTerm.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(search) ||
      supplier.email.toLowerCase().includes(search) ||
      supplier.contactPerson.toLowerCase().includes(search) ||
      supplier.phone.toLowerCase().includes(search) ||
      formatAddress(supplier.address).toLowerCase().includes(search)
    );
  });

  if (!isAuthenticated) return null;

  return (
    <AnimatedPage>
      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://plus.unsplash.com/premium_photo-1661963876857-0cff8745a6af?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Warehouse and logistics background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
      </div>

      {/* Subtle animated accents */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Truck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Suppliers</h1>
                <p className="text-gray-300">Manage your supplier contacts</p>
              </div>
            </div>
            <Link
              href="/suppliers/create"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Supplier
            </Link>
          </div>

          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, contact person, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full dark-form-input pl-10"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6">
            <Alert
              variant="error"
              title="Error"
              message={error}
              onClose={() => setError('')}
            />
          </div>
        )}

        {/* Loading / Content */}
        {loading ? (
          <TableSkeleton />
        ) : filteredSuppliers.length === 0 ? (
          <EmptyState
            icon={<Truck className="w-16 h-16" />}
            title={searchTerm ? 'No suppliers found' : 'No suppliers yet'}
            description={
              searchTerm
                ? 'Try adjusting your search terms'
                : 'Get started by adding your first supplier'
            }
            action={
              !searchTerm
                ? {
                    label: 'Add First Supplier',
                    onClick: () => router.push('/suppliers/create')
                  }
                : undefined
            }
          />
        ) : (
          <AnimatedCard className="!shadow-sm !p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Terms
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {supplier.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {supplier.contactPerson}
                            </div>
                            {supplier.rating !== undefined && supplier.rating > 0 && (
                              <div className="flex items-center mt-1">
                                <span className="text-xs text-yellow-400">
                                  ★ {supplier.rating.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-800">{supplier.email}</div>
                        <div className="text-sm text-gray-500">{supplier.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-800 max-w-xs">
                          {formatAddress(supplier.address)}
                        </div>
                        <div className="text-sm text-gray-500">{supplier.country}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {supplier.paymentTerms}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          supplier.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {supplier.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <Link
                          href={`/suppliers/${supplier._id}`}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-900">{filteredSuppliers.length}</span> of{' '}
                <span className="font-medium text-gray-900">{suppliers.length}</span> supplier
                {suppliers.length !== 1 ? 's' : ''}
              </p>
            </div>
          </AnimatedCard>
        )}
      </div>
    </AnimatedPage>
  );
}