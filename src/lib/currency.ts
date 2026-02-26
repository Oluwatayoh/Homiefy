/**
 * Utility for handling currency codes and symbols.
 */

export const CURRENCY_MAP: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function getCurrencySymbol(code: string = 'NGN'): string {
  return CURRENCY_MAP[code] || code;
}

export function formatCurrency(amount: number, code: string = 'NGN'): string {
  const symbol = getCurrencySymbol(code);
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
