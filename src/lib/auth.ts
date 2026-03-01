import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/types';

// ============================
// ENV HELPER (runtime only)
// ============================
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Please define JWT_SECRET in .env.local');
  return secret;
}

// ============================
// JWT PAYLOAD (SOURCE OF TRUTH)
// ============================
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyName?: string;
  companyId?: string;
}

// ============================
// AUTH USER (API CONTEXT)
// ============================
export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
}

// ============================
// PASSWORD
// ============================
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ============================
// JWT
// ============================
export function generateToken(payload: JWTPayload): string {
  console.log('🪙 [generateToken] Generating JWT payload:', payload);
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as JWTPayload;
    console.log('🔐 [verifyToken] Decoded JWT:', decoded);
    return decoded;
  } catch (error) {
    console.error('❌ [verifyToken] JWT verification failed:', error);
    return null;
  }
}

// ============================
// TOKEN EXTRACTION (FIXED)
// ============================
/**
 * Extract token from Authorization header OR cookies
 * ✅ FIXED: Better logging and cookie extraction
 */
export function extractToken(request: NextRequest): string | null {
  console.log('\n🔍 [extractToken] Starting token extraction...');
  
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  console.log('📋 [extractToken] Authorization header:', authHeader ? `Bearer ${authHeader.substring(0, 20)}...` : 'NOT FOUND');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    // Guard against placeholder values
    if (token && token !== 'httponly' && token !== 'null' && token !== 'undefined') {
      console.log('✅ [extractToken] Token found in Authorization header');
      return token;
    }
  }

  // Try NextRequest cookies API
  const cookieToken = request.cookies.get('token')?.value;
  console.log('🍪 [extractToken] Cookie (NextRequest API):', cookieToken ? `${cookieToken.substring(0, 20)}...` : 'NOT FOUND');
  
  if (cookieToken && cookieToken !== 'httponly' && cookieToken !== 'null' && cookieToken !== 'undefined') {
    console.log('✅ [extractToken] Token found in cookies (NextRequest API)');
    return cookieToken;
  }

  // Fallback to raw cookie header parsing
  const cookieHeader = request.headers.get('cookie');
  console.log('🍪 [extractToken] Raw cookie header:', cookieHeader ? 'EXISTS' : 'NOT FOUND');
  
  if (cookieHeader) {
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    if (tokenMatch) {
      const token = decodeURIComponent(tokenMatch[1]).trim();
      console.log('🍪 [extractToken] Token from raw cookie:', token ? `${token.substring(0, 20)}...` : 'EMPTY');
      
      if (token && token !== 'httponly' && token !== 'null' && token !== 'undefined') {
        console.log('✅ [extractToken] Token found in cookies (raw header)');
        return token;
      }
    }
  }

  console.log('❌ [extractToken] No valid token found');
  return null;
}

/**
 * @deprecated Use extractToken instead
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

// ============================
// AUTH USER GETTER (FIXED)
// ============================
/**
 * Get authenticated user from request (supports cookies + headers)
 * ✅ FIXED: Better error handling and logging
 */
export function getAuthUser(request: NextRequest): AuthUser | null {
  try {
    console.log('\n🔐 [getAuthUser] Starting authentication...');
    
    const token = extractToken(request);

    if (!token) {
      console.warn('⚠️ [getAuthUser] No token found - user not authenticated');
      return null;
    }

    console.log('✅ [getAuthUser] Token extracted, verifying...');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      console.warn('⚠️ [getAuthUser] Token verification failed - invalid token');
      return null;
    }

    // ✅ FIXED: Check for required fields
    if (!decoded.userId || !decoded.email || !decoded.role) {
      console.error('❌ [getAuthUser] Invalid token payload - missing required fields:', {
        hasUserId: !!decoded.userId,
        hasEmail: !!decoded.email,
        hasRole: !!decoded.role,
      });
      return null;
    }

    console.log('✅ [getAuthUser] User authenticated:', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId,
    });

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId,
      companyName: decoded.companyName,
    };
  } catch (error: any) {
    console.error('❌ [getAuthUser] Auth error:', error.message);
    return null;
  }
}

// ============================
// MIDDLEWARE WRAPPERS (ENHANCED)
// ============================
export type AuthenticatedHandler = (
  request: NextRequest,
  auth: AuthUser
) => Promise<NextResponse>;

/**
 * Middleware wrapper for authenticated routes
 * ✅ ENHANCED: Better logging
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    console.log('\n🔒 [withAuth] Checking authentication...');
    console.log('📍 [withAuth] Route:', request.method, request.nextUrl.pathname);
    
    const auth = getAuthUser(request);

    if (!auth) {
      console.error('❌ [withAuth] Authentication failed - Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    console.log('✅ [withAuth] Authentication successful:', {
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
    });

    return handler(request, auth);
  };
}

/**
 * Middleware for admin-only routes
 * ✅ ENHANCED: Better logging and error messages
 */
export function withAdminAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    console.log('\n🔒 [withAdminAuth] Checking admin authentication...');
    console.log('📍 [withAdminAuth] Route:', request.method, request.nextUrl.pathname);
    
    const auth = getAuthUser(request);

    if (!auth) {
      console.error('❌ [withAdminAuth] Authentication failed - Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    console.log('🔍 [withAdminAuth] User role check:', {
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
      requiredRole: 'admin',
    });

    if (auth.role !== 'admin') {
      console.error('❌ [withAdminAuth] Access denied - Admin role required');
      console.error('   Current role:', auth.role);
      console.error('   Required role: admin');
      return NextResponse.json(
        { 
          error: 'Forbidden - Admin role required',
          details: `Your role: ${auth.role}. Required: admin`
        },
        { status: 403 }
      );
    }

    console.log('✅ [withAdminAuth] Admin authentication successful');

    return handler(request, auth);
  };
}

/**
 * Middleware for staff and admin routes
 * ✅ ENHANCED: Better logging
 */
export function withStaffAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    console.log('\n🔒 [withStaffAuth] Checking staff authentication...');
    console.log('📍 [withStaffAuth] Route:', request.method, request.nextUrl.pathname);
    
    const auth = getAuthUser(request);

    if (!auth) {
      console.error('❌ [withStaffAuth] Authentication failed - Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    console.log('🔍 [withStaffAuth] User role check:', {
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
      requiredRoles: ['admin', 'staff'],
    });

    if (auth.role !== 'admin' && auth.role !== 'staff') {
      console.error('❌ [withStaffAuth] Access denied - Staff or Admin role required');
      console.error('   Current role:', auth.role);
      console.error('   Required roles: admin or staff');
      return NextResponse.json(
        { 
          error: 'Forbidden - Staff role required',
          details: `Your role: ${auth.role}. Required: admin or staff`
        },
        { status: 403 }
      );
    }

    console.log('✅ [withStaffAuth] Staff authentication successful');

    return handler(request, auth);
  };
}