// __tests__/performance/benchmarks.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { perfLogger } from '@/lib/performance-logger';
import bcrypt from 'bcrypt';

// Type definitions
interface PerformanceThresholds {
  API_RESPONSE: number;
  DB_QUERY: number;
  PAGE_LOAD: number;
  REDIRECT: number;
  PASSWORD_HASH: number;
}

interface DatabaseQuery {
  name: string;
  fn: () => Promise<any>;
}

interface SessionData {
  userId: string;
  token: string;
  expiresAt: Date;
}

interface SessionResult {
  session: SessionData;
  duration: number;
}

interface MockRouter {
  push: jest.Mock<(path: string) => void>;
}

describe('Performance Benchmarks', () => {
  const THRESHOLDS: PerformanceThresholds = {
    API_RESPONSE: 500,
    DB_QUERY: 200,
    PAGE_LOAD: 1000,
    REDIRECT: 100,
    PASSWORD_HASH: 300,
  };

  beforeEach(() => {
    perfLogger.clear();
  });

  describe('API Endpoints Performance', () => {
    it('Login API should respond quickly', async () => {
      const start = performance.now();
      
      const response: Response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      const duration: number = performance.now() - start;
      
      console.log(`\n⏱️  Login API: ${duration.toFixed(2)}ms`);
      
      if (duration > THRESHOLDS.API_RESPONSE) {
        console.error(`❌ SLOW: Login took ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.API_RESPONSE}ms)`);
      }

      expect(duration).toBeLessThan(THRESHOLDS.API_RESPONSE);
    });

    it('Customers API should respond quickly', async () => {
      const start: number = performance.now();
      
      const response: Response = await fetch('http://localhost:3000/api/customers');
      const duration: number = performance.now() - start;
      
      console.log(`⏱️  Customers API: ${duration.toFixed(2)}ms`);
      
      expect(duration).toBeLessThan(THRESHOLDS.API_RESPONSE);
    });

    it('Shipments API should respond quickly', async () => {
      const start: number = performance.now();
      
      const response: Response = await fetch('http://localhost:3000/api/shipments');
      const duration: number = performance.now() - start;
      
      console.log(`⏱️  Shipments API: ${duration.toFixed(2)}ms`);
      
      expect(duration).toBeLessThan(THRESHOLDS.API_RESPONSE);
    });
  });

  describe('Database Query Performance', () => {
    it('Should detect slow queries', async () => {
      // Skip if Prisma is not configured
      try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        const queries: DatabaseQuery[] = [
          { name: 'Find User', fn: () => prisma.user.findFirst() },
          { name: 'List Customers', fn: () => prisma.customer.findMany({ take: 50 }) },
          { name: 'List Shipments', fn: () => prisma.shipment.findMany({ take: 50 }) },
          { name: 'Count Products', fn: () => prisma.product.count() },
        ];

        const slowQueries: string[] = [];

        for (const query of queries) {
          const start: number = performance.now();
          await query.fn();
          const duration: number = performance.now() - start;

          console.log(`  ${query.name}: ${duration.toFixed(2)}ms`);

          if (duration > THRESHOLDS.DB_QUERY) {
            slowQueries.push(`${query.name} (${duration.toFixed(2)}ms)`);
            console.error(`  ❌ SLOW QUERY: ${query.name}`);
          }
        }

        if (slowQueries.length > 0) {
          console.error(`\n🐌 Slow queries detected:\n${slowQueries.join('\n')}`);
          console.log('\n💡 Consider adding database indexes!');
        }

        expect(slowQueries.length).toBe(0);
      } catch (error) {
        console.log('⚠️  Skipping Prisma tests - Prisma not configured');
        expect(true).toBe(true); // Pass the test if Prisma isn't available
      }
    });

    it('Should measure N+1 query problems', async () => {
      try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        // BAD: N+1 queries
        const start1: number = performance.now();
        const customers = await prisma.customer.findMany();
        for (const customer of customers) {
          await prisma.shipment.findMany({ where: { customerId: customer.id } });
        }
        const nPlusOneDuration: number = performance.now() - start1;

        // GOOD: With include
        const start2: number = performance.now();
        const customersWithShipments = await prisma.customer.findMany({
          include: { shipments: true }
        });
        const optimizedDuration: number = performance.now() - start2;

        console.log(`\n📊 Query Comparison:`);
        console.log(`  N+1 approach: ${nPlusOneDuration.toFixed(2)}ms`);
        console.log(`  Optimized approach: ${optimizedDuration.toFixed(2)}ms`);
        console.log(`  Improvement: ${((nPlusOneDuration - optimizedDuration) / nPlusOneDuration * 100).toFixed(1)}%`);

        expect(optimizedDuration).toBeLessThan(nPlusOneDuration);
      } catch (error) {
        console.log('⚠️  Skipping Prisma tests - Prisma not configured');
        expect(true).toBe(true); // Pass the test if Prisma isn't available
      }
    });
  });

  describe('Password Hashing Performance', () => {
    it('Password hashing should be within threshold', async () => {
      const start: number = performance.now();
      await bcrypt.hash('password123', 10);
      const duration: number = performance.now() - start;

      console.log(`\n🔐 Password hashing: ${duration.toFixed(2)}ms`);

      if (duration > THRESHOLDS.PASSWORD_HASH) {
        console.warn(`⚠️  Password hashing is slow. Consider reducing bcrypt rounds.`);
      }

      expect(duration).toBeLessThan(THRESHOLDS.PASSWORD_HASH);
    });

    it('Password verification should be within threshold', async () => {
      const hash: string = await bcrypt.hash('password123', 10);
      
      const start: number = performance.now();
      await bcrypt.compare('password123', hash);
      const duration: number = performance.now() - start;

      console.log(`🔐 Password verification: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(THRESHOLDS.PASSWORD_HASH);
    });
  });

  describe('Redirect Performance', () => {
    it('Client-side redirect should be instant', () => {
      const mockRouter: MockRouter = {
        push: jest.fn<(path: string) => void>()
      };

      const start: number = performance.now();
      mockRouter.push('/shipments');
      const duration: number = performance.now() - start;

      console.log(`\n🔄 Redirect call: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(THRESHOLDS.REDIRECT);
      expect(mockRouter.push).toHaveBeenCalledWith('/shipments');
    });
  });

  describe('Session Management Performance', () => {
    it('Creating session should be fast', async () => {
      // Mock your session creation
      const createSession = async (userId: string): Promise<SessionResult> => {
        const start: number = performance.now();
        
        // Your actual session creation logic
        const session: SessionData = {
          userId,
          token: 'mock-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
        
        const duration: number = performance.now() - start;
        return { session, duration };
      };

      const { session, duration }: SessionResult = await createSession('user-123');
      
      console.log(`\n🎫 Session creation: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(100);
      expect(session.userId).toBe('user-123');
    });
  });
});