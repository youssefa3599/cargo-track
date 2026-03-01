// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sendVerificationEmail } from '@/lib/services/emailService';
import mongoose from 'mongoose';
import crypto from 'crypto';

const ULTRA = '🔥'.repeat(40);
const INFO  = '📧'.repeat(40);
const OK    = '✅'.repeat(40);
const FAIL  = '❌'.repeat(40);

export async function POST(request: NextRequest) {
  try {
    console.log('\n' + ULTRA);
    console.log('🔥 [REGISTER] NEW REGISTRATION REQUEST');
    console.log(ULTRA);

    const body = await request.json();

    console.log('\n📋 STEP 1: INPUT DATA');
    console.log('  email        :', body.email);
    console.log('  name         :', body.name);
    console.log('  companyName  :', body.companyName || '(not provided)');
    console.log('  role         :', body.role || 'user'); // ✅ ADDED: Log role
    console.log('  password len :', body.password?.length);

    const { email, password, name, companyName, role } = body;

    if (!email || !password || !name) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Please provide email, password, and name' },
        { status: 400 }
      );
    }

    // ✅ ADDED: Validate role
    const userRole = role && ['admin', 'user'].includes(role) ? role : 'user';
    console.log('  resolved role:', userRole);

    console.log('\n📋 STEP 2: DATABASE CONNECTION');
    await dbConnect();
    console.log('  ✅ Database connected');

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('  ❌ User already exists:', email);
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    console.log('  ✅ Email is available');

    console.log('\n📋 STEP 3: CREATING USER');
    const companyId = new mongoose.Types.ObjectId().toString();
    const resolvedCompanyName = companyName?.trim() || name;
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    console.log('  companyId    :', companyId);
    console.log('  companyName  :', resolvedCompanyName);
    console.log('  role         :', userRole); // ✅ ADDED: Log role being saved
    console.log('  token(10)    :', emailVerificationToken.substring(0, 10) + '...');
    console.log('  expires      :', emailVerificationExpires.toISOString());

    const user = new User({
      email: email.toLowerCase(),
      password,
      name,
      companyId,
      companyName: resolvedCompanyName,
      role: userRole, // ✅ ADDED: Set role from request
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
    });

    await user.save();
    console.log('  ✅ User saved, _id:', user._id.toString());
    console.log('  ✅ User role:', user.role); // ✅ ADDED: Confirm role was saved

    // ── ULTIMATE EMAIL DEBUG ────────────────────────────────────────────────
    console.log('\n' + INFO);
    console.log('📧 STEP 4: EMAIL SENDING - ULTIMATE DEBUG');
    console.log(INFO);

    console.log('\n  📋 SMTP ENV CHECK:');
    console.log('  SMTP_HOST      :', process.env.SMTP_HOST         || '❌ NOT SET');
    console.log('  SMTP_PORT      :', process.env.SMTP_PORT         || '❌ NOT SET');
    console.log('  SMTP_USER      :', process.env.SMTP_USER         || '❌ NOT SET');
    console.log('  SMTP_PASS      :', process.env.SMTP_PASS         ? `✅ SET (len:${process.env.SMTP_PASS.length})` : '❌ NOT SET');
    console.log('  EMAIL_FROM     :', process.env.EMAIL_FROM        || '❌ NOT SET');
    console.log('  EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME   || '❌ NOT SET');
    console.log('  APP_URL        :', process.env.NEXT_PUBLIC_APP_URL || '❌ NOT SET');

    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${emailVerificationToken}`;
    console.log('\n  📋 EMAIL DETAILS:');
    console.log('  To             :', email);
    console.log('  Verify URL     :', verificationUrl);

    console.log('\n  🚀 CALLING sendVerificationEmail...');
    const emailStart = Date.now();

    try {
      await sendVerificationEmail(email, name, emailVerificationToken);
      const elapsed = Date.now() - emailStart;
      console.log('\n' + OK);
      console.log(`✅ EMAIL SENT SUCCESSFULLY in ${elapsed}ms`);
      console.log(OK + '\n');
    } catch (emailError: any) {
      const elapsed = Date.now() - emailStart;
      console.log('\n' + FAIL);
      console.log(`❌ EMAIL FAILED after ${elapsed}ms`);
      console.log(FAIL);
      console.log('\n  ❌ ERROR DETAILS:');
      console.log('  name     :', emailError?.name);
      console.log('  message  :', emailError?.message);
      console.log('  code     :', emailError?.code);
      console.log('  command  :', emailError?.command);
      console.log('  response :', emailError?.response);
      console.log('  stack    :\n', emailError?.stack);
      console.log('\n  ❌ FULL ERROR:');
      console.log(JSON.stringify(emailError, Object.getOwnPropertyNames(emailError), 2));
      console.log(FAIL + '\n');
      // Registration still succeeds even if email fails
    }
    // ── END EMAIL DEBUG ─────────────────────────────────────────────────────

    console.log('\n' + ULTRA);
    console.log('🔥 [REGISTER] COMPLETE');
    console.log(ULTRA + '\n');

    return NextResponse.json(
      {
        message: 'Registration successful. Please check your email to verify your account.',
        email: user.email,
        role: user.role, // ✅ ADDED: Return role in response
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.log('\n' + FAIL);
    console.error('❌ [REGISTER] CRITICAL ERROR:', error.message);
    console.error('  stack:', error.stack);
    console.log(FAIL + '\n');

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