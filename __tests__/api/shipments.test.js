// @ts-nocheck
// ============================================================================
// FILE: __tests__/api/shipments.test.js
// Shipments API Integration Tests - WITHOUT CUSTOMER CREATION
// ============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Helper to wait between requests
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test user credentials
const TEST_USER = {
  email: 'youssef.a3599@gmail.com',
  password: 'youssefabass1999'
};

let authToken = '';
let testShipmentId = '';
let testProductId = '';

describe('Shipments API Tests', () => {
  
  // =========================================================================
  // SETUP: Login and create test data
  // =========================================================================
  beforeAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 STARTING TEST SETUP');
    console.log('='.repeat(80));
    
    try {
      // ===== STEP 1: LOGIN =====
      console.log('\n📧 STEP 1: Logging in...');
      console.log('   URL:', `${BASE_URL}/api/auth/login`);
      console.log('   Email:', TEST_USER.email);
      
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER)
      });
      
      console.log('   Status:', loginResponse.status);
      console.log('   Status Text:', loginResponse.statusText);
      
      const loginData = await loginResponse.json();
      console.log('   Response:', JSON.stringify(loginData, null, 2));
      
      if (!loginResponse.ok) {
        throw new Error(`Login failed: ${loginData.error || loginResponse.statusText}`);
      }
      
      authToken = loginData.data.token;
      console.log('   ✅ Login successful');
      console.log('   Token:', authToken.substring(0, 30) + '...');
      
      // ===== STEP 2: CREATE PRODUCT =====
      console.log('\n📦 STEP 2: Creating test product...');
      const uniqueSku = `SKU-${Date.now()}`;
      console.log('   SKU:', uniqueSku);
      
      const productPayload = {
        name: 'Test Product for Shipments',
        sku: uniqueSku,
        unitPrice: 100,
        hsCode: '123456'
      };
      console.log('   Payload:', JSON.stringify(productPayload, null, 2));
      
      const productResponse = await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(productPayload)
      });
      
      console.log('   Status:', productResponse.status);
      console.log('   Status Text:', productResponse.statusText);
      
      const productResponseText = await productResponse.text();
      console.log('   Raw Response:', productResponseText);
      
      let productData;
      try {
        productData = JSON.parse(productResponseText);
        console.log('   Parsed Response:', JSON.stringify(productData, null, 2));
      } catch (e) {
        throw new Error(`Failed to parse product response: ${productResponseText}`);
      }
      
      if (!productResponse.ok) {
        throw new Error(`Product creation failed: ${productData.error || productResponse.statusText}`);
      }
      
      testProductId = productData.data._id;
      console.log('   ✅ Product created');
      console.log('   Product ID:', testProductId);
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ SETUP COMPLETE - All test data created');
      console.log('   Auth Token:', authToken ? 'Present' : 'Missing');
      console.log('   Product ID:', testProductId);
      console.log('='.repeat(80) + '\n');
      
    } catch (error) {
      console.error('\n' + '='.repeat(80));
      console.error('❌ SETUP FAILED');
      console.error('='.repeat(80));
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('='.repeat(80) + '\n');
      throw error;
    }
  }, 30000);
  
  // Wait between tests
  beforeEach(async () => {
    await wait(300);
  });
  
  // =========================================================================
  // TEST 1: Create Shipment with Valid Data
  // =========================================================================
  test('Should create a new shipment with valid data', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TEST 1: Create Shipment');
    console.log('='.repeat(80));
    
    const shipmentData = {
      origin: 'China',
      destination: 'USA',
      shippingDate: new Date().toISOString(),
      estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      products: [
        {
          productId: testProductId,
          quantity: 10
        }
      ]
    };
    
    console.log('Payload:', JSON.stringify(shipmentData, null, 2));

    const response = await fetch(`${BASE_URL}/api/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(shipmentData)
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('_id');
    expect(data.data).toHaveProperty('shipmentId');
    
    testShipmentId = data.data._id;
    console.log('✅ Shipment created:', testShipmentId);
    console.log('   Generated shipmentId:', data.data.shipmentId);
    console.log('='.repeat(80) + '\n');
  }, 15000);

  // =========================================================================
  // TEST 2: Get All Shipments
  // =========================================================================
  test('Should get all shipments for authenticated user', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TEST 2: Get All Shipments');
    console.log('='.repeat(80));
    
    const response = await fetch(`${BASE_URL}/api/shipments`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('Response keys:', Object.keys(data));
    console.log('Shipments count:', Array.isArray(data.data) ? data.data.length : 'N/A');

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    
    console.log('✅ Successfully fetched shipments');
    console.log('='.repeat(80) + '\n');
  });

  // =========================================================================
  // TEST 3: Delete Test Shipment
  // =========================================================================
  test('Should delete a shipment', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TEST 3: Delete Shipment');
    console.log('='.repeat(80));
    console.log('Deleting shipment ID:', testShipmentId);
    
    const response = await fetch(`${BASE_URL}/api/shipments/${testShipmentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Shipment deleted successfully');
    
    console.log('✅ Shipment deleted');
    console.log('='.repeat(80) + '\n');
  });

});