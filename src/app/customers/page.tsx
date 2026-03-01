'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import * as LucideIcons from 'lucide-react';

// Animated UI components (same as Shipments)
import {
  AnimatedCard,
  AnimatedButton,
  PageHeader,
  AnimatedPage,
  Input,
  Alert,
  EmptyState,
} from '@/components/animated';

// Icons
const Users = LucideIcons.Users as any;
const Plus = LucideIcons.Plus as any;
const Search = LucideIcons.Search as any;

/* ✅ FRONTEND TYPE MATCHING BACKEND SCHEMA */
interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  companyName: string;
  taxId?: string;
  type: 'customer';
  createdAt: string;
  updatedAt: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const { token, isAuthenticated, user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  /* 🔐 Auth guard */
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchCustomers();
    }
  }, [isAuthenticated, token]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/customers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError(
            `Access denied. Your role (${user?.role}) may not have permission to view customers.`
          );
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to fetch customers');
        }
        return;
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setCustomers(data);
      } else if (Array.isArray(data.customers)) {
        setCustomers(data.customers);
      } else if (Array.isArray(data.data)) {
        setCustomers(data.data);
      } else {
        setCustomers([]);
        setError('Unexpected data format received from server');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while fetching customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      customer.companyName.toLowerCase().includes(search) ||
      customer.phone.toLowerCase().includes(search)
    );
  });

  if (!isAuthenticated) return null;

  return (
    <AnimatedPage>
      {/* Background — same as Shipments */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1590650516494-0c8e4a4dd67e?q=80&w=1471&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Shipping containers background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
      </div>

      {/* Animated Blobs — subtle accents */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      <div className="relative">
        {/* Header with Actions */}
        <PageHeader
          icon={<Users className="w-8 h-8" />}
          title="Customer Management"
          description={`Manage your business contacts (${customers.length} total)`}
          actions={
            <AnimatedButton
              variant="primary"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => router.push('/customers/create')}
            >
              Add Customer
            </AnimatedButton>
          }
        />

        {/* Search Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <AnimatedCard>
            <Input
              icon={<Search className="w-5 h-5" />}
              placeholder="Search by name, email, company, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </AnimatedCard>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
            <Alert
              variant="error"
              title="Error loading customers"
              message={error}
              onClose={() => setError('')}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-16 h-16" />}
              title={searchTerm ? 'No matching customers' : 'No customers yet'}
              description={
                searchTerm
                  ? 'Try adjusting your search terms.'
                  : 'Add your first customer to get started.'
              }
              action={
                !searchTerm
                  ? {
                      label: 'Add New Customer',
                      onClick: () => router.push('/customers/create'),
                    }
                  : undefined
              }
            />
          ) : (
            <AnimatedCard>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-gray-900 font-medium">{customer.name}</div>
                          {customer.taxId && (
                            <div className="text-xs text-gray-500">Tax ID: {customer.taxId}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700">{customer.companyName}</td>
                        <td className="px-6 py-4">
                          <div className="text-gray-700">{customer.email}</div>
                          <div className="text-gray-500">{customer.phone}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                          {customer.address}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/customers/${customer._id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600 rounded-b-lg">
                Showing {filteredCustomers.length} of {customers.length}{' '}
                customer{customers.length !== 1 ? 's' : ''}
              </div>
            </AnimatedCard>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}