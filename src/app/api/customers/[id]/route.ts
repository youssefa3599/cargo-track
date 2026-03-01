//C:\Users\youss\Downloads\cargo-track\src\app\api\customers\[id]\route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import Shipment from '@/models/Shipment';
import { rateLimit } from '@/lib/rateLimiter';
import { z } from 'zod';
import mongoose from 'mongoose';
import User from '@/models/User';

// Validation schema for updates
const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  taxId: z.string().max(100).optional(),
  type: z.enum(['customer', 'supplier', 'both']).optional(),
  country: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * GET /api/customers/[id]
 * Get a single customer/supplier by ID
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

    // Find customer
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

    // Get shipment counts
    const shipmentCounts = await Shipment.aggregate([
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
          activeShipments: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'in-transit', 'customs']] },
                1,
                0,
              ],
            },
          },
          totalValue: { $sum: '$costBreakdown.totalLandedCost' },
        },
      },
    ]);

    const stats = shipmentCounts[0] || {
      totalShipments: 0,
      activeShipments: 0,
      totalValue: 0,
    };

    return NextResponse.json({
      customer: customer.toObject(),
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/customers/[id]
 * Update a customer/supplier
 */
export async function PUT(
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

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update customers' },
        { status: 403 }
      );
    }

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    await connectDB();

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateCustomerSchema.parse(body);

    // Check for duplicate email (if updating email)
    if (validatedData.email) {
      const existingCustomer = await Customer.findOne({
        _id: { $ne: params.id },
        userId: decoded.userId,
        companyName: decoded.companyName,
        email: validatedData.email,
      });

      if (existingCustomer) {
        return NextResponse.json(
          { error: 'A customer with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Update customer
    const customer = await Customer.findOneAndUpdate(
      {
        _id: params.id,
        userId: decoded.userId,
        companyName: decoded.companyName,
      },
      { $set: validatedData },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Customer updated successfully',
      customer,
    });
  } catch (error: any) {
    console.error('Error updating customer:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update customer', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id]
 * Delete a customer/supplier
 */
export async function DELETE(
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

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete customers' },
        { status: 403 }
      );
    }

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if customer has associated shipments
    const shipmentCount = await Shipment.countDocuments({
      userId: decoded.userId,
      companyName: decoded.companyName,
      $or: [
        { customerId: params.id },
        { supplierId: params.id },
      ],
    });

    if (shipmentCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete customer with associated shipments',
          details: `This customer has ${shipmentCount} shipment(s). Please remove or reassign them first.`,
        },
        { status: 400 }
      );
    }

    // Delete customer
    const customer = await Customer.findOneAndDelete({
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

    return NextResponse.json({
      message: 'Customer deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer', details: error.message },
      { status: 500 }
    );
  }
}