/** Shift a calendar date string (YYYY-MM-DD) by whole days in local time. */
export function addDaysToIsoDate(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
