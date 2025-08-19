// Common timezone options with user-friendly labels
export const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (UTC+7)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+9)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (UTC+8)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+8)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (UTC+5:30)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "America/Denver", label: "America/Denver (MST/MDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "Australia/Perth", label: "Australia/Perth (AWST)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST/NZDT)" }
];

// Get user's timezone from settings or default to UTC
export function getUserTimezone(): string {
  if (typeof window !== 'undefined') {
    // Try to get from localStorage first
    const stored = localStorage.getItem('userTimezone');
    if (stored) return stored;
    
    // Fallback to app settings timezone
    const appSettings = localStorage.getItem('appSettings');
    if (appSettings) {
      try {
        const parsed = JSON.parse(appSettings);
        if (parsed.timezone) return parsed.timezone;
      } catch {}
    }
  }
  return 'UTC';
}

// Set user's timezone preference
export function setUserTimezone(timezone: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userTimezone', timezone);
  }
}

// Format date in user's timezone
export function formatDateInUserTimezone(
  dateString: string | Date,
  options: Intl.DateTimeFormatOptions = {},
  timezone?: string
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const userTz = timezone || getUserTimezone();
  
  // Default options for consistent formatting
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  try {
    return new Intl.DateTimeFormat('en-US', {
      ...defaultOptions,
      timeZone: userTz
    }).format(date);
  } catch (error) {
    // Fallback to local formatting if timezone is invalid
    console.warn(`Invalid timezone: ${userTz}, falling back to local time`);
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  }
}

// Format date for display in tables (compact format)
export function formatDateForTable(dateString?: string, timezone?: string): string {
  if (!dateString) return "Never";
  return formatDateInUserTimezone(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }, timezone);
}

// Format date for detailed view (with seconds)
export function formatDateDetailed(dateString: string, timezone?: string): string {
  return formatDateInUserTimezone(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }, timezone);
}

// Get current time in user's timezone
export function getCurrentTimeInUserTimezone(timezone?: string): string {
  const userTz = timezone || getUserTimezone();
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: userTz
    }).format(new Date());
  } catch (error) {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

// Get timezone offset display string
export function getTimezoneOffsetDisplay(timezone: string): string {
  try {
    const date = new Date();
    const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tz = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const offset = (tz.getTime() - utc.getTime()) / (1000 * 60 * 60);
    
    if (offset === 0) return 'UTC';
    if (offset > 0) return `UTC+${offset}`;
    return `UTC${offset}`;
  } catch (error) {
    return timezone;
  }
}
