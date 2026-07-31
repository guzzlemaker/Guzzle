import { getElapsedBucket } from './ranking.js';

const LOCAL_ANALYTICS_KEY = 'guzzle:analytics-events';
const BLOCKED_KEYS = new Set(['answer', 'guess', 'email', 'normalizedEmail']);

export function recordAnalyticsEvent(eventName, details = {}) {
  try {
    const safeDetails = sanitizeAnalyticsDetails(details);

    if (import.meta.env?.PROD && import.meta.env?.VITE_VERCEL_ANALYTICS_ENABLED !== 'false') {
      import('@vercel/analytics')
        .then(({ track }) => track(eventName, safeDetails))
        .catch(() => {});
    }

    const currentEvents = JSON.parse(window.localStorage.getItem(LOCAL_ANALYTICS_KEY) ?? '[]');
    window.localStorage.setItem(
      LOCAL_ANALYTICS_KEY,
      JSON.stringify([
        ...currentEvents.slice(-199),
        {
          eventName,
          details: safeDetails,
          timestamp: new Date().toISOString(),
        },
      ]),
    );
  } catch {
    // Analytics must never interrupt gameplay.
  }
}

export function sanitizeAnalyticsDetails(details) {
  return Object.entries(details).reduce((safeDetails, [key, value]) => {
    if (BLOCKED_KEYS.has(key)) {
      return safeDetails;
    }

    if (key === 'timeMs' || key === 'elapsedMilliseconds') {
      safeDetails.elapsedTimeBucket = getElapsedBucket(value);
      return safeDetails;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      safeDetails[key] = value;
    }

    return safeDetails;
  }, {});
}
