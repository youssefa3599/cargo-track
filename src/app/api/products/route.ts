// src/app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { productSchema } from '@/lib/validations';
import { rateLimit } from '@/lib/rateLimiter';
import { getCache, setCache, clearCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(100)(req);
    if (rateLimitResponse) return rateLimitResponse;

    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const user = verifyToken(token);
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

    await dbConnect();

    const { searchParams } = req.nextUrl;
    const supplierId        = searchParams.get('supplierId');
    const excludeSupplierId = searchParams.get('excludeSupplierId');

    const filter: any = { companyName: user.companyName };
    if (supplierId) filter.supplierId = supplierId;
    else if (excludeSupplierId) filter.supplierId = { $nin: [excludeSupplierId] };

    const cacheBase = `products:${user.companyName}`;
    const cacheKey  = excludeSupplierId
      ? `${cacheBase}:exclude:${excludeSupplierId}`
      : supplierId
      ? `${cacheBase}:supplier:${supplierId}`
      : cacheBase;

    const cached = getCache(cacheKey, 120);
    if (cached) {
      return NextResponse.json({ success: true, data: cached.products, count: cached.count, cached: true });
    }

    const products = await Product.find(filter)
      .select('name description hsCode unitPrice dutyPercentage imageUrl imagePublicId supplierId companyName createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    setCache(cacheKey, { products, count: products.length, _cacheTimestamp: Date.now() });

    return NextResponse.json({ success: true, data: products, count: products.length, cached: false });

  } catch (error: any) {
    console.error('[GET /api/products]', error.message);
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(50)(req);
    if (rateLimitResponse) return rateLimitResponse;

    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const user = verifyToken(token);
    if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

    await dbConnect();

    const body = await req.json();
    const validatedData = productSchema.parse(body);

    const product = await Product.create({
      name:           validatedData.name,
      hsCode:         validatedData.hsCode,
      unitPrice:      validatedData.unitPrice,
      dutyPercentage: validatedData.dutyPercentage || 0,
      description:    validatedData.description    || '',
      imageUrl:       validatedData.imageUrl       || '',
      imagePublicId:  validatedData.imagePublicId  || '',
      userId:         user.userId,
      createdBy:      user.userId,
      companyName:    user.companyName,
      companyId:      user.companyId || user.userId,
    });

    // Invalidate ALL product cache entries for this company
    clearCache(`products:${user.companyName}`);

    return NextResponse.json(
      { success: true, message: 'Product created successfully', data: product },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/products]', error.message);
    if (error.errors) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
      }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Product creation failed' }, { status: 500 });
  }
}