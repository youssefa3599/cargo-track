// __tests__/performance/login-flow.test.ts
describe('Complete Login Flow Performance', () => {
  it('Should identify bottlenecks in login → redirect flow', async () => {
    const timings: Record<string, number> = {};

    // Step 1: API Call
    const apiStart = performance.now();
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    timings.apiCall = performance.now() - apiStart;

    // Step 2: Parse Response
    const parseStart = performance.now();
    const data = await response.json();
    timings.parseResponse = performance.now() - parseStart;

    // Step 3: Redirect
    const redirectStart = performance.now();
    // Mock redirect
    const mockRedirect = () => '/shipments';
    mockRedirect();
    timings.redirect = performance.now() - redirectStart;

    // Calculate total
    const total = Object.values(timings).reduce((sum, t) => sum + t, 0);

    // Print detailed breakdown
    console.log('\n📊 LOGIN FLOW BREAKDOWN:');
    console.log('═══════════════════════════════════════');
    Object.entries(timings).forEach(([step, duration]) => {
      const percentage = (duration / total * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(duration / 10));
      const status = duration > 200 ? '🔴' : duration > 100 ? '🟡' : '🟢';
      console.log(`${status} ${step.padEnd(20)} ${duration.toFixed(2)}ms (${percentage}%) ${bar}`);
    });
    console.log('───────────────────────────────────────');
    console.log(`TOTAL: ${total.toFixed(2)}ms`);
    console.log('═══════════════════════════════════════\n');

    // Identify the bottleneck
    const bottleneck = Object.entries(timings)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (bottleneck[1] > 200) {
      console.error(`\n🐌 BOTTLENECK IDENTIFIED: ${bottleneck[0]} (${bottleneck[1].toFixed(2)}ms)`);
      console.log('\n💡 SUGGESTIONS:');
      
      if (bottleneck[0] === 'apiCall') {
        console.log('  - Check database query performance');
        console.log('  - Verify password hashing rounds (should be 10-12)');
        console.log('  - Check network latency');
        console.log('  - Add database indexes');
      }
      if (bottleneck[0] === 'parseResponse') {
        console.log('  - Response might be too large');
        console.log('  - Consider streaming responses');
      }
    }

    expect(total).toBeLessThan(1000); // Total flow < 1s
  });
});