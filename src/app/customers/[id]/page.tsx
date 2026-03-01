'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import * as LucideIcons from 'lucide-react';

// Animated components (same as Shipments)
import {
  AnimatedPage,
  PageHeader,
  AnimatedCard,
  AnimatedButton,
  Alert,
} from '@/components/animated';

// Icons
const Users = LucideIcons.Users as any;
const ArrowLeft = LucideIcons.ArrowLeft as any;
const Edit = LucideIcons.Edit as any;
const Trash2 = LucideIcons.Trash2 as any;

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

// Safe date formatter (no logs)
function formatDate(dateString: string | null | undefined): string | null {
  if (!dateString || dateString === 'null' || dateString === 'undefined') return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date.toLocaleString();
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isAuthenticated } = useAuth();

  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch customer
  useEffect(() => {
    if (isAuthenticated && token && customerId) {
      fetchCustomer();
    }
  }, [isAuthenticated, token, customerId]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Customer not found');
        } else if (response.status === 403) {
          setError('Access denied');
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to fetch customer');
        }
        return;
      }

      const rawResponse = await response.json();

      // Extract customer from common API structures
      let customerData;
      if ('customer' in rawResponse) {
        customerData = rawResponse.customer;
      } else if ('data' in rawResponse && typeof rawResponse.data === 'object') {
        customerData = rawResponse.data;
      } else if ('_id' in rawResponse) {
        customerData = rawResponse;
      } else {
        setError('Invalid response format from server');
        return;
      }

      setCustomer(customerData);
    } catch (err) {
      setError('An error occurred while fetching customer details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete customer');
        return;
      }

      router.push('/customers');
    } catch (err) {
      alert('An error occurred while deleting the customer');
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthenticated) return null;

  const createdAtFormatted = customer ? formatDate(customer.createdAt) : null;
  const updatedAtFormatted = customer ? formatDate(customer.updatedAt) : null;

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

      {/* Animated Blobs */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      <div className="relative">
        <PageHeader
          icon={<Users className="w-8 h-8" />}
          title={customer?.name || 'Customer Details'}
          description={customer?.companyName || ''}
          actions={
            <div className="flex gap-2">
              <Link href={`/customers/${customerId}/edit`}>
                <AnimatedButton variant="secondary" icon={<Edit className="w-4 h-4" />}>
                  Edit
                </AnimatedButton>
              </Link>
              <AnimatedButton
  variant="danger"
  icon={<Trash2 className="w-4 h-4" />}
  onClick={handleDelete}
  loading={deleting}
  disabled={deleting}
>
  Delete
</AnimatedButton>
            </div>
          }
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {error && (
            <div className="mb-6">
              <Alert
                variant="error"
                title="Error loading customer"
                message={error}
                onClose={() => setError('')}
              />
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : !customer ? (
            <AnimatedCard>
              <div className="text-center py-12">
                <p className="text-gray-600">Customer not found.</p>
                <AnimatedButton
                  variant="primary"
                  className="mt-4"
                  onClick={() => router.push('/customers')}
                >
                  Go Back
                </AnimatedButton>
              </div>
            </AnimatedCard>
          ) : (
            <>
              {/* Contact Information */}
              <AnimatedCard className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{customer.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900">{customer.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Company</p>
                    <p className="text-gray-900">{customer.companyName || 'N/A'}</p>
                  </div>
                  {customer.taxId && (
                    <div>
                      <p className="text-sm text-gray-500">Tax ID</p>
                      <p className="text-gray-900">{customer.taxId}</p>
                    </div>
                  )}
                </div>
              </AnimatedCard>

              {/* Address */}
              <AnimatedCard className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
                <p className="text-gray-900">{customer.address || 'N/A'}</p>
              </AnimatedCard>

              {/* Metadata */}
              {(createdAtFormatted || updatedAtFormatted) && (
                <AnimatedCard className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {createdAtFormatted && (
                      <div>
                        <p className="text-sm text-gray-500">Created</p>
                        <p className="text-gray-900">{createdAtFormatted}</p>
                      </div>
                    )}
                    {updatedAtFormatted && (
                      <div>
                        <p className="text-sm text-gray-500">Last Updated</p>
                        <p className="text-gray-900">{updatedAtFormatted}</p>
                      </div>
                    )}
                  </div>
                </AnimatedCard>
              )}

              {/* Related Records */}
              <AnimatedCard>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Records</h2>
                <p className="text-gray-600 text-sm">
                  Shipments and invoices for this customer will appear here.
                </p>
              </AnimatedCard>
            </>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}