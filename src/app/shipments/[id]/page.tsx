// app/shipments/[id]/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import * as LucideIcons from 'lucide-react';
import {
  AnimatedPage,
  AnimatedCard,
  Alert
} from '@/components/animated';

const Loader2 = LucideIcons.Loader2 as any;
const ArrowLeft = LucideIcons.ArrowLeft as any;
const Package = LucideIcons.Package as any;
const Truck = LucideIcons.Truck as any;
const DollarSign = LucideIcons.DollarSign as any;
const Calendar = LucideIcons.Calendar as any;
const MapPin = LucideIcons.MapPin as any;
const FileText = LucideIcons.FileText as any;
const Edit = LucideIcons.Edit as any;
const Trash2 = LucideIcons.Trash2 as any;

interface Product {
  _id: string;
  productId?: string;
  name: string;
  hsCode?: string;
  quantity: number;
  unitPrice?: number;
}

interface Shipment {
  _id: string;
  origin: string;
  destination: string;
  shippingDate: string;
  estimatedArrival: string;
  actualArrival?: string;
  status: string;
  carrier?: string;
  trackingNumber?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  products: Product[];
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  shippingCost?: number;
  exchangeRate?: number;
  currency?: string;
  insurancePercentage?: number;
  vatPercentage?: number;
  serviceMarkup?: number;
  totalProductValue?: number;
  totalProductCostEGP?: number;
  totalCustomsDuty?: number;
  insurance?: number;
  vat?: number;
  shippingCostEGP?: number;
  totalCost?: number;
  customerPayment?: number;
  profit?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ShipmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isAuthenticated } = useAuth();
  const shipmentId = params?.id as string;

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (shipmentId) {
      fetchShipment();
    }
  }, [isAuthenticated, shipmentId, token]);

  const fetchShipment = async () => {
    try {
      setLoading(true);

      const shipmentRes = await fetch(`/api/shipments/${shipmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!shipmentRes.ok) {
        throw new Error('Failed to fetch shipment');
      }

      const shipmentData = await shipmentRes.json();
      const shipmentObj = shipmentData.shipment || shipmentData.data || shipmentData;

      console.log('🔍 RAW shipment.products from API:', JSON.stringify(shipmentObj.products, null, 2));

      const normalizedProducts = shipmentObj.products?.map((item: any, i: number) => {
        const populated = typeof item.productId === 'object' && item.productId !== null ? item.productId : null;
        const normalized = {
          _id: populated?._id || item.productId || item._id,
          name: populated?.name || item.name || null,
          hsCode: populated?.hsCode || item.hsCode || null,
          unitPrice: populated?.unitPrice ?? item.unitPrice ?? null,
          quantity: item.quantity,
        };
        console.log(`🔍 Product[${i}] raw:`, JSON.stringify(item));
        console.log(`🔍 Product[${i}] normalized:`, JSON.stringify(normalized));
        return normalized;
      }) || [];

      shipmentObj.products = normalizedProducts;
      setShipment(shipmentObj);
    } catch (err: any) {
      console.error('Error fetching shipment:', err);
      setError(err.message || 'Failed to load shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this shipment? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete shipment');
      }

      router.push('/shipments');
    } catch (err: any) {
      console.error('Error deleting shipment:', err);
      setError(err.message || 'Failed to delete shipment');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-600 text-yellow-100';
      case 'in transit':
      case 'in-transit':
        return 'bg-blue-600 text-blue-100';
      case 'delivered':
        return 'bg-green-600 text-green-100';
      case 'cancelled':
        return 'bg-red-600 text-red-100';
      default:
        return 'bg-gray-600 text-gray-100';
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <AnimatedPage>
        <div className="fixed inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1678182451047-196f22a4143e?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Shipping containers background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
        </div>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-blue-400">Loading shipment details...</p>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  if (error || !shipment) {
    return (
      <AnimatedPage>
        <div className="fixed inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1678182451047-196f22a4143e?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Shipping containers background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/shipments" className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Shipments
          </Link>
          <Alert
            variant="error"
            title="Error"
            message={error || 'Shipment not found'}
            onClose={() => router.push('/shipments')}
          />
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1678182451047-196f22a4143e?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Shipping containers background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
      </div>
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/shipments" className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200">
            <ArrowLeft className="w-4 h-4" />
            Back to Shipments
          </Link>
          <div className="flex gap-3">
            <Link
              href={`/shipments/${shipmentId}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-blue-400">Shipment Details</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(shipment.status)}`}>
              {shipment.status || 'Pending'}
            </span>
          </div>
          <p className="text-blue-300 mt-2">Tracking: {shipment.trackingNumber || 'N/A'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Route Information */}
            <AnimatedCard>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-500" />
                  Route Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-cyan-600 mb-1">Origin</p>
                    <p className="text-cyan-300 font-medium">{shipment.origin}</p>
                  </div>
                  <div>
                    <p className="text-sm text-cyan-600 mb-1">Destination</p>
                    <p className="text-cyan-300 font-medium">{shipment.destination}</p>
                  </div>
                  <div>
                    <p className="text-sm text-cyan-600 mb-1">Carrier</p>
                    <p className="text-cyan-300 font-medium">{shipment.carrier || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-cyan-600 mb-1">Weight</p>
                    <p className="text-cyan-300 font-medium">{shipment.weight ? `${shipment.weight} kg` : 'N/A'}</p>
                  </div>
                  {shipment.dimensions && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-cyan-600 mb-1">Dimensions (L × W × H)</p>
                      <p className="text-cyan-300 font-medium">
                        {shipment.dimensions.length} × {shipment.dimensions.width} × {shipment.dimensions.height} cm
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </AnimatedCard>

            {/* Dates */}
            <AnimatedCard>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-purple-400 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  Timeline
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-purple-600 mb-1">Shipping Date</p>
                    <p className="text-purple-300 font-medium">
                      {new Date(shipment.shippingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-600 mb-1">Estimated Arrival</p>
                    <p className="text-purple-300 font-medium">
                      {new Date(shipment.estimatedArrival).toLocaleDateString()}
                    </p>
                  </div>
                  {shipment.actualArrival && (
                    <div>
                      <p className="text-sm text-purple-600 mb-1">Actual Arrival</p>
                      <p className="text-purple-300 font-medium">
                        {new Date(shipment.actualArrival).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </AnimatedCard>

            {/* Products - WHITE BOX */}
            <AnimatedCard>
              <div className="p-6 bg-white rounded-xl">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-500" />
                  Products ({shipment.products?.length || 0})
                </h2>
                <div className="space-y-3">
                  {shipment.products && shipment.products.length > 0 ? (
                    shipment.products.map((product, index) => {
                      const displayName = product.name || `Unknown Product (${product._id})`;
                      const displayHsCode = product.hsCode;
                      const displayPrice = product.unitPrice;

                      console.log(`🟠 Rendering Product[${index}] → name: "${displayName}" | hsCode: "${displayHsCode}" | price: ${displayPrice} | qty: ${product.quantity}`);

                      return (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-gray-800 font-semibold">{displayName}</p>
                              {displayHsCode && (
                                <p className="text-sm text-gray-500">HS Code: {displayHsCode}</p>
                              )}
                              {displayPrice !== undefined && displayPrice !== null && (
                                <p className="text-sm text-gray-500">${Number(displayPrice).toFixed(2)} / unit</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-gray-700 font-medium">Qty: {product.quantity}</p>
                              {displayPrice !== undefined && displayPrice !== null && (
                                <p className="text-sm text-orange-500 font-semibold">
                                  Total: ${(Number(displayPrice) * product.quantity).toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-400">No products listed</p>
                  )}
                </div>
              </div>
            </AnimatedCard>

            {/* Notes */}
            {shipment.notes && (
              <AnimatedCard>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-indigo-400 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Notes
                  </h2>
                  <p className="text-indigo-300 whitespace-pre-wrap">{shipment.notes}</p>
                </div>
              </AnimatedCard>
            )}
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <AnimatedCard>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  Financial Summary
                </h2>
                <div className="space-y-3">
                  {shipment.shippingCost !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-emerald-600">Shipping Cost</span>
                      <span className="text-emerald-300 font-medium">
                        ${shipment.shippingCost.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {shipment.exchangeRate !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-emerald-600">Exchange Rate</span>
                      <span className="text-emerald-300 font-medium">
                        {shipment.exchangeRate.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {shipment.totalCost !== undefined && (
                    <div className="flex justify-between pt-3 border-t border-gray-700">
                      <span className="text-amber-600">Total Cost</span>
                      <span className="text-amber-400 font-bold">
                        {shipment.totalCost.toFixed(2)} EGP
                      </span>
                    </div>
                  )}
                  {shipment.customerPayment !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-green-600">Customer Payment</span>
                      <span className="text-green-400 font-bold">
                        {shipment.customerPayment.toFixed(2)} EGP
                      </span>
                    </div>
                  )}
                  {shipment.profit !== undefined && (
                    <div className="flex justify-between pt-3 border-t border-gray-700">
                      <span className="text-blue-600">Profit</span>
                      <span className="text-blue-400 font-bold">
                        {shipment.profit.toFixed(2)} EGP
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </AnimatedCard>

            {/* Additional Costs */}
            {(shipment.totalCustomsDuty || shipment.insurance || shipment.vat) && (
              <AnimatedCard>
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-teal-400 mb-4">Cost Breakdown</h2>
                  <div className="space-y-2 text-sm">
                    {shipment.totalCustomsDuty !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-teal-600">Customs Duty</span>
                        <span className="text-teal-300">
                          {shipment.totalCustomsDuty.toFixed(2)} EGP
                        </span>
                      </div>
                    )}
                    {shipment.insurance !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-teal-600">Insurance</span>
                        <span className="text-teal-300">
                          {shipment.insurance.toFixed(2)} EGP
                        </span>
                      </div>
                    )}
                    {shipment.vat !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-teal-600">VAT</span>
                        <span className="text-teal-300">
                          {shipment.vat.toFixed(2)} EGP
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </AnimatedCard>
            )}
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}