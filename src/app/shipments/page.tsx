// src/app/shipments/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Shipment, ShipmentStatus } from '@/types/shipment';
import * as LucideIcons from 'lucide-react';

// Import ALL components from animated library
import {
  AnimatedCard,
  AnimatedButton,
  AnimatedStatusBadge,
  AnimatedTable,
  PageHeader,
  AnimatedPage,
  Input,
  Select,
  TableSkeleton,
  EmptyState,
  EnhancedStatCard,
  Alert
} from '@/components/animated';

const Package = LucideIcons.Package as any;
const Plus = LucideIcons.Plus as any;
const Search = LucideIcons.Search as any;
const Filter = LucideIcons.Filter as any;
const Download = LucideIcons.Download as any;
const RefreshCw = LucideIcons.RefreshCw as any;
const Edit = LucideIcons.Edit as any;
const Clock = LucideIcons.Clock as any;
const CheckCircle = LucideIcons.CheckCircle as any;
const Truck = LucideIcons.Truck as any;
const DollarSign = LucideIcons.DollarSign as any;

export default function ShipmentsPage() {
  const { token, isAuthenticated } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log('🚢 ShipmentsPage mounted with smooth animations');
    return () => console.log('🚢 ShipmentsPage unmounted');
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchShipments();
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    filterShipments();
  }, [searchTerm, filterStatus, shipments]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError('');

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        setError('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/shipments', { headers });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.error || `Failed to fetch shipments: ${response.status}`);
        } catch {
          setError(`Failed to fetch shipments: ${response.status} ${response.statusText}`);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      let shipmentsList: Shipment[] = [];

      if (Array.isArray(data)) {
        shipmentsList = data;
      } else if (Array.isArray(data.shipments)) {
        shipmentsList = data.shipments;
      } else if (Array.isArray(data.data)) {
        shipmentsList = data.data;
      } else {
        setError('Unexpected response format from server');
        setLoading(false);
        return;
      }

      setShipments(shipmentsList);
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch shipments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterShipments = () => {
    let filtered = [...shipments];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === filterStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        (s.trackingNumber?.toLowerCase() || '').includes(term) ||
        s.origin.toLowerCase().includes(term) ||
        s.destination.toLowerCase().includes(term) ||
        (s.customerName?.toLowerCase() || '').includes(term)
      );
    }

    setFilteredShipments(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchShipments();
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const symbol = currency === 'USD' ? '$' : currency === 'EGP' ? 'E£' : currency;
    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusVariant = (status: ShipmentStatus): 'success' | 'warning' | 'error' | 'info' | 'purple' => {
    switch (status) {
      case ShipmentStatus.DELIVERED:
        return 'success';
      case ShipmentStatus.IN_TRANSIT:
        return 'info';
      case ShipmentStatus.CUSTOMS:
        return 'purple';
      case ShipmentStatus.PENDING:
        return 'warning';
      case ShipmentStatus.CANCELLED:
        return 'error';
      default:
        return 'info';
    }
  };

  const stats = [
    {
      icon: <Package className="w-6 h-6" />,
      label: 'Total Shipments',
      value: shipments.length,
      change: '+12%',
      color: 'blue' as const,
      imageUrl: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=400&h=300&fit=crop'
    },
    {
      icon: <Truck className="w-6 h-6" />,
      label: 'In Transit',
      value: shipments.filter(s => s.status === ShipmentStatus.IN_TRANSIT).length,
      change: '+8%',
      color: 'yellow' as const,
      imageUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=400&h=300&fit=crop'
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      label: 'Delivered',
      value: shipments.filter(s => s.status === ShipmentStatus.DELIVERED).length,
      change: '+15%',
      color: 'green' as const,
      imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: 'Pending',
      value: shipments.filter(s => s.status === ShipmentStatus.PENDING).length,
      change: '-3%',
      color: 'red' as const,
      imageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&h=300&fit=crop'
    },
  ];

  // Define table columns for AnimatedTable
  const tableColumns = [
    {
      key: 'trackingNumber',
      label: 'Tracking Number',
      render: (value: string) => (
        <div className="font-mono text-sm font-medium text-blue-600">
          {value || 'N/A'}
        </div>
      )
    },
    {
      key: 'route',
      label: 'Route',
      render: (_: any, row: Shipment) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{row.origin}</div>
          <div className="text-gray-500">→ {row.destination}</div>
        </div>
      )
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (value: string) => (
        <div className="text-sm text-gray-900">{value || '-'}</div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: ShipmentStatus) => (
        <AnimatedStatusBadge 
          status={value} 
          variant={getStatusVariant(value)}
        />
      )
    },
    {
      key: 'carrier',
      label: 'Carrier',
      render: (value: string) => (
        <div className="text-sm text-gray-700">{value || '-'}</div>
      )
    },
    {
      key: 'cost',
      label: 'Total Cost',
      render: (_: any, row: Shipment) => (
        row.costBreakdown ? (
          <div className="text-sm">
            <div className="font-semibold text-gray-900">
              {formatCurrency(row.costBreakdown.totalLandedCost, row.currency || 'USD')}
            </div>
            <div className="text-xs text-gray-500">
              {formatCurrency(row.costBreakdown.totalLandedCostEGP, 'EGP')}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No cost data</div>
        )
      )
    },
    {
      key: 'estimatedDelivery',
      label: 'Est. Delivery',
      render: (value: string) => (
        <div className="text-sm text-gray-700">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: Shipment) => (
        <AnimatedButton
          variant="ghost"
          size="sm"
          icon={<Edit className="w-4 h-4" />}
          onClick={(e) => {
            e?.stopPropagation();
            router.push(`/shipments/${row._id || row.trackingNumber}/edit`);
          }}
        >
          Edit
        </AnimatedButton>
      )
    }
  ];

  if (!isAuthenticated) return null;

  return (
    <AnimatedPage>
      {/* Shipping container background image */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1678182451047-196f22a4143e?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Shipping containers background"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-blue-900/80 to-gray-900/85" />
      </div>

      {/* Subtle animated accents */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      <div className="relative">
        {/* Header */}
        <PageHeader
          icon={<Package className="w-8 h-8" />}
          title="Shipment Management"
          description={`Track and manage all your cargo shipments (${shipments.length} total)`}
          actions={
            <AnimatedButton
              variant="primary"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => router.push('/shipments/create')}
            >
              Create Shipment
            </AnimatedButton>
          }
        />

        {/* STATS CARDS */}
        {!loading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <AnimatedCard key={stat.label} delay={index * 0.1} hover={true}>
                  <EnhancedStatCard {...stat} />
                </AnimatedCard>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <AnimatedCard>
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                icon={<Search className="w-5 h-5" />}
                placeholder="Search by tracking number, location, or customer..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Select
                icon={<Filter className="w-5 h-5" />}
                value={filterStatus}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}
                className="md:w-48"
              >
                <option value="all">All Status</option>
                <option value={ShipmentStatus.PENDING}>⏳ Pending</option>
                <option value={ShipmentStatus.IN_TRANSIT}>🚚 In Transit</option>
                <option value={ShipmentStatus.CUSTOMS}>🛃 Customs</option>
                <option value={ShipmentStatus.DELIVERED}>✅ Delivered</option>
                <option value={ShipmentStatus.CANCELLED}>❌ Cancelled</option>
              </Select>
              <AnimatedButton
                variant="secondary"
                icon={<RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />}
                onClick={handleRefresh}
                disabled={refreshing}
                loading={refreshing}
              >
                Refresh
              </AnimatedButton>
              <AnimatedButton
                variant="ghost"
                icon={<Download className="w-5 h-5" />}
              >
                Export
              </AnimatedButton>
            </div>

            {(searchTerm || filterStatus !== 'all') && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-sm text-gray-600">
                Active filters:
                {searchTerm && (
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                    Search: {searchTerm}
                  </span>
                )}
                {filterStatus !== 'all' && (
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                    Status: {filterStatus.replace('-', ' ')}
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium ml-2 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </AnimatedCard>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
            <Alert
              variant="error"
              title="Error loading shipments"
              message={error}
              onClose={() => setError('')}
            />
            <div className="mt-4 text-center">
              <AnimatedButton
                variant="primary"
                onClick={() => fetchShipments()}
              >
                Try Again
              </AnimatedButton>
            </div>
          </div>
        )}

        {/* Shipments List */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {loading ? (
            <TableSkeleton />
          ) : filteredShipments.length === 0 ? (
            <EmptyState
              icon={<Package className="w-16 h-16" />}
              title={shipments.length === 0 ? 'No shipments found' : 'No shipments match your filters'}
              description={
                shipments.length === 0
                  ? 'Create your first shipment to get started'
                  : 'Try adjusting your search or filters'
              }
              action={
                shipments.length === 0
                  ? {
                      label: 'Create First Shipment',
                      onClick: () => router.push('/shipments/create')
                    }
                  : undefined
              }
            />
          ) : (
            <AnimatedCard>
              <AnimatedTable
                columns={tableColumns}
                data={filteredShipments}
                onRowClick={(shipment) => router.push(`/shipments/${shipment._id || shipment.trackingNumber}`)}
              />
            </AnimatedCard>
          )}

          {!loading && filteredShipments.length > 0 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {filteredShipments.length} of {shipments.length} shipments
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}