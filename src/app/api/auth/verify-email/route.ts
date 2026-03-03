// src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import PendingRegistration from '@/models/PendingRegistration';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    await dbConnect();

    // Find the pending registration by token
    const pending = await PendingRegistration.findOne({
      token,
      expires: { $gt: new Date() },
    });

    if (!pending) {
      // Token invalid or expired — pending record already auto-deleted by MongoDB TTL
      return NextResponse.redirect(new URL('/login?error=token_expired', request.url));
    }

    // Guard against double-clicks — if User already exists just clean up and redirect
    const existingUser = await User.findOne({ email: pending.email });
    if (existingUser) {
      await PendingRegistration.deleteOne({ token });
      return NextResponse.redirect(new URL('/login?verified=true', request.url));
    }

    // ✅ Create the real User now — email is verified from the start
    const companyId = new mongoose.Types.ObjectId().toString();

    const user = new User({
      email:           pending.email,
      password:        pending.password, // User pre-save hook hashes this automatically
      name:            pending.name,
      companyName:     pending.companyName,
      companyId,
      role:            pending.role,
      isEmailVerified: true,             // ✅ already verified — no token fields needed
    });

    await user.save();

    // Delete the pending record
    await PendingRegistration.deleteOne({ token });

    // ✅ Only redirect to login happens here — register page never redirects
    return NextResponse.redirect(new URL('/login?verified=true', request.url));

  } catch (error: any) {
    console.error('[VERIFY-EMAIL] Error:', error.message);
    return NextResponse.redirect(new URL('/login?error=verification_failed', request.url));
  }
}