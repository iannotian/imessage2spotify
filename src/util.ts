export function formatTimeAgo(date: Date, locale?: string): string {
  const unitToMsMap: { [key: string]: number } = {
    year: 1000 * 3600 * 24 * 365,
    month: 1000 * 3600 * 24 * 30,
    week: 1000 * 3600 * 24 * 7,
    day: 1000 * 3600 * 24,
    hour: 1000 * 3600,
    minute: 1000 * 60,
    second: 1000,
  };

  let remainingMs = date.getTime() - Date.now();
  let timeDelta = 0;
  let lastUnit: any = "year";

  for (const [unit, unitMs] of Object.entries(unitToMsMap)) {
    if (remainingMs > unitMs) {
      remainingMs = remainingMs % unitMs;
    } else {
      timeDelta = (date.getTime() - Date.now()) / unitMs;
      lastUnit = unit;

      if (Math.abs(timeDelta) >= 1) {
        break;
      }
    }
  }

  const formatter = new Intl.RelativeTimeFormat(locale);
  return formatter.format(Math.round(timeDelta), lastUnit);
}
