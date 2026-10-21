export interface AuthService {
  signIn(email: string, password: string, remember: boolean): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
}

/**
 * Phase 1 stand-in. There are no accounts yet (single user), so signing in just opens the editor
 * and password reset says it isn't available. Phase 2 replaces this with Supabase Auth.
 */
export const auth: AuthService = {
  async signIn() {},
  async requestPasswordReset() {
    throw new Error("Password reset isn't connected yet. It arrives with accounts in Phase 2.");
  },
};

export const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
