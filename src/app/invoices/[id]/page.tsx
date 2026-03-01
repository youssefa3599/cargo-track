// src/app/invoices/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import * as LucideIcons from 'lucide-react';

const Loader2 = LucideIcons.Loader2 as any;
const AlertCircle = LucideIcons.AlertCircle as any;
const FileText = LucideIcons.FileText as any;
const Download = LucideIcons.Download as any;
const Send = LucideIcons.Send as any;
const Edit2 = LucideIcons.Edit2 as any;
const Save = LucideIcons.Save as any;
const X = LucideIcons.X as any;
const CheckCircle = LucideIcons.CheckCircle as any;
const ArrowLeft = LucideIcons.ArrowLeft as any;
const Calendar = LucideIcons.Calendar as any;
const DollarSign = LucideIcons.DollarSign as any;

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  shipmentId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  companyName: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  sentDate?: string;
  dueDate?: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function InvoiceDetailPage() {
  console.log('\n💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰');
  console.log('💰 INVOICE DETAIL PAGE - HYBRID APPROACH');
  console.log('💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰\n');

  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Edit state
  const [editedDiscount, setEditedDiscount] = useState(0);
  const [editedNotes, setEditedNotes] = useState('');

  console.log('📋 Invoice ID:', invoiceId);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetails();
    }
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    console.log('\n🔥 FETCHING INVOICE DETAILS...');
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/invoices/${invoiceId}`, { headers });
      console.log('📨 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch invoice: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Invoice data:', data);
      
      const invoiceData = data.invoice || data;
      setInvoice(invoiceData);
      setEditedDiscount(invoiceData.discount || 0);
      setEditedNotes(invoiceData.notes || '');
    } catch (error: any) {
      console.error('❌ Error fetching invoice:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    if (!invoice) return;

    console.log('\n💾 SAVING INVOICE CHANGES...');
    setSaving(true);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          discount: editedDiscount,
          notes: editedNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      const data = await response.json();
      console.log('✅ Invoice updated:', data);
      
      setInvoice(data.invoice || data);
      setEditing(false);
      alert('✅ Invoice updated successfully!');
    } catch (error: any) {
      console.error('❌ Error saving invoice:', error);
      alert(`❌ Failed to save changes: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const sendInvoice = async () => {
    if (!invoice) return;

    const confirmed = confirm(
      `Send invoice ${invoice.invoiceNumber} to ${invoice.customerName}?\n\n` +
      `Email: ${invoice.customerEmail}\n` +
      `Amount: ${invoice.currency} ${invoice.totalAmount.toFixed(2)}`
    );

    if (!confirmed) return;

    console.log('\n📧 SENDING INVOICE TO CUSTOMER...');
    setSending(true);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to send invoice');
      }

      const data = await response.json();
      console.log('✅ Invoice sent:', data);
      
      setInvoice(data.invoice || data);
      alert(`✅ Invoice sent successfully to ${invoice.customerEmail}!`);
    } catch (error: any) {
      console.error('❌ Error sending invoice:', error);
      alert(`❌ Failed to send invoice: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const downloadInvoice = async () => {
    console.log('\n📥 DOWNLOADING INVOICE PDF...');
    try {
      const headers: HeadersInit = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/invoices/${invoiceId}/download`, { headers });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice?.invoiceNumber || 'invoice'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Invoice downloaded');
    } catch (error: any) {
      console.error('❌ Error downloading invoice:', error);
      alert(`❌ Failed to download invoice: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800 mb-1">Error Loading Invoice</p>
              <p className="text-sm text-red-700">{error || 'Invoice not found'}</p>
              <Link
                href="/invoices"
                className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Back to Invoices
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const calculatedTotalAmount = invoice.subtotal + invoice.taxAmount - editedDiscount;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Invoice {invoice.invoiceNumber}
              </h1>
              <p className="text-gray-600">
                Created: {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
            
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold ${getStatusColor(invoice.status)}`}>
              <FileText className="w-5 h-5" />
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Status Banner for Draft */}
        {invoice.status === 'draft' && (
          <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Edit2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  📝 Draft Invoice - Review Required
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  This invoice was auto-generated and is awaiting your review. You can edit the discount and notes before sending it to the customer.
                </p>
                <div className="flex gap-3">
                  {!editing ? (
                    <>
                      <button
                        onClick={() => setEditing(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-yellow-600 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors font-semibold"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Invoice
                      </button>
                      <button
                        onClick={sendInvoice}
                        disabled={sending}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 font-semibold"
                      >
                        {sending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send to Customer
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={saveChanges}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 font-semibold"
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
                      <button
                        onClick={() => {
                          setEditing(false);
                          setEditedDiscount(invoice.discount);
                          setEditedNotes(invoice.notes || '');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions for Sent/Paid Invoices */}
        {invoice.status !== 'draft' && (
          <div className="mb-6 flex gap-3">
            <button
              onClick={downloadInvoice}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <Link
              href={`/shipments/${invoice.shipmentId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Shipment
            </Link>
          </div>
        )}

        {/* Invoice Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill To</h3>
            <div className="space-y-2">
              <p className="font-semibold text-gray-900">{invoice.customerName}</p>
              <p className="text-sm text-gray-600">{invoice.customerEmail}</p>
              {invoice.customerAddress && (
                <p className="text-sm text-gray-600">{invoice.customerAddress}</p>
              )}
            </div>
          </div>

          {/* Invoice Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Invoice Number:</span>
                <span className="text-sm font-semibold text-gray-900">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Shipment ID:</span>
                <Link 
                  href={`/shipments/${invoice.shipmentId}`}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  View Shipment
                </Link>
              </div>
              {invoice.sentDate && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sent Date:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date(invoice.sentDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {invoice.dueDate && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Due Date:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {invoice.paidDate && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Paid Date:</span>
                  <span className="text-sm font-semibold text-green-600">
                    {new Date(invoice.paidDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Description</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Quantity</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Unit Price</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm text-gray-900">{item.description}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">{item.quantity}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">
                      {invoice.currency} {item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                      {invoice.currency} {item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 border-t-2 border-gray-200 pt-4">
            <div className="space-y-2 max-w-md ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold text-gray-900">
                  {invoice.currency} {invoice.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax ({(invoice.taxRate * 100).toFixed(0)}%):</span>
                <span className="font-semibold text-gray-900">
                  {invoice.currency} {invoice.taxAmount.toFixed(2)}
                </span>
              </div>
              {editing ? (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600">Discount:</span>
                  <input
                    type="number"
                    value={editedDiscount}
                    onChange={(e) => setEditedDiscount(Number(e.target.value))}
                    className="w-32 px-3 py-1 border border-gray-300 rounded text-right"
                    step="0.01"
                    min="0"
                  />
                </div>
              ) : (
                invoice.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-semibold text-red-600">
                      -{invoice.currency} {invoice.discount.toFixed(2)}
                    </span>
                  </div>
                )
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-gray-900">
                  {invoice.currency} {calculatedTotalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
          {editing ? (
            <textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={4}
              placeholder="Add notes for the customer..."
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">
              {invoice.notes || 'No notes'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}