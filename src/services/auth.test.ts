import { beforeEach, describe, expect, it } from 'vitest';
import { auth, isEmail } from './auth';

describe('auth service', () => {
  beforeEach(async () => {
    await auth.signOut();
  });

  it('validates email addresses properly', () => {
    expect(isEmail('hello@example.com')).toBe(true);
    expect(isEmail('user.name+tag@sub.domain.co')).toBe(true);
    expect(isEmail('invalid')).toBe(false);
    expect(isEmail('invalid@')).toBe(false);
    expect(isEmail('@domain.com')).toBe(false);
  });

  it('signs in with email and persists session', async () => {
    const user = await auth.signIn('test.artist@aidoodle.art', 'password123', true);
    expect(user.email).toBe('test.artist@aidoodle.art');
    expect(user.provider).toBe('email');
    expect(auth.getCurrentUser()?.email).toBe('test.artist@aidoodle.art');
  });

  it('signs in with Google and persists session', async () => {
    const user = await auth.signInWithGoogle('creator.pro@gmail.com');
    expect(user.provider).toBe('google');
    expect(user.email).toBe('creator.pro@gmail.com');
    expect(user.name).toBe('Creator Pro');
    expect(user.picture).toContain('https://api.dicebear.com');
    expect(auth.getCurrentUser()?.provider).toBe('google');
  });

  it('signs out properly', async () => {
    await auth.signInWithGoogle('signout.test@gmail.com');
    expect(auth.getCurrentUser()).not.toBeNull();
    await auth.signOut();
    expect(auth.getCurrentUser()).toBeNull();
  });

  it('notifies auth state listeners', async () => {
    const states: (string | undefined)[] = [];
    const unsubscribe = auth.onAuthStateChange((user) => {
      states.push(user?.email);
    });

    await auth.signInWithGoogle('notified@gmail.com');
    await auth.signOut();

    unsubscribe();
    expect(states).toContain('notified@gmail.com');
    expect(states[states.length - 1]).toBeUndefined();
  });
});
