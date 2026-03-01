'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
const Save = LucideIcons.Save as any;
const X = LucideIcons.X as any;

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId?: string;
  type: 'customer' | 'supplier';
}

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, token } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    type: 'customer' as 'customer' | 'supplier',
  });

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch customer
  useEffect(() => {
    if (!isAuthenticated || !params?.id || !token) return;

    const fetchCustomer = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/customers/${params.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to load customer (${response.status})`);
        }

        const data = await response.json();
        if (data.customer) {
          setCustomer(data.customer);
          setFormData({
            name: data.customer.name || '',
            email: data.customer.email || '',
            phone: data.customer.phone || '',
            address: data.customer.address || '',
            taxId: data.customer.taxId || '',
            type: data.customer.type || 'customer',
          });
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load customer data');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [isAuthenticated, params?.id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !params?.id) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/customers/${params.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update customer');
      }

      router.push('/customers');
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!isAuthenticated) return null;

  // Background & overlay (same as Shipments)
  return (
    <AnimatedPage>
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
          title="Edit Customer"
          description="Update customer details"
          actions={
            <AnimatedButton
              variant="ghost"
              icon={<ArrowLeft className="w-5 h-5" />}
              onClick={() => router.push('/customers')}
            >
              Back to List
            </AnimatedButton>
          }
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {error && (
            <div className="mb-6">
              <Alert
                variant="error"
                title="Error"
                message={error}
                onClose={() => setError(null)}
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
            <AnimatedCard>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Customer name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="customer@example.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1234567890"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Main St, City, Country"
                  />
                </div>

                {/* Tax ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tax identification number"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <AnimatedButton
                    variant="secondary"
                    icon={<X className="w-4 h-4" />}
                    onClick={() => router.push('/customers')}
                    disabled={saving}
                  >
                    Cancel
                  </AnimatedButton>
                  <AnimatedButton
                    variant="primary"
                    type="submit"
                    icon={<Save className="w-4 h-4" />}
                    loading={saving}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </AnimatedButton>
                </div>
              </form>
            </AnimatedCard>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}