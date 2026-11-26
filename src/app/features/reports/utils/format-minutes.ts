/** "125" -> "2h 5m", "120" -> "2h", "45" -> "45m", "0" -> "0m". Whole hours get thousands separators. */
export function formatMinutes(value: number | null | undefined): string {
  const total = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  const h = `${hours.toLocaleString('en-US')}h`;
  return minutes === 0 ? h : `${h} ${minutes}m`;
}
