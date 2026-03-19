// ============================================================================
// FILE: src/components/AIAssistant.tsx
// Floating AI Assistant — Navigation, Shipment/Customer/Supplier/Invoice Fetch & Q&A
// ============================================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import * as LucideIcons from 'lucide-react';

const Bot          = LucideIcons.Bot          as any;
const X            = LucideIcons.X            as any;
const Send         = LucideIcons.Send         as any;
const Sparkles     = LucideIcons.Sparkles     as any;
const Mic          = LucideIcons.Mic          as any;
const MicOff       = LucideIcons.MicOff       as any;
const Loader2      = LucideIcons.Loader2      as any;
const Navigation   = LucideIcons.Navigation   as any;
const Package      = LucideIcons.Package      as any;
const MapPin       = LucideIcons.MapPin       as any;
const Calendar     = LucideIcons.Calendar     as any;
const DollarSign   = LucideIcons.DollarSign   as any;
const ExternalLink = LucideIcons.ExternalLink as any;
const User         = LucideIcons.User         as any;
const Building2    = LucideIcons.Building2    as any;
const Mail         = LucideIcons.Mail         as any;
const Phone        = LucideIcons.Phone        as any;
const Globe        = LucideIcons.Globe        as any;
const FileText     = LucideIcons.FileText     as any;
const CheckCircle2 = LucideIcons.CheckCircle2 as any;
const AlertCircle  = LucideIcons.AlertCircle  as any;
const Clock        = LucideIcons.Clock        as any;
const Ban          = LucideIcons.Ban          as any;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShipmentResult {
  _id: string;
  shipmentId: string;
  origin: string;
  destination: string;
  status: 'pending' | 'in-transit' | 'customs' | 'delivered' | 'cancelled';
  customerName?: string;
  supplierName?: string;
  shippingDate: string;
  estimatedArrival: string;
  costBreakdown?: { totalLandedCost: number };
  currency?: string;
  trackingNumber?: string;
}

interface CustomerResult {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  country?: string;
  taxId?: string;
  notes?: string;
}

interface SupplierResult {
  _id: string;
  name: string;
  email: string;
  phone: string;
  contactPerson: string;
  country?: string;
  address?: any;
  isActive?: boolean;
  paymentTerms?: string;
}

interface InvoiceResult {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  status: 'unpaid' | 'paid' | 'overdue' | 'cancelled';
  totalAmount: number;
  totalAmountEGP?: number;
  currency: string;
  issueDate?: string;
  dueDate?: string;
  shipmentId?: string;
  items?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: 'navigate' | 'fetch_shipment' | 'fetch_customer' | 'fetch_supplier' | 'fetch_invoice' | 'answer' | 'unknown';
  route?: string | null;
  shipments?: ShipmentResult[];
  customers?: CustomerResult[];
  suppliers?: SupplierResult[];
  invoices?: InvoiceResult[];
  timestamp: Date;
}

