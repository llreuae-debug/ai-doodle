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
        <button type="submit" className="btn-auth" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
