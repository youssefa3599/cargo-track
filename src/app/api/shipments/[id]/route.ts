//src/app/api/shipments/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Shipment from '@/models/Shipment';
import Product from '@/models/Product';
import mongoose from 'mongoose';
import { calculateShipmentCosts } from '@/lib/calculations';
import type { ICostBreakdown } from '@/models/Shipment';

/**
 * GET /api/shipments/:id
 * Get a single shipment by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {

  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    
    if (!token) {
      console.error('❌ No token provided');
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    
    if (!user) {
      console.error('❌ Token verification failed');
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      console.error('❌ Invalid shipment ID format:', params.id);
      return NextResponse.json(
        { error: 'Invalid shipment ID format' },
        { status: 400 }
      );
    }

    await dbConnect();

    
    const shipment = await Shipment.findOne({
      _id: params.id,
      companyName: user.companyName
    })
      .populate('products.productId', 'name hsCode unitPrice')
      .populate('createdBy', 'email role')
      .populate('statusHistory.changedBy', 'email role')
      .lean();

    if (!shipment) {
      console.error('❌ Shipment not found');
      console.error('   Searched for ID:', params.id);
      console.error('   In company:', user.companyName);
      return NextResponse.json(
        { error: 'Shipment not found' },
        { status: 404 }
      );
    }


    return NextResponse.json({
      success: true,
      data: shipment
    });

  } catch (error: any) {
    console.error('💥💥💥 GET SHIPMENT ERROR 💥💥💥');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖📖\n');
    
    return NextResponse.json(
      { error: 'Failed to fetch shipment' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/shipments/:id
 * Update shipment status and other fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {

  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid shipment ID format' }, { status: 400 });
    }

    const body = await request.json();
    const { status, currentLocation, estimatedDelivery, notes } = body;
    
    const validStatuses = ['pending', 'in-transit', 'customs', 'delivered', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    await dbConnect();

    const shipment = await Shipment.findOne({
      _id: params.id,
      companyName: user.companyName
    });
    
    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    let updatesMade = false;
    const updatesLog: string[] = [];

    if (status) {
      shipment.status = status;
      updatesMade = true;
      updatesLog.push(`status: ${status}`);
      
      shipment.statusHistory.push({
        status: status,
        changedBy: new mongoose.Types.ObjectId(user.userId),
        changedAt: new Date(),
        notes: notes || `Status updated to ${status}`,
        location: currentLocation || shipment.currentLocation
      });
      updatesLog.push('Added status history entry');
    }

    if (currentLocation !== undefined) {
      shipment.currentLocation = currentLocation;
      updatesMade = true;
      updatesLog.push(`location: ${currentLocation}`);
    }

    if (estimatedDelivery) {
      shipment.estimatedDelivery = new Date(estimatedDelivery);
      updatesMade = true;
      updatesLog.push(`estimatedDelivery: ${estimatedDelivery}`);
    }

    if (status === 'delivered' && !shipment.actualDelivery) {
      shipment.actualDelivery = new Date();
      updatesLog.push('Set actual delivery date');
    }

    if (!updatesMade) {
      return NextResponse.json({
        success: true,
        message: 'No changes to save',
        data: shipment
      });
    }

    await shipment.save();

    const updatedShipment = await Shipment.findById(params.id)
      .populate('products.productId', 'name hsCode unitPrice')
      .populate('createdBy', 'email role')
      .populate('statusHistory.changedBy', 'email role')
      .lean();


    return NextResponse.json({
      success: true,
      message: 'Shipment updated successfully',
      data: updatedShipment,
      shipment: updatedShipment,
      changesApplied: updatesLog
    });

  } catch (error: any) {
    console.error('💥 PATCH ERROR:', error.message);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: 'Validation failed', details: error.message }, { status: 400 });
    }
    if (error.name === 'CastError') {
      return NextResponse.json({ error: 'Invalid shipment ID format' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update shipment', details: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/shipments/:id
 * Update a shipment (full update with financial fields)
 * 🔧 FIXED: Now saves all financial fields from frontend
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid shipment ID format' }, { status: 400 });
    }

    const body = await request.json();
    
    await dbConnect();

    const existingShipment = await Shipment.findOne({
      _id: params.id,
      companyName: user.companyName
    });

    if (!existingShipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }


    // Validate products if provided
    if (body.products && body.products.length > 0) {
      const productIds = body.products.map((p: any) => p.productId);
      const validProducts = await Product.find({
        _id: { $in: productIds },
        companyName: user.companyName
      }).lean();

      if (validProducts.length !== productIds.length) {
        return NextResponse.json({ error: 'One or more products not found' }, { status: 400 });
      }


      // Prepare for cost calculation
      const productsForCalculation = body.products.map((p: any) => {
        // 🔧 FIX: Use .find() and type guard instead of type assertion
        const productDetails = validProducts.find(
          (vp: any) => vp._id.toString() === p.productId
        );
        
        if (!productDetails) {
          throw new Error(`Product ${p.productId} not found`);
        }
        
        return {
          productId: p.productId,
          productName: productDetails.name,
          hsCode: productDetails.hsCode,
          quantity: p.quantity,
          unitPrice: productDetails.unitPrice,
          dutyPercentage: productDetails.dutyPercentage || 0
        };
      });

      // Recalculate costs ONLY if products changed
      const costBreakdown: ICostBreakdown = calculateShipmentCosts(
        productsForCalculation,
        body.shippingCost || existingShipment.shippingCost || 0,
        body.exchangeRate || existingShipment.exchangeRate || 50,
        body.insurancePercentage || existingShipment.insurancePercentage || 2,
        body.vatPercentage || existingShipment.vatPercentage || 14
      );


      // Update shipment products and costBreakdown
      existingShipment.products = body.products.map((p: any) => ({
        productId: new mongoose.Types.ObjectId(p.productId),
        quantity: p.quantity
      }));
      existingShipment.costBreakdown = costBreakdown;
    }

    // Update basic fields
    if (body.origin) existingShipment.origin = body.origin;
    if (body.destination) existingShipment.destination = body.destination;
    if (body.shippingDate) existingShipment.shippingDate = new Date(body.shippingDate);
    if (body.estimatedArrival) existingShipment.estimatedArrival = new Date(body.estimatedArrival);
    if (body.carrier) existingShipment.carrier = body.carrier;
    if (body.trackingNumber) existingShipment.trackingNumber = body.trackingNumber;
    if (body.customerId) existingShipment.customerId = new mongoose.Types.ObjectId(body.customerId);
    if (body.customerName) existingShipment.customerName = body.customerName;
    if (body.supplierId) existingShipment.supplierId = new mongoose.Types.ObjectId(body.supplierId);
    if (body.supplierName) existingShipment.supplierName = body.supplierName;
    if (body.weight) existingShipment.weight = body.weight;
    if (body.estimatedDelivery) existingShipment.estimatedDelivery = new Date(body.estimatedDelivery);
    if (body.notes) existingShipment.notes = body.notes;
    if (body.dimensions) existingShipment.dimensions = body.dimensions;
    if (body.currentLocation !== undefined) existingShipment.currentLocation = body.currentLocation;

    // 💰 FIXED: Update financial fields
    
    if (body.shippingCost !== undefined) existingShipment.shippingCost = body.shippingCost;
    if (body.exchangeRate !== undefined) existingShipment.exchangeRate = body.exchangeRate;
    if (body.currency) existingShipment.currency = body.currency;
    if (body.insurancePercentage !== undefined) existingShipment.insurancePercentage = body.insurancePercentage;
    if (body.vatPercentage !== undefined) existingShipment.vatPercentage = body.vatPercentage;
    
    // 🆕 Save auto-calculated financial data from frontend
    if (body.customerPayment !== undefined) {
      existingShipment.customerPayment = body.customerPayment;
    }
    
    if (body.profit !== undefined) {
      existingShipment.profit = body.profit;
      existingShipment.companyProfit = body.profit; // Keep both for compatibility
    }
    
    if (body.serviceMarkup !== undefined) {
      existingShipment.serviceMarkup = body.serviceMarkup;
    }
    
    if (body.totalCost !== undefined) {
      existingShipment.totalCost = body.totalCost;
    }
    
    if (body.customsDuty !== undefined) {
      existingShipment.customsDuty = body.customsDuty;
    }
    
    if (body.insurance !== undefined) {
      existingShipment.insurance = body.insurance;
    }
    
    if (body.vat !== undefined) {
      existingShipment.vat = body.vat;
    }

    // Calculate profit margin if we have both values
    if (existingShipment.customerPayment && existingShipment.customerPayment > 0 && existingShipment.profit !== undefined) {
      existingShipment.profitMargin = (existingShipment.profit / existingShipment.customerPayment) * 100;
    }

    // Handle status change
    if (body.status && body.status !== existingShipment.status) {
      existingShipment.status = body.status;
      existingShipment.statusHistory.push({
        status: body.status,
        changedBy: new mongoose.Types.ObjectId(user.userId),
        changedAt: new Date(),
        notes: body.statusNotes || `Status changed to ${body.status}`,
        location: existingShipment.currentLocation
      });
    }

    await existingShipment.save();

    const shipment = await Shipment.findById(params.id)
      .populate('products.productId', 'name hsCode unitPrice')
      .populate('createdBy', 'email role')
      .populate('statusHistory.changedBy', 'email role')
      .lean();


    return NextResponse.json({
      success: true,
      message: 'Shipment updated successfully',
      data: shipment
    });

  } catch (error: any) {
    console.error('💥 PUT Error:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: 'Validation failed', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update shipment', details: error.message }, { status: 500 });
  }
}
/**
 * DELETE /api/shipments/:id
 * Delete a shipment by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    
    if (!token) {
      console.error('❌ No token provided');
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    
    if (!user) {
      console.error('❌ Token verification failed');
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      console.error('❌ Invalid shipment ID format:', params.id);
      return NextResponse.json(
        { error: 'Invalid shipment ID format' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find and delete the shipment (only if it belongs to user's company)
    const shipment = await Shipment.findOneAndDelete({
      _id: params.id,
      companyName: user.companyName
    });

    if (!shipment) {
      console.error('❌ Shipment not found or unauthorized');
      console.error('   Searched for ID:', params.id);
      console.error('   In company:', user.companyName);
      return NextResponse.json(
        { error: 'Shipment not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    console.log('✅ Shipment deleted successfully:', params.id);

    return NextResponse.json({
      success: true,
      message: 'Shipment deleted successfully',
      data: { id: params.id }
    });

  } catch (error: any) {
    console.error('💥💥💥 DELETE SHIPMENT ERROR 💥💥💥');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { error: 'Failed to delete shipment' },
      { status: 500 }
    );
  }
}