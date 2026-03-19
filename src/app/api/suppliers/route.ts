// src/app/api/suppliers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Supplier from '@/models/Supplier';
import { verifyToken } from '@/lib/auth';

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.substring(7);
  return request.cookies.get('token')?.value ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page    = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit   = Math.min(100, parseInt(searchParams.get('limit') || '50'));
    const search  = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');
    const country  = searchParams.get('country');

    const query: any = { companyId: decoded.companyId };
    
    // ✅ FIX: Only apply search filter if search term is at least 1 character
    // This prevents returning all results when search is empty or too short
    if (search && search.trim().length >= 1) {
      query.$or = [
        { name:          { $regex: search.trim(), $options: 'i' } },
        { email:         { $regex: search.trim(), $options: 'i' } },
        { contactPerson: { $regex: search.trim(), $options: 'i' } },
      ];
    }
    
    if (isActive != null) query.isActive = isActive === 'true';
    if (country) query.country = country;

    const skip = (page - 1) * limit;
    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Supplier.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      suppliers,
      data: suppliers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('[GET /api/suppliers]', error.message);
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await dbConnect();

    const body = await request.json();

    const required = ['name', 'contactPerson', 'email', 'phone', 'address', 'country', 'paymentTerms'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    if (typeof body.address !== 'object') {
      return NextResponse.json({ error: 'Address must be an object' }, { status: 400 });
    }
    for (const f of ['street', 'city', 'state', 'zipCode', 'country']) {
      if (!body.address[f]) {
        return NextResponse.json({ error: `Missing required address field: ${f}` }, { status: 400 });
      }
    }

    const existing = await Supplier.findOne({ name: body.name, companyId: decoded.companyId });
    if (existing) {
      return NextResponse.json({ error: 'A supplier with this name already exists' }, { status: 409 });
    }

    const supplier = await Supplier.create({ ...body, companyId: decoded.companyId });

    return NextResponse.json(
      { success: true, message: 'Supplier created successfully', supplier, data: supplier },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/suppliers]', error.message);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: 'Validation error', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}