'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import * as LucideIcons from 'lucide-react';

// Import animated components
import {
  AnimatedPage,
  AnimatedCard,
  Alert,
  PageHeader
} from '@/components/animated';

const ArrowLeft = LucideIcons.ArrowLeft;
const Edit = LucideIcons.Edit;
const Trash2 = LucideIcons.Trash2;
const Loader2 = LucideIcons.Loader2;
const Building = LucideIcons.Building;
const Mail = LucideIcons.Mail;
const Phone = LucideIcons.Phone;
const MapPin = LucideIcons.MapPin;
const Star = LucideIcons.Star;
const Package = LucideIcons.Package;
const Plus = LucideIcons.Plus;

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
  companyName: string;
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

interface Product {
  _id: string;
  name: string;
  hsCode: string;
  unitPrice: number;
  imageUrl?: string;
}

interface Stats {
  totalShipments: number;
  activeShipments: number;
  totalValue: number;
}

export default function SupplierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isAuthenticated } = useAuth();

  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && token && supplierId) {
      fetchSupplierAndProducts();
    }
  }, [isAuthenticated, token, supplierId]);

  const fetchSupplierAndProducts = async () => {
    try {
      setLoading(true);
      setError('');

      const supRes = await fetch(`/api/suppliers/${supplierId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!supRes.ok) {
        if (supRes.status === 404) throw new Error('Supplier not found');
        if (supRes.status === 403) throw new Error('Access denied');
        const data = await supRes.json();
        throw new Error(data.error || 'Failed to fetch supplier');
      }

      const supData = await supRes.json();
      const supplierData = supData.supplier || supData.data || supData;
      const statsData = supData.stats || null;

      setSupplier(supplierData);
      setStats(statsData);

      const prodRes = await fetch(`/api/products?supplierId=${encodeURIComponent(supplierId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!prodRes.ok) {
        console.warn('Failed to fetch products:', await prodRes.text());
        setProducts([]);
        return;
      }

      const prodData = await prodRes.json();
      const productList = prodData.data || prodData.products || [];
      setProducts(productList);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: Address | string): string => {
    if (!address) return 'N/A';
    if (typeof address === 'string') return address;
    const parts = [address.street, address.city, address.state, address.zipCode].filter(Boolean);
    return parts.join(', ') || 'N/A';
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete supplier');
        return;
      }

      router.push('/suppliers');
    } catch (err) {
      alert('An error occurred while deleting the supplier');
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <AnimatedPage>
        <div className="fixed inset-0 -z-10">
          <img
            src="https://plus.unsplash.com/premium_photo-1661963876857-0cff8745a6af?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Warehouse background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
        </div>

        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-white">Loading supplier details...</p>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  if (error || !supplier) {
    return (
      <AnimatedPage>
        <div className="fixed inset-0 -z-10">
          <img
            src="https://plus.unsplash.com/premium_photo-1661963876857-0cff8745a6af?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Warehouse background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Link
              href="/suppliers"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Suppliers
            </Link>
          </div>
          <Alert
            variant="error"
            title="Error Loading Supplier"
            message={error || 'Supplier not found'}
            onClose={() => router.push('/suppliers')}
          />
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="fixed inset-0 -z-10">
        <img
          src="https://plus.unsplash.com/premium_photo-1661963876857-0cff8745a6af?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Warehouse background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
      </div>

      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/suppliers"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Suppliers
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{supplier.name}</h1>
                <p className="text-white/70">{supplier.contactPerson}</p>
                {supplier.rating !== undefined && supplier.rating > 0 && (
                  <div className="flex items-center mt-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />
                    <span className="text-sm font-medium text-white">
                      {supplier.rating.toFixed(1)} / 5.0
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/suppliers/${supplierId}/assign-products`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors border border-blue-600"
              >
                <Plus className="w-4 h-4" />
                Assign Products
              </Link>
              <Link
                href={`/suppliers/${supplierId}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-black font-medium rounded-lg transition-colors border border-gray-300"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              supplier.isActive
                ? 'bg-green-100 text-black'
                : 'bg-gray-200 text-black'
            }`}
          >
            {supplier.isActive ? '✓ Active' : 'Inactive'}
          </span>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <AnimatedCard className="bg-white border border-gray-200">
              <p className="text-sm text-black/70 mb-1">Total Shipments</p>
              <p className="text-2xl font-bold text-black">{stats.totalShipments}</p>
            </AnimatedCard>
            <AnimatedCard className="bg-white border border-gray-200">
              <p className="text-sm text-black/70 mb-1">Active Shipments</p>
              <p className="text-2xl font-bold text-green-700">{stats.activeShipments}</p>
            </AnimatedCard>
            <AnimatedCard className="bg-white border border-gray-200">
              <p className="text-sm text-black/70 mb-1">Total Value</p>
              <p className="text-2xl font-bold text-blue-700">
                ${stats.totalValue.toLocaleString()}
              </p>
            </AnimatedCard>
          </div>
        )}

        <div className="space-y-6">
          {/* Contact Information */}
          <AnimatedCard className="bg-white border border-gray-200">
            <h2 className="black-form-section-title">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {supplier.companyName && (
                <div className="flex items-start gap-3">
                  <Building className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="black-card-label">Company Name</p>
                    <p className="black-card-value">{supplier.companyName}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="black-card-label">Email</p>
                  <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:text-blue-800 font-medium">
                    {supplier.email}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="black-card-label">Phone</p>
                  <a href={`tel:${supplier.phone}`} className="black-card-value">
                    {supplier.phone}
                  </a>
                </div>
              </div>
              {supplier.taxId && (
                <div>
                  <p className="black-card-label">Tax ID</p>
                  <p className="black-card-value">{supplier.taxId}</p>
                </div>
              )}
              <div>
                <p className="black-card-label">Country</p>
                <p className="black-card-value">{supplier.country}</p>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard className="bg-white border border-gray-200">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <h2 className="black-card-title">Address</h2>
                <p className="text-black leading-relaxed">{formatAddress(supplier.address)}</p>
              </div>
            </div>
          </AnimatedCard>

          {supplier.notes && (
            <AnimatedCard className="bg-white border border-gray-200">
              <h2 className="black-card-title">Notes</h2>
              <p className="text-black whitespace-pre-wrap leading-relaxed">{supplier.notes}</p>
            </AnimatedCard>
          )}

          {/* PRODUCTS SECTION */}
          <AnimatedCard className="bg-white border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">Products Supplied</h2>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {products.length} product{products.length !== 1 ? 's' : ''}
              </span>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-black/70">No products assigned yet.</p>
                <Link
                  href={`/suppliers/${supplierId}/assign-products`}
                  className="mt-3 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-4 h-4" />
                  Assign your first product
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Link
                    key={product._id}
                    href={`/products/${product._id}`}
                    className="group block bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg overflow-hidden transition-all hover:shadow-md"
                  >
                    <div className="aspect-square bg-white flex items-center justify-center relative">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-contain p-2"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <Package className="w-10 h-10 text-gray-400" />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-black group-hover:text-blue-800 line-clamp-1">
                        {product.name}
                      </h3>
                      <div className="flex justify-between text-sm text-black/70 mt-1">
                        <span>HS: {product.hsCode}</span>
                        <span>${product.unitPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </AnimatedCard>
        </div>
      </div>
    </AnimatedPage>
  );
}