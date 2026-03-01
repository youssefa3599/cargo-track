//src\lib\performance-logger.ts

export interface PerformanceLog {
  name: string;
  duration: number;
  timestamp: Date;
}

export interface PerformanceLogger {
  log(name: string, duration: number): void;
  clear(): void;
  getLogs(): PerformanceLog[];
  getSlowLogs(threshold: number): PerformanceLog[];
  start(label: string): void;
  end(label: string): number;
  measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
  printReport(): void;
}

class PerformanceLoggerImpl implements PerformanceLogger {
  private logs: PerformanceLog[] = [];
  private marks: Map<string, number> = new Map();

  log(name: string, duration: number): void {
    this.logs.push({
      name,
      duration,
      timestamp: new Date(),
    });
  }

  start(label: string): void {
    const timestamp = performance.now();
    this.marks.set(label, timestamp);
    console.log(`🟢 [START] ${label} at ${timestamp.toFixed(2)}ms`);
  }

  end(label: string): number {
    const startTime = this.marks.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      
      this.log(label, duration);
      
      const emoji = duration < 100 ? '🟢' : duration < 500 ? '🟡' : '🔴';
      console.log(`${emoji} [END] ${label} - ${duration.toFixed(2)}ms`);
      
      this.marks.delete(label);
      return duration;
    }
    console.warn(`⚠️ No start mark found for: ${label}`);
    return 0;
  }

  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      console.error(`❌ Error in ${label}:`, error);
      this.end(label);
      throw error;
    }
  }

  clear(): void {
    this.logs = [];
    this.marks.clear();
  }

  getLogs(): PerformanceLog[] {
    return [...this.logs];
  }

  getSlowLogs(threshold: number): PerformanceLog[] {
    return this.logs.filter(log => log.duration > threshold);
  }

  printReport(): void {
    if (this.logs.length === 0) {
      console.log('📊 No measurements recorded');
      return;
    }

    const total = this.logs.reduce((sum, log) => sum + log.duration, 0);
    const avg = total / this.logs.length;
    const max = Math.max(...this.logs.map(log => log.duration));
    const min = Math.min(...this.logs.map(log => log.duration));

    console.log('\n📊 Performance Report:');
    console.log('═══════════════════════════════════════');
    console.log(`Total Time: ${total.toFixed(2)}ms`);
    console.log(`Average: ${avg.toFixed(2)}ms`);
    console.log(`Max: ${max.toFixed(2)}ms`);
    console.log(`Min: ${min.toFixed(2)}ms`);
    console.log(`Count: ${this.logs.length}`);
    console.log('═══════════════════════════════════════');
    
    console.log('\n📋 Detailed Measurements:');
    [...this.logs]
      .sort((a, b) => b.duration - a.duration)
      .forEach(log => {
        const bar = '█'.repeat(Math.min(50, Math.floor(log.duration / 10)));
        console.log(`  ${log.name.padEnd(30)} ${log.duration.toFixed(2)}ms ${bar}`);
      });
  }
}

export const perfLogger = new PerformanceLoggerImpl();