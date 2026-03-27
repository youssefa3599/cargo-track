// src/app/shipments/create/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import * as LucideIcons from 'lucide-react';
import {
  AnimatedPage,
  AnimatedCard,
  Alert
} from '@/components/animated';
import DocumentScanner, { ScannedShipmentData } from '@/components/DocumentScanner';

const Loader2 = LucideIcons.Loader2 as any;
const AlertCircle = LucideIcons.AlertCircle as any;
const DollarSign = LucideIcons.DollarSign as any;
const ArrowLeft = LucideIcons.ArrowLeft as any;
const Truck = LucideIcons.Truck as any;
const Package = LucideIcons.Package as any;
const Ruler = LucideIcons.Ruler as any;
const Info = LucideIcons.Info as any;

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
  type: 'customer';
}

interface Supplier {
  _id: string;
  name: string;
  contactPerson: string;
  email: string;
}

// ✅ FIX 1: Added scannedUnitPrice, scannedDutyPct, _rowId
interface ShipmentProduct {
  productId: string;
  quantity: number;
  scannedUnitPrice?: number;
  scannedDutyPct?: number;
  _rowId?: number;
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

const calculateShippingCost = (
  weight: number,
  dimensions: { length: number; width: number; height: number } | null,
  origin: string,
  destination: string
) => {
  const result = {
    actualWeight: weight,
    volumetricWeight: 0,
    chargeableWeight: 0,
    shippingCost: 0,
    ratePerKg: 0,
    calculationMethod: '',
    route: `${origin} → ${destination}`
  };

  if (!weight || weight <= 0) return result;

  if (dimensions && dimensions.length > 0 && dimensions.width > 0 && dimensions.height > 0) {
    result.volumetricWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;
  }

  result.chargeableWeight = Math.max(result.actualWeight, result.volumetricWeight);

  let baseRate = 4.30;
  let routeName = 'Standard Route';
  const originLower = origin.toLowerCase();
  const destLower = destination.toLowerCase();

  if (originLower.includes('china') && destLower.includes('los angeles')) { baseRate = 4.30; routeName = 'China → Los Angeles'; }
  else if (originLower.includes('china') && destLower.includes('new york')) { baseRate = 4.80; routeName = 'China → New York'; }
  else if (originLower.includes('china') && destLower.includes('egypt')) { baseRate = 3.90; routeName = 'China → Egypt'; }
  else if (originLower.includes('usa') && destLower.includes('egypt')) { baseRate = 5.20; routeName = 'USA → Egypt'; }
  else if (originLower.includes('uae') && destLower.includes('egypt')) { baseRate = 2.80; routeName = 'UAE → Egypt'; }
  else if (originLower.includes('turkey') && destLower.includes('egypt')) { baseRate = 2.50; routeName = 'Turkey → Egypt'; }
  else { baseRate = 4.50; routeName = 'International Route'; }

  result.ratePerKg = baseRate;
  result.shippingCost = result.chargeableWeight * baseRate;
  result.calculationMethod = routeName;
  return result;
};

// ✅ FIX 2: calculateFinancials uses scannedUnitPrice and scannedDutyPct as fallback
const calculateFinancials = (
  selectedProducts: ShipmentProduct[],
  products: Product[],
  shippingCost: number,
  exchangeRate: number,
  insurancePercentage: number,
  vatPercentage: number,
  serviceMarkup: number,
  weight: number,
  dimensions: { length: number; width: number; height: number } | null,
  useWeightBased: boolean
): FinancialCalculation => {
  let finalShippingCost = shippingCost;

  let totalProductValue = 0;
  selectedProducts.forEach((sp) => {
    const product = products.find(p => p._id === sp.productId);
    const unitPrice = product?.unitPrice ?? sp.scannedUnitPrice ?? 0;
    if (unitPrice > 0 && sp.quantity > 0) {
      totalProductValue += unitPrice * sp.quantity;
    }
  });

  const totalProductCostEGP = totalProductValue * exchangeRate;

  let totalCustomsDutyUSD = 0;
  selectedProducts.forEach((sp) => {
    const product = products.find(p => p._id === sp.productId);
    const unitPrice = product?.unitPrice ?? sp.scannedUnitPrice ?? 0;
    const dutyPct = product?.dutyPercentage ?? sp.scannedDutyPct ?? 0;
    if (dutyPct > 0 && unitPrice > 0 && sp.quantity > 0) {
      totalCustomsDutyUSD += unitPrice * sp.quantity * (dutyPct / 100);
    }
  });
  const totalCustomsDuty = totalCustomsDutyUSD * exchangeRate;

  const insurance = totalProductCostEGP * (insurancePercentage / 100);
  const shippingCostEGP = finalShippingCost * exchangeRate;
  const vatBase = totalProductCostEGP + totalCustomsDuty + insurance + shippingCostEGP;
  const vat = vatBase * (vatPercentage / 100);
  const totalCost = totalProductCostEGP + totalCustomsDuty + insurance + vat + shippingCostEGP;
  const customerPayment = totalCost * (1 + serviceMarkup / 100);
  const profit = customerPayment - totalCost;

  return { totalProductValue, totalProductCostEGP, totalCustomsDuty, insurance, vat, shippingCostEGP, totalCost, customerPayment, profit };
};

export default function CreateShipment() {
  const router = useRouter();
  const { token, isAuthenticated, user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
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
    estimatedDelivery: '',
    notes: '',
    shippingCost: '',
    exchangeRate: '50',
    currency: 'USD',
    insurancePercentage: '2',
    vatPercentage: '14',
    serviceMarkup: '15',
    useWeightBasedShipping: false,
  });

