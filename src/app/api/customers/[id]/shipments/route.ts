// C:\Users\youss\Downloads\cargo-track\src\app\api\customers\[id]\shipments\route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import Shipment from '@/models/Shipment';
import { rateLimit } from '@/lib/rateLimiter';
import mongoose from 'mongoose';

/**
 * GET /api/customers/[id]/shipments
 * Get all shipments for a specific customer/supplier
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(100, 15 * 60 * 1000)(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Extract token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify customer exists and belongs to user
    const customer = await Customer.findOne({
      _id: params.id,
      userId: decoded.userId,
      companyName: decoded.companyName,
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build query - find shipments where this customer is either customer or supplier
    const query: any = {
      userId: decoded.userId,
      companyName: decoded.companyName,
      $or: [
        { customerId: params.id },
        { supplierId: params.id },
      ],
    };

    // Filter by status
    if (status && ['pending', 'in-transit', 'customs', 'delivered', 'cancelled'].includes(status)) {
      query.status = status;
    }

    // Execute query with pagination
    const [shipments, total] = await Promise.all([
      Shipment.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Shipment.countDocuments(query),
    ]);

    // Calculate summary statistics
    const summary = await Shipment.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(decoded.userId),
          companyName: decoded.companyName,
          $or: [
            { customerId: new mongoose.Types.ObjectId(params.id) },
            { supplierId: new mongoose.Types.ObjectId(params.id) },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          totalValue: { $sum: '$costBreakdown.totalLandedCost' },
          averageValue: { $avg: '$costBreakdown.totalLandedCost' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          inTransitCount: {
            $sum: { $cond: [{ $eq: ['$status', 'in-transit'] }, 1, 0] },
          },
          customsCount: {
            $sum: { $cond: [{ $eq: ['$status', 'customs'] }, 1, 0] },
          },
          deliveredCount: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
    ]);

    const stats = summary[0] || {
      totalShipments: 0,
      totalValue: 0,
      averageValue: 0,
      pendingCount: 0,
      inTransitCount: 0,
      customsCount: 0,
      deliveredCount: 0,
      cancelledCount: 0,
    };

    // Get shipments by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const shipmentsByMonth = await Shipment.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(decoded.userId),
          companyName: decoded.companyName,
          $or: [
            { customerId: new mongoose.Types.ObjectId(params.id) },
            { supplierId: new mongoose.Types.ObjectId(params.id) },
          ],
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          totalValue: { $sum: '$costBreakdown.totalLandedCost' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          count: 1,
          totalValue: 1,
        },
      },
    ]);

    return NextResponse.json({
      customer: {
        id: customer._id,
        name: customer.name,
        type: customer.type,
        email: customer.email,
      },
      shipments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: stats,
      shipmentsByMonth,
    });
  } catch (error: any) {
    console.error('Error fetching customer shipments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer shipments', details: error.message },
      { status: 500 }
    );
  }
}