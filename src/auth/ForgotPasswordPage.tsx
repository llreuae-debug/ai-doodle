import { useState, type FormEvent } from 'react';
import { Link } from '../Link';
import { auth, isEmail } from '../services/auth';
import { AuthLayout } from './AuthLayout';
import { Field } from './Field';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(undefined);
    const problem = !email.trim() ? 'Enter your email.' : !isEmail(email) ? 'Enter a valid email, like name@example.com.' : undefined;
    setError(problem);
    if (problem) return;
    setBusy(true);
    try {
      await auth.requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout pageTitle="Forgot password" title="Forgot Password" subtitle="Please enter your details." narrow>
      {sent ? (
        <p className="auth-note" role="status">
          If an account uses {email.trim()}, a reset link is on its way. Check your inbox.
        </p>
      ) : (
        <form className="auth-form" noValidate onSubmit={submit}>
          {formError && (
            <p className="auth-alert" role="alert">
              {formError}
            </p>
          )}
          <Field id="email" label="Email" error={error}>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'email-error' : undefined}
            />
          </Field>
          <button type="submit" className="btn-auth" disabled={busy}>
            {busy ? 'Sending…' : 'Recover password'}
          </button>
        </form>
      )}
      <p className="auth-switch">
        Have an account?{' '}
        <Link to="/login" className="link">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
