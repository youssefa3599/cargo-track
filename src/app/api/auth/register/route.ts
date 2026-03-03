// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import PendingRegistration from '@/models/PendingRegistration';
import { sendVerificationEmail } from '@/lib/services/emailService';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('[REGISTER] New registration request');

    const body = await request.json();
    const { email, password, name, companyName, role } = body;

    console.log('  email       :', email);
    console.log('  name        :', name);
    console.log('  companyName :', companyName || '(not provided)');
    console.log('  role        :', role || 'user');

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Please provide email, password, and name' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const userRole = role && ['admin', 'user'].includes(role) ? role : 'user';

    await dbConnect();
    console.log('  ✅ Database connected');

    // Check real User collection first
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('  ❌ User already exists:', email);
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Remove any previous pending attempt for this email (resend / retry case)
    await PendingRegistration.deleteOne({ email: email.toLowerCase() });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // ✅ Save to PendingRegistration — NOT to User
    // User will only be created in verify-email/route.ts when the link is clicked
    await PendingRegistration.create({
      email: email.toLowerCase(),
      password,                          // plain text — User pre-save hook hashes on final save
      name,
      companyName: companyName?.trim() || name,
      role: userRole,
      token,
      expires,
    });

    console.log('  ✅ Pending registration saved');

    // Send verification email
    console.log('  📧 Sending verification email to:', email);
    try {
      await sendVerificationEmail(email, name, token);
      console.log('  ✅ Email sent successfully');
    } catch (emailError: any) {
      // If email fails, delete the pending record so user can try again
      await PendingRegistration.deleteOne({ email: email.toLowerCase() });
      console.error('  ❌ Email failed:', emailError?.message);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Verification email sent. Please check your inbox.' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[REGISTER] Critical error:', error.message);

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.message },
        { status: 400 }
      );
    }
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}