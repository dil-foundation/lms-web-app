/**
 * Date and timezone utility functions
 */

/**
 * Get timezone abbreviation for a given timezone
 */
export const getTimezoneAbbreviation = (timezone: string): string => {
  const timezoneMap: { [key: string]: string } = {
    // North America
    'America/New_York': 'EST',
    'America/Chicago': 'CST', 
    'America/Denver': 'MST',
    'America/Los_Angeles': 'PST',
    'America/Anchorage': 'AKST',
    'Pacific/Honolulu': 'HST',
    'America/Toronto': 'EST',
    'America/Vancouver': 'PST',
    'America/Montreal': 'EST',
    
    // Asia
    'Asia/Kolkata': 'IST',
    'Asia/Dubai': 'GST',
    'Asia/Tokyo': 'JST',
    'Asia/Shanghai': 'CST',
    'Asia/Seoul': 'KST',
    'Asia/Singapore': 'SGT',
    'Asia/Bangkok': 'ICT',
    'Asia/Manila': 'PHT',
    'Asia/Jakarta': 'WIB',
    'Asia/Kuala_Lumpur': 'MYT',
    'Asia/Ho_Chi_Minh': 'ICT',
    'Asia/Hong_Kong': 'HKT',
    'Asia/Taipei': 'CST',
    
    // Europe
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
    'Europe/Berlin': 'CET',
    'Europe/Moscow': 'MSK',
    'Europe/Rome': 'CET',
    'Europe/Madrid': 'CET',
    'Europe/Amsterdam': 'CET',
    'Europe/Brussels': 'CET',
    'Europe/Vienna': 'CET',
    'Europe/Zurich': 'CET',
    'Europe/Stockholm': 'CET',
    'Europe/Oslo': 'CET',
    'Europe/Copenhagen': 'CET',
    'Europe/Helsinki': 'EET',
    'Europe/Warsaw': 'CET',
    'Europe/Prague': 'CET',
    'Europe/Budapest': 'CET',
    'Europe/Bucharest': 'EET',
    'Europe/Sofia': 'EET',
    'Europe/Athens': 'EET',
    'Europe/Istanbul': 'TRT',
    
    // Australia/Oceania
    'Australia/Sydney': 'AEST',
    'Australia/Perth': 'AWST',
    'Australia/Melbourne': 'AEST',
    'Australia/Brisbane': 'AEST',
    'Australia/Adelaide': 'ACST',
    'Pacific/Auckland': 'NZST',
    'Pacific/Fiji': 'FJT',
    
    // Africa
    'Africa/Cairo': 'EET',
    'Africa/Johannesburg': 'SAST',
    'Africa/Lagos': 'WAT',
    'Africa/Nairobi': 'EAT',
    'Africa/Casablanca': 'WET',
    
    // South America
    'America/Sao_Paulo': 'BRT',
    'America/Buenos_Aires': 'ART',
    'America/Santiago': 'CLT',
    'America/Lima': 'PET',
    'America/Bogota': 'COT',
    'America/Mexico_City': 'CST',
  };
  
  return timezoneMap[timezone] || timezone.split('/').pop()?.substring(0, 3).toUpperCase() || 'UTC';
};

/**
 * Format timestamp with timezone information
 */
export const formatTimestampWithTimezone = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Format the date with timezone
    const formattedDate = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
      timeZone: userTimezone
    });
    
    // Get timezone abbreviation
    const timezoneAbbr = getTimezoneAbbreviation(userTimezone);
    
    return `${formattedDate} ${timezoneAbbr}`;
  } catch (error) {
    console.error('Error formatting timestamp with timezone:', error);
    return new Date(timestamp).toLocaleString();
  }
};

/**
 * Format timestamp for relative time (e.g., "2h ago", "3d ago")
 */
export const formatRelativeTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Recently';
    }
    
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  } catch (error) {
    console.error('Error formatting relative time:', error, timestamp);
    return 'Recently';
  }
};

/**
 * Get current user timezone
 */
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Get current user timezone abbreviation
 */
export const getUserTimezoneAbbreviation = (): string => {
  const timezone = getUserTimezone();
  return getTimezoneAbbreviation(timezone);
};
