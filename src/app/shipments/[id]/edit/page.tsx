// src/app/shipments/[id]/edit/page.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import * as LucideIcons from 'lucide-react';

// Animated UI Components
import {
  AnimatedPage,
  AnimatedCard,
  PageHeader,
  Alert
} from '@/components/animated';

const Loader2 = LucideIcons.Loader2 as any;
const AlertCircle = LucideIcons.AlertCircle as any;
const ArrowLeft = LucideIcons.ArrowLeft as any;
const DollarSign = LucideIcons.DollarSign as any;
const Save = LucideIcons.Save as any;
const Package = LucideIcons.Package as any;
const MapPin = LucideIcons.MapPin as any;

interface Product {
  _id: string;
  name: string;
  hsCode: string;
  unitPrice: number;
  dutyPercentage?: number;
}

interface Customer {
  _id: string;
  name: string;
}

interface Supplier {
  _id: string;
  name: string;
}

interface ShipmentProduct {
  productId: string;
  quantity: number;
}

interface Shipment {
  _id: string;
  shipmentId: string;
  trackingNumber?: string;
  origin: string;
  destination: string;
  shippingDate: string;
  estimatedArrival: string;
  estimatedDelivery?: string;
  carrier?: string;
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  notes?: string;
  shippingCost: number;
  exchangeRate: number;
  currency?: string;
  insurancePercentage?: number;
  vatPercentage?: number;
  customerPayment?: number;
  serviceMarkup?: number;
  products: Array<{
    productId: { _id: string } | string | null;
    quantity: number;
  }>;
  status: string;
  currentLocation?: string;
}

interface FinancialCalculation {
  totalProductValue: number;
  totalProductCostEGP: number;
  totalCustomsDuty: number;
  insurance: number;
  vat: number;
  shippingCostEGP: number;
  totalCost: number;
  customerPayment: number;
  profit: number;
}

// ✅ Status transition map — must match validations.ts STATUS_TRANSITIONS
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'pending':   ['in-transit', 'cancelled'],
  'in-transit': ['customs', 'delivered', 'cancelled'],
  'customs':   ['delivered', 'cancelled'],
  'delivered': [],
  'cancelled': [],
};

/** Returns statuses the user is allowed to move TO from currentStatus */
function getAllowedStatusOptions(currentStatus: string): string[] {
  const forward = STATUS_TRANSITIONS[currentStatus] ?? [];
  // always include the current status itself (no-op change)
  return [currentStatus, ...forward];
}

const STATUS_LABELS: Record<string, string> = {
  'pending':    '📦 Pending',
  'in-transit': '🚚 In Transit',
  'customs':    '🛃 At Customs',
  'delivered':  '✅ Delivered',
  'cancelled':  '❌ Cancelled',
};

const getAuthToken = (): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'token') return value;
  }
  return null;
};

// 💰 FINANCIAL CALCULATION FUNCTION
const calculateFinancials = (
  selectedProducts: ShipmentProduct[],
  products: Product[],
  shippingCost: number,
  exchangeRate: number,
  insurancePercentage: number,
  vatPercentage: number,
  serviceMarkup: number
): FinancialCalculation => {
  // Step 1: Total product value in USD
  let totalProductValue = 0;
  selectedProducts.forEach(sp => {
    const product = products.find(p => p._id === sp.productId);
    if (product && sp.quantity > 0) {
      totalProductValue += product.unitPrice * sp.quantity;
    }
  });

  // Step 2: Convert product value to EGP
  const totalProductCostEGP = totalProductValue * exchangeRate;

  // Step 3: Customs duty — calculated on USD product value first, then converted to EGP
  // (matches backend calculateProductDuty which works in USD before the final EGP conversion)
  let totalCustomsDutyUSD = 0;
  selectedProducts.forEach(sp => {
    const product = products.find(p => p._id === sp.productId);
    if (product && product.dutyPercentage && sp.quantity > 0) {
      const productValueUSD = product.unitPrice * sp.quantity;
      totalCustomsDutyUSD += productValueUSD * (product.dutyPercentage / 100);
    }
  });
  const totalCustomsDuty = totalCustomsDutyUSD * exchangeRate;

  // Step 4: Insurance on product cost EGP
  const insurance = totalProductCostEGP * (insurancePercentage / 100);

  // Step 5: Shipping cost in EGP
  const shippingCostEGP = shippingCost * exchangeRate;

  // Step 6: VAT base = products + duty + insurance + shipping (matches backend calculateVAT)
  const vatBase = totalProductCostEGP + totalCustomsDuty + insurance + shippingCostEGP;
  const vat = vatBase * (vatPercentage / 100);

  // Step 7: Total cost and profit
  const totalCost = totalProductCostEGP + totalCustomsDuty + insurance + vat + shippingCostEGP;
  const customerPayment = totalCost * (1 + serviceMarkup / 100);
  const profit = customerPayment - totalCost;

  return {
    totalProductValue,
    totalProductCostEGP,
    totalCustomsDuty,
    insurance,
    vat,
    shippingCostEGP,
    totalCost,
    customerPayment,
    profit
  };
};

