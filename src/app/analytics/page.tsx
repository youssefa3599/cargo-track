'use client';

// ======================
// IMPORTS
// ======================
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area
} from 'recharts';
import * as LucideIcons from 'lucide-react';

// Custom Components
import {
  AnimatedCard,
  AnimatedButton,
  PageHeader,
  AnimatedPage,
  TableSkeleton,
  Alert
} from '@/components/animated';

// ======================
// ICON MAPPING
// ======================
const {
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  BarChart3,
  RefreshCw,
  Calendar,
  GitCompare
} = LucideIcons as any;

// ======================
// CONSTANTS
// ======================
const COLORS = ["#0088FE", "#FF8042", "#00C49F", "#FFBB28", "#FF6666", "#AA66CC"];
const CHART_COLORS = {
  year1: "#06B6D4", // Cyan
  year2: "#F59E0B", // Amber
  profit: "#10B981", // Green
  revenue: "#3B82F6", // Blue
  cost: "#EF4444" // Red
};

// ======================
// TYPE DEFINITIONS
// ======================
interface YearlyMetrics {
  year: number;
  totalShipments: number;
  delivered: number;
  revenue: number;
  profit: number;
  costs: number;
  avgShipmentValue: number;
  avgProfit: number;
  profitMargin: number;
  onTimeRate: number;
}

interface MonthlyData {
  month: string;
  shipments: number;
  revenue: number;
  profit: number;
  costs: number;
}

interface CategoryData {
  category: string;
  year1Value: number;
  year2Value: number;
}

interface StatusDistribution {
  status: string;
  year1: number;
  year2: number;
}

