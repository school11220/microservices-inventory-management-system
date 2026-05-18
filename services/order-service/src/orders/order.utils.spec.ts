import { calculateLineTotal, calculateOrderTotal } from './order.utils';

describe('order utils', () => {
  it('calculates money totals with two decimal precision', () => {
    expect(calculateLineTotal({ quantity: 3, unitPrice: 19.995 })).toBe(59.98);
    expect(
      calculateOrderTotal([
        { quantity: 2, unitPrice: 10 },
        { quantity: 1, unitPrice: 4.5 },
      ]),
    ).toBe(24.5);
  });
});
