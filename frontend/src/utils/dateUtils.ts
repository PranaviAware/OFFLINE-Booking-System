import { format, parseISO, isBefore } from 'date-fns';

/**
 * Converts local date input (YYYY-MM-DD) and time input (HH:mm) into an exact ISO-8601 UTC string.
 */
export const toUTCISO = (dateStr: string, timeStr: string): string => {
  if (!dateStr || !timeStr) return '';
  const localDate = new Date(`${dateStr}T${timeStr}:00`);
  return localDate.toISOString();
};

/**
 * Formats a UTC ISO string into a local human-readable representation.
 */
export const formatUTCToLocal = (utcIsoStr: string, formatStr: string = 'PPp'): string => {
  if (!utcIsoStr) return '';
  try {
    const parsed = parseISO(utcIsoStr);
    return format(parsed, formatStr);
  } catch {
    return utcIsoStr;
  }
};

/**
 * Formats start and end UTC timestamps into a clean schedule block.
 */
export const formatBookingRange = (startUTC: string, endUTC: string): { date: string; time: string } => {
  try {
    const startDate = parseISO(startUTC);
    const endDate = parseISO(endUTC);
    return {
      date: format(startDate, 'EEE, MMM d, yyyy'),
      time: `${format(startDate, 'h:mm a')} – ${format(endDate, 'h:mm a')}`
    };
  } catch {
    return { date: startUTC, time: endUTC };
  }
};

/**
 * Checks if a UTC timestamp has passed.
 */
export const isBookingPast = (endUTC: string): boolean => {
  try {
    return isBefore(parseISO(endUTC), new Date());
  } catch {
    return false;
  }
};
