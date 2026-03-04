// src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import PendingRegistration from '@/models/PendingRegistration';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`;

  function redirect(path: string) {
    return NextResponse.redirect(`${appUrl}${path}`);
  }

  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return redirect('/login?error=invalid_token');
    }

    await dbConnect();

    const pending = await PendingRegistration.findOne({
      token,
      expires: { $gt: new Date() },
    });

    if (!pending) {
      return redirect('/login?error=token_expired');
    }

    // Guard against double-clicks
    const existingUser = await User.findOne({ email: pending.email });
    if (existingUser) {
      await PendingRegistration.deleteOne({ token });
      return redirect('/login?verified=true');
    }

    // Create the real User now — email is verified from the start
    const companyId = new mongoose.Types.ObjectId().toString();

    const user = new User({
      email:           pending.email,
      password:        pending.password,
      name:            pending.name,
      companyName:     pending.companyName,
      companyId,
      role:            pending.role,
      isEmailVerified: true,
    });

    await user.save();

    await PendingRegistration.deleteOne({ token });

    return redirect('/login?verified=true');

  } catch (error: any) {
    console.error('[VERIFY-EMAIL] Error:', error.message);
    return redirect('/login?error=verification_failed');
  }
}