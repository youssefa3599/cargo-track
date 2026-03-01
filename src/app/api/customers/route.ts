// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withAdminAuth } from '@/lib/auth';
import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import { rateLimit } from '@/lib/rateLimiter';
import { z } from 'zod';

const createCustomerSchema = z.object({
  name:    z.string().min(1, 'Name is required').max(200),
  email:   z.string().email('Invalid email'),
  phone:   z.string().min(1, 'Phone is required').max(50),
  address: z.string().min(1, 'Address is required').max(500),
  taxId:   z.string().max(100).optional().or(z.literal('')),
  type:    z.literal('customer').optional(),
  country: z.string().max(100).optional().or(z.literal('')),
  notes:   z.string().max(1000).optional().or(z.literal('')),
});

// ── GET /api/customers ────────────────────────────────────────────────────────
export const GET = withAuth(async (request: NextRequest, auth: any) => {
  try {
    const rateLimitResponse = await rateLimit(100, 15 * 60 * 1000)(request);
    if (rateLimitResponse) return rateLimitResponse;

    if (!auth.companyId || !auth.userId) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const search    = searchParams.get('search') || '';
    const country   = searchParams.get('country');
    const page      = parseInt(searchParams.get('page')  || '1');
    const limit     = parseInt(searchParams.get('limit') || '20');
    const sortBy    = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    const query: any = { companyId: auth.companyId, type: 'customer' };

    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (country) {
      query.country = { $regex: country, $options: 'i' };
    }

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(query),
    ]);

    return NextResponse.json({
      customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });

  } catch (error: any) {
    console.error('[GET /api/customers]', error.message);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
});

// ── POST /api/customers ───────────────────────────────────────────────────────
export const POST = withAdminAuth(async (request: NextRequest, auth: any) => {
  try {
    const rateLimitResponse = await rateLimit(100, 15 * 60 * 1000)(request);
    if (rateLimitResponse) return rateLimitResponse;

    if (!auth.companyId || !auth.companyName || !auth.userId) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    let validatedData: any;

    try {
      validatedData = createCustomerSchema.parse({ ...body, type: 'customer' });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
      }
      throw err;
    }

    if (validatedData.email) {
      const existing = await Customer.findOne({ companyId: auth.companyId, email: validatedData.email });
      if (existing) {
        return NextResponse.json({ error: 'A customer with this email already exists' }, { status: 400 });
      }
    }

    const customer = await Customer.create({
      ...validatedData,
      userId:      auth.userId,
      companyId:   auth.companyId,
      companyName: auth.companyName,
      type:        'customer',
    });

    return NextResponse.json({ message: 'Customer created successfully', customer }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/customers]', error.message);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A customer with this email already exists' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
});