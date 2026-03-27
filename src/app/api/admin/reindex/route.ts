// src/app/api/admin/reindex/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { bulkIndexAllData } from '@/lib/services/indexer';
import dbConnect from '@/lib/db';

/**
 * Admin endpoint to re-index all data to Pinecone
 * POST /api/admin/reindex
 * 
 * Usage:
 * curl -X POST https://your-app.railway.app/api/admin/reindex \
 *   -H "Authorization: Bearer YOUR_ADMIN_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    // 🔐 Verify admin authorization
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.ADMIN_SECRET}`;
    
    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid admin credentials' 
      }, { status: 401 });
    }
    
    // Connect to database
    await dbConnect();
    
    console.log('🚀 Starting bulk re-indexing...');
    
    // Run bulk indexing
    await bulkIndexAllData();
    
    console.log('✅ Bulk re-indexing complete');
    
    return NextResponse.json({ 
      success: true, 
      message: 'All data has been re-indexed to Pinecone successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Re-indexing failed:', error);
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Re-indexing failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({ 
    error: 'Method not allowed. Use POST to trigger re-indexing.' 
  }, { status: 405 });
}