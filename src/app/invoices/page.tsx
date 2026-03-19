//src\app\invoices\page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';

// Animated components
import {
  AnimatedCard,
  AnimatedButton,
  PageHeader,
  AnimatedPage,
  Alert,
  EmptyState,
} from '@/components/animated';

// Icons
const FileText = LucideIcons.FileText as any;
const Plus = LucideIcons.Plus as any;
const Download = LucideIcons.Download as any;
const Send = LucideIcons.Send as any;
const Eye = LucideIcons.Eye as any;
const RefreshCw = LucideIcons.RefreshCw as any;
const Trash2 = LucideIcons.Trash2 as any;

// Types
interface Shipment {
  _id: string;
  trackingNumber: string;
  status: string;
  customerName?: string;
  customer?: {
    name?: string;
  };
  hasInvoice?: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  shipment: {
    trackingNumber: string;
  };
  customer: {
    name: string;
  };
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'shipments' | 'invoices'>('shipments');
  const [refreshing, setRefreshing] = useState(false);
  
  // Separate pagination state for each tab
  const [shipmentsPage, setShipmentsPage] = useState(1);
  const [shipmentsTotalPages, setShipmentsTotalPages] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesTotalPages, setInvoicesTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [totalShipments, setTotalShipments] = useState(0);
  const [shipmentsWithoutInvoice, setShipmentsWithoutInvoice] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchData();
    }
  }, [isAuthenticated, token, shipmentsPage, invoicesPage]);

  const fetchData = async () => {
    console.log('🚀 ========== FETCH DATA STARTED ==========');
    console.log('📍 Shipments Page:', shipmentsPage);
    console.log('📍 Invoices Page:', invoicesPage);
    console.log('📍 Active Tab:', activeTab);
    
    try {
      setLoading(true);
      setError('');

      console.log('🔄 Making API calls...');
      const [shipmentsRes, invoicesRes] = await Promise.all([
        fetch(`/api/shipments?page=${shipmentsPage}&limit=10`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/invoices?page=${invoicesPage}&limit=10`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      console.log('✅ API calls completed');
      console.log('📦 Shipments Response Status:', shipmentsRes.status, shipmentsRes.statusText);
      console.log('📄 Invoices Response Status:', invoicesRes.status, invoicesRes.statusText);

      let shipmentsData: Shipment[] = [];
      if (shipmentsRes.ok) {
        const data = await shipmentsRes.json();
        console.log('📦 SHIPMENTS RAW DATA:', JSON.stringify(data, null, 2));
        
        shipmentsData = Array.isArray(data)
          ? data
          : Array.isArray(data.shipments)
          ? data.shipments
          : Array.isArray(data.data)
          ? data.data
          : [];
        
        console.log('📦 Shipments Array Length:', shipmentsData.length);
        console.log('📦 First Shipment hasInvoice:', shipmentsData[0]?.hasInvoice);
        
        // Extract pagination for shipments
        if (data.pagination) {
          console.log('📦 SHIPMENTS PAGINATION:', data.pagination);
          setTotalShipments(data.pagination.total || 0);
          setShipmentsTotalPages(data.pagination.totalPages || 1);
        } else {
          console.warn('⚠️ NO PAGINATION in shipments response');
        }
        
        // Count shipments without invoices from current page
        const withoutInvoiceCount = shipmentsData.filter((s: any) => !s.hasInvoice).length;
        console.log('📦 Shipments WITHOUT invoice:', withoutInvoiceCount);
        console.log('📦 Shipments WITH invoice:', shipmentsData.length - withoutInvoiceCount);
        setShipmentsWithoutInvoice(withoutInvoiceCount);
      } else {
        console.error('❌ Shipments request failed');
        throw new Error('Failed to load shipments');
      }

      let invoicesData: Invoice[] = [];
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        console.log('📄 ========== INVOICES RAW DATA ==========');
        console.log('📄 Full Response:', JSON.stringify(data, null, 2));
        console.log('📄 Response Keys:', Object.keys(data));
        console.log('📄 Has pagination?', !!data.pagination);
        
        const rawInvoices = Array.isArray(data)
          ? data
          : Array.isArray(data.invoices)
          ? data.invoices
          : [];

        console.log('📄 Raw Invoices Array Length:', rawInvoices.length);

        invoicesData = rawInvoices.map((inv: any) => ({
          ...inv,
          id: inv._id || inv.id || inv.invoiceNumber,
          customer: { name: inv.customerName || inv.customer?.name || '' },
          shipment: { trackingNumber: inv.shipmentTrackingNumber || inv.shipment?.trackingNumber || inv.shipmentId || '' },
        })).filter((inv: any) => inv.id);
        
        console.log('📄 Processed Invoices Array Length:', invoicesData.length);
        
        // Extract pagination for invoices
        if (data.pagination) {
          console.log('📄 ========== INVOICES PAGINATION ==========');
          console.log('📄 Page:', data.pagination.page);
          console.log('📄 Limit:', data.pagination.limit);
          console.log('📄 Total:', data.pagination.total);
          console.log('📄 Total Pages:', data.pagination.totalPages);
          console.log('📄 ==========================================');
          
          setInvoicesTotalPages(data.pagination.totalPages || 1);
          setTotalInvoices(data.pagination.total || 0);
        } else {
          console.warn('⚠️ ========== NO PAGINATION DATA IN INVOICE RESPONSE ==========');
          console.warn('⚠️ Setting defaults: totalPages=1, totalInvoices=' + invoicesData.length);
          setInvoicesTotalPages(1);
          setTotalInvoices(invoicesData.length);
        }
      }

      console.log('💾 Setting state...');
      console.log('💾 Shipments to set:', shipmentsData.length);
      console.log('💾 Invoices to set:', invoicesData.length);
      
      setShipments(shipmentsData);
      setInvoices(invoicesData);
      
      console.log('✅ ========== FETCH DATA COMPLETED ==========');
    } catch (err: any) {
      console.error('💥 ========== FETCH DATA ERROR ==========');
      console.error('Error fetching invoices/shipments:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      setError(err.message || 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🏁 ========== FETCH DATA FINALLY BLOCK ==========');
    }
  };

  const generateInvoice = async (shipmentId: string) => {
    setGenerating(shipmentId);
    try {
      const res = await fetch(`/api/invoices/generate/${shipmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate invoice');
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate invoice');
    } finally {
      setGenerating(null);
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    setDeleting(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete invoice');
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete invoice');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download invoice');
    }
  };

  const sendInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send invoice');
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to send invoice');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (!isAuthenticated) return null;

  const pendingShipments = shipments.filter((s) => !s.hasInvoice);
  const tabCount = {
    shipments: shipmentsWithoutInvoice || pendingShipments.length,
    invoices: totalInvoices || invoices.length,
  };

  console.log('🎨 ========== RENDER STATE ==========');
  console.log('🎨 Shipments Page:', shipmentsPage);
  console.log('🎨 Shipments Total Pages:', shipmentsTotalPages);
  console.log('🎨 Invoices Page:', invoicesPage);
  console.log('🎨 Invoices Total Pages:', invoicesTotalPages);
  console.log('🎨 Total Invoices:', totalInvoices);
  console.log('🎨 Invoices Array Length:', invoices.length);
  console.log('🎨 Total Shipments:', totalShipments);
  console.log('🎨 Shipments Array Length:', shipments.length);
  console.log('🎨 Pending Shipments Length:', pendingShipments.length);
  console.log('🎨 Pending Shipments:', pendingShipments);
  console.log('🎨 Shipments Without Invoice:', shipmentsWithoutInvoice);
  console.log('🎨 Tab Counts:', tabCount);
  console.log('🎨 Loading:', loading);
  console.log('🎨 Active Tab:', activeTab);
  console.log('🎨 =====================================');

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

      {/* Animated Blobs */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Invoice</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this invoice? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteInvoice(confirmDelete)}
                disabled={deleting === confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting === confirmDelete ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Header */}
        <PageHeader
          icon={<FileText className="w-8 h-8" />}
          title="Invoice Management"
          description={`Manage and generate invoices (${totalInvoices} total)`}
          actions={
            <div className="flex gap-2">
              <AnimatedButton
                variant="secondary"
                icon={<RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />}
                onClick={handleRefresh}
                disabled={refreshing}
                loading={refreshing}
              >
                Refresh
              </AnimatedButton>
            </div>
          }
        />

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <AnimatedCard>
            <div className="flex gap-6 border-b border-gray-200 pb-2">
              <button
                onClick={() => setActiveTab('shipments')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'shipments'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Generate Invoices ({tabCount.shipments})
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'invoices'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Existing Invoices ({tabCount.invoices})
              </button>
            </div>
          </AnimatedCard>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
            <Alert
              variant="error"
              title="Something went wrong"
              message={error}
              onClose={() => setError('')}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : activeTab === 'shipments' ? (
            pendingShipments.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-16 h-16" />}
                title="No shipments need invoicing"
                description="All eligible shipments already have invoices."
              />
            ) : (
              <>
                <AnimatedCard>
                  <div className="space-y-4">
                    {pendingShipments.map((shipment) => (
                      <div
                        key={shipment._id || shipment.trackingNumber}
                        className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-gray-200 last:border-0"
                      >
                        <div className="mb-3 md:mb-0">
                          <p className="font-medium text-gray-900">
                            {shipment.trackingNumber || 'Unknown Tracking'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Customer: {shipment.customerName || shipment.customer?.name || 'N/A'}
                          </p>
                          <span className="inline-block mt-1 px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                            {shipment.status || 'Unknown'}
                          </span>
                        </div>
                        <AnimatedButton
                          size="sm"
                          variant="primary"
                          onClick={() => generateInvoice(shipment._id)}
                          disabled={generating === shipment._id}
                          loading={generating === shipment._id}
                        >
                          Generate Invoice
                        </AnimatedButton>
                      </div>
                    ))}
                  </div>
                </AnimatedCard>
                
                {/* Shipments Pagination Controls */}
                <div className="mt-4 text-center text-sm text-gray-500">
                  Showing {pendingShipments.length} of {totalShipments} total shipments (Page {shipmentsPage} of {shipmentsTotalPages})
                </div>
                
                {shipmentsTotalPages > 1 && (
                  <div className="mt-6 flex justify-center items-center gap-2">
                    <AnimatedButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setShipmentsPage(prev => Math.max(1, prev - 1))}
                      disabled={shipmentsPage === 1}
                    >
                      Previous
                    </AnimatedButton>
                    
                    <div className="flex gap-2">
                      {Array.from({ length: shipmentsTotalPages }, (_, i) => i + 1).map(pageNum => (
                        <AnimatedButton
                          key={pageNum}
                          variant={shipmentsPage === pageNum ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => setShipmentsPage(pageNum)}
                        >
                          {pageNum}
                        </AnimatedButton>
                      ))}
                    </div>
                    
                    <AnimatedButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setShipmentsPage(prev => Math.min(shipmentsTotalPages, prev + 1))}
                      disabled={shipmentsPage === shipmentsTotalPages}
                    >
                      Next
                    </AnimatedButton>
                  </div>
                )}
              </>
            )
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-16 h-16" />}
              title="No invoices yet"
              description="Generate your first invoice from a shipment."
            />
          ) : (
            <>
              <AnimatedCard>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-blue-600">{invoice.invoiceNumber || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {invoice.customer?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {invoice.shipment?.trackingNumber || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${typeof invoice.totalAmount === 'number' ? invoice.totalAmount.toFixed(2) : '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                invoice.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : invoice.status === 'sent'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {invoice.status || 'draft'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <Link href={`/invoices/${invoice.id}`}>
                              <AnimatedButton variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />}>
                                View
                              </AnimatedButton>
                            </Link>
                            <AnimatedButton
                              variant="ghost"
                              size="sm"
                              icon={<Download className="w-4 h-4" />}
                              onClick={() => downloadInvoice(invoice.id)}
                            >
                              PDF
                            </AnimatedButton>
                            <AnimatedButton
                              variant="ghost"
                              size="sm"
                              icon={<Send className="w-4 h-4" />}
                              onClick={() => sendInvoice(invoice.id)}
                            >
                              Send
                            </AnimatedButton>
                            <AnimatedButton
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 className="w-4 h-4 text-red-500" />}
                              onClick={() => setConfirmDelete(invoice.id)}
                              disabled={deleting === invoice.id}
                            >
                              <span className="text-red-500">Delete</span>
                            </AnimatedButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AnimatedCard>
              
              {/* Pagination Controls */}
              <div className="mt-4 text-center text-sm text-gray-500">
                Showing {invoices.length} of {totalInvoices} invoices (Page {invoicesPage} of {invoicesTotalPages})
              </div>
              
              {invoicesTotalPages > 1 && (
                <div className="mt-6 flex justify-center items-center gap-2">
                  <AnimatedButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setInvoicesPage(prev => Math.max(1, prev - 1))}
                    disabled={invoicesPage === 1}
                  >
                    Previous
                  </AnimatedButton>
                  
                  <div className="flex gap-2">
                    {Array.from({ length: invoicesTotalPages }, (_, i) => i + 1).map(pageNum => (
                      <AnimatedButton
                        key={pageNum}
                        variant={invoicesPage === pageNum ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setInvoicesPage(pageNum)}
                      >
                        {pageNum}
                      </AnimatedButton>
                    ))}
                  </div>
                  
                  <AnimatedButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setInvoicesPage(prev => Math.min(invoicesTotalPages, prev + 1))}
                    disabled={invoicesPage === invoicesTotalPages}
                  >
                    Next
                  </AnimatedButton>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}