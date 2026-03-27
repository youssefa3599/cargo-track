// src/components/DocumentScanner.tsx
// Drop-in component for the shipment create page.
// User uploads a supplier invoice / bill of lading → Gemini extracts fields
// → onScanComplete is called with the pre-filled data for the parent form.

'use client';

import { useState, useRef } from 'react';
import * as LucideIcons from 'lucide-react';

const Upload     = LucideIcons.Upload     as any;
const FileText   = LucideIcons.FileText   as any;
const Loader2    = LucideIcons.Loader2    as any;
const CheckCircle= LucideIcons.CheckCircle as any;
const XCircle    = LucideIcons.XCircle    as any;
const ScanLine   = LucideIcons.ScanLine   as any;

export interface ScannedShipmentData {
  supplierName:     string | null;
  customerName:     string | null;
  origin:           string | null;
  destination:      string | null;
  trackingNumber:   string | null;
  carrier:          string | null;
  shippingDate:     string | null;
  estimatedArrival: string | null;
  weight:           number | null;
  currency:         string | null;
  notes:            string | null;
  shippingCost:     number | null;
  products: Array<{
    productName: string;
    hsCode:      string | null;
    quantity:    number;
    unitPrice:   number;
  }>;
}

interface DocumentScannerProps {
  token: string;
  onScanComplete: (data: ScannedShipmentData) => void;
}

export default function DocumentScanner({ token, onScanComplete }: DocumentScannerProps) {
  const [scanning,  setScanning]  = useState(false);
  const [fileName,  setFileName]  = useState('');
  const [status,    setStatus]    = useState<'idle' | 'success' | 'error'>('idle');
  const [message,   setMessage]   = useState('');
  const [preview,   setPreview]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setStatus('idle');
    setMessage('');

    // Show image preview for non-PDFs
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    setScanning(true);
    setMessage('Reading document...');

    try {
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/shipments/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Scan failed');
      }

      setStatus('success');
      setMessage(json.message);
      onScanComplete(json.data as ScannedShipmentData);

    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong');
    } finally {
      setScanning(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <ScanLine size={18} className="text-blue-500" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Scan supplier document
        </h3>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          optional
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Upload a supplier invoice, bill of lading, or packing list — CargoTrack will
        auto-fill the form fields for you.
      </p>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200
          ${scanning
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10 pointer-events-none'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleChange}
        />

        {/* Preview thumbnail */}
        {preview && !scanning && (
          <img
            src={preview}
            alt="Document preview"
            className="mx-auto mb-3 max-h-24 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
          />
        )}

        {/* Icon + text */}
        {scanning ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={28} className="text-blue-500 animate-spin" />
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              {message}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {fileName ? (
              <FileText size={28} className="text-gray-400" />
            ) : (
              <Upload size={28} className="text-gray-400" />
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {fileName
                ? <span className="font-medium text-gray-700 dark:text-gray-300">{fileName}</span>
                : <><span className="text-blue-500 font-medium">Click to upload</span> or drag and drop</>
              }
            </p>
            <p className="text-xs text-gray-400">
              JPEG, PNG, WebP or PDF · Max 10MB
            </p>
          </div>
        )}
      </div>

      {/* Status message */}
      {status === 'success' && (
        <div className="flex items-center gap-2 mt-3 text-sm text-green-600 dark:text-green-400">
          <CheckCircle size={16} />
          <span>{message} — review and adjust the fields below.</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 mt-3 text-sm text-red-500 dark:text-red-400">
          <XCircle size={16} />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}