// src/app/api/suppliers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Supplier from '@/models/Supplier';
import Product from '@/models/Product';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookieToken = request.cookies.get('token')?.value;
  return cookieToken || null;
}

// GET /api/suppliers/[id] - Get single supplier with product count
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    
    const token = getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid supplier ID' },
        { status: 400 }
      );
    }

    const supplier = await Supplier.findOne({
      _id: id,
      companyId: decoded.companyId
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // ✅ NEW: Get product count for this supplier
    const productCount = await Product.countDocuments({
      supplierId: id,
      companyId: decoded.companyId
    });


    return NextResponse.json({ 
      success: true,
      data: {
        ...supplier.toObject(),
        productCount // ✅ Add product count
      },
      supplier: {
        ...supplier.toObject(),
        productCount
      }
    });
  } catch (error: any) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier', details: error.message },
      { status: 500 }
    );
  }
}

// PUT and DELETE remain the same...
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await dbConnect();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid supplier ID' }, { status: 400 });
    }

    const body = await request.json();

    const existingSupplier = await Supplier.findOne({
      _id: id,
      companyId: decoded.companyId
    });

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    if (body.name && body.name !== existingSupplier.name) {
      const duplicateSupplier = await Supplier.findOne({
        name: body.name,
        companyId: decoded.companyId,
        _id: { $ne: id }
      });

      if (duplicateSupplier) {
        return NextResponse.json(
          { error: 'A supplier with this name already exists' },
          { status: 409 }
        );
      }
    }

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    // ✅ NEW: If supplier name changed, update all products
    if (body.name && body.name !== existingSupplier.name) {
      await Product.updateMany(
        { supplierId: id },
        { $set: { supplierName: body.name } }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Supplier updated successfully',
      data: updatedSupplier,
      supplier: updatedSupplier
    });
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update supplier', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid supplier ID' }, { status: 400 });
    }

    // ✅ Check if supplier has products
    const productCount = await Product.countDocuments({
      supplierId: id,
      companyId: decoded.companyId
    });

    if (productCount > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete supplier with ${productCount} products. Please reassign or delete products first.` 
        },
        { status: 400 }
      );
    }

    const supplier = await Supplier.findOneAndDelete({
      _id: id,
      companyId: decoded.companyId
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Supplier deleted successfully',
      data: supplier,
      supplier
    });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier', details: error.message },
      { status: 500 }
    );
  }
}