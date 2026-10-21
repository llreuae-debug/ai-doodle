/**
 * Cookie Consent & Privacy Preference Management
 * Strictly complies with GDPR/ePrivacy and Google AdSense consent requirements.
 */

export interface ConsentPreferences {
  essential: boolean; // Always true
  analytics: boolean;
  advertising: boolean;
  timestamp: number;
  version: number;
}

const STORAGE_KEY = 'ai_doodle_cookie_consent_v1';
const CONSENT_VERSION = 1;

export const DEFAULT_CONSENT: ConsentPreferences = {
  essential: true,
  analytics: false,
  advertising: false,
  timestamp: 0,
  version: CONSENT_VERSION,
};

const listeners = new Set<(prefs: ConsentPreferences) => void>();

export function getConsentPreferences(): ConsentPreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentPreferences;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConsentPreferences(prefs: { analytics: boolean; advertising: boolean }): ConsentPreferences {
  const fullPrefs: ConsentPreferences = {
    essential: true,
    analytics: prefs.analytics,
    advertising: prefs.advertising,
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullPrefs));
  } catch (err) {
    console.warn('Failed to save cookie consent to localStorage', err);
  }

  for (const listener of listeners) {
    listener(fullPrefs);
  }

  // Dispatch custom window event
  window.dispatchEvent(new CustomEvent('ai_doodle_consent_change', { detail: fullPrefs }));

  return fullPrefs;
}

export function acceptAllCookies(): ConsentPreferences {
  return saveConsentPreferences({ analytics: true, advertising: true });
}

export function rejectOptionalCookies(): ConsentPreferences {
  return saveConsentPreferences({ analytics: false, advertising: false });
}

export function subscribeToConsent(listener: (prefs: ConsentPreferences) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
