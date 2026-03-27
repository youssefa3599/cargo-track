'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Shipment {
  _id: string;
  shipmentId: string;
  origin: string;
  destination: string;
  status: string;
  customerName?: string;
  companyName: string;
  shippingDate: string;
  costBreakdown?: object;
  hasInvoice: boolean;
}

interface InvoiceResult {
  shipmentId: string;
  shipmentRef: string;
  status: 'pending' | 'success' | 'skipped' | 'error';
  message?: string;
  invoiceNumber?: string;
  totalAmount?: number;
}

export default function BulkGeneratePage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<InvoiceResult[]>([]);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  const getToken = () => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch('/api/shipments?limit=200', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch shipments');
      const data = await res.json();
      const list: Shipment[] = data.shipments || data.data || [];
      setShipments(list);
      // Pre-select all that don't have invoices yet and have costBreakdown
      const eligible = new Set(
        list
          .filter((s) => !s.hasInvoice && s.costBreakdown)
          .map((s) => s._id)
      );
      setSelected(eligible);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = () => {
    const eligible = shipments.filter((s) => !s.hasInvoice && s.costBreakdown);
    if (selected.size === eligible.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligible.map((s) => s._id)));
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startGeneration = async () => {
    const toProcess = shipments.filter((s) => selected.has(s._id));
    if (!toProcess.length) return;

    setGenerating(true);
    setDone(false);
    setResults([]);
    setCurrentIdx(0);

    const token = getToken();
    const initialResults: InvoiceResult[] = toProcess.map((s) => ({
      shipmentId: s._id,
      shipmentRef: s.shipmentId,
      status: 'pending',
    }));
    setResults(initialResults);

    for (let i = 0; i < toProcess.length; i++) {
      const s = toProcess[i];
      setCurrentIdx(i);

      try {
        const res = await fetch(`/api/invoices/generate/${s._id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json();

        if (res.status === 409) {
          setResults((prev) =>
            prev.map((r) =>
              r.shipmentId === s._id
                ? { ...r, status: 'skipped', message: 'Invoice already exists', invoiceNumber: data.existingInvoice?.invoiceNumber }
                : r
            )
          );
        } else if (res.ok && data.success) {
          setResults((prev) =>
            prev.map((r) =>
              r.shipmentId === s._id
                ? {
                    ...r,
                    status: 'success',
                    invoiceNumber: data.invoice.invoiceNumber,
                    totalAmount: data.invoice.totalAmount,
                  }
                : r
            )
          );
        } else {
          setResults((prev) =>
            prev.map((r) =>
              r.shipmentId === s._id
                ? { ...r, status: 'error', message: data.error || data.message || 'Failed' }
                : r
            )
          );
        }
      } catch (e: any) {
        setResults((prev) =>
          prev.map((r) =>
            r.shipmentId === s._id ? { ...r, status: 'error', message: e.message } : r
          )
        );
      }

      // Small delay to avoid hammering the API
      if (i < toProcess.length - 1) await new Promise((r) => setTimeout(r, 200));
    }

    setGenerating(false);
    setDone(true);
  };

  const eligible = shipments.filter((s) => !s.hasInvoice && s.costBreakdown);
  const alreadyHave = shipments.filter((s) => s.hasInvoice);
  const noCostBreakdown = shipments.filter((s) => !s.hasInvoice && !s.costBreakdown);

  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const progress = results.length > 0 ? ((results.filter(r => r.status !== 'pending').length) / results.length) * 100 : 0;

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", background: '#0a0e17', minHeight: '100vh', color: '#e2e8f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0e17; }
        ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 3px; }
        .row-check:hover { background: #111827 !important; }
        .btn-primary { background: #3b82f6; border: none; color: white; padding: 10px 24px; border-radius: 4px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; letter-spacing: 0.05em; transition: all 0.15s; }
        .btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-ghost { background: transparent; border: 1px solid #2d3748; color: #94a3b8; padding: 8px 16px; border-radius: 4px; font-family: inherit; font-size: 12px; cursor: pointer; transition: all 0.15s; }
        .btn-ghost:hover { border-color: #4b5563; color: #e2e8f0; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:translateX(0) } }
        .slide-in { animation: slideIn 0.2s ease forwards; }
        .pulsing { animation: pulse 1.2s ease infinite; }
      `}</style>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #1e2d3d', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn-ghost" onClick={() => router.push('/invoices')}>← invoices</button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.1em' }}>CARGO TRACK</div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: '#3b82f6', letterSpacing: '0.15em', marginBottom: 8 }}>BATCH OPERATION</div>
          <h1 style={{ fontSize: 32, fontWeight: 600, margin: 0, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
            Bulk Invoice Generator
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            Generate invoices for all eligible shipments in one operation.
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: '#475569' }}>
            <div className="pulsing" style={{ fontSize: 13, letterSpacing: '0.1em' }}>LOADING SHIPMENTS...</div>
          </div>
        )}

        {error && (
          <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: 16, color: '#fca5a5', fontSize: 13, marginBottom: 24 }}>
            ⚠ {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 32 }}>
              {[
                { label: 'Total Shipments', value: shipments.length, color: '#94a3b8' },
                { label: 'Eligible', value: eligible.length, color: '#3b82f6' },
                { label: 'Already Invoiced', value: alreadyHave.length, color: '#10b981' },
                { label: 'No Cost Data', value: noCostBreakdown.length, color: '#f59e0b' },
              ].map((stat) => (
                <div key={stat.label} style={{ background: '#0f1724', border: '1px solid #1e2d3d', borderRadius: 6, padding: '16px 20px' }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.08em', marginTop: 4 }}>{stat.label.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* Pre-generation: shipment table */}
            {!done && !generating && (
              <>
                {eligible.length === 0 ? (
                  <div style={{ background: '#0f1724', border: '1px solid #1e2d3d', borderRadius: 6, padding: 48, textAlign: 'center', color: '#475569' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                    <div style={{ fontSize: 14 }}>All shipments already have invoices.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        <span style={{ color: '#3b82f6', fontWeight: 600 }}>{selected.size}</span> of {eligible.length} selected
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-ghost" onClick={toggleAll}>
                          {selected.size === eligible.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <button
                          className="btn-primary"
                          onClick={startGeneration}
                          disabled={selected.size === 0}
                        >
                          Generate {selected.size} Invoice{selected.size !== 1 ? 's' : ''}
                        </button>
                      </div>
                    </div>

                    <div style={{ border: '1px solid #1e2d3d', borderRadius: 6, overflow: 'hidden' }}>
                      {/* Table header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '40px 160px 1fr 120px 100px', gap: 0, background: '#080d14', borderBottom: '1px solid #1e2d3d', padding: '10px 16px', fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>
                        <div />
                        <div>SHIPMENT ID</div>
                        <div>ROUTE</div>
                        <div>STATUS</div>
                        <div>CUSTOMER</div>
                      </div>

                      {/* Eligible shipments */}
                      {eligible.map((s, i) => (
                        <div
                          key={s._id}
                          className="row-check"
                          onClick={() => toggle(s._id)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '40px 160px 1fr 120px 100px',
                            gap: 0,
                            padding: '12px 16px',
                            borderBottom: i < eligible.length - 1 ? '1px solid #111827' : 'none',
                            cursor: 'pointer',
                            background: selected.has(s._id) ? '#0f1a2e' : 'transparent',
                            transition: 'background 0.1s',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{
                              width: 16, height: 16, border: `1.5px solid ${selected.has(s._id) ? '#3b82f6' : '#2d3748'}`,
                              borderRadius: 3, background: selected.has(s._id) ? '#3b82f6' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white'
                            }}>
                              {selected.has(s._id) && '✓'}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: '#93c5fd', fontWeight: 500 }}>{s.shipmentId}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.origin} → {s.destination}</div>
                          <div>
                            <span style={{
                              fontSize: 10, padding: '2px 8px', borderRadius: 10,
                              background: s.status === 'delivered' ? '#064e3b' : s.status === 'in-transit' ? '#1e3a5f' : '#1a1a2e',
                              color: s.status === 'delivered' ? '#6ee7b7' : s.status === 'in-transit' ? '#93c5fd' : '#94a3b8',
                              border: `1px solid ${s.status === 'delivered' ? '#065f46' : s.status === 'in-transit' ? '#1e40af' : '#2d3748'}`,
                              letterSpacing: '0.05em',
                            }}>
                              {s.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{s.customerName || '—'}</div>
                        </div>
                      ))}
                    </div>

                    {noCostBreakdown.length > 0 && (
                      <div style={{ marginTop: 16, background: '#1a1200', border: '1px solid #78350f', borderRadius: 6, padding: '12px 16px', fontSize: 12, color: '#92400e' }}>
                        ⚠ {noCostBreakdown.length} shipment{noCostBreakdown.length > 1 ? 's' : ''} cannot be invoiced — missing cost breakdown data.
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* In-progress / done: results */}
            {(generating || done) && (
              <>
                {/* Progress bar */}
                {generating && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                      <span className="pulsing">Processing shipment {currentIdx + 1} of {results.length}...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ background: '#1e2d3d', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                      <div style={{ background: '#3b82f6', height: '100%', width: `${progress}%`, transition: 'width 0.3s ease', borderRadius: 4 }} />
                    </div>
                  </div>
                )}

                {done && (
                  <div style={{ background: '#051a0e', border: '1px solid #065f46', borderRadius: 6, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 20 }}>✓</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#6ee7b7', fontWeight: 600 }}>Batch complete</div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                        {successCount} generated · {skippedCount} skipped · {errorCount} failed
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-ghost" onClick={() => { setDone(false); setResults([]); setSelected(new Set()); fetchShipments(); }}>
                        Run Again
                      </button>
                      <button className="btn-primary" onClick={() => router.push('/invoices')}>
                        View Invoices →
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ border: '1px solid #1e2d3d', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ background: '#080d14', borderBottom: '1px solid #1e2d3d', padding: '10px 16px', display: 'grid', gridTemplateColumns: '160px 1fr 120px auto', fontSize: 10, color: '#475569', letterSpacing: '0.1em', gap: 0 }}>
                    <div>SHIPMENT</div>
                    <div>RESULT</div>
                    <div>INVOICE #</div>
                    <div>AMOUNT</div>
                  </div>
                  {results.map((r, i) => (
                    <div
                      key={r.shipmentId}
                      className="slide-in"
                      style={{
                        display: 'grid', gridTemplateColumns: '160px 1fr 120px auto',
                        gap: 0, padding: '12px 16px',
                        borderBottom: i < results.length - 1 ? '1px solid #111827' : 'none',
                        alignItems: 'center',
                        opacity: r.status === 'pending' ? 0.4 : 1,
                        transition: 'opacity 0.3s',
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#93c5fd' }}>{r.shipmentRef}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.status === 'pending' && <span className="pulsing" style={{ fontSize: 11, color: '#475569' }}>waiting...</span>}
                        {r.status === 'success' && <span style={{ fontSize: 11, color: '#6ee7b7' }}>✓ Generated</span>}
                        {r.status === 'skipped' && <span style={{ fontSize: 11, color: '#f59e0b' }}>⊘ {r.message}</span>}
                        {r.status === 'error' && <span style={{ fontSize: 11, color: '#f87171' }}>✕ {r.message}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{r.invoiceNumber || '—'}</div>
                      <div style={{ fontSize: 12, color: r.status === 'success' ? '#93c5fd' : '#475569', textAlign: 'right' }}>
                        {r.totalAmount != null ? `$${r.totalAmount.toFixed(2)}` : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}