interface AICommandResponse {
  action: 'navigate' | 'fetch_shipment' | 'fetch_customer' | 'fetch_supplier' | 'fetch_invoice' | 'answer' | 'unknown';
  route: string | null;
  message: string;
  confidence: number;
  shipmentQuery: {
    shipmentId: string | null;
    customerName: string | null;
    origin: string | null;
    destination: string | null;
    status: string | null;
    trackingNumber?: string | null;
  } | null;
  customerQuery: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  supplierQuery: {
    name: string | null;
    email: string | null;
    contactPerson: string | null;
  } | null;
  invoiceQuery: {
    invoiceNumber: string | null;
    customerName: string | null;
    status: string | null;
    dateFrom: string | null;
    dateTo: string | null;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending:      'bg-yellow-100 text-yellow-800',
  'in-transit': 'bg-blue-100 text-blue-800',
  customs:      'bg-purple-100 text-purple-800',
  delivered:    'bg-green-100 text-green-800',
  cancelled:    'bg-red-100 text-red-800',
  unpaid:       'bg-yellow-100 text-yellow-800',
  paid:         'bg-green-100 text-green-800',
  overdue:      'bg-red-100 text-red-800',
};

const INVOICE_STATUS_ICONS: Record<string, any> = {
  paid:      CheckCircle2,
  overdue:   AlertCircle,
  cancelled: Ban,
  unpaid:    Clock,
};

const SUGGESTIONS = [
  'Go to shipments',
  'Find customer Ahmed',
  'Show supplier Ali',
  'Show pending shipments',
  'Show analytics',
  'Open invoices',
  'Find unpaid invoices',
  'Show overdue invoices',
];

function generateId() { return Math.random().toString(36).slice(2, 9); }
function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Detect whether a search term looks like an ID or a name ──────────────────
// IDs contain dashes or are all-uppercase alphanumeric (SHP-XXX, TRK-123, INV-20241201-0001)
// Names are regular words (Ahmed, Ali, Mohamed)
function looksLikeId(term: string): boolean {
  return /[-\/]/.test(term) || /^[A-Z0-9]{4,}$/.test(term.trim());
}

// ── Fuzzy matching ────────────────────────────────────────────────────────────

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function similarityScore(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(s1, s2);
  return 1 - (distance / maxLen);
}

function fuzzyMatch(searchTerm: string, text: string, threshold: number = 0.6): boolean {
  const search = searchTerm.toLowerCase().trim();
  const target = text.toLowerCase().trim();
  if (target.includes(search) || search.includes(target)) return true;
  if (similarityScore(search, target) >= threshold) return true;
  const targetWords = target.split(/\s+/);
  for (const word of targetWords) {
    if (word.includes(search)) return true;
    if (similarityScore(search, word) >= threshold) return true;
  }
  let searchIndex = 0;
  for (let i = 0; i < target.length && searchIndex < search.length; i++) {
    if (target[i] === search[searchIndex]) searchIndex++;
  }
  if (searchIndex === search.length) return true;
  return false;
}

function filterResults(results: any[], searchTerm: string, type: 'customer' | 'supplier' | 'shipment' | 'invoice'): any[] {
  if (!results || results.length === 0) return [];
  const scored = results.map(item => {
    let maxScore = 0;
    if (type === 'customer') {
      maxScore = Math.max(
        similarityScore(searchTerm, item.name),
        similarityScore(searchTerm, item.email),
        similarityScore(searchTerm, item.phone),
      );
      if (fuzzyMatch(searchTerm, item.name) || fuzzyMatch(searchTerm, item.email) || fuzzyMatch(searchTerm, item.phone)) {
        maxScore = Math.max(maxScore, 0.7);
      }
    } else if (type === 'supplier') {
      maxScore = Math.max(
        similarityScore(searchTerm, item.name),
        similarityScore(searchTerm, item.email),
        similarityScore(searchTerm, item.contactPerson || ''),
      );
      if (fuzzyMatch(searchTerm, item.name) || fuzzyMatch(searchTerm, item.email) || fuzzyMatch(searchTerm, item.contactPerson || '')) {
        maxScore = Math.max(maxScore, 0.7);
      }
    } else if (type === 'shipment') {
      maxScore = Math.max(
        similarityScore(searchTerm, item.shipmentId || ''),
        similarityScore(searchTerm, item.trackingNumber || ''),
        similarityScore(searchTerm, item.customerName || ''),
        similarityScore(searchTerm, item.supplierName || ''),
        similarityScore(searchTerm, item.origin || ''),
        similarityScore(searchTerm, item.destination || ''),
      );
      if (
        fuzzyMatch(searchTerm, item.shipmentId || '') ||
        fuzzyMatch(searchTerm, item.trackingNumber || '') ||
        fuzzyMatch(searchTerm, item.customerName || '') ||
        fuzzyMatch(searchTerm, item.supplierName || '') ||
        fuzzyMatch(searchTerm, item.origin || '') ||
        fuzzyMatch(searchTerm, item.destination || '')
      ) {
        maxScore = Math.max(maxScore, 0.7);
      }
    } else if (type === 'invoice') {
      maxScore = Math.max(
        similarityScore(searchTerm, item.invoiceNumber || ''),
        similarityScore(searchTerm, item.customerName || ''),
        similarityScore(searchTerm, item.customerEmail || ''),
      );
      if (
        fuzzyMatch(searchTerm, item.invoiceNumber || '') ||
        fuzzyMatch(searchTerm, item.customerName || '') ||
        fuzzyMatch(searchTerm, item.customerEmail || '')
      ) {
        maxScore = Math.max(maxScore, 0.7);
      }
    }
    return { item, score: maxScore };
  });
  return scored
    .filter(({ score }) => score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

// ── Cascade fetch — for NAME searches only, never for IDs ────────────────────
async function cascadeFetch(
  endpoint: string,
  searchTerm: string,
  token: string,
  type: 'customer' | 'supplier' | 'shipment' | 'invoice',
  extraParams?: Record<string, string>
): Promise<any[]> {
  const attempts = [
    searchTerm.slice(0, 3),
    searchTerm.slice(0, 2),
    searchTerm.slice(0, 1),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  for (const prefix of attempts) {
    const p = new URLSearchParams({ search: prefix, limit: '20', ...extraParams });
    const res = await fetch(`${endpoint}?${p.toString()}`, {
      headers:     { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!res.ok) continue;
    const data = await res.json();
    const results = data.customers || data.suppliers || data.shipments || data.invoices || data.data || [];
    const filtered = filterResults(results, searchTerm, type);
    if (filtered.length > 0) return filtered.slice(0, 5);
  }
  return [];
}

// ── Direct fetch — for ID searches (shipmentId, trackingNumber, invoiceNumber) ─
// Sends the full term directly, no prefix slicing, no fuzzy filter needed
async function directFetch(
  endpoint: string,
  search: string,
  token: string,
  resultKey: string,
  extraParams?: Record<string, string>
): Promise<any[]> {
  const p = new URLSearchParams({ search, limit: '10', ...extraParams });
  const res = await fetch(`${endpoint}?${p.toString()}`, {
    headers:     { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data[resultKey] || data.data || [];
}

// ── Shipment Card ─────────────────────────────────────────────────────────────

function ShipmentCard({ shipment, onOpen }: { shipment: ShipmentResult; onOpen: (id: string) => void }) {
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-semibold text-gray-800">{shipment.shipmentId}</span>
          {shipment.trackingNumber && (
            <span className="text-xs text-gray-400">· {shipment.trackingNumber}</span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[shipment.status] || 'bg-gray-100 text-gray-600'}`}>
          {shipment.status}
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="font-medium">{shipment.origin}</span>
          <span className="text-gray-300">→</span>
          <span className="font-medium">{shipment.destination}</span>
        </div>
        {(shipment.customerName || shipment.supplierName) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="text-gray-400">Customer:</span>
            <span>{shipment.customerName || '—'}</span>
            {shipment.supplierName && (
              <>
                <span className="text-gray-300 mx-1">•</span>
                <span className="text-gray-400">Supplier:</span>
                <span>{shipment.supplierName}</span>
              </>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span>{formatDate(shipment.shippingDate)}</span>
          <span className="text-gray-300">→</span>
          <span>{formatDate(shipment.estimatedArrival)}</span>
        </div>
        {shipment.costBreakdown?.totalLandedCost && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <DollarSign className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-700">
              {shipment.costBreakdown.totalLandedCost.toLocaleString()} {shipment.currency || 'USD'}
            </span>
            <span className="text-gray-400">total landed cost</span>
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-gray-100">
        <button
          onClick={() => onOpen(shipment._id)}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View full details
        </button>
      </div>
    </div>
  );
}

// ── Customer Card ─────────────────────────────────────────────────────────────

function CustomerCard({ customer, onOpen }: { customer: CustomerResult; onOpen: (id: string) => void }) {
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-100">
        <User className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-xs font-semibold text-gray-800">{customer.name}</span>
        {customer.country && (
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <Globe className="w-3 h-3" />{customer.country}
          </span>
        )}
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span>{customer.email}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span>{customer.phone}</span>
        </div>
        {customer.address && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="truncate">{customer.address}</span>
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-gray-100">
        <button
          onClick={() => onOpen(customer._id)}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View customer
        </button>
      </div>
    </div>
  );
}

// ── Supplier Card ─────────────────────────────────────────────────────────────

function SupplierCard({ supplier, onOpen }: { supplier: SupplierResult; onOpen: (id: string) => void }) {
  const addressStr = supplier.address
    ? typeof supplier.address === 'string'
      ? supplier.address
      : [supplier.address.city, supplier.address.country].filter(Boolean).join(', ')
    : null;

  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border-b border-orange-100">
        <Building2 className="w-3.5 h-3.5 text-orange-500" />
        <span className="text-xs font-semibold text-gray-800">{supplier.name}</span>
        {supplier.isActive !== undefined && (
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${supplier.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {supplier.isActive ? 'Active' : 'Inactive'}
          </span>
        )}
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {supplier.contactPerson && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span>{supplier.contactPerson}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span>{supplier.email}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span>{supplier.phone}</span>
        </div>
        {addressStr && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span>{addressStr}</span>
          </div>
        )}
        {supplier.paymentTerms && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <DollarSign className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span>{supplier.paymentTerms}</span>
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-gray-100">
        <button
          onClick={() => onOpen(supplier._id)}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View supplier
        </button>
      </div>
    </div>
  );
}

// ── Invoice Card ──────────────────────────────────────────────────────────────

function InvoiceCard({ invoice, onOpen }: { invoice: InvoiceResult; onOpen: (id: string) => void }) {
  const StatusIcon = INVOICE_STATUS_ICONS[invoice.status] || Clock;
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-xs font-semibold text-gray-800">{invoice.invoiceNumber}</span>
        </div>
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[invoice.status] || 'bg-gray-100 text-gray-600'}`}>
          <StatusIcon className="w-3 h-3" />
          {invoice.status}
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="font-medium">{invoice.customerName}</span>
        </div>
        {invoice.customerEmail && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span>{invoice.customerEmail}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <DollarSign className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="font-semibold text-gray-800">
            {invoice.totalAmount?.toLocaleString()} {invoice.currency}
          </span>
          {invoice.totalAmountEGP && invoice.currency !== 'EGP' && (
            <span className="text-gray-400 text-xs">
              ≈ {invoice.totalAmountEGP.toLocaleString()} EGP
            </span>
          )}
        </div>
        {invoice.dueDate && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span>Due {formatDate(invoice.dueDate)}</span>
          </div>
        )}
        {invoice.items !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Package className="w-3 h-3 text-gray-300 flex-shrink-0" />
            <span>{invoice.items} line item{invoice.items !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-gray-100">
        <button
          onClick={() => onOpen(invoice.id)}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View invoice
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AIAssistant() {
  const router   = useRouter();
  const pathname = usePathname();

  const [isOpen,       setIsOpen]       = useState(false);
  const [input,        setInput]        = useState('');
  const [messages,     setMessages]     = useState<Message[]>([
    {
      id:        'welcome',
      role:      'assistant',
      text:      "Hi! I'm CargoAI 👋 I can navigate the app, fetch shipments, customers, suppliers, invoices, or answer logistics questions.",
      timestamp: new Date(),
    },
  ]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isListening,  setIsListening]  = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  if (pathname === '/login' || pathname === '/register') return null;

  // ── Voice Input ─────────────────────────────────────────────────────────────

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addAssistantMessage("Sorry, your browser doesn't support voice input. Try Chrome!", 'unknown');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang           = 'en-US';
    recognition.interimResults = false;
    recognitionRef.current     = recognition;

    recognition.onstart  = () => setIsListening(true);
    recognition.onend    = () => setIsListening(false);
    recognition.onerror  = () => setIsListening(false);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => handleSend(transcript), 300);
    };
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // ── Message Helpers ─────────────────────────────────────────────────────────

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: generateId(), role: 'user', text, timestamp: new Date() }]);
  };

  const addAssistantMessage = (
    text: string,
    action?: Message['action'],
    route?: string | null,
    extras?: {
      shipments?: ShipmentResult[];
      customers?: CustomerResult[];
      suppliers?: SupplierResult[];
      invoices?:  InvoiceResult[];
    }
  ) => {
    setMessages(prev => [...prev, {
      id:        generateId(),
      role:      'assistant',
      text,
      action,
      route,
      shipments: extras?.shipments,
      customers: extras?.customers,
      suppliers: extras?.suppliers,
      invoices:  extras?.invoices,
      timestamp: new Date(),
    }]);
  };

  // ── Fetch Functions ─────────────────────────────────────────────────────────

  const fetchShipments = async (query: AICommandResponse['shipmentQuery']): Promise<ShipmentResult[]> => {
    if (!query) return [];
    const token = Cookies.get('token');
    if (!token) return [];

    // ✅ FIXED: shipmentId and trackingNumber go through directFetch — never cascade
    // cascade slices to 3 chars which matches everything and fuzzy scoring then fails
    if (query.shipmentId) {
      return directFetch('/api/shipments', query.shipmentId, token, 'shipments',
        query.status ? { status: query.status } : undefined);
    }

    if (query.trackingNumber) {
      return directFetch('/api/shipments', query.trackingNumber, token, 'shipments',
        query.status ? { status: query.status } : undefined);
    }

    // Names, origins, destinations → cascade fetch with fuzzy matching
    if (query.customerName) {
      return cascadeFetch('/api/shipments', query.customerName, token, 'shipment',
        query.status ? { status: query.status } : undefined);
    }

    const params = new URLSearchParams({ limit: '5' });
    if (query.origin)      params.set('search', query.origin);
    if (query.destination) params.set('search', query.destination);
    if (query.status)      params.set('status', query.status);

    const res = await fetch(`/api/shipments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.shipments || data.data || [];
    const searchTerm = query.origin || query.destination || '';
    return filterResults(results, searchTerm, 'shipment').slice(0, 5);
  };

  const fetchCustomers = async (query: AICommandResponse['customerQuery']): Promise<CustomerResult[]> => {
    if (!query) return [];
    const token = Cookies.get('token');
    if (!token) return [];
    const searchTerm = query.name || query.email || query.phone || '';
    if (!searchTerm) return [];
    return cascadeFetch('/api/customers', searchTerm, token, 'customer');
  };

  const fetchSuppliers = async (query: AICommandResponse['supplierQuery']): Promise<SupplierResult[]> => {
    if (!query) return [];
    const token = Cookies.get('token');
    if (!token) return [];
    const searchTerm = query.name || query.email || query.contactPerson || '';
    if (!searchTerm) return [];
    return cascadeFetch('/api/suppliers', searchTerm, token, 'supplier');
  };

  const fetchInvoices = async (query: AICommandResponse['invoiceQuery']): Promise<InvoiceResult[]> => {
    if (!query) return [];
    const token = Cookies.get('token');
    if (!token) return [];

    // ✅ FIXED: invoiceNumber goes through directFetch — never cascade
    // INV-20241201-0001 sliced to "INV" matches everything; fuzzy then scores it low
    if (query.invoiceNumber) {
      const extraParams: Record<string, string> = {};
      if (query.status) extraParams.status = query.status;
      return directFetch('/api/invoices', query.invoiceNumber, token, 'invoices', extraParams);
    }

    // Customer name → cascade fetch with fuzzy matching
    if (query.customerName) {
      const extraParams: Record<string, string> = {};
      if (query.status)   extraParams.status   = query.status;
      if (query.dateFrom) extraParams.dateFrom = query.dateFrom;
      if (query.dateTo)   extraParams.dateTo   = query.dateTo;
      return cascadeFetch('/api/invoices', query.customerName, token, 'invoice', extraParams);
    }

    // Status / date only — direct fetch, no search term needed
    const params = new URLSearchParams({ limit: '10' });
    if (query.status)   params.set('status',   query.status);
    if (query.dateFrom) params.set('dateFrom', query.dateFrom);
    if (query.dateTo)   params.set('dateTo',   query.dateTo);

    const res = await fetch(`/api/invoices?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.invoices || data.data || []).slice(0, 10);
  };

  // ── Core Send ───────────────────────────────────────────────────────────────

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    setInput('');
    addUserMessage(text);
    setIsLoading(true);

    try {
      const res  = await fetch('/api/ai/command', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ message: text }),
      });
      const data: AICommandResponse = await res.json();

      if (data.action === 'fetch_shipment') {
        const shipments = await fetchShipments(data.shipmentQuery);
        if (shipments.length === 0) {
          addAssistantMessage("I couldn't find any shipments matching that. Try a different ID, tracking number, or customer name.", 'fetch_shipment');
        } else {
          addAssistantMessage(`Found ${shipments.length} shipment${shipments.length > 1 ? 's' : ''} 📦`, 'fetch_shipment', null, { shipments });
        }

      } else if (data.action === 'fetch_customer') {
        const customers = await fetchCustomers(data.customerQuery);
        if (customers.length === 0) {
          addAssistantMessage("I couldn't find any customers matching that. Try a different name.", 'fetch_customer');
        } else {
          addAssistantMessage(`Found ${customers.length} customer${customers.length > 1 ? 's' : ''} 👤`, 'fetch_customer', null, { customers });
        }

      } else if (data.action === 'fetch_supplier') {
        const suppliers = await fetchSuppliers(data.supplierQuery);
        if (suppliers.length === 0) {
          addAssistantMessage("I couldn't find any suppliers matching that. Try a different name.", 'fetch_supplier');
        } else {
          addAssistantMessage(`Found ${suppliers.length} supplier${suppliers.length > 1 ? 's' : ''} 🏭`, 'fetch_supplier', null, { suppliers });
        }

      } else if (data.action === 'fetch_invoice') {
        const invoices = await fetchInvoices(data.invoiceQuery);
        if (invoices.length === 0) {
          addAssistantMessage("I couldn't find any invoices matching that. Try an invoice number, customer name, or status like 'unpaid'.", 'fetch_invoice');
        } else {
          addAssistantMessage(`Found ${invoices.length} invoice${invoices.length > 1 ? 's' : ''} 🧾`, 'fetch_invoice', null, { invoices });
        }

      } else {
        addAssistantMessage(data.message, data.action, data.route);
        if (data.action === 'navigate' && data.route) {
          setNavigatingTo(data.route);
          setTimeout(() => { router.push(data.route!); setNavigatingTo(null); }, 800);
        }
      }
    } catch {
      addAssistantMessage("Couldn't connect to CargoAI. Please check your connection.", 'unknown');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const openShipment = (id: string) => router.push(`/shipments/${id}`);
  const openCustomer = (id: string) => router.push(`/customers/${id}`);
  const openSupplier = (id: string) => router.push(`/suppliers/${id}`);
  const openInvoice  = (id: string) => router.push(`/invoices/${id}`);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`
          fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center transition-all duration-300
          ${isOpen ? 'bg-gray-800 scale-95' : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'}
        `}
        aria-label="Toggle CargoAI"
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
        {!isOpen && <span className="absolute w-full h-full rounded-full bg-blue-400 opacity-30 animate-ping" />}
      </button>

      {/* Chat Panel */}
      <div className={`
        fixed bottom-24 right-6 z-50 w-[370px] max-h-[580px]
        bg-white rounded-2xl shadow-2xl border border-gray-100
        flex flex-col overflow-hidden
        transition-all duration-300 ease-in-out origin-bottom-right
        ${isOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}
      `}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">CargoAI Assistant</p>
            <p className="text-blue-100 text-xs">
              {isLoading ? 'Thinking...' : navigatingTo ? `Navigating to ${navigatingTo}...` : 'Navigate · Fetch · Answer'}
            </p>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? '' : 'w-full'}`}>
                <div className={`
                  px-3 py-2 rounded-2xl text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm'
                  }
                `}>
                  {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={i}>{part.slice(2, -2)}</strong>
                      : <span key={i}>{part}</span>
                  )}
                  {msg.action === 'navigate' && msg.route && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-blue-500">
                      <Navigation className="w-3 h-3" />
                      <span>{msg.route}</span>
                    </div>
                  )}
                  {msg.shipments && msg.shipments.length > 0 && (
                    <div className="space-y-2">
                      {msg.shipments.map(s => (
                        <ShipmentCard key={s._id} shipment={s} onOpen={openShipment} />
                      ))}
                    </div>
                  )}
                  {msg.customers && msg.customers.length > 0 && (
                    <div className="space-y-2">
                      {msg.customers.map(c => (
                        <CustomerCard key={c._id} customer={c} onOpen={openCustomer} />
                      ))}
                    </div>
                  )}
                  {msg.suppliers && msg.suppliers.length > 0 && (
                    <div className="space-y-2">
                      {msg.suppliers.map(s => (
                        <SupplierCard key={s._id} supplier={s} onOpen={openSupplier} />
                      ))}
                    </div>
                  )}
                  {msg.invoices && msg.invoices.length > 0 && (
                    <div className="space-y-2">
                      {msg.invoices.map(inv => (
                        <InvoiceCard key={inv.id} invoice={inv} onOpen={openInvoice} />
                      ))}
                    </div>
                  )}
                </div>
                <p className={`text-xs text-gray-400 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions */}
        {messages.length <= 2 && !isLoading && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Quick commands:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="px-3 py-3 bg-white border-t border-gray-100 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Shipments, invoices, customers..."
            disabled={isLoading}
            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
          />
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading}
            className={`
              w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0
              ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}
              disabled:opacity-40
            `}
            title={isListening ? 'Stop listening' : 'Voice input'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />
            }
          </button>
        </div>
      </div>
    </>
  );
}