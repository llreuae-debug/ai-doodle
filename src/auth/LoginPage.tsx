import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from '../Link';
import { navigate } from '../router';
import { auth, isEmail } from '../services/auth';
import { AuthLayout } from './AuthLayout';
import { Field } from './Field';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);

  const handleGoogleSignIn = async () => {
    setBusyGoogle(true);
    setErrors({});
    try {
      await auth.signInWithGoogle();
      navigate('/');
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Google sign-in could not be completed.' });
    } finally {
      setBusyGoogle(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = {
      email: !email.trim() ? 'Enter your email.' : !isEmail(email) ? 'Enter a valid email, like name@example.com.' : undefined,
      password: password ? undefined : 'Enter your password.',
    };
    setErrors(next);
    if (next.email || next.password) return;
    setBusy(true);
    try {
      await auth.signIn(email.trim(), password, remember);
      navigate('/');
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout pageTitle="Log in" title="Welcome back" subtitle="Welcome back! Please enter your details.">
      <div className="auth-actions-top">
        <button
          type="button"
          id="btn-google-login"
          className="btn-google"
          onClick={handleGoogleSignIn}
          disabled={busy || busyGoogle}
          aria-label="Continue with Google"
        >
          <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{busyGoogle ? 'Connecting to Google…' : 'Continue with Google'}</span>
        </button>

        <div className="auth-divider">
          <span>or continue with email</span>
        </div>
      </div>

      <form className="auth-form" noValidate onSubmit={submit}>
        {errors.form && (
          <p className="auth-alert" role="alert">
            {errors.form}
          </p>
        )}
        <Field id="email" label="Email" error={errors.email}>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
        </Field>
        <Field id="password" label="Password" error={errors.password}>
          <div className="input-wrap">
            <input
              id="password"
              className="input has-icon"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              className="input-icon"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </Field>
        <div className="auth-row">
          <label className="check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember for 30 days
          </label>
          <Link to="/forgot-password" className="link">
            Forgot password
          </Link>
        </div>
        <button type="submit" className="btn-auth" disabled={busy || busyGoogle}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
