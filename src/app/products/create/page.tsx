// src/app/products/create/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Cookies from 'js-cookie';

const Package = LucideIcons.Package as any;
const Plus = LucideIcons.Plus as any;
const Search = LucideIcons.Search as any;
const Eye = LucideIcons.Eye as any;
const Edit = LucideIcons.Edit as any;
const Trash2 = LucideIcons.Trash2 as any;
const Loader2 = LucideIcons.Loader2 as any;
const X = LucideIcons.X as any;

interface Product {
  _id: string;
  name: string;
  description?: string;
  hsCode: string;
  unitPrice: number;
  dutyPercentage: number;
  companyName: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProductsPage() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hsCode: '',
    unitPrice: '',
    dutyPercentage: ''
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (token) {
      loadProducts();
    }
  }, [token]);

  const getAuthHeaders = () => {
    const authToken = token || Cookies.get('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }
      
      const data = await response.json();
      setProducts(data.products || data.data || data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate HS Code
    if (!/^\d{6}$/.test(formData.hsCode)) {
      alert('HS Code must be exactly 6 digits');
      return;
    }

    // Validate unit price
    const unitPrice = parseFloat(formData.unitPrice);
    if (isNaN(unitPrice) || unitPrice < 0) {
      alert('Unit price must be a valid positive number');
      return;
    }

    // Validate duty percentage
    const dutyPercentage = parseFloat(formData.dutyPercentage);
    if (isNaN(dutyPercentage) || dutyPercentage < 0 || dutyPercentage > 100) {
      alert('Duty percentage must be between 0 and 100');
      return;
    }

    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct._id}`
        : '/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          hsCode: formData.hsCode.trim(),
          unitPrice: unitPrice,
          dutyPercentage: dutyPercentage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save product');
      }
      
      await loadProducts();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(error.message || 'Failed to save product');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      hsCode: product.hsCode,
      unitPrice: product.unitPrice.toString(),
      dutyPercentage: product.dutyPercentage.toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete product');
      }
      
      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ 
      name: '', 
      description: '', 
      hsCode: '', 
      unitPrice: '', 
      dutyPercentage: ''
    });
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.hsCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Products Management</h1>
            <p className="text-gray-400">Manage your product catalog</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-6 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name, HS Code, or description..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No products found
            </h3>
            <p className="text-gray-400 mb-4">Get started by adding your first product</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-750 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">HS Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Duty %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-750">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-400 truncate max-w-xs">{product.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300 font-mono">{product.hsCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-green-400 font-semibold">
                          {formatCurrency(product.unitPrice)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-blue-400 font-semibold">
                          {product.dutyPercentage}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <Link
                            href={`/products/${product._id}`}
                            className="text-blue-400 hover:text-blue-300 p-2 hover:bg-gray-700 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-green-400 hover:text-green-300 p-2 hover:bg-gray-700 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product._id)}
                            className="text-red-400 hover:text-red-300 p-2 hover:bg-gray-700 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800">
                <h2 className="text-xl font-bold text-white">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h2>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                  <p className="text-xs text-gray-400 mt-1">Max 200 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    maxLength={1000}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                  <p className="text-xs text-gray-400 mt-1">Max 1000 characters (optional)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    HS Code *
                  </label>
                  <input
                    type="text"
                    required
                    pattern="\d{6}"
                    title="Must be exactly 6 digits"
                    maxLength={6}
                    placeholder="e.g., 851830"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    value={formData.hsCode}
                    onChange={(e) => setFormData({...formData, hsCode: e.target.value})}
                  />
                  <p className="text-xs text-gray-400 mt-1">6-digit harmonized system code</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Unit Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Duty % *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      value={formData.dutyPercentage}
                      onChange={(e) => setFormData({...formData, dutyPercentage: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500"
                  >
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}