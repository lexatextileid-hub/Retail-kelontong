import { describe, expect, it } from 'vitest';
import { uangCepat } from './DialogBayar';

describe('tombol uang cepat', () => {
  it('17.500 → 20.000, 50.000, 100.000, 150.000', () => {
    expect(uangCepat(17500)).toEqual([20000, 50000, 100000, 150000]);
  });
  it('86.500 → 90.000, 100.000, 150.000, 200.000', () => {
    expect(uangCepat(86500)).toEqual([90000, 100000, 150000, 200000]);
  });
});
