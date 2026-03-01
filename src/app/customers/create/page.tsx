'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import * as LucideIcons from 'lucide-react';

// Animated components
import {
  AnimatedPage,
  PageHeader,
  AnimatedCard,
  AnimatedButton,
  Input,
  Alert,
} from '@/components/animated';

// Icons
const Users = LucideIcons.Users as any;
const ArrowLeft = LucideIcons.ArrowLeft as any;
const Save = LucideIcons.Save as any;

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  companyName: string;
  taxId: string;
}

export default function CreateCustomerPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    companyName: '',
    taxId: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone is required';
    }

    if (!formData.companyName.trim()) {
      errors.companyName = 'Company name is required';
    }

    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        ...formData,
        type: 'customer',
        // Only include taxId if it has a value
        ...(formData.taxId.trim() && { taxId: formData.taxId }),
      };

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create customer');
        return;
      }

      const result = await response.json();
      
      // Extract customer ID from various possible response structures
      let customerId;
      if (result.customer?._id) {
        customerId = result.customer._id;
      } else if (result.data?._id) {
        customerId = result.data._id;
      } else if (result._id) {
        customerId = result._id;
      }

      // Redirect to the new customer's detail page or back to list
      if (customerId) {
        router.push(`/customers/${customerId}`);
      } else {
        router.push('/customers');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while creating the customer');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <AnimatedPage>
      {/* Background */}
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
          title="Add New Customer"
          description="Create a new customer record"
          actions={
            <AnimatedButton
              variant="secondary"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => router.push('/customers')}
            >
              Back to Customers
            </AnimatedButton>
          }
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {error && (
            <div className="mb-6">
              <Alert
                variant="error"
                title="Error creating customer"
                message={error}
                onClose={() => setError('')}
              />
            </div>
          )}

          <AnimatedCard>
            <form onSubmit={handleSubmit}>
              {/* Basic Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="John Doe"
                    />
                    {validationErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.companyName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Acme Corporation"
                    />
                    {validationErrors.companyName && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.companyName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1">
                      Tax ID <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="taxId"
                      name="taxId"
                      value={formData.taxId}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="XX-XXXXXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="john@example.com"
                    />
                    {validationErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+1 (555) 123-4567"
                    />
                    {validationErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows={3}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.address ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="123 Main Street, City, State, ZIP"
                    />
                    {validationErrors.address && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
                <AnimatedButton
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/customers')}
                  disabled={loading}
                >
                  Cancel
                </AnimatedButton>
                <AnimatedButton
                  type="submit"
                  variant="primary"
                  icon={<Save className="w-4 h-4" />}
                  loading={loading}
                  disabled={loading}
                >
                  Create Customer
                </AnimatedButton>
              </div>
            </form>
          </AnimatedCard>
        </div>
      </div>
    </AnimatedPage>
  );
}