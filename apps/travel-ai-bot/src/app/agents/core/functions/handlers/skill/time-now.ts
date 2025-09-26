export const timeNowHandler = async (args: any) => {
  const { timezone, format } = args || {};
  const now = new Date();
  try {
    const locale = 'en-US';
    const formatted = timezone
      ? new Intl.DateTimeFormat(locale, { timeZone: timezone, dateStyle: 'medium', timeStyle: 'long' }).format(now)
      : now.toISOString();
    return { success: true, timestamp: now.toISOString(), formatted, timezone: timezone || 'UTC/ISO', format: format || 'auto' };
  } catch {
    return { success: true, timestamp: now.toISOString() };
  }
};
