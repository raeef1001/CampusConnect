// src/lib/rateLimiter.ts

interface RateLimiterOptions {
  intervalMs: number; // Time interval in milliseconds between allowed operations
}

class RateLimiter {
  private lastExecutionTime: number = 0;
  private queue: (() => Promise<unknown>)[] = [];
  private isProcessing: boolean = false;
  private intervalMs: number;

  constructor(options: RateLimiterOptions) {
    this.intervalMs = options.intervalMs;
  }

  /**
   * Wraps an asynchronous function with rate-limiting logic.
   * The function will be executed only after the specified interval has passed since the last execution.
   * If multiple calls are made rapidly, they will be queued and processed sequentially.
   * @param fn The asynchronous function to rate-limit.
   * @returns A promise that resolves with the result of the wrapped function.
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      this.queue.push(task);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const now = Date.now();
    const timeSinceLastExecution = now - this.lastExecutionTime;
    const delayNeeded = this.intervalMs - timeSinceLastExecution;

    if (delayNeeded > 0) {
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }

    const nextTask = this.queue.shift();
    if (nextTask) {
      this.lastExecutionTime = Date.now();
      await nextTask();
    }

    this.isProcessing = false;
    // Process the next item in the queue immediately if available
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }
}

// Export a default instance for common use, e.g., 200ms between operations
// This can be adjusted based on typical database query times and desired load.
export const dbRateLimiter = new RateLimiter({ intervalMs: 200 });
