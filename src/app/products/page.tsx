// src/app/products/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Cookies from 'js-cookie';

// ✅ Import your animated components (same as in shipments)
import {
  AnimatedCard,
  AnimatedButton,
  PageHeader,
  AnimatedPage,
  Input,
  TableSkeleton,
  EmptyState,
  Alert
} from '@/components/animated';

const Package = LucideIcons.Package;
const Plus = LucideIcons.Plus;
const Search = LucideIcons.Search;
const X = LucideIcons.X;
const Upload = LucideIcons.Upload;
const ImageIcon = LucideIcons.Image;
const Edit = LucideIcons.Edit;
const Trash2 = LucideIcons.Trash2;
const ChevronLeft = LucideIcons.ChevronLeft;
const ChevronRight = LucideIcons.ChevronRight;
const Eye = LucideIcons.Eye;
const Loader2 = LucideIcons.Loader2;

interface Product {
  _id: string;
  name: string;
  description?: string;
  hsCode: string;
  unitPrice: number;
  dutyPercentage: number;
  imageUrl?: string;
  imagePublicId?: string;
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hsCode: '',
    unitPrice: '',
    dutyPercentage: '',
    imageUrl: '',
    imagePublicId: ''
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);

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
      const productArray = data.products || data.data || data || [];
      setProducts(productArray);
    } catch (error) {
      console.error('❌ ERROR LOADING PRODUCTS:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      setFormData(prev => ({
        ...prev,
        imageUrl: data.imageUrl,
        imagePublicId: data.publicId
      }));
      setImagePreview(data.imageUrl);
    } catch (error: any) {
      alert(error.message || 'Failed to upload image');
      setImagePreview(null);
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

    if (!/^\d{6}$/.test(formData.hsCode)) {
      alert('HS Code must be exactly 6 digits');
      return;
    }

    const unitPrice = parseFloat(formData.unitPrice);
    if (isNaN(unitPrice) || unitPrice < 0) {
      alert('Unit price must be a valid positive number');
      return;
    }

    const dutyPercentage = parseFloat(formData.dutyPercentage);
    if (isNaN(dutyPercentage) || dutyPercentage < 0 || dutyPercentage > 100) {
      alert('Duty percentage must be between 0 and 100');
      return;
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
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
        throw new Error(errorData.error || 'Failed to save product');
      }

      await loadProducts();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(error.message || 'Failed to save product');
    }
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
      if (selectedProduct?._id === id) setSelectedProduct(null);
      if (slideshowIndex !== null) {
        const updatedProducts = products.filter(p => p._id !== id);
        if (updatedProducts.length === 0) {
          setSlideshowIndex(null);
        } else if (slideshowIndex >= updatedProducts.length) {
          setSlideshowIndex(updatedProducts.length - 1);
        }
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setImagePreview(null);
    setFormData({
      name: '',
      description: '',
      hsCode: '',
      unitPrice: '',
      dutyPercentage: '',
      imageUrl: '',
      imagePublicId: ''
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AnimatedPage>
      {/* ✅ WAREHOUSE BACKGROUND WITH OVERLAY */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="https://images.unsplash.com/photo-1495195129352-aeb325a55b65?q=80&w=876&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Warehouse shelves with products"
          fill
          className="object-cover"
          priority
          unoptimized
        />
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-blue-900/80 to-gray-900/90" />
      </div>

      {/* Optional animated blobs (if defined in globals.css) */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      <div className="relative">
        {/* Header */}
        <PageHeader
          icon={<Package className="w-8 h-8" />}
          title="Products Management"
          description={`Manage your product catalog (${products.length} items)`}
          actions={
            <AnimatedButton
              variant="primary"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => setShowModal(true)}
            >
              Add Product
            </AnimatedButton>
          }
        />

        {/* Search */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <AnimatedCard>
            <Input
              icon={<Search className="w-5 h-5" />}
              placeholder="Search products by name, HS Code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </AnimatedCard>

          {/* Launch Slideshow Button */}
          {filteredProducts.length > 0 && (
            <div className="mt-4 text-center">
              <AnimatedButton
                variant="primary"
                onClick={() => setSlideshowIndex(0)}
              >
                View as Slideshow ({filteredProducts.length} items)
              </AnimatedButton>
            </div>
          )}
        </div>

        {/* Loading / Empty */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {loading ? (
            <TableSkeleton />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={<Package className="w-16 h-16" />}
              title="No products found"
              description="Get started by adding your first product"
              action={{
                label: "Add Product",
                onClick: () => setShowModal(true)
              }}
            />
          ) : (
            /* Grid for browsing */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <AnimatedCard
                  key={product._id}
                  onClick={() => setSelectedProduct(product)}
                  className="cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <div className="relative w-full h-48 bg-gray-900 rounded-t-lg overflow-hidden">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl.trim()}
                        alt={product.name}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <ImageIcon className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-semibold truncate">{product.name}</h3>
                    <p className="text-sm text-gray-400 mt-1 truncate">
                      {product.description || 'No description'}
                    </p>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-green-400 font-medium">
                        {formatCurrency(product.unitPrice)}
                      </span>
                      <span className="text-blue-400">{product.hsCode}</span>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          )}
        </div>

        {/* >>> ADD PRODUCT MODAL <<< */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
                <h2 className="text-xl font-bold text-white">Add New Product</h2>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Image
                  </label>
                  {!imagePreview ? (
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition">
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
                        width={200}
                        height={200}
                        className="rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        disabled={uploadingImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:bg-gray-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    className="dark-form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    className="dark-form-textarea"
                    rows={3}
                    maxLength={1000}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">HS Code *</label>
                  <input
                    type="text"
                    required
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="e.g., 851830"
                    className="dark-form-input"
                    value={formData.hsCode}
                    onChange={(e) => setFormData({ ...formData, hsCode: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className="dark-form-input"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Duty %</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      className="dark-form-input"
                      value={formData.dutyPercentage}
                      onChange={(e) => setFormData({ ...formData, dutyPercentage: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading || uploadingImage}
                    className="dark-form-button-primary flex-1"
                  >
                    {loading ? 'Creating...' : 'Create Product'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="dark-form-button-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* >>> PRODUCT DETAIL MODAL <<< */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700 flex justify-between items-start sticky top-0 bg-gray-800 z-10">
                <h2 className="text-xl font-bold text-white">{selectedProduct.name}</h2>
                <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    {selectedProduct.imageUrl ? (
                      <Image
                        src={selectedProduct.imageUrl.trim()}
                        alt={selectedProduct.name}
                        width={300}
                        height={300}
                        className="rounded-lg object-contain w-full h-auto"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-64 bg-gray-700 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="md:w-2/3 space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">Description</h3>
                      <p className="text-white mt-1">
                        {selectedProduct.description || 'No description provided.'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><h3 className="text-sm font-medium text-gray-400">HS Code</h3><p className="text-white font-mono">{selectedProduct.hsCode}</p></div>
                      <div><h3 className="text-sm font-medium text-gray-400">Unit Price</h3><p className="text-green-400 font-semibold">{formatCurrency(selectedProduct.unitPrice)}</p></div>
                      <div><h3 className="text-sm font-medium text-gray-400">Duty Percentage</h3><p className="text-blue-400 font-semibold">{selectedProduct.dutyPercentage}%</p></div>
                      <div><h3 className="text-sm font-medium text-gray-400">Created</h3><p className="text-white">{new Date(selectedProduct.createdAt).toLocaleDateString()}</p></div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <AnimatedButton
                        variant="primary"
                        icon={<Edit className="w-4 h-4" />}
                        onClick={() => {
                          setSelectedProduct(null);
                          router.push(`/products/${selectedProduct._id}/edit`);
                        }}
                      >
                        Edit
                      </AnimatedButton>
                      <AnimatedButton
                        variant="secondary"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={() => {
                          setSelectedProduct(null);
                          handleDelete(selectedProduct._id);
                        }}
                      >
                        Delete
                      </AnimatedButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* >>> TRUE SLIDESHOW MODAL <<< */}
        {slideshowIndex !== null && filteredProducts.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl">
              {/* Close */}
              <AnimatedButton
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10"
                onClick={() => setSlideshowIndex(null)}
                icon={<X className="w-5 h-5" />}
              >
                {" "}
              </AnimatedButton>

              {/* Nav Arrows */}
              <AnimatedButton
                variant="secondary"
                size="lg"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                onClick={() => {
                  if (slideshowIndex === 0) {
                    setSlideshowIndex(filteredProducts.length - 1);
                  } else {
                    setSlideshowIndex(slideshowIndex - 1);
                  }
                }}
                icon={<ChevronLeft className="w-6 h-6" />}
              >
                {" "}
              </AnimatedButton>
              <AnimatedButton
                variant="secondary"
                size="lg"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
                onClick={() => {
                  if (slideshowIndex === filteredProducts.length - 1) {
                    setSlideshowIndex(0);
                  } else {
                    setSlideshowIndex(slideshowIndex + 1);
                  }
                }}
                icon={<ChevronRight className="w-6 h-6" />}
              >
                {" "}
              </AnimatedButton>

              {/* Slide */}
              <AnimatedCard className="overflow-hidden">
                <div className="p-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white">{filteredProducts[slideshowIndex].name}</h2>
                    <p className="text-gray-400 mt-2">
                      {filteredProducts[slideshowIndex].description || 'No description'}
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Image */}
                    <div className="md:w-1/3 flex justify-center">
                      {filteredProducts[slideshowIndex].imageUrl ? (
                        <Image
                          src={filteredProducts[slideshowIndex].imageUrl.trim()}
                          alt={filteredProducts[slideshowIndex].name}
                          width={250}
                          height={250}
                          className="rounded-lg object-contain"
                          unoptimized
                        />
                      ) : (
                        <div className="w-64 h-64 bg-gray-700 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-16 h-16 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="md:w-2/3 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-gray-400">HS Code:</span> <span className="text-white ml-2 font-mono">{filteredProducts[slideshowIndex].hsCode}</span></div>
                        <div><span className="text-gray-400">Unit Price:</span> <span className="text-green-400 ml-2 font-semibold">{formatCurrency(filteredProducts[slideshowIndex].unitPrice)}</span></div>
                        <div><span className="text-gray-400">Duty %:</span> <span className="text-blue-400 ml-2 font-semibold">{filteredProducts[slideshowIndex].dutyPercentage}%</span></div>
                        <div><span className="text-gray-400">Created:</span> <span className="text-white ml-2">{new Date(filteredProducts[slideshowIndex].createdAt).toLocaleDateString()}</span></div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <AnimatedButton
                          variant="primary"
                          icon={<Eye className="w-4 h-4" />}
                          onClick={() => {
                            setSelectedProduct(filteredProducts[slideshowIndex]);
                            setSlideshowIndex(null);
                          }}
                        >
                          View Details
                        </AnimatedButton>
                        <AnimatedButton
                          variant="secondary"
                          icon={<Edit className="w-4 h-4" />}
                          onClick={() => {
                            router.push(`/products/${filteredProducts[slideshowIndex]._id}/edit`);
                            setSlideshowIndex(null);
                          }}
                        >
                          Edit
                        </AnimatedButton>
                        <AnimatedButton
                          variant="secondary"
                          icon={<Trash2 className="w-4 h-4" />}
                          onClick={() => {
                            handleDelete(filteredProducts[slideshowIndex]._id);
                            if (filteredProducts.length <= 1) {
                              setSlideshowIndex(null);
                            } else if (slideshowIndex === filteredProducts.length - 1) {
                              setSlideshowIndex(slideshowIndex - 1);
                            }
                          }}
                        >
                          Delete
                        </AnimatedButton>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedCard>

              {/* Dots */}
              <div className="flex justify-center mt-6 space-x-2">
                {filteredProducts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSlideshowIndex(idx)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      idx === slideshowIndex ? 'bg-white' : 'bg-gray-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}