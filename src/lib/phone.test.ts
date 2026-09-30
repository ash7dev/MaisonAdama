import { describe, expect, it } from 'vitest';
import { parseSenegalPhone } from './phone';

describe('parseSenegalPhone', () => {
  it.each([
    ['77 123 45 67', '+221771234567'],
    ['771234567', '+221771234567'],
    ['+221 77 123 45 67', '+221771234567'],
    ['00221771234567', '+221771234567'],
    ['221-70-123-45-67', '+221701234567'],
    ['(76) 123.45.67', '+221761234567'],
    ['33 820 00 00', '+221338200000'],
  ])('%s → %s', (input, expected) => {
    expect(parseSenegalPhone(input)).toBe(expected);
  });

  it.each([
    ['+225 07 12 34 56 78'], // Côte d'Ivoire
    ['+33 6 12 34 56 78'], // France
    ['77 123 45'], // trop court
    ['7712345678'], // trop long
    ['72 123 45 67'], // préfixe inexistant
    [''],
  ])('refuse %s', (input) => {
    expect(parseSenegalPhone(input)).toBeNull();
  });

  it('produit toujours le format exigé par la base', () => {
    expect(parseSenegalPhone('78 000 00 00')).toMatch(/^\+221[0-9]{9}$/);
  });
});
