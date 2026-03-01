'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Save, Loader2, Plus } from 'lucide-react';

import {
  AnimatedPage,
  AnimatedCard,
  Alert
} from '@/components/animated';

interface Supplier {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  companyName: string;
  taxId?: string;
  country?: string;
  notes?: string;
  website?: string;
}

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isAuthenticated } = useAuth();
  const supplierId = params.id as string;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    companyName: '',
    taxId: '',
    country: '',
    notes: '',
    website: '',
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && token && supplierId) {
      fetchSupplier();
    }
  }, [isAuthenticated, token, supplierId]);

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to fetch supplier');
        return;
      }
      const data = await response.json();
      const supplier = data.supplier || data.data || data;
      setFormData({
        name: supplier.name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        companyName: supplier.companyName || '',
        taxId: supplier.taxId || '',
        country: supplier.country || '',
        notes: supplier.notes || '',
        website: supplier.website || '',
      });
    } catch (err) {
      setError('An error occurred while fetching supplier details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let website = formData.website.trim();
      if (website && !website.startsWith('http')) {
        website = 'https://' + website;
      }
      const updateData = {
        ...formData,
        website: website || undefined,
      };
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update supplier');
        return;
      }
      router.push(`/suppliers/${supplierId}`);
    } catch (err) {
      setError('An error occurred while updating the supplier');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <AnimatedPage>
        <div className="fixed inset-0 -z-10">
          <img
            src="https://plus.unsplash.com/premium_photo-1661963876857-0cff8745a6af?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
        </div>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-white">Loading...</p>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="fixed inset-0 -z-10">
        <img
          src="https://plus.unsplash.com/premium_photo-1661963876857-0cff8745a6af?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
      </div>
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/suppliers/${supplierId}`}
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Supplier
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4 mb-2">
            Edit Supplier
          </h1>
          <p className="text-gray-400">
            Update supplier information
          </p>
        </div>

        {error && (
          <Alert
            variant="error"
            title="Error"
            message={error}
            onClose={() => setError('')}
          />
        )}

        <AnimatedCard className="bg-gray-800/95 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <h2 className="dark-form-section-title">Supplier Information</h2>
            <div className="space-y-4">
              <div>
                <label className="dark-form-label">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="dark-form-input"
                />
              </div>
              <div>
                <label className="dark-form-label">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="dark-form-input"
                />
              </div>
              <div>
                <label className="dark-form-label">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="dark-form-input"
                />
              </div>
              <div>
                <label className="dark-form-label">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="dark-form-input"
                />
              </div>
              <div>
                <label className="dark-form-label">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="dark-form-textarea"
                />
              </div>
              <div>
                <label className="dark-form-label">Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="dark-form-input"
                />
              </div>
              <div>
                <label className="dark-form-label">Website</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  className="dark-form-input"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Full URL will be saved, but displayed truncated in the detail view
                </p>
              </div>
              <div>
                <label className="dark-form-label">Tax ID</label>
                <input
                  type="text"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                  className="dark-form-input"
                />
              </div>
              <div>
                <label className="dark-form-label">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="dark-form-textarea"
                />
              </div>
            </div>

            {/* --- Assign Products Section --- */}
            <div className="pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-2">
                Link products this supplier sells:
              </p>
              <Link
                href={`/suppliers/${supplierId}/assign-products`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors border border-blue-600"
              >
                <Plus className="w-4 h-4" />
                Assign Products
              </Link>
            </div>

            {/* --- Save / Cancel Buttons --- */}
            <div className="flex gap-4 pt-4 border-t border-gray-700">
              <button
                type="submit"
                disabled={submitting}
                className="dark-form-button-primary flex-1 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
              <Link
                href={`/suppliers/${supplierId}`}
                className="dark-form-button-secondary text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </AnimatedCard>
      </div>
    </AnimatedPage>
  );
}