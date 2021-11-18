export function formatTimeAgo(date: Date, locale?: string): string {
  const formatter = new Intl.RelativeTimeFormat(locale);
  const deltaDays = (date.getTime() - Date.now()) / (1000 * 3600 * 24);

  if (Math.abs(deltaDays) < 1) {
    const deltaHours = (date.getTime() - Date.now()) / (1000 * 3600);
    if (Math.abs(deltaHours) < 1) {
      const deltaMinutes = (date.getTime() - Date.now()) / (1000 * 60);

      if (Math.abs(deltaMinutes) < 1) {
        const deltaSeconds = (date.getTime() - Date.now()) / 1000;
        return formatter.format(Math.round(deltaSeconds), "seconds");
      } else {
        return formatter.format(Math.round(deltaMinutes), "minutes");
      }
    } else {
      return formatter.format(Math.round(deltaHours), "hours");
    }
  } else {
    return formatter.format(Math.round(deltaDays), "days");
  }
}
