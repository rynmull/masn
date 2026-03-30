import {
  getSymbolForWord,
  getSymbolProvider,
  getSymbolTerm,
  isSymbolProviderImplemented,
  toProviderSymbol,
} from '../src/utils/symbols';

describe('symbols utils', () => {
  it('maps known labels to normalized provider-prefixed symbols', () => {
    expect(getSymbolForWord('Mom')).toBe('arasaac:mother');
    expect(getSymbolForWord('Eat', 'pcs')).toBe('pcs:eat');
  });

  it('falls back to lowercased label for unknown words', () => {
    expect(getSymbolForWord('Snack Time')).toBe('arasaac:snack time');
  });

  it('extracts provider and term from prefixed symbol values', () => {
    expect(getSymbolProvider('symbolstix:drink')).toBe('symbolstix');
    expect(getSymbolTerm('symbolstix:drink')).toBe('drink');
  });

  it('uses defaults when symbol has no provider prefix', () => {
    expect(getSymbolProvider('drink')).toBe('arasaac');
    expect(getSymbolTerm('drink')).toBe('drink');
  });

  it('normalizes term when creating provider symbols', () => {
    expect(toProviderSymbol('  Need Help  ', 'pcs')).toBe('pcs:need help');
  });

  it('flags implemented providers correctly', () => {
    expect(isSymbolProviderImplemented('arasaac')).toBe(true);
    expect(isSymbolProviderImplemented('pcs')).toBe(false);
    expect(isSymbolProviderImplemented('symbolstix')).toBe(false);
  });
});
