import { useState, useEffect } from 'react';

export interface GeoLocationData {
  countryCode: string;
  countryName: string;
  region: string;
  city: string;
  currency: string;
  timezone: string;
  isEU: boolean;
  isUS: boolean;
}

// Mapping pays -> devise
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // EU countries
  AT: 'EUR', BE: 'EUR', BG: 'BGN', HR: 'EUR', CY: 'EUR', CZ: 'CZK',
  DK: 'DKK', EE: 'EUR', FI: 'EUR', FR: 'EUR', DE: 'EUR', GR: 'EUR',
  HU: 'HUF', IE: 'EUR', IT: 'EUR', LV: 'EUR', LT: 'EUR', LU: 'EUR',
  MT: 'EUR', NL: 'EUR', PL: 'PLN', PT: 'EUR', RO: 'RON', SK: 'EUR',
  SI: 'EUR', ES: 'EUR', SE: 'SEK',
  // US
  US: 'USD',
  // Other
  GB: 'GBP', CA: 'CAD', AU: 'AUD', JP: 'JPY', CH: 'CHF',
};

const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 
  'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 
  'RO', 'SK', 'SI', 'ES', 'SE'
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI',
  'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI',
  'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC',
  'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT',
  'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const DEFAULT_GEO: GeoLocationData = {
  countryCode: 'FR',
  countryName: 'France',
  region: '',
  city: '',
  currency: 'EUR',
  timezone: 'Europe/Paris',
  isEU: true,
  isUS: false,
};

export const useGeoLocation = () => {
  const [geoData, setGeoData] = useState<GeoLocationData>(() => {
    // Check localStorage first
    const cached = localStorage.getItem('geo-location');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Check if cache is less than 24 hours old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      } catch {
        // Invalid cache
      }
    }
    return DEFAULT_GEO;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectLocation = async () => {
      try {
        // Use ip-api.com (free, no API key required)
        const response = await fetch('https://ip-api.com/json/?fields=status,country,countryCode,region,regionName,city,timezone');
        
        if (!response.ok) {
          throw new Error('Failed to fetch location');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
          const countryCode = data.countryCode || 'FR';
          const isEU = EU_COUNTRIES.includes(countryCode);
          const isUS = countryCode === 'US';
          
          const geoLocation: GeoLocationData = {
            countryCode,
            countryName: data.country || 'France',
            region: data.region || '',
            city: data.city || '',
            currency: COUNTRY_CURRENCY_MAP[countryCode] || 'EUR',
            timezone: data.timezone || 'Europe/Paris',
            isEU,
            isUS,
          };
          
          setGeoData(geoLocation);
          
          // Cache the result
          localStorage.setItem('geo-location', JSON.stringify({
            data: geoLocation,
            timestamp: Date.now()
          }));
        }
      } catch (err) {
        console.error('Geo location detection failed:', err);
        setError('Failed to detect location');
        // Keep default location
      } finally {
        setLoading(false);
      }
    };

    detectLocation();
  }, []);

  const getMarket = (): 'eu' | 'us' | 'other' => {
    if (geoData.isUS) return 'us';
    if (geoData.isEU) return 'eu';
    return 'other';
  };

  const getStateCode = (): string | null => {
    if (geoData.isUS && geoData.region && US_STATES.includes(geoData.region)) {
      return geoData.region;
    }
    return null;
  };

  return {
    geoData,
    loading,
    error,
    getMarket,
    getStateCode,
    isEU: geoData.isEU,
    isUS: geoData.isUS,
  };
};

// Utility function for getting country info without hook
export const detectCountryFromTimezone = (): string => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Map timezone to country code
  const timezoneToCountry: Record<string, string> = {
    'Europe/Paris': 'FR',
    'Europe/Berlin': 'DE',
    'Europe/London': 'GB',
    'Europe/Madrid': 'ES',
    'Europe/Rome': 'IT',
    'Europe/Amsterdam': 'NL',
    'Europe/Brussels': 'BE',
    'Europe/Vienna': 'AT',
    'Europe/Zurich': 'CH',
    'Europe/Warsaw': 'PL',
    'Europe/Prague': 'CZ',
    'Europe/Stockholm': 'SE',
    'Europe/Oslo': 'NO',
    'Europe/Copenhagen': 'DK',
    'Europe/Helsinki': 'FI',
    'Europe/Dublin': 'IE',
    'Europe/Lisbon': 'PT',
    'Europe/Athens': 'GR',
    'Europe/Budapest': 'HU',
    'Europe/Bucharest': 'RO',
    'America/New_York': 'US',
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'America/Los_Angeles': 'US',
    'America/Phoenix': 'US',
    'America/Toronto': 'CA',
    'America/Vancouver': 'CA',
    'Australia/Sydney': 'AU',
    'Australia/Melbourne': 'AU',
    'Asia/Tokyo': 'JP',
  };
  
  return timezoneToCountry[timezone] || 'FR';
};
