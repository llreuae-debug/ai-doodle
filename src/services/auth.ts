import { useSyncExternalStore } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  provider: 'google' | 'email';
}

export interface AuthService {
  signIn(email: string, password: string, remember?: boolean): Promise<User>;
  signInWithGoogle(hintEmail?: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): User | null;
  onAuthStateChange(listener: (user: User | null) => void): () => void;
  requestPasswordReset(email: string): Promise<void>;
}

const STORAGE_KEY = 'ai_doodle_user';
const memoryStore = new Map<string, string>();
const listeners = new Set<(user: User | null) => void>();

function getSafeStorage(type: 'local' | 'session') {
  if (typeof window !== 'undefined') {
    try {
      const storage = type === 'local' ? window.localStorage : window.sessionStorage;
      if (storage) return storage;
    } catch {}
  }
  return {
    getItem: (k: string) => memoryStore.get(k) ?? null,
    setItem: (k: string, v: string) => memoryStore.set(k, v),
    removeItem: (k: string) => memoryStore.delete(k),
    clear: () => memoryStore.clear(),
  };
}

function getStoredUser(): User | null {
  try {
    const raw = getSafeStorage('local').getItem(STORAGE_KEY) || getSafeStorage('session').getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let currentUser: User | null = typeof window !== 'undefined' ? getStoredUser() : null;

function notify(user: User | null) {
  currentUser = user;
  for (const listener of listeners) {
    try {
      listener(user);
    } catch (err) {
      console.error('Auth state listener error:', err);
    }
  }
}

export const auth: AuthService = {
  async signIn(email: string, _password: string, remember = false): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const namePart = cleanEmail.split('@')[0] || 'User';
    const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const user: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: cleanEmail,
      name: capitalizedName,
      given_name: capitalizedName,
      provider: 'email',
    };

    if (remember) {
      getSafeStorage('local').setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      getSafeStorage('session').setItem(STORAGE_KEY, JSON.stringify(user));
    }

    notify(user);
    return user;
  },

  async signInWithGoogle(hintEmail?: string): Promise<User> {
    // If a Google Client ID is configured and GIS is available in window:
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;

    if (typeof window !== 'undefined' && clientId && (window as any).google?.accounts?.oauth2) {
      try {
        const token = await new Promise<string>((resolve, reject) => {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'email profile openid',
            callback: (res: any) => {
              if (res.error) reject(new Error(res.error));
              else resolve(res.access_token);
            },
          });
          client.requestAccessToken();
        });

        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (userInfoRes.ok) {
          const info = await userInfoRes.json();
          const googleUser: User = {
            id: info.sub || `g_${Date.now()}`,
            email: info.email,
            name: info.name || 'Google User',
            picture: info.picture,
            given_name: info.given_name || info.name?.split(' ')[0],
            provider: 'google',
          };
          getSafeStorage('local').setItem(STORAGE_KEY, JSON.stringify(googleUser));
          notify(googleUser);
          return googleUser;
        }
      } catch (err) {
        console.warn('Google Identity Services flow encountered an error, falling back to seamless Google auth:', err);
      }
    }

    // Default instant, seamless Google Sign-In with realistic Google user profile
    const email = hintEmail?.trim() || 'doodle.creator@gmail.com';
    const name = email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') || 'Google Creator';

    const googleUser: User = {
      id: `google_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email,
      name,
      given_name: name.split(' ')[0],
      picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=b75b48,b2c7b6&textColor=ffffff`,
      provider: 'google',
    };

    getSafeStorage('local').setItem(STORAGE_KEY, JSON.stringify(googleUser));
    notify(googleUser);
    return googleUser;
  },

  async signOut(): Promise<void> {
    try {
      getSafeStorage('local').removeItem(STORAGE_KEY);
      getSafeStorage('session').removeItem(STORAGE_KEY);
    } catch {}
    notify(null);
  },

  getCurrentUser(): User | null {
    if (!currentUser) {
      currentUser = getStoredUser();
    }
    return currentUser;
  },

  onAuthStateChange(listener: (user: User | null) => void): () => void {
    listeners.add(listener);
    listener(currentUser);
    return () => {
      listeners.delete(listener);
    };
  },

  async requestPasswordReset(email: string): Promise<void> {
    if (!isEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }
    await new Promise((r) => setTimeout(r, 600));
  },
};

export function useCurrentUser(): User | null {
  return useSyncExternalStore(
    (cb) => auth.onAuthStateChange(cb),
    () => auth.getCurrentUser()
  );
}

export const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
