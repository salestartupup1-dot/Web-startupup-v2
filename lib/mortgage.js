export function monthlyMortgage(principal, annualRate = 3, years = 30) {
  const amount = Number(String(principal || '').replace(/,/g, ''));
  const months = Number(years) * 12, rate = Number(annualRate) / 1200;
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(months) || months <= 0 || !Number.isFinite(rate) || rate < 0) return 0;
  return rate === 0 ? amount / months : amount * rate / (1 - Math.pow(1 + rate, -months));
}