// ======================
// MAIN COMPONENT
// ======================
export default function AnalyticsEnhancedPage() {
  // ======================
  // HOOKS & STATE
  // ======================
  const authContext = useAuth();
  const { token, isAuthenticated } = authContext;
  const authLoading = 'loading' in authContext ? (authContext as any).loading : false;
  
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Comparison state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedYear1, setSelectedYear1] = useState<number>(new Date().getFullYear());
  const [selectedYear2, setSelectedYear2] = useState<number>(new Date().getFullYear() - 1);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  // Date basis for analytics: 'created', 'shipped', or 'delivered'
  const [dateBasis, setDateBasis] = useState<'created' | 'shipped' | 'delivered'>('shipped');

  // Metrics state
  const [yearlyMetrics, setYearlyMetrics] = useState<YearlyMetrics | null>(null);
  const [yearlyMetrics1, setYearlyMetrics1] = useState<YearlyMetrics | null>(null);
  const [yearlyMetrics2, setYearlyMetrics2] = useState<YearlyMetrics | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [monthlyData1, setMonthlyData1] = useState<MonthlyData[]>([]);
  const [monthlyData2, setMonthlyData2] = useState<MonthlyData[]>([]);

  // ======================
  // EFFECTS
  // ======================
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (authLoading) return;
    
    if (!isAuthenticated || !token) {
      router.push('/login');
    } else {
      fetchShipments();
    }
  }, [isAuthenticated, authLoading, router, token, mounted]);

  // ======================
  // DATE CALCULATION HELPER
  // ======================
  
  /**
   * Get the appropriate date for a shipment based on selected date basis
   */
  const getShipmentDate = (shipment: any): Date => {
    switch (dateBasis) {
      case 'delivered':
        // For delivered shipments: prefer actual delivery date, fall back to estimated
        if (shipment.status === 'delivered') {
          const actualDate = shipment.actualDelivery || shipment.actualArrival || shipment.deliveryDate;
          if (actualDate) return new Date(actualDate);
          // No actual date stamped — use estimated arrival as best approximation
          const estimatedDate = shipment.estimatedDelivery || shipment.estimatedArrival;
          if (estimatedDate) return new Date(estimatedDate);
        }
        // For non-delivered shipments: use estimated arrival to place them in expected year
        return new Date(
          shipment.estimatedDelivery ||
          shipment.estimatedArrival ||
          shipment.shippingDate ||
          shipment.createdAt ||
          Date.now()
        );

      case 'shipped':
        return new Date(shipment.shippingDate || shipment.createdAt || Date.now());

      case 'created':
      default:
        return new Date(shipment.createdAt || shipment.shippingDate || Date.now());
    }
  };

  // Calculate available years from shipments
  useEffect(() => {
    if (shipments.length > 0) {
      const years = new Set<number>();
      shipments.forEach(s => {
        // Check ALL possible dates to ensure we don't miss any years
        // Support multiple field name variations across the codebase
        const dates = [
          s.actualDelivery,
          s.actualArrival,      // Also check actualArrival (used in some parts)
          s.deliveryDate,
          s.estimatedDelivery,
          s.estimatedArrival,
          s.shippingDate,
          s.createdAt
        ].filter(Boolean); // Remove null/undefined values
        
        dates.forEach(dateStr => {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) { // Valid date
            years.add(date.getFullYear());
          }
        });
      });
      const yearArray = Array.from(years).sort((a, b) => b - a);
      setAvailableYears(yearArray);
      
      // Set default years if not already set
      if (yearArray.length > 0) {
        if (!selectedYear || !yearArray.includes(selectedYear)) {
          setSelectedYear(yearArray[0]);
          setSelectedYear1(yearArray[0]);
        }
        if (yearArray.length > 1 && (!selectedYear2 || !yearArray.includes(selectedYear2))) {
          setSelectedYear2(yearArray[1]);
        }
      }
    }
  }, [shipments]);

  // Calculate metrics when year selection changes
  useEffect(() => {
    if (shipments.length > 0) {
      if (comparisonMode) {
        const metrics1 = calculateYearlyMetrics(selectedYear1);
        const metrics2 = calculateYearlyMetrics(selectedYear2);
        const monthly1 = calculateMonthlyData(selectedYear1);
        const monthly2 = calculateMonthlyData(selectedYear2);
        
        setYearlyMetrics1(metrics1);
        setYearlyMetrics2(metrics2);
        setMonthlyData1(monthly1);
        setMonthlyData2(monthly2);
      } else {
        const metrics = calculateYearlyMetrics(selectedYear);
        const monthly = calculateMonthlyData(selectedYear);
        
        setYearlyMetrics(metrics);
        setMonthlyData(monthly);
      }
    }
  }, [shipments, selectedYear, selectedYear1, selectedYear2, comparisonMode, dateBasis]);

  // ======================
  // DATA FETCHING
  // ======================
  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError('');
      setRefreshing(true);

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/shipments', { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch shipments data (${response.status})`);
      }

      const data = await response.json();
      
      // Extract shipments array from response
      let shipmentsList: any[] = [];
      if (Array.isArray(data)) {
        shipmentsList = data;
      } else if (Array.isArray(data.shipments)) {
        shipmentsList = data.shipments;
      } else if (Array.isArray(data.data)) {
        shipmentsList = data.data;
      }

      setShipments(shipmentsList);
      
    } catch (err: any) {
      setError(err?.message || 'Unable to load analytics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ======================
  // CALCULATION FUNCTIONS
  // ======================
  
  const calculateYearlyMetrics = (year: number): YearlyMetrics => {
    const yearShipments = shipments.filter(s => {
      const date = getShipmentDate(s);
      return date.getFullYear() === year;
    });

    const totalShipments = yearShipments.length;
    const delivered = yearShipments.filter(s => s.status === 'delivered').length;

    // In delivery date mode, revenue/profit only counts actually delivered shipments
    // In shipped/created mode, count all shipments in the year
    const revenueShipments = dateBasis === 'delivered'
      ? yearShipments.filter(s => s.status === 'delivered')
      : yearShipments;

    const revenue = revenueShipments.reduce((sum, s) =>
      sum + (s.customerPayment || s.totalCost || s.costBreakdown?.totalLandedCost || 0), 0);

    const profit = revenueShipments.reduce((sum, s) => sum + (s.profit || 0), 0);

    const costs = revenueShipments.reduce((sum, s) =>
      sum + (s.totalCost || s.costBreakdown?.totalLandedCost || 0), 0);

    const avgShipmentValue = totalShipments > 0 ? revenue / totalShipments : 0;
    const avgProfit = totalShipments > 0 ? profit / totalShipments : 0;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Calculate on-time rate
    const deliveredShipments = yearShipments.filter(s => s.status === 'delivered');
    const onTimeDeliveries = deliveredShipments.filter(s => {
      const estimatedDate = s.estimatedDelivery || s.estimatedArrival;
      const actualDate = s.actualDelivery || s.deliveryDate;
      if (!estimatedDate || !actualDate) return true;
      return new Date(actualDate) <= new Date(estimatedDate);
    }).length;
    const onTimeRate = deliveredShipments.length > 0 ? (onTimeDeliveries / deliveredShipments.length) * 100 : 0;

    return {
      year,
      totalShipments,
      delivered,
      revenue,
      profit,
      costs,
      avgShipmentValue,
      avgProfit,
      profitMargin,
      onTimeRate
    };
  };

  const calculateMonthlyData = (year: number): MonthlyData[] => {
    const monthlyMap = new Map<number, MonthlyData>();

    // Initialize all 12 months
    for (let i = 0; i < 12; i++) {
      const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
      monthlyMap.set(i, {
        month: monthKey,
        shipments: 0,
        revenue: 0,
        profit: 0,
        costs: 0
      });
    }

    // Aggregate data
    shipments.forEach(s => {
      const date = getShipmentDate(s);
      if (date.getFullYear() !== year) return;

      const month = date.getMonth();
      const data = monthlyMap.get(month)!;
      
      data.shipments++;
      // Only count revenue/profit from delivered shipments in delivery date mode
      if (dateBasis !== 'delivered' || s.status === 'delivered') {
        data.revenue += s.customerPayment || s.totalCost || s.costBreakdown?.totalLandedCost || 0;
        data.profit += s.profit || 0;
        data.costs += s.totalCost || s.costBreakdown?.totalLandedCost || 0;
      }
    });

    return Array.from(monthlyMap.values());
  };

  const getStatusDistribution = (): StatusDistribution[] => {
    const statuses = ['pending', 'in-transit', 'customs', 'delivered', 'cancelled'];
    
    return statuses.map(status => {
      const year1Count = shipments.filter(s => {
        const date = getShipmentDate(s);
        const normalizedStatus = s.status === 'in_transit' ? 'in-transit' : s.status;
        return date.getFullYear() === selectedYear1 && normalizedStatus === status;
      }).length;

      const year2Count = shipments.filter(s => {
        const date = getShipmentDate(s);
        const normalizedStatus = s.status === 'in_transit' ? 'in-transit' : s.status;
        return date.getFullYear() === selectedYear2 && normalizedStatus === status;
      }).length;

      return {
        status: status.replace('-', ' ').replace('_', ' '),
        year1: year1Count,
        year2: year2Count
      };
    });
  };

  // ======================
  // HANDLERS
  // ======================
  const handleRefresh = () => {
    if (!refreshing) {
      fetchShipments();
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'E£0.00';
    }
    return `E£${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // ======================
  // RENDER HELPERS
  // ======================
  const renderComparisonMetric = (
    title: string,
    value1: number,
    value2: number,
    formatter: (val: number) => string,
    icon: any,
    iconColor: string,
    bgColor: string
  ) => {
    const change = calculatePercentageChange(value1, value2);
    const isPositive = change > 0;
    const isNegative = change < 0;

    return (
      <AnimatedCard hover>
        <div className="p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 ${bgColor} rounded-lg`}>
              {icon}
            </div>
            {change !== 0 && (
              <div className={`flex items-center text-sm font-bold ${
                isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
              }`}>
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : isNegative ? (
                  <TrendingDown className="w-4 h-4 mr-1" />
                ) : null}
                {Math.abs(change).toFixed(1)}%
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-sm text-gray-600">{selectedYear1}</div>
              <div className={`text-2xl font-bold ${iconColor}`}>
                {formatter(value1)}
              </div>
            </div>
            <div className="border-t pt-2">
              <div className="text-sm text-gray-600">{selectedYear2}</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatter(value2)}
              </div>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-600 mt-3">{title}</div>
        </div>
      </AnimatedCard>
    );
  };

  // ======================
  // RENDER LOGIC
  // ======================
  if (!mounted || authLoading) {
    return (
      <AnimatedPage>
        <div className="fixed inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop"
            alt="Logistics analytics background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-blue-900/85 to-gray-900/90" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TableSkeleton rows={12} />
        </div>
      </AnimatedPage>
    );
  }

  if (!isAuthenticated || !token) {
    return null;
  }

  return (
    <AnimatedPage>
      {/* Background Overlay */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop"
          alt="Logistics analytics background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-blue-900/85 to-gray-900/90" />
      </div>

      <div className="relative">
        {/* Page Header */}
        <PageHeader
          icon={<BarChart3 className="w-8 h-8 text-cyan-400" />}
          title="Analytics Dashboard"
          description={comparisonMode
            ? `Year-over-Year Comparison: ${selectedYear1} vs ${selectedYear2}`
            : `Shipments by shipping date for ${selectedYear}`
          }
          actions={
            <div className="flex gap-3">
              <AnimatedButton
                variant={comparisonMode ? "primary" : "secondary"}
                icon={<GitCompare className="w-5 h-5" />}
                onClick={() => setComparisonMode(!comparisonMode)}
              >
                {comparisonMode ? "Disable Comparison" : "Compare Years"}
              </AnimatedButton>
              <AnimatedButton
                variant="secondary"
                icon={<RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />}
                onClick={handleRefresh}
                disabled={refreshing}
              >
                Refresh
              </AnimatedButton>
            </div>
          }
        />

        {/* Error Alert */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
            <Alert
              variant="error"
              title="Analytics Loading Error"
              message={error}
              onClose={() => setError('')}
            />
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <TableSkeleton rows={12} />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
            
            {/* Year Selector */}
            <AnimatedCard>
              <div className="p-6 bg-white">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <Calendar className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 flex-1">
                    {/* Date Basis Selector */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Analyze by:</label>
                      <select
                        value={dateBasis}
                        onChange={(e) => setDateBasis(e.target.value as 'created' | 'shipped' | 'delivered')}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-cyan-50 font-medium"
                      >
                        <option value="delivered">Delivery Date</option>
                        <option value="shipped">Shipping Date</option>
                        <option value="created">Creation Date</option>
                      </select>
                    </div>
                    
                    {!comparisonMode ? (
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700">Year:</label>
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                          {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium text-gray-700">Year 1:</label>
                          <select
                            value={selectedYear1}
                            onChange={(e) => setSelectedYear1(Number(e.target.value))}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          >
                            {availableYears.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium text-gray-700">Year 2:</label>
                          <select
                            value={selectedYear2}
                            onChange={(e) => setSelectedYear2(Number(e.target.value))}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          >
                            {availableYears.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Helper Text */}
                  <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded border border-gray-200 whitespace-nowrap">
                    {dateBasis === 'delivered' && '💰 Revenue recognized when delivered'}
                    {dateBasis === 'shipped' && '🚢 Revenue recognized on shipping date'}
                    {dateBasis === 'created' && '📝 Based on creation date'}
                  </div>
                </div>
              </div>
            </AnimatedCard>

            {/* SINGLE YEAR VIEW */}
            {!comparisonMode && yearlyMetrics && (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <AnimatedCard hover delay={0}>
                    <div className="p-6 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Package className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-gray-900">
                        {yearlyMetrics.totalShipments.toLocaleString()}
                      </div>
                      <div className="text-sm font-medium text-gray-600 mt-2">Total Shipments</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {yearlyMetrics.delivered} delivered
                      </div>
                    </div>
                  </AnimatedCard>

                  <AnimatedCard hover delay={0.1}>
                    <div className="p-6 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-green-600">
                        {formatCurrency(yearlyMetrics.revenue)}
                      </div>
                      <div className="text-sm font-medium text-gray-600 mt-2">Total Revenue (EGP)</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Avg: {formatCurrency(yearlyMetrics.avgShipmentValue)}
                      </div>
                    </div>
                  </AnimatedCard>

                  <AnimatedCard hover delay={0.2}>
                    <div className="p-6 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className={`text-sm font-bold ${
                          yearlyMetrics.profitMargin >= 20 ? 'text-green-600' :
                          yearlyMetrics.profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatPercent(yearlyMetrics.profitMargin)} margin
                        </div>
                      </div>
                      <div className={`text-4xl font-bold ${
                        yearlyMetrics.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(yearlyMetrics.profit)}
                      </div>
                      <div className="text-sm font-medium text-gray-600 mt-2">Net Profit (EGP)</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Avg: {formatCurrency(yearlyMetrics.avgProfit)}
                      </div>
                    </div>
                  </AnimatedCard>

                  <AnimatedCard hover delay={0.3}>
                    <div className="p-6 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-cyan-100 rounded-lg">
                          <CheckCircle className="w-6 h-6 text-cyan-600" />
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-cyan-600">
                        {formatPercent(yearlyMetrics.onTimeRate)}
                      </div>
                      <div className="text-sm font-medium text-gray-600 mt-2">On-Time Rate</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {yearlyMetrics.delivered} deliveries
                      </div>
                    </div>
                  </AnimatedCard>
                </div>

                {/* Monthly Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue & Profit Trend */}
                  <AnimatedCard delay={0.4}>
                    <div className="p-6 bg-white">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue & Profit</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 12 }} />
                          <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value: any) => formatCurrency(value)}
                            contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                          />
                          <Legend />
                          <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                          <Area type="monotone" dataKey="profit" stroke="#10B981" fillOpacity={1} fill="url(#colorProfit)" name="Profit" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </AnimatedCard>

                  {/* Shipments Trend */}
                  <AnimatedCard delay={0.5}>
                    <div className="p-6 bg-white">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Shipments</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 12 }} />
                          <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                          />
                          <Legend />
                          <Bar dataKey="shipments" fill="#06B6D4" radius={[6, 6, 0, 0]} name="Shipments" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </AnimatedCard>
                </div>
              </>
            )}

            {/* COMPARISON MODE VIEW */}
            {comparisonMode && yearlyMetrics1 && yearlyMetrics2 && (
              <>
                {/* Comparison Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {renderComparisonMetric(
                    "Total Shipments",
                    yearlyMetrics1.totalShipments,
                    yearlyMetrics2.totalShipments,
                    (val) => val.toLocaleString(),
                    <Package className="w-6 h-6 text-blue-600" />,
                    "text-blue-600",
                    "bg-blue-100"
                  )}
                  
                  {renderComparisonMetric(
                    "Total Revenue",
                    yearlyMetrics1.revenue,
                    yearlyMetrics2.revenue,
                    formatCurrency,
                    <DollarSign className="w-6 h-6 text-green-600" />,
                    "text-green-600",
                    "bg-green-100"
                  )}
                  
                  {renderComparisonMetric(
                    "Net Profit",
                    yearlyMetrics1.profit,
                    yearlyMetrics2.profit,
                    formatCurrency,
                    <TrendingUp className="w-6 h-6 text-purple-600" />,
                    "text-purple-600",
                    "bg-purple-100"
                  )}
                  
                  {renderComparisonMetric(
                    "On-Time Rate",
                    yearlyMetrics1.onTimeRate,
                    yearlyMetrics2.onTimeRate,
                    formatPercent,
                    <CheckCircle className="w-6 h-6 text-cyan-600" />,
                    "text-cyan-600",
                    "bg-cyan-100"
                  )}
                </div>

                {/* Side-by-Side Monthly Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Year 1 */}
                  <AnimatedCard delay={0.4}>
                    <div className="p-6 bg-white">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {selectedYear1} Monthly Performance
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyData1} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 12 }} />
                          <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value: any, name: string) => {
                              if (name === 'shipments') return [value, 'Shipments'];
                              return [formatCurrency(value), name];
                            }}
                            contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.revenue} strokeWidth={2} name="Revenue" />
                          <Line type="monotone" dataKey="profit" stroke={CHART_COLORS.profit} strokeWidth={2} name="Profit" />
                          <Line type="monotone" dataKey="shipments" stroke={CHART_COLORS.year1} strokeWidth={2} name="Shipments" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </AnimatedCard>

                  {/* Year 2 */}
                  <AnimatedCard delay={0.5}>
                    <div className="p-6 bg-white">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {selectedYear2} Monthly Performance
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyData2} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 12 }} />
                          <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value: any, name: string) => {
                              if (name === 'shipments') return [value, 'Shipments'];
                              return [formatCurrency(value), name];
                            }}
                            contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.revenue} strokeWidth={2} name="Revenue" />
                          <Line type="monotone" dataKey="profit" stroke={CHART_COLORS.profit} strokeWidth={2} name="Profit" />
                          <Line type="monotone" dataKey="shipments" stroke={CHART_COLORS.year2} strokeWidth={2} name="Shipments" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </AnimatedCard>
                </div>

                {/* Combined Comparison Chart */}
                <AnimatedCard delay={0.6}>
                  <div className="p-6 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Revenue Comparison: {selectedYear1} vs {selectedYear2}
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart 
                        data={monthlyData1.map((m1, idx) => ({
                          month: new Date(m1.month).toLocaleDateString('en-US', { month: 'short' }),
                          [`${selectedYear1}`]: m1.revenue,
                          [`${selectedYear2}`]: monthlyData2[idx]?.revenue || 0
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value: any) => formatCurrency(value)}
                          contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                        />
                        <Legend />
                        <Bar dataKey={`${selectedYear1}`} fill={CHART_COLORS.year1} radius={[6, 6, 0, 0]} />
                        <Bar dataKey={`${selectedYear2}`} fill={CHART_COLORS.year2} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </AnimatedCard>

                {/* Status Distribution Comparison */}
                <AnimatedCard delay={0.7}>
                  <div className="p-6 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Status Distribution Comparison
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={getStatusDistribution()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="status" stroke="#6B7280" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                        />
                        <Legend />
                        <Bar dataKey="year1" fill={CHART_COLORS.year1} name={`${selectedYear1}`} radius={[6, 6, 0, 0]} />
                        <Bar dataKey="year2" fill={CHART_COLORS.year2} name={`${selectedYear2}`} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </AnimatedCard>

                {/* Radar Comparison */}
                <AnimatedCard delay={0.8}>
                  <div className="p-6 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Performance Radar Comparison
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <RadarChart data={[
                        { 
                          metric: 'Shipments',
                          [selectedYear1]: (yearlyMetrics1.totalShipments / Math.max(yearlyMetrics1.totalShipments, yearlyMetrics2.totalShipments)) * 100,
                          [selectedYear2]: (yearlyMetrics2.totalShipments / Math.max(yearlyMetrics1.totalShipments, yearlyMetrics2.totalShipments)) * 100
                        },
                        { 
                          metric: 'Revenue',
                          [selectedYear1]: (yearlyMetrics1.revenue / Math.max(yearlyMetrics1.revenue, yearlyMetrics2.revenue)) * 100,
                          [selectedYear2]: (yearlyMetrics2.revenue / Math.max(yearlyMetrics1.revenue, yearlyMetrics2.revenue)) * 100
                        },
                        { 
                          metric: 'Profit',
                          [selectedYear1]: (yearlyMetrics1.profit / Math.max(yearlyMetrics1.profit, yearlyMetrics2.profit)) * 100,
                          [selectedYear2]: (yearlyMetrics2.profit / Math.max(yearlyMetrics1.profit, yearlyMetrics2.profit)) * 100
                        },
                        { 
                          metric: 'On-Time',
                          [selectedYear1]: yearlyMetrics1.onTimeRate,
                          [selectedYear2]: yearlyMetrics2.onTimeRate
                        },
                        { 
                          metric: 'Avg Value',
                          [selectedYear1]: (yearlyMetrics1.avgShipmentValue / Math.max(yearlyMetrics1.avgShipmentValue, yearlyMetrics2.avgShipmentValue)) * 100,
                          [selectedYear2]: (yearlyMetrics2.avgShipmentValue / Math.max(yearlyMetrics1.avgShipmentValue, yearlyMetrics2.avgShipmentValue)) * 100
                        }
                      ]}
                      margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Radar name={`${selectedYear1}`} dataKey={selectedYear1} stroke={CHART_COLORS.year1} fill={CHART_COLORS.year1} fillOpacity={0.6} />
                        <Radar name={`${selectedYear2}`} dataKey={selectedYear2} stroke={CHART_COLORS.year2} fill={CHART_COLORS.year2} fillOpacity={0.6} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </AnimatedCard>
              </>
            )}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}