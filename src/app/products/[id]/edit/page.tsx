// src/app/products/[id]/edit/page.tsx - NEW FILE

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Cookies from 'js-cookie';

const ArrowLeft = LucideIcons.ArrowLeft as any;
const Upload = LucideIcons.Upload as any;
const Loader2 = LucideIcons.Loader2 as any;
const X = LucideIcons.X as any;
const Save = LucideIcons.Save as any;

interface Product {
  _id: string;
  name: string;
  description?: string;
  hsCode: string;
  unitPrice: number;
  dutyPercentage: number;
  imageUrl?: string;
  imagePublicId?: string;
}

export default function EditProductPage() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hsCode: '',
    unitPrice: '',
    dutyPercentage: '',
    imageUrl: '',
    imagePublicId: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (token && productId) {
      loadProduct();
    }
  }, [token, productId]);

  const getAuthHeaders = () => {
    const authToken = token || Cookies.get('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };
  };

  const loadProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }
      
      const data = await response.json();
      const product = data.product || data;
      
      setFormData({
        name: product.name || '',
        description: product.description || '',
        hsCode: product.hsCode || '',
        unitPrice: product.unitPrice?.toString() || '',
        dutyPercentage: product.dutyPercentage?.toString() || '',
        imageUrl: product.imageUrl || '',
        imagePublicId: product.imagePublicId || ''
      });
      
      if (product.imageUrl) {
        setImagePreview(product.imageUrl);
      }
    } catch (error: any) {
      console.error('Error loading product:', error);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const authToken = token || Cookies.get('token');
      const response = await fetch('/api/upload/product-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: uploadFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await response.json();
      
      // Delete old image if exists
      if (formData.imagePublicId && formData.imagePublicId !== data.publicId) {
        try {
          await fetch('/api/upload/product-image', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ publicId: formData.imagePublicId })
          });
        } catch (err) {
          console.error('Failed to delete old image:', err);
        }
      }
      
      setFormData(prev => ({
        ...prev,
        imageUrl: data.imageUrl,
        imagePublicId: data.publicId
      }));
      setImagePreview(data.imageUrl);
      
    } catch (error: any) {
      alert(error.message || 'Failed to upload image');
      // Revert to original image on error
      if (formData.imageUrl) {
        setImagePreview(formData.imageUrl);
      } else {
        setImagePreview(null);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async () => {
    if (formData.imagePublicId) {
      try {
        const authToken = token || Cookies.get('token');
        await fetch('/api/upload/product-image', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ publicId: formData.imagePublicId })
        });
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    }
    
    setFormData(prev => ({ ...prev, imageUrl: '', imagePublicId: '' }));
    setImagePreview(null);
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

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          hsCode: formData.hsCode.trim(),
          unitPrice: unitPrice,
          dutyPercentage: dutyPercentage,
          imageUrl: formData.imageUrl,
          imagePublicId: formData.imagePublicId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }
      
      // Success - redirect to products list
      router.push('/products');
    } catch (error: any) {
      console.error('Error updating product:', error);
      setError(error.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </Link>
          <h1 className="text-3xl font-bold text-white">Edit Product</h1>
          <p className="text-gray-400 mt-1">Update product information</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-6">
          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product Image
            </label>
            
            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="text-gray-400">
                    {uploadingImage ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="ml-2">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-500 mb-2" />
                        <p className="text-sm">Click to upload product image</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP up to 5MB</p>
                      </>
                    )}
                  </div>
                </label>
              </div>
            ) : (
              <div className="relative inline-block">
                <Image
                  src={imagePreview}
                  alt="Product preview"
                  width={300}
                  height={300}
                  className="rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={uploadingImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 disabled:bg-gray-500 shadow-lg"
                >
                  <X className="w-5 h-5" />
                </button>
                <label 
                  htmlFor="image-upload-replace"
                  className="absolute bottom-2 right-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-500 cursor-pointer flex items-center gap-2 text-sm shadow-lg"
                >
                  <Upload className="w-4 h-4" />
                  Replace
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                  id="image-upload-replace"
                />
              </div>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              maxLength={200}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <p className="text-xs text-gray-400 mt-1">Max 200 characters</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              maxLength={1000}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
            <p className="text-xs text-gray-400 mt-1">Max 1000 characters (optional)</p>
          </div>

          {/* HS Code */}
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
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.hsCode}
              onChange={(e) => setFormData({...formData, hsCode: e.target.value})}
            />
            <p className="text-xs text-gray-400 mt-1">6-digit harmonized system code</p>
          </div>

          {/* Unit Price & Duty Percentage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Unit Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.unitPrice}
                onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Duty Percentage *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.dutyPercentage}
                onChange={(e) => setFormData({...formData, dutyPercentage: e.target.value})}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-700">
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
            <Link
              href="/products"
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}