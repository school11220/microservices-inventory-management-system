import { isLowStock } from './product.presenter';

describe('isLowStock', () => {
  it('flags stock below reorder threshold', () => {
    expect(isLowStock(4, 5)).toBe(true);
    expect(isLowStock(5, 5)).toBe(false);
  });
});
