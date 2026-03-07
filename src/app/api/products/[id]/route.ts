// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { productSchema } from '@/lib/validations';
import { rateLimit } from '@/lib/rateLimiter';
import { setCache, clearCache } from '@/lib/cache';
import mongoose from 'mongoose';

/**
 * GET /api/products/:id
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  
  try {
    await dbConnect();
    
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }
    
    const product = await Product.findOne({
      _id: params.id,
      companyName: user.companyName
    }).select('name description hsCode unitPrice dutyPercentage imageUrl imagePublicId supplierId companyName createdAt updatedAt');
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    
    return NextResponse.json({
      success: true,
      data: product
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fetch product!', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch product'
    }, { status: 500 });
  }
}

/**
 * PUT /api/products/:id
 * ✅ FIXED: Now properly handles `supplierId`
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  
  try {
    const rateLimitResponse = await rateLimit(50)(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    await dbConnect();
    
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }
    
    const body = await req.json();

    // 👇 EXTRACT supplierId BEFORE validation
    const { supplierId, ...restBody } = body;

    // Validate rest of fields
    const validatedData = productSchema.partial().parse(restBody);

    // Build update object
    const updateFields: any = { ...validatedData };

    // 👇 ALWAYS include supplierId if provided (even null)
    if (supplierId !== undefined) {
      updateFields.supplierId = supplierId;
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: params.id,
        companyName: user.companyName
      },
      updateFields,
      {
        new: true,
        runValidators: true
      }
    ).select('name description hsCode unitPrice dutyPercentage imageUrl imagePublicId supplierId companyName createdAt updatedAt');
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    
    // Invalidate ALL product cache entries for this company (including excludeSupplierId variants)
    clearCache(`products:${user.companyName}`);
    
    
    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
    
  } catch (error: any) {
    console.error('❌ Product update failed!', error);
    
    if (error.errors) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Product update failed'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/products/:id
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  
  try {
    await dbConnect();
    
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }
    
    const product = await Product.findOneAndDelete({
      _id: params.id,
      companyName: user.companyName
    });
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    
    // Invalidate ALL product cache entries for this company
    clearCache(`products:${user.companyName}`);
    
    
    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Product deletion failed!', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Product deletion failed'
    }, { status: 500 });
  }
}