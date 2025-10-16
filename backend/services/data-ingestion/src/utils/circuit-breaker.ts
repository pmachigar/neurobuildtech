import { config } from '../config';
import { logger } from './logger';
import { CircuitBreakerState } from '../types';

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(threshold?: number, timeout?: number) {
    this.threshold = threshold || config.circuitBreaker.threshold;
    this.timeout = timeout || config.circuitBreaker.timeoutMs;
    this.state = {
      failures: 0,
      state: 'closed',
      nextAttempt: 0,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.state === 'open') {
      if (Date.now() < this.state.nextAttempt) {
        throw new Error('Circuit breaker is open');
      }
      this.state.state = 'half-open';
      logger.info('Circuit breaker transitioning to half-open state');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.state.failures = 0;
    if (this.state.state === 'half-open') {
      this.state.state = 'closed';
      logger.info('Circuit breaker closed');
    }
  }

  private onFailure(): void {
    this.state.failures++;
    logger.warn(`Circuit breaker failure count: ${this.state.failures}`);

    if (this.state.failures >= this.threshold) {
      this.state.state = 'open';
      this.state.nextAttempt = Date.now() + this.timeout;
      logger.error('Circuit breaker opened');
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      failures: 0,
      state: 'closed',
      nextAttempt: 0,
    };
    logger.info('Circuit breaker reset');
  }
}
