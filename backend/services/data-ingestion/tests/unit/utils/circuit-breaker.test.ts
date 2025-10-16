import { CircuitBreaker } from '../../../src/utils/circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(3, 1000);
  });

  describe('execute', () => {
    it('should execute function successfully when closed', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(breaker.getState().state).toBe('closed');
    });

    it('should open circuit after threshold failures', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getState().state).toBe('open');
      expect(breaker.getState().failures).toBe(3);
    });

    it('should reject execution when circuit is open', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (error) {
          // Expected
        }
      }

      // Try to execute again
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is open');
    });

    it('should transition to half-open after timeout', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getState().state).toBe('open');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should allow execution in half-open state
      fn.mockResolvedValue('success');
      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(breaker.getState().state).toBe('closed');
    });

    it('should reset failure count on success', async () => {
      const fn = jest.fn();

      // First two failures
      fn.mockRejectedValueOnce(new Error('failure'));
      fn.mockRejectedValueOnce(new Error('failure'));

      try {
        await breaker.execute(fn);
      } catch (error) {
        // Expected
      }

      try {
        await breaker.execute(fn);
      } catch (error) {
        // Expected
      }

      expect(breaker.getState().failures).toBe(2);

      // Success resets the counter
      fn.mockResolvedValue('success');
      await breaker.execute(fn);

      expect(breaker.getState().failures).toBe(0);
      expect(breaker.getState().state).toBe('closed');
    });
  });

  describe('reset', () => {
    it('should reset circuit breaker state', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getState().state).toBe('open');

      breaker.reset();

      expect(breaker.getState().state).toBe('closed');
      expect(breaker.getState().failures).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = breaker.getState();

      expect(state).toHaveProperty('failures');
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('nextAttempt');
      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
    });
  });
});
