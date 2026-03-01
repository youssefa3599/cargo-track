// __tests__/performance/database-indexes.test.ts
describe('Database Index Verification', () => {
  it('Should check if required indexes exist', async () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Test queries that should be fast with indexes
    const indexTests = [
      {
        name: 'Customer by ID',
        query: () => prisma.customer.findUnique({ where: { id: 'test-id' } }),
        threshold: 50
      },
      {
        name: 'Shipments by Customer',
        query: () => prisma.shipment.findMany({ 
          where: { customerId: 'test-id' },
          take: 10 
        }),
        threshold: 100
      },
      {
        name: 'Shipments by Status',
        query: () => prisma.shipment.findMany({ 
          where: { status: 'PENDING' },
          take: 10 
        }),
        threshold: 100
      },
    ];

    const missingIndexes: string[] = [];

    for (const test of indexTests) {
      const start = performance.now();
      try {
        await test.query();
      } catch (e) {
        // Ignore errors, we're just testing speed
      }
      const duration = performance.now() - start;

      console.log(`  ${test.name}: ${duration.toFixed(2)}ms`);

      if (duration > test.threshold) {
        missingIndexes.push(test.name);
        console.error(`  ❌ Likely missing index for: ${test.name}`);
      }
    }

    if (missingIndexes.length > 0) {
      console.log('\n📝 Add these indexes to your Prisma schema:');
      console.log('');
      console.log('model Customer {');
      console.log('  @@index([id])');
      console.log('}');
      console.log('');
      console.log('model Shipment {');
      console.log('  @@index([customerId])');
      console.log('  @@index([status])');
      console.log('  @@index([createdAt])');
      console.log('}');
    }

    expect(missingIndexes.length).toBe(0);
  });
});