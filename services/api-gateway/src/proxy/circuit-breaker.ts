import { ServiceUnavailableException } from '@nestjs/common';

interface CircuitState {
  failures: number;
  openedUntil: number;
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetAfterMs: number;
}

export class CircuitBreaker {
  private readonly states = new Map<string, CircuitState>();

  constructor(private readonly options: CircuitBreakerOptions) {}

  async execute<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const state = this.states.get(name) ?? { failures: 0, openedUntil: 0 };
    const now = Date.now();

    if (state.openedUntil > now) {
      throw new ServiceUnavailableException(`${name} circuit is open`);
    }

    try {
      const result = await operation();
      this.states.set(name, { failures: 0, openedUntil: 0 });
      return result;
    } catch (error) {
      const failures = state.failures + 1;
      this.states.set(name, {
        failures,
        openedUntil:
          failures >= this.options.failureThreshold ? now + this.options.resetAfterMs : 0,
      });
      throw error;
    }
  }
}
