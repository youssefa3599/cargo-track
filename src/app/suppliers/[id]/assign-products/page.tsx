'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import * as LucideIcons from 'lucide-react';

// Animated components
import {
  AnimatedPage,
  PageHeader,
  AnimatedCard,
  AnimatedButton,
  Alert,
} from '@/components/animated';

interface Product {
  _id: string;
  name: string;
  description?: string;
  hsCode: string;
  unitPrice: number;
  dutyPercentage: number;
  imageUrl?: string;
}

interface Supplier {
  _id: string;
  name: string;
  email: string;
  country: string;
}

export default function AssignProductsToSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isAuthenticated } = useAuth();

  const supplierId = params?.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [unassignedProducts, setUnassignedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigningProductId, setAssigningProductId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch supplier + unassigned products
  useEffect(() => {
    if (isAuthenticated && token && supplierId) {
      fetchSupplierAndProducts();
    }
  }, [isAuthenticated, token, supplierId]);

  const fetchSupplierAndProducts = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch supplier
      const supplierRes = await fetch(`/api/suppliers/${supplierId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!supplierRes.ok) {
        throw new Error('Failed to load supplier');
      }

      const supplierData = await supplierRes.json();
      const resolvedSupplier = supplierData.supplier || supplierData.data || supplierData;
      setSupplier(resolvedSupplier);

      // Fetch unassigned products
      const productsRes = await fetch(
        `/api/products?excludeSupplierId=${encodeURIComponent(supplierId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!productsRes.ok) {
        throw new Error('Failed to load products');
      }

      const productsData = await productsRes.json();
      const resolvedProducts = productsData.data || productsData.products || [];
      setUnassignedProducts(Array.isArray(resolvedProducts) ? resolvedProducts : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const assignProductToSupplier = async (productId: string) => {
    if (!supplier) {
      setError('Supplier not loaded');
      return;
    }

    if (!confirm(`Are you sure you want to assign this product to ${supplier.name}?`)) {
      return;
    }

    setAssigningProductId(productId);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ supplierId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to assign product');
      }

      // Refresh list after successful assignment
      await fetchSupplierAndProducts();
    } catch (err: any) {
      setError(err.message || 'Assignment failed');
    } finally {
      setAssigningProductId(null);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AnimatedPage>
      <PageHeader
        title={supplier ? `Assign Products to ${supplier.name}` : 'Assign Products'}
        icon={<LucideIcons.Link />}
        actions={
          <AnimatedButton
            variant="secondary"
            onClick={() => router.back()}
            icon={<LucideIcons.ArrowLeft />}
          >
            Back
          </AnimatedButton>
        }
      />

      <div className="max-w-4xl mx-auto">
        {error && (
          <Alert variant="error" title="Error" message={error} />
        )}

        {loading ? (
          <AnimatedCard className="bg-white border border-gray-200 text-center py-8">
            <div className="light-card-muted">Loading available products...</div>
          </AnimatedCard>
        ) : unassignedProducts.length === 0 ? (
          <AnimatedCard className="bg-white border border-gray-200 text-center py-8">
            <LucideIcons.Package className="mx-auto h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold light-card-title">All products are already assigned</h3>
            <p className="light-card-muted mt-2">
              There are no unassigned products available.
            </p>
          </AnimatedCard>
        ) : (
          <AnimatedCard className="bg-white border border-gray-200">
            <div className="space-y-4">
              {unassignedProducts.map((product) => (
                <div
                  key={product._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <div className="font-medium light-card-value">{product.name}</div>
                    <div className="text-sm light-card-muted">
                      HS: {product.hsCode} • {product.unitPrice.toLocaleString()} USD
                    </div>
                  </div>
                  <AnimatedButton
                    variant="primary"
                    size="sm"
                    onClick={() => assignProductToSupplier(product._id)}
                    loading={assigningProductId === product._id}
                    disabled={assigningProductId !== null}
                  >
                    Assign
                  </AnimatedButton>
                </div>
              ))}
            </div>
          </AnimatedCard>
        )}
      </div>
    </AnimatedPage>
  );
}