// ✅ FIXED: safely extract productId regardless of shape (object, string, or null)
const isFinalStatus = (status: string) => status === 'delivered' || status === 'cancelled';

const extractProductId = (productId: { _id: string } | string | null | undefined): string => {
  if (!productId) return '';
  if (typeof productId === 'object' && productId !== null) return productId._id || '';
  return productId;
};

export default function EditShipmentPage() {
  console.log('\n' + '✏️'.repeat(80));
  console.log('✏️ EDIT SHIPMENT PAGE - COMPONENT RENDER');
  console.log('✏️'.repeat(80));

  const { token: authToken, isAuthenticated } = useAuth();
  const params = useParams();
  const router = useRouter();
  const shipmentId = params.id as string;

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    status: 'pending',
    currentLocation: '',
    origin: '',
    destination: '',
    shippingDate: '',
    estimatedArrival: '',
    carrier: '',
    trackingNumber: '',
    customerId: '',
    customerName: '',
    supplierId: '',
    supplierName: '',
    weight: '',
    dimensionLength: '',
    dimensionWidth: '',
    dimensionHeight: '',
    notes: '',
    shippingCost: '',
    exchangeRate: '50',
    currency: 'USD',
    insurancePercentage: '2',
    vatPercentage: '14',
    serviceMarkup: '15',
  });

  const [selectedProducts, setSelectedProducts] = useState<ShipmentProduct[]>([
    { productId: '', quantity: 1 }
  ]);

  const [financials, setFinancials] = useState<FinancialCalculation>({
    totalProductValue: 0,
    totalProductCostEGP: 0,
    totalCustomsDuty: 0,
    insurance: 0,
    vat: 0,
    shippingCostEGP: 0,
    totalCost: 0,
    customerPayment: 0,
    profit: 0
  });

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!shipmentId || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchAllData();
  }, [shipmentId, isAuthenticated, router]);

  useEffect(() => {
    const calculated = calculateFinancials(
      selectedProducts,
      products,
      parseFloat(formData.shippingCost) || 0,
      parseFloat(formData.exchangeRate) || 50,
      parseFloat(formData.insurancePercentage) || 2,
      parseFloat(formData.vatPercentage) || 14,
      parseFloat(formData.serviceMarkup) || 15
    );
    setFinancials(calculated);
    console.log('💰 Recalculated financials:', calculated);
  }, [selectedProducts, products, formData.shippingCost, formData.exchangeRate,
      formData.insurancePercentage, formData.vatPercentage, formData.serviceMarkup]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken() || authToken;
      if (!token) {
        setError('Authentication required');
        router.push('/login');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      console.log('🔄 Fetching shipment, products, customers, and suppliers...');
      const [shipmentRes, productsRes, customersRes, suppliersRes] = await Promise.all([
        fetch(`/api/shipments/${shipmentId}`, { headers }),
        fetch('/api/products', { headers }),
        fetch('/api/customers', { headers }),
        fetch('/api/suppliers', { headers })
      ]);

      if (!shipmentRes.ok) {
        if (shipmentRes.status === 404) {
          setError('Shipment not found');
        } else if (shipmentRes.status === 401) {
          router.push('/login');
          return;
        } else {
          throw new Error('Failed to load shipment');
        }
        setLoading(false);
        return;
      }

      const shipmentData = await shipmentRes.json();
      const loadedShipment = shipmentData.data || shipmentData.shipment || shipmentData;
      console.log('✅ Loaded shipment:', loadedShipment);
      setShipment(loadedShipment);

      const shippingDate = loadedShipment.shippingDate
        ? new Date(loadedShipment.shippingDate).toISOString().split('T')[0]
        : '';
      const estimatedArrival = loadedShipment.estimatedArrival
        ? new Date(loadedShipment.estimatedArrival).toISOString().split('T')[0]
        : '';

      // Normalize status: Mongoose uses hyphens (in-transit), not underscores (in_transit)
      const normalizeStatus = (s: string) => (s || 'pending').replace(/_/g, '-');

      // Load customers + suppliers FIRST so we can resolve names immediately
      let customersList: Customer[] = [];
      let suppliersList: Supplier[] = [];

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        customersList = customersData.customers || customersData.data || [];
        if (!Array.isArray(customersList)) customersList = [];
        setCustomers(customersList);
      }

      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        suppliersList = suppliersData.suppliers || suppliersData.data || [];
        if (!Array.isArray(suppliersList)) suppliersList = [];
        setSuppliers(suppliersList);
      }

      // Resolve names from lists in case the DB only stored ID
      const matchedCustomer = customersList.find((c: Customer) => c._id === loadedShipment.customerId);
      const matchedSupplier = suppliersList.find((s: Supplier) => s._id === loadedShipment.supplierId);

      setFormData({
        status: normalizeStatus(loadedShipment.status),
        currentLocation: loadedShipment.currentLocation || '',
        origin: loadedShipment.origin || '',
        destination: loadedShipment.destination || '',
        shippingDate,
        estimatedArrival,
        carrier: loadedShipment.carrier || '',
        trackingNumber: loadedShipment.trackingNumber || '',
        customerId: loadedShipment.customerId || '',
        customerName: loadedShipment.customerName || matchedCustomer?.name || '',
        supplierId: loadedShipment.supplierId || '',
        supplierName: loadedShipment.supplierName || matchedSupplier?.name || '',
        weight: loadedShipment.weight?.toString() || '',
        dimensionLength: loadedShipment.dimensions?.length?.toString() || '',
        dimensionWidth: loadedShipment.dimensions?.width?.toString() || '',
        dimensionHeight: loadedShipment.dimensions?.height?.toString() || '',
        notes: loadedShipment.notes || '',
        shippingCost: loadedShipment.shippingCost?.toString() || '',
        exchangeRate: loadedShipment.exchangeRate?.toString() || '50',
        currency: loadedShipment.currency || 'USD',
        insurancePercentage: loadedShipment.insurancePercentage?.toString() || '2',
        vatPercentage: loadedShipment.vatPercentage?.toString() || '14',
        serviceMarkup: loadedShipment.serviceMarkup?.toString() || '15',
      });

      // ✅ FIXED: use extractProductId to safely handle null, object, or string productId
      const loadedProducts = (loadedShipment.products || [])
        .map((p: any) => ({
          productId: extractProductId(p.productId),
          quantity: p.quantity || 1
        }))
        .filter((p: ShipmentProduct) => p.productId !== ''); // skip null/missing productIds

      setSelectedProducts(loadedProducts.length > 0 ? loadedProducts : [{ productId: '', quantity: 1 }]);

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const productsList = productsData.data || productsData.products || [];
        setProducts(Array.isArray(productsList) ? productsList : []);
      }

      // customers and suppliers already loaded above

      console.log('✅ All data loaded successfully');
    } catch (error: any) {
      console.error('💥 Error loading data:', error);
      setError(error.message || 'Failed to load shipment data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'customerId') {
      const customer = customers.find(c => c._id === value);
      setFormData({
        ...formData,
        customerId: value,
        // ✅ Always sync customerName with the selected customer
        customerName: customer?.name || ''
      });
    } else if (name === 'supplierId') {
      const supplier = suppliers.find(s => s._id === value);
      setFormData({
        ...formData,
        supplierId: value,
        // ✅ Always sync supplierName with the selected supplier
        supplierName: supplier?.name || ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleProductChange = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    const updated = [...selectedProducts];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setSelectedProducts(updated);
  };

  const addProductRow = () => {
    setSelectedProducts([...selectedProducts, { productId: '', quantity: 1 }]);
  };

  const removeProductRow = (index: number) => {
    if (selectedProducts.length > 1) {
      setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('\n' + '💾'.repeat(80));
    console.log('💾 UPDATING SHIPMENT');
    console.log('💾'.repeat(80));
    setError('');
    setSaving(true);

    try {
      if (!formData.origin || !formData.destination || !formData.shippingDate || !formData.estimatedArrival) {
        setError('Please fill in all required fields');
        setSaving(false);
        return;
      }
      if (!formData.shippingCost || parseFloat(formData.shippingCost) < 0) {
        setError('Please enter a valid shipping cost');
        setSaving(false);
        return;
      }
      if (!formData.exchangeRate || parseFloat(formData.exchangeRate) <= 0) {
        setError('Please enter a valid exchange rate');
        setSaving(false);
        return;
      }

      const validProducts = selectedProducts.filter(p => p.productId && p.quantity > 0);
      if (validProducts.length === 0) {
        setError('Please add at least one product');
        setSaving(false);
        return;
      }

      const updateData: any = {
        status: formData.status,
        currentLocation: formData.currentLocation,
        origin: formData.origin,
        destination: formData.destination,
        shippingDate: formData.shippingDate,
        estimatedArrival: formData.estimatedArrival,
        products: validProducts,
        shippingCost: parseFloat(formData.shippingCost),
        exchangeRate: parseFloat(formData.exchangeRate),
        currency: formData.currency || 'USD',
        insurancePercentage: parseFloat(formData.insurancePercentage) || 2,
        vatPercentage: parseFloat(formData.vatPercentage) || 14,
        serviceMarkup: parseFloat(formData.serviceMarkup) || 15,

        // 💰 AUTO-CALCULATED FINANCIALS
        customerPayment: financials.customerPayment,
        profit: financials.profit,
        totalCost: financials.totalCost,
        customsDuty: financials.totalCustomsDuty,   // saved as customsDuty on the model
        totalCustomsDuty: financials.totalCustomsDuty, // also saved for [id] display page
        insurance: financials.insurance,
        vat: financials.vat,

        // ✅ Always include customer/supplier name so list page can display them
        customerId: formData.customerId || null,
        customerName: formData.customerName || '',
        supplierId: formData.supplierId || null,
        supplierName: formData.supplierName || '',
      };

      if (formData.carrier) updateData.carrier = formData.carrier;
      if (formData.trackingNumber) updateData.trackingNumber = formData.trackingNumber;
      if (formData.weight) updateData.weight = parseFloat(formData.weight);
      if (formData.notes) updateData.notes = formData.notes;
      if (formData.dimensionLength || formData.dimensionWidth || formData.dimensionHeight) {
        updateData.dimensions = {
          length: formData.dimensionLength ? parseFloat(formData.dimensionLength) : 0,
          width: formData.dimensionWidth ? parseFloat(formData.dimensionWidth) : 0,
          height: formData.dimensionHeight ? parseFloat(formData.dimensionHeight) : 0,
        };
      }

      console.log('📤 Sending update:', JSON.stringify(updateData, null, 2));
      const token = getAuthToken() || authToken;
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const responseText = await response.text();
      console.log('📨 Response status:', response.status);
      console.log('📨 Response:', responseText);

      if (response.ok) {
        console.log('✅ Shipment updated successfully!');
        router.push('/shipments');
      } else {
        try {
          const data = JSON.parse(responseText);
          setError(data.error || 'Failed to update shipment');
        } catch {
          setError(`Failed to update shipment: ${response.status}`);
        }
      }
    } catch (err: any) {
      console.error('💥 Error:', err);
      setError(err.message || 'Failed to update shipment');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <AnimatedPage>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-300">Loading shipment data...</p>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  if (error && !shipment) {
    return (
      <AnimatedPage>
        <div className="min-h-screen py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <Alert
              variant="error"
              title="Error"
              message={error}
              onClose={() => router.push('/shipments')}
            />
            <div className="mt-6 text-center">
              <Link
                href="/shipments"
                className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Back to Shipments
              </Link>
            </div>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      {/* Background Image & Overlay */}
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

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          icon={<Package className="w-8 h-8" />}
          title="Edit Shipment"
          description={`${shipment?.shipmentId} • ${shipment?.trackingNumber || 'No tracking number'}`}
          actions={
            <Link
              href="/shipments"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Shipments
            </Link>
          }
        />

        {error && (
          <div className="mb-6">
            <Alert
              variant="error"
              title="Form Error"
              message={error}
              onClose={() => setError('')}
            />
          </div>
        )}

        <AnimatedCard className="!bg-gray-900/95 !border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-8 p-6">
            {/* Basic Information */}
            <div className="dark-form-section">
              <h2 className="dark-form-section-title">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="dark-form-label">Origin *</label>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleInputChange}
                    className="dark-form-input"
                    required
                  />
                </div>
                <div>
                  <label className="dark-form-label">Destination *</label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                    className="dark-form-input"
                    required
                  />
                </div>
                <div>
                  <label className="dark-form-label">Shipping Date *</label>
                  <input
                    type="date"
                    name="shippingDate"
                    value={formData.shippingDate}
                    onChange={handleInputChange}
                    className="dark-form-input"
                    required
                  />
                </div>
                <div>
                  <label className="dark-form-label">Estimated Arrival *</label>
                  <input
                    type="date"
                    name="estimatedArrival"
                    value={formData.estimatedArrival}
                    onChange={handleInputChange}
                    className="dark-form-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Status & Location */}
            <div className="dark-form-section">
              <h2 className="dark-form-section-title flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-400" />
                Status & Location
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="dark-form-label">Shipment Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="dark-form-select"
                    required
                    disabled={isFinalStatus(shipment?.status ?? '')}
                  >
                    {getAllowedStatusOptions(shipment?.status ?? formData.status).map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                    ))}
                  </select>
                  {isFinalStatus(shipment?.status ?? '') && (
                    <p className="mt-1 text-xs text-red-400">
                      🔒 This shipment is {shipment?.status} and cannot be changed.
                    </p>
                  )}
                  {shipment && (
                    <p className="mt-1 text-xs text-gray-400">
                      Current: <span className="font-medium capitalize">{shipment.status.replace('-', ' ')}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="dark-form-label">Current Location</label>
                  <input
                    type="text"
                    name="currentLocation"
                    value={formData.currentLocation}
                    onChange={handleInputChange}
                    className="dark-form-input"
                    placeholder="e.g., Port of Alexandria, Cairo Customs"
                    maxLength={200}
                  />
                  {shipment?.currentLocation && (
                    <p className="mt-1 text-xs text-gray-400">Current: {shipment.currentLocation}</p>
                  )}
                </div>
              </div>
              {shipment && formData.status !== shipment.status && (
                <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                  <p className="text-sm text-yellow-300">
                    ⚠️ Changing status from <strong className="capitalize">{shipment.status.replace('-', ' ')}</strong> to{' '}
                    <strong className="capitalize">{formData.status.replace('-', ' ')}</strong>
                  </p>
                  <p className="text-xs text-yellow-400 mt-1">
                    This will create a new entry in the shipment's status history.
                  </p>
                </div>
              )}
            </div>

            {/* Financial Information */}
            <div className="dark-form-section">
              <h2 className="dark-form-section-title flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Financial Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="dark-form-label">Shipping Cost (USD) *</label>
                  <input
                    type="number"
                    name="shippingCost"
                    value={formData.shippingCost}
                    onChange={handleInputChange}
                    className="dark-form-input"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="dark-form-label">Exchange Rate (USD to EGP) *</label>
                  <input
                    type="number"
                    name="exchangeRate"
                    value={formData.exchangeRate}
                    onChange={handleInputChange}
                    className="dark-form-input"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="dark-form-label">Currency</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="dark-form-select"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="EGP">EGP</option>
                  </select>
                </div>
                <div>
                  <label className="dark-form-label">Insurance %</label>
                  <input
                    type="number"
                    name="insurancePercentage"
                    value={formData.insurancePercentage}
                    onChange={handleInputChange}
                    className="dark-form-input"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <label className="dark-form-label">VAT %</label>
                  <input
                    type="number"
                    name="vatPercentage"
                    value={formData.vatPercentage}
                    onChange={handleInputChange}
                    className="dark-form-input"
                    step="0.1"
                    min="0"
                  />
                </div>

                {/* 💰 AUTO-CALCULATED: Revenue & Profit Section */}
                <div className="md:col-span-2 border-t border-gray-600 pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    💰 Revenue & Profit (Auto-Calculated)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="dark-form-label">Service Markup (%)</label>
                      <input
                        type="number"
                        name="serviceMarkup"
                        value={formData.serviceMarkup}
                        onChange={handleInputChange}
                        className="dark-form-input"
                        placeholder="15"
                        step="0.1"
                        min="0"
                        max="100"
                      />
                      <p className="text-xs text-gray-400 mt-1">💡 Adjust to change profit margin</p>
                    </div>

                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                      <h4 className="text-xs font-semibold text-gray-400 mb-2">Cost Breakdown (EGP)</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Products:</span>
                          <span className="text-gray-200">{financials.totalProductCostEGP.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Customs Duty:</span>
                          <span className="text-gray-200">{financials.totalCustomsDuty.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Insurance:</span>
                          <span className="text-gray-200">{financials.insurance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">VAT:</span>
                          <span className="text-gray-200">{financials.vat.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Shipping:</span>
                          <span className="text-gray-200">{financials.shippingCostEGP.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-600 mt-2 pt-2 flex justify-between font-semibold">
                          <span className="text-gray-300">Total Cost:</span>
                          <span className="text-yellow-400">{financials.totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 bg-gradient-to-r from-green-900/30 to-blue-900/30 p-4 rounded-lg border border-green-700/50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Customer Charge</p>
                          <p className="text-2xl font-bold text-green-400">
                            {financials.customerPayment.toFixed(2)} EGP
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ ${(financials.customerPayment / parseFloat(formData.exchangeRate || '50')).toFixed(2)} USD
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Your Profit</p>
                          <p className="text-2xl font-bold text-blue-400">
                            {financials.profit.toFixed(2)} EGP
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Margin: {formData.serviceMarkup}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Profit (USD)</p>
                          <p className="text-2xl font-bold text-cyan-400">
                            ${(financials.profit / parseFloat(formData.exchangeRate || '50')).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                    <p className="text-xs text-blue-300">
                      ℹ️ <strong>Auto-Calculated:</strong> Customer charge = Total costs + your {formData.serviceMarkup}% markup.
                      Adjust the markup % to change your profit margin.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tracking & Logistics */}
            <div className="dark-form-section">
              <h2 className="dark-form-section-title">Tracking & Logistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="dark-form-label">Carrier</label>
                  <select
                    name="carrier"
                    value={formData.carrier}
                    onChange={handleInputChange}
                    className="dark-form-select"
                  >
                    <option value="">Select carrier</option>
                    <option value="FedEx">FedEx</option>
                    <option value="UPS">UPS</option>
                    <option value="DHL">DHL</option>
                    <option value="USPS">USPS</option>
                    <option value="Maersk">Maersk</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="dark-form-label">Tracking Number</label>
                  <input
                    type="text"
                    name="trackingNumber"
                    value={formData.trackingNumber}
                    onChange={handleInputChange}
                    className="dark-form-input"
                  />
                </div>
                <div>
                  <label className="dark-form-label">Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    className="dark-form-input"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="dark-form-label">Dimensions (L × W × H cm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      name="dimensionLength"
                      value={formData.dimensionLength}
                      onChange={handleInputChange}
                      className="dark-form-input"
                      placeholder="L"
                      step="0.01"
                      min="0"
                    />
                    <input
                      type="number"
                      name="dimensionWidth"
                      value={formData.dimensionWidth}
                      onChange={handleInputChange}
                      className="dark-form-input"
                      placeholder="W"
                      step="0.01"
                      min="0"
                    />
                    <input
                      type="number"
                      name="dimensionHeight"
                      value={formData.dimensionHeight}
                      onChange={handleInputChange}
                      className="dark-form-input"
                      placeholder="H"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Customer & Supplier */}
            <div className="dark-form-section">
              <h2 className="dark-form-section-title">Customer & Supplier</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="dark-form-label">Customer</label>
                  <select
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleInputChange}
                    className="dark-form-select"
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  {formData.customerName && (
                    <p className="mt-1 text-xs text-green-400">✓ {formData.customerName}</p>
                  )}
                </div>
                <div>
                  <label className="dark-form-label">Supplier</label>
                  <select
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleInputChange}
                    className="dark-form-select"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  {formData.supplierName && (
                    <p className="mt-1 text-xs text-green-400">✓ {formData.supplierName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="dark-form-section">
              <h2 className="dark-form-section-title">Products *</h2>
              {selectedProducts.map((item, index) => (
                <div key={index} className="flex gap-4 mb-3">
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductChange(index, 'productId', e.target.value)}
                    className="flex-1 dark-form-select"
                    required
                  >
                    <option value="">Select a product</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name} ({product.hsCode}) - ${product.unitPrice}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-32 dark-form-input"
                    placeholder="Qty"
                    required
                  />
                  {selectedProducts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProductRow(index)}
                      className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addProductRow}
                className="mt-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 border border-gray-600"
              >
                + Add Product
              </button>
            </div>

            {/* Notes */}
            <div className="dark-form-section">
              <label className="dark-form-label">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="dark-form-textarea"
                rows={4}
                maxLength={1000}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 justify-end pt-4 border-t border-gray-700">
              <Link href="/shipments" className="dark-form-button-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="dark-form-button-primary flex items-center gap-2"
              >
                {saving ? (
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
            </div>
          </form>
        </AnimatedCard>
      </div>
    </AnimatedPage>
  );
}