  // ✅ FIX 3: initial product row has _rowId
  const [selectedProducts, setSelectedProducts] = useState<ShipmentProduct[]>([
    { productId: '', quantity: 1, _rowId: Date.now() }
  ]);

  const [financials, setFinancials] = useState<FinancialCalculation>({
    totalProductValue: 0, totalProductCostEGP: 0, totalCustomsDuty: 0,
    insurance: 0, vat: 0, shippingCostEGP: 0, totalCost: 0, customerPayment: 0, profit: 0
  });

  const [shippingCalculation, setShippingCalculation] = useState({
    actualWeight: 0, volumetricWeight: 0, chargeableWeight: 0,
    shippingCost: 0, ratePerKg: 0, calculationMethod: '', route: ''
  });

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  useEffect(() => {
    if (formData.useWeightBasedShipping) {
      const weight = parseFloat(formData.weight) || 0;
      const dimensions = (formData.dimensionLength && formData.dimensionWidth && formData.dimensionHeight)
        ? { length: parseFloat(formData.dimensionLength) || 0, width: parseFloat(formData.dimensionWidth) || 0, height: parseFloat(formData.dimensionHeight) || 0 }
        : null;
      const calculation = calculateShippingCost(weight, dimensions, formData.origin, formData.destination);
      setShippingCalculation(calculation);
      setFormData(prev => ({ ...prev, shippingCost: calculation.shippingCost.toFixed(2) }));
    }
  }, [formData.useWeightBasedShipping, formData.weight, formData.dimensionLength, formData.dimensionWidth, formData.dimensionHeight, formData.origin, formData.destination]);

  useEffect(() => {
    const dimensions = (formData.dimensionLength && formData.dimensionWidth && formData.dimensionHeight)
      ? { length: parseFloat(formData.dimensionLength), width: parseFloat(formData.dimensionWidth), height: parseFloat(formData.dimensionHeight) }
      : null;
    const calculated = calculateFinancials(
      selectedProducts, products,
      parseFloat(formData.shippingCost) || 0,
      parseFloat(formData.exchangeRate) || 50,
      parseFloat(formData.insurancePercentage) || 2,
      parseFloat(formData.vatPercentage) || 14,
      parseFloat(formData.serviceMarkup) || 15,
      parseFloat(formData.weight) || 0,
      dimensions,
      formData.useWeightBasedShipping
    );
    setFinancials(calculated);
  }, [selectedProducts, products, formData.shippingCost, formData.weight, formData.dimensionLength, formData.dimensionWidth, formData.dimensionHeight, formData.useWeightBasedShipping, formData.exchangeRate, formData.insurancePercentage, formData.vatPercentage, formData.serviceMarkup]);

