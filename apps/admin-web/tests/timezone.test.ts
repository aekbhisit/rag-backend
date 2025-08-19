import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TIMEZONE_OPTIONS,
  getUserTimezone,
  setUserTimezone,
  formatDateInUserTimezone,
  formatDateForTable,
  formatDateDetailed,
  getCurrentTimeInUserTimezone,
  getTimezoneOffsetDisplay
} from '../utils/timezone';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Timezone Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TIMEZONE_OPTIONS', () => {
    it('should contain common timezone options', () => {
      expect(TIMEZONE_OPTIONS).toBeInstanceOf(Array);
      expect(TIMEZONE_OPTIONS.length).toBeGreaterThan(0);
      
      // Check for common timezones
      const timezoneValues = TIMEZONE_OPTIONS.map(opt => opt.value);
      expect(timezoneValues).toContain('UTC');
      expect(timezoneValues).toContain('Asia/Bangkok');
      expect(timezoneValues).toContain('America/New_York');
      expect(timezoneValues).toContain('Europe/London');
    });

    it('should have proper structure for each option', () => {
      TIMEZONE_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
        expect(option.value.length).toBeGreaterThan(0);
        expect(option.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getUserTimezone', () => {
    it('should return UTC when no timezone is stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      expect(getUserTimezone()).toBe('UTC');
    });

    it('should return stored timezone from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('Asia/Bangkok');
      expect(getUserTimezone()).toBe('Asia/Bangkok');
    });

    it('should fallback to app settings timezone', () => {
      localStorageMock.getItem
        .mockReturnValueOnce(null) // userTimezone
        .mockReturnValueOnce('{"timezone": "Europe/London"}'); // appSettings
      expect(getUserTimezone()).toBe('Europe/London');
    });
  });

  describe('setUserTimezone', () => {
    it('should store timezone in localStorage', () => {
      setUserTimezone('Asia/Tokyo');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('userTimezone', 'Asia/Tokyo');
    });
  });

  describe('formatDateInUserTimezone', () => {
    it('should format date in specified timezone', () => {
      const testDate = '2024-01-15T10:30:00Z';
      const result = formatDateInUserTimezone(testDate, 'Asia/Bangkok');
      
      // Should contain date components
      expect(result).toMatch(/\d{4}/); // year
      expect(result).toMatch(/[A-Za-z]{3}/); // month
      expect(result).toMatch(/\d{1,2}/); // day
      expect(result).toMatch(/\d{1,2}:\d{2}/); // time
    });

    it('should use user timezone when no timezone specified', () => {
      localStorageMock.getItem.mockReturnValue('America/New_York');
      const testDate = '2024-01-15T10:30:00Z';
      const result = formatDateInUserTimezone(testDate);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle invalid timezone gracefully', () => {
      const testDate = '2024-01-15T10:30:00Z';
      const result = formatDateInUserTimezone(testDate, 'Invalid/Timezone');
      
      // Should still return a formatted date (fallback to local)
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatDateForTable', () => {
    it('should return "Never" for null/undefined dates', () => {
      expect(formatDateForTable(undefined)).toBe('Never');
      expect(formatDateForTable(null as any)).toBe('Never');
    });

    it('should format valid dates for table display', () => {
      const testDate = '2024-01-15T10:30:00Z';
      const result = formatDateForTable(testDate, 'UTC');
      
      expect(result).toBeDefined();
      expect(result).not.toBe('Never');
      expect(typeof result).toBe('string');
    });
  });

  describe('formatDateDetailed', () => {
    it('should format date with seconds', () => {
      const testDate = '2024-01-15T10:30:00Z';
      const result = formatDateDetailed(testDate, 'UTC');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      // Should contain time with seconds
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe('getCurrentTimeInUserTimezone', () => {
    it('should return current time in specified timezone', () => {
      const result = getCurrentTimeInUserTimezone('UTC');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it('should fallback to local time on error', () => {
      const result = getCurrentTimeInUserTimezone('Invalid/Timezone');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('getTimezoneOffsetDisplay', () => {
    it('should return UTC for UTC timezone', () => {
      const result = getTimezoneOffsetDisplay('UTC');
      expect(result).toBe('UTC');
    });

    it('should return timezone name for invalid timezone', () => {
      const result = getTimezoneOffsetDisplay('Invalid/Timezone');
      expect(result).toBe('Invalid/Timezone');
    });
  });
});
