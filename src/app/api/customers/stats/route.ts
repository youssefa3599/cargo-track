import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import Shipment from '@/models/Shipment';
import { rateLimit } from '@/lib/rateLimiter';
import { withCache } from '@/lib/cache';
import mongoose from 'mongoose';

/**
 * GET /api/customers/stats
 * Get overall customer/supplier statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(100, 15 * 60 * 1000)(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify authentication
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const cacheKey = `customer:stats:${decoded.userId}`;

    const fetchStats = async () => {
      // Get customer counts
      const [
        totalCustomers,
        totalSuppliers,
        bothTypes,
      ] = await Promise.all([
        Customer.countDocuments({
          userId: decoded.userId,
          companyName: decoded.companyName,
          type: { $in: ['customer', 'both'] },
        }),
        Customer.countDocuments({
          userId: decoded.userId,
          companyName: decoded.companyName,
          type: { $in: ['supplier', 'both'] },
        }),
        Customer.countDocuments({
          userId: decoded.userId,
          companyName: decoded.companyName,
          type: 'both',
        }),
      ]);

      // Get top customers by shipment value
      const topCustomers = await Shipment.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(decoded.userId),
            companyName: decoded.companyName,
            customerId: { $exists: true },
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: '$customerId',
            customerName: { $first: '$customerName' },
            totalShipments: { $sum: 1 },
            totalValue: { $sum: '$costBreakdown.totalLandedCost' },
            activeShipments: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['pending', 'in-transit', 'customs']] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { totalValue: -1 } },
        { $limit: 5 },
      ]);

      // Get top suppliers by shipment value
      const topSuppliers = await Shipment.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(decoded.userId),
            companyName: decoded.companyName,
            supplierId: { $exists: true },
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: '$supplierId',
            supplierName: { $first: '$supplierName' },
            totalShipments: { $sum: 1 },
            totalValue: { $sum: '$costBreakdown.totalLandedCost' },
            activeShipments: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['pending', 'in-transit', 'customs']] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { totalValue: -1 } },
        { $limit: 5 },
      ]);

      // Get customers added in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentCustomers = await Customer.countDocuments({
        userId: decoded.userId,
        companyName: decoded.companyName,
        createdAt: { $gte: thirtyDaysAgo },
      });

      return {
        counts: {
          totalCustomers,
          totalSuppliers,
          bothTypes,
          recentCustomers,
        },
        topCustomers: topCustomers.map((c) => ({
          id: c._id,
          name: c.customerName,
          totalShipments: c.totalShipments,
          totalValue: c.totalValue || 0,
          activeShipments: c.activeShipments,
        })),
        topSuppliers: topSuppliers.map((s) => ({
          id: s._id,
          name: s.supplierName,
          totalShipments: s.totalShipments,
          totalValue: s.totalValue || 0,
          activeShipments: s.activeShipments,
        })),
      };
    };

    const stats = await withCache(cacheKey, fetchStats, 300); // Cache for 5 minutes

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching customer stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer statistics', details: error.message },
      { status: 500 }
    );
  }
}