  const fetchData = async () => {
    setFetchingData(true);
    await Promise.all([fetchProducts(), fetchCustomers(), fetchSuppliers()]);
    setFetchingData(false);
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const productsList = data.data || data.products || [];
      setProducts(Array.isArray(productsList) ? productsList : []);
    } catch (err: any) {
      setError('Failed to load products. Please try refreshing the page.');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const customersList = data.customers || data.data || [];
      setCustomers(Array.isArray(customersList) ? customersList : []);
    } catch (err: any) {}
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const suppliersList = data.suppliers || data.data || [];
      setSuppliers(Array.isArray(suppliersList) ? suppliersList : []);
    } catch (err: any) {}
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else if (name === 'customerId') {
      const customer = customers.find(c => c._id === value);
      setFormData({ ...formData, customerId: value, customerName: customer?.name || '' });
    } else if (name === 'supplierId') {
      const supplier = suppliers.find(s => s._id === value);
      setFormData({ ...formData, supplierId: value, supplierName: supplier?.name || '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleProductChange = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    const updated = [...selectedProducts];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedProducts(updated);
  };

  // ✅ FIX 4: addProductRow assigns unique _rowId
  const addProductRow = () => {
    setSelectedProducts([...selectedProducts, { productId: '', quantity: 1, _rowId: Date.now() }]);
  };

  const removeProductRow = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  // ✅ FIX 5: handleScanComplete matches customer, supplier, products with two-way fuzzy match + _rowId
  const handleScanComplete = (data: ScannedShipmentData) => {
    const matchedCustomer = data.customerName
      ? customers.find(c =>
          c.name.toLowerCase().includes(data.customerName!.toLowerCase()) ||
          data.customerName!.toLowerCase().includes(c.name.toLowerCase())
        )
      : null;

    const matchedSupplier = data.supplierName
      ? suppliers.find(s =>
          s.name.toLowerCase().includes(data.supplierName!.toLowerCase()) ||
          data.supplierName!.toLowerCase().includes(s.name.toLowerCase())
        )
      : null;

    setFormData(prev => ({
      ...prev,
      ...(data.origin           && { origin:           data.origin }),
      ...(data.destination      && { destination:      data.destination }),
      ...(data.trackingNumber   && { trackingNumber:   data.trackingNumber }),
      ...(data.carrier          && { carrier:          data.carrier }),
      ...(data.shippingDate     && { shippingDate:     data.shippingDate }),
      ...(data.estimatedArrival && { estimatedArrival: data.estimatedArrival }),
      ...(data.weight           && { weight:           String(data.weight) }),
      ...(data.currency         && { currency:         data.currency }),
      ...(data.notes            && { notes:            data.notes }),
      ...(data.shippingCost     && { shippingCost:     String(data.shippingCost) }),
      ...(matchedCustomer
        ? { customerId: matchedCustomer._id, customerName: matchedCustomer.name }
        : data.customerName ? { customerId: '', customerName: data.customerName } : {}),
      ...(matchedSupplier
        ? { supplierId: matchedSupplier._id, supplierName: matchedSupplier.name }
        : data.supplierName ? { supplierId: '', supplierName: data.supplierName } : {}),
    }));

    if (data.products.length > 0) {
      const mapped = data.products.map(scanned => {
        const scannedWords = scanned.productName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const match = products.find(p => {
          const dbLower = p.name.toLowerCase();
          const scannedLower = scanned.productName.toLowerCase();
          // exact or full-string match
          if (dbLower.includes(scannedLower) || scannedLower.includes(dbLower)) return true;
          // keyword match — any meaningful word in scanned name found in db name or vice versa
          return scannedWords.some(word => dbLower.includes(word));
        });
        return {
          productId:        match?._id || '',
          quantity:         scanned.quantity || 1,
          scannedUnitPrice: match ? undefined : (scanned.unitPrice || 0),
          scannedDutyPct:   match ? undefined : 0,
          _rowId:           Date.now() + Math.random(),
        };
      });
      setSelectedProducts(mapped);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.origin || !formData.destination || !formData.shippingDate || !formData.estimatedArrival) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (formData.useWeightBasedShipping) {
        if (!formData.weight || parseFloat(formData.weight) <= 0) {
          setError('Please enter a valid weight when using weight-based shipping');
          setLoading(false);
          return;
        }
      } else {
        if (!formData.shippingCost || parseFloat(formData.shippingCost) < 0) {
          setError('Please enter a valid shipping cost');
          setLoading(false);
          return;
        }
      }

      if (!formData.exchangeRate || parseFloat(formData.exchangeRate) <= 0) {
        setError('Please enter a valid exchange rate');
        setLoading(false);
        return;
      }

      const validProducts = selectedProducts.filter(p => p.productId && p.quantity > 0);
      if (validProducts.length === 0) {
        setError('Please add at least one product');
        setLoading(false);
        return;
      }

      const shipmentData: any = {
        origin: formData.origin,
        destination: formData.destination,
        shippingDate: formData.shippingDate,
        estimatedArrival: formData.estimatedArrival,
        products: validProducts,
        shippingCost: formData.useWeightBasedShipping
          ? parseFloat(formData.weight)
          : parseFloat(formData.shippingCost),
        exchangeRate: parseFloat(formData.exchangeRate),
        currency: formData.currency || 'USD',
        insurancePercentage: parseFloat(formData.insurancePercentage) || 2,
        vatPercentage: parseFloat(formData.vatPercentage) || 14,
        serviceMarkup: parseFloat(formData.serviceMarkup) || 15,
        useWeightBased: formData.useWeightBasedShipping,
        customerPayment: financials.customerPayment,
        profit: financials.profit,
        totalCost: financials.totalCost,
        customsDuty: financials.totalCustomsDuty,
        insurance: financials.insurance,
        vat: financials.vat,
        customerId: formData.customerId || null,
        customerName: formData.customerName || '',
        supplierId: formData.supplierId || null,
        supplierName: formData.supplierName || '',
      };

      if (formData.carrier) shipmentData.carrier = formData.carrier;
      if (formData.trackingNumber) shipmentData.trackingNumber = formData.trackingNumber;
      if (formData.weight) shipmentData.weight = parseFloat(formData.weight);
      if (formData.estimatedDelivery) shipmentData.estimatedDelivery = formData.estimatedDelivery;
      if (formData.notes) shipmentData.notes = formData.notes;
      if (formData.dimensionLength || formData.dimensionWidth || formData.dimensionHeight) {
        shipmentData.dimensions = {
          length: formData.dimensionLength ? parseFloat(formData.dimensionLength) : 0,
          width: formData.dimensionWidth ? parseFloat(formData.dimensionWidth) : 0,
          height: formData.dimensionHeight ? parseFloat(formData.dimensionHeight) : 0,
        };
      }

      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(shipmentData)
      });

      const responseText = await response.text();
      if (response.ok) {
        router.push('/shipments');
      } else {
        try {
          const data = JSON.parse(responseText);
          setError(data.error || 'Failed to create shipment');
        } catch {
          setError(`Failed to create shipment: ${response.status}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;
  if (!token) return null;

  if (fetchingData) {
    return (
      <AnimatedPage>
        <div className="fixed inset-0 -z-10">
          <img src="https://images.unsplash.com/photo-1678182451047-196f22a4143e?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
        </div>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-white">Loading data...</p>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="fixed inset-0 -z-10">
        <img src="https://images.unsplash.com/photo-1678182451047-196f22a4143e?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
      </div>
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/shipments" className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Shipments
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Create New Shipment</h1>
        <p className="text-gray-300 mb-8">Fill in the details to create a new shipment</p>

        {error && <Alert variant="error" title="Error" message={error} onClose={() => setError('')} />}

        <AnimatedCard>
          <form onSubmit={handleSubmit} className="space-y-8 p-6">

            {/* Document Scanner */}
            <DocumentScanner token={token} onScanComplete={handleScanComplete} />

            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="dark-form-label">Origin *</label>
                  <input type="text" name="origin" value={formData.origin} onChange={handleInputChange} className="dark-form-input" placeholder="e.g., Shanghai, China" required />
                </div>
                <div>
                  <label className="dark-form-label">Destination *</label>
                  <input type="text" name="destination" value={formData.destination} onChange={handleInputChange} className="dark-form-input" placeholder="e.g., Los Angeles, USA" required />
                </div>
                <div>
                  <label className="dark-form-label">Shipping Date *</label>
                  <input type="date" name="shippingDate" value={formData.shippingDate} onChange={handleInputChange} className="dark-form-input" required />
                </div>
                <div>
                  <label className="dark-form-label">Estimated Arrival *</label>
                  <input type="date" name="estimatedArrival" value={formData.estimatedArrival} onChange={handleInputChange} className="dark-form-input" required />
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="dark-form-section">
              <h2 className="dark-form-section-title flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Financial Information
              </h2>

              <div className="mb-4 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="useWeightBasedShipping" checked={formData.useWeightBasedShipping} onChange={handleInputChange} className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500" />
                  <div>
                    <span className="text-blue-300 font-semibold">Use Weight-Based Shipping Calculation</span>
                    <p className="text-xs text-blue-400 mt-1">Enable this to calculate shipping cost automatically based on weight and dimensions</p>
                  </div>
                </label>
              </div>

              {formData.useWeightBasedShipping && (
                <div className="mb-6 bg-gradient-to-br from-blue-900/40 to-cyan-900/30 border border-blue-600 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Truck className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-bold text-white">Real-Time Shipping Cost Calculator</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    <div className="bg-white/10 p-4 rounded-lg border border-blue-500/30">
                      <div className="text-xs text-blue-300 mb-1 flex items-center gap-1"><Package className="w-3 h-3" />Actual Weight</div>
                      <div className="text-2xl font-bold text-blue-300">{shippingCalculation.actualWeight.toFixed(1)} kg</div>
                    </div>
                    <div className="bg-white/10 p-4 rounded-lg border border-purple-500/30">
                      <div className="text-xs text-purple-300 mb-1 flex items-center gap-1"><Ruler className="w-3 h-3" />Volumetric Weight</div>
                      <div className="text-2xl font-bold text-purple-300">{shippingCalculation.volumetricWeight.toFixed(1)} kg</div>
                      <div className="text-xs text-gray-400 mt-1">(L×W×H ÷ 5000)</div>
                    </div>
                    <div className={`bg-white/10 p-4 rounded-lg border ${shippingCalculation.chargeableWeight === shippingCalculation.volumetricWeight && shippingCalculation.volumetricWeight > shippingCalculation.actualWeight ? 'border-purple-500/50 bg-purple-900/20' : 'border-green-500/30'}`}>
                      <div className="text-xs text-green-300 mb-1">Chargeable Weight{shippingCalculation.chargeableWeight === shippingCalculation.volumetricWeight && shippingCalculation.volumetricWeight > shippingCalculation.actualWeight && <span className="ml-1 text-purple-300">(Volumetric)</span>}</div>
                      <div className="text-2xl font-bold text-green-400">{shippingCalculation.chargeableWeight.toFixed(1)} kg</div>
                      <div className="text-xs text-gray-400 mt-1">MAX(Actual, Volumetric)</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg p-5 text-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm opacity-90 flex items-center gap-2"><span>Estimated Shipping Cost</span><Info className="w-4 h-4 opacity-70" /></div>
                        <div className="text-4xl font-bold mt-1">${shippingCalculation.shippingCost.toFixed(2)}</div>
                        <div className="text-sm opacity-85 mt-1">Route: {shippingCalculation.calculationMethod || 'Select origin/destination'}<br/>Rate: ${shippingCalculation.ratePerKg.toFixed(2)}/kg</div>
                      </div>
                      <Truck className="w-16 h-16 opacity-50" />
                    </div>
                  </div>
                  {shippingCalculation.volumetricWeight > shippingCalculation.actualWeight && (
                    <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                      <p className="text-xs text-yellow-300">💡 <strong>Pro Tip:</strong> Your package is being charged by volumetric weight. Consider reducing dimensions to lower shipping costs!</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.useWeightBasedShipping ? (
                  <>
                    <div>
                      <label className="dark-form-label">Weight (kg) *</label>
                      <input type="number" name="weight" value={formData.weight} onChange={handleInputChange} className="dark-form-input" placeholder="0" min="0" step="0.01" required />
                    </div>
                    <div>
                      <label className="dark-form-label">Dimensions (cm) - Optional</label>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" name="dimensionLength" value={formData.dimensionLength} onChange={handleInputChange} className="dark-form-input" placeholder="L" min="0" step="0.1" />
                        <input type="number" name="dimensionWidth" value={formData.dimensionWidth} onChange={handleInputChange} className="dark-form-input" placeholder="W" min="0" step="0.1" />
                        <input type="number" name="dimensionHeight" value={formData.dimensionHeight} onChange={handleInputChange} className="dark-form-input" placeholder="H" min="0" step="0.1" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="dark-form-label">Shipping Cost (USD) *</label>
                    <input type="number" name="shippingCost" value={formData.shippingCost} onChange={handleInputChange} className="dark-form-input" placeholder="0.00" step="0.01" min="0" required />
                    <p className="text-xs text-gray-400 mt-1">📦 Manual mode: Enter shipping cost directly</p>
                  </div>
                )}

                <div>
                  <label className="dark-form-label">Exchange Rate (USD to EGP) *</label>
                  <input type="number" name="exchangeRate" value={formData.exchangeRate} onChange={handleInputChange} className="dark-form-input" placeholder="50.00" step="0.01" min="0" required />
                </div>
                <div>
                  <label className="dark-form-label">Currency</label>
                  <select name="currency" value={formData.currency} onChange={handleInputChange} className="dark-form-select" style={{color:"white", appearance:"none" as any}}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="EGP">EGP</option>
                  </select>
                </div>
                <div>
                  <label className="dark-form-label">Insurance %</label>
                  <input type="number" name="insurancePercentage" value={formData.insurancePercentage} onChange={handleInputChange} className="dark-form-input" step="0.1" min="0" />
                </div>
                <div>
                  <label className="dark-form-label">VAT %</label>
                  <input type="number" name="vatPercentage" value={formData.vatPercentage} onChange={handleInputChange} className="dark-form-input" step="0.1" min="0" />
                </div>

                <div className="md:col-span-2 border-t border-gray-600 pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">💰 Revenue & Profit (Auto-Calculated)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="dark-form-label">Service Markup (%)</label>
                      <input type="number" name="serviceMarkup" value={formData.serviceMarkup} onChange={handleInputChange} className="dark-form-input" placeholder="15" step="0.1" min="0" max="100" />
                      <p className="text-xs text-gray-400 mt-1">💡 Adjust to change profit margin</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                      <h4 className="text-xs font-semibold text-gray-400 mb-2">Cost Breakdown (EGP)</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-gray-400">Products:</span><span className="text-gray-200">{financials.totalProductCostEGP.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Customs Duty:</span><span className="text-gray-200">{financials.totalCustomsDuty.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Insurance:</span><span className="text-gray-200">{financials.insurance.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">VAT:</span><span className="text-gray-200">{financials.vat.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Shipping:</span><span className="text-gray-200">{financials.shippingCostEGP.toFixed(2)}</span></div>
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
                          <p className="text-2xl font-bold text-green-400">{financials.customerPayment.toFixed(2)} EGP</p>
                          <p className="text-xs text-gray-400 mt-1">≈ ${(financials.customerPayment / parseFloat(formData.exchangeRate || '50')).toFixed(2)} USD</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Your Profit</p>
                          <p className="text-2xl font-bold text-blue-400">{financials.profit.toFixed(2)} EGP</p>
                          <p className="text-xs text-gray-400 mt-1">Margin: {formData.serviceMarkup}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Profit (USD)</p>
                          <p className="text-2xl font-bold text-cyan-400">${(financials.profit / parseFloat(formData.exchangeRate || '50')).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                    <p className="text-xs text-blue-300">ℹ️ <strong>Auto-Calculated:</strong> Customer charge = Total costs + your {formData.serviceMarkup}% markup.{formData.useWeightBasedShipping && ' Shipping cost is calculated from weight in real-time.'}</p>
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
                  <select name="carrier" value={formData.carrier} onChange={handleInputChange} className="dark-form-select" style={{color:"white", appearance:"none" as any}}>
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
                  <input type="text" name="trackingNumber" value={formData.trackingNumber} onChange={handleInputChange} className="dark-form-input" placeholder="e.g., MAEU123456789" />
                </div>
                {!formData.useWeightBasedShipping && (
                  <div>
                    <label className="dark-form-label">Weight (kg) - Optional</label>
                    <input type="number" name="weight" value={formData.weight} onChange={handleInputChange} className="dark-form-input" placeholder="0" min="0" step="0.01" />
                  </div>
                )}
              </div>
            </div>

            {/* Customer & Supplier */}
            <div className="dark-form-section">
              <h2 className="dark-form-section-title">Customer & Supplier</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="dark-form-label">Customer</label>
                  <select name="customerId" value={formData.customerId} onChange={handleInputChange} className="dark-form-select" style={{color:"white", appearance:"none" as any}}>
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>{customer.name}</option>
                    ))}
                  </select>
                  {formData.customerName && <p className="text-xs text-green-400 mt-1">✓ Selected: {formData.customerName}</p>}
                </div>
                <div>
                  <label className="dark-form-label">Supplier</label>
                  <select name="supplierId" value={formData.supplierId} onChange={handleInputChange} className="dark-form-select" style={{color:"white", appearance:"none" as any}}>
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>{supplier.name}</option>
                    ))}
                  </select>
                  {formData.supplierName && <p className="text-xs text-green-400 mt-1">✓ Selected: {formData.supplierName}</p>}
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="dark-form-section">
              <h2 className="dark-form-section-title">Products *</h2>
              {products.length === 0 && (
                <div className="mb-4 bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <p className="text-sm text-yellow-300">No products available. <Link href="/products/create" className="underline font-medium text-yellow-200">Add products first</Link> before creating a shipment.</p>
                </div>
              )}

              {/* ✅ FIX 6: key uses _rowId so React remounts selects after scan */}
              {selectedProducts.map((item, index) => (
                <div key={item._rowId ?? index} className="flex items-center gap-3 mb-3">
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductChange(index, 'productId', e.target.value)}
                    className="dark-form-select" style={{color:"white", appearance:"none" as any, flex:"1 1 0%", minWidth:"0"}}
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
                    className="dark-form-input" style={{width:"90px", flexShrink:0}}
                    placeholder="Qty"
                    required
                  />
                  {selectedProducts.length > 1 && (
                    <button type="button" onClick={() => removeProductRow(index)} className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-600">Remove</button>
                  )}
                </div>
              ))}

              <button type="button" onClick={addProductRow} className="mt-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 border border-gray-600" disabled={products.length === 0}>
                + Add Product
              </button>
            </div>

            {/* Notes */}
            <div className="dark-form-section">
              <label className="dark-form-label">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="dark-form-textarea" placeholder="Additional notes or comments..." rows={4} maxLength={1000} />
              <p className="text-xs text-gray-400 mt-1">{formData.notes.length}/1000 characters</p>
            </div>

            {/* Submit */}
            <div className="flex gap-4 justify-end pt-4 border-t border-gray-700">
              <Link href="/shipments" className="dark-form-button-secondary">Cancel</Link>
              <button type="submit" disabled={loading || products.length === 0} className="dark-form-button-primary">
                {loading ? 'Creating...' : 'Create Shipment'}
              </button>
            </div>
          </form>
        </AnimatedCard>
      </div>
    </AnimatedPage>
  );
}