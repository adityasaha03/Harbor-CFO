export function formatYuan(minor: number): string {
  const isNeg = minor < 0;
  const abs = Math.abs(minor);
  const yuan = (abs / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNeg ? '-' : ''}¥${yuan}`;
}
