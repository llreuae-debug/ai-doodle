import { LogIn, LogOut, ShieldCheck, Sparkles, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { auth, type User } from '../services/auth';
import { Modal } from './modals';
import { navigate } from '../router';

interface Props {
  user: User | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export function AccountModal({ user, onClose, onToast }: Props) {
  const [busyGoogle, setBusyGoogle] = useState(false);

  const handleGoogleLogin = async () => {
    setBusyGoogle(true);
    try {
      const loggedUser = await auth.signInWithGoogle();
      onToast(`Welcome, ${loggedUser.name}! Signed in with Google.`);
      onClose();
    } catch {
      onToast('Google sign-in could not be completed.');
    } finally {
      setBusyGoogle(false);
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    onToast('You have signed out.');
    onClose();
  };

  return (
    <Modal
      title={user ? 'Your Account' : 'Account & Sync'}
      subtitle={user ? 'Manage your profile and connected identity' : 'Sign in to access your projects and synced assets'}
      icon={<UserIcon size={20} />}
      size="md"
      onClose={onClose}
    >
      <div className="account-modal-body">
        {user ? (
          <div className="account-card">
            <div className="account-avatar-wrap">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="account-avatar-img" />
              ) : (
                <div className="account-avatar-fallback">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="account-details">
              <h3 className="account-name">{user.name}</h3>
              <p className="account-email">{user.email}</p>
              <div className="account-badge">
                {user.provider === 'google' ? (
                  <>
                    <svg className="google-badge-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>Connected with Google</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Email Account</span>
                  </>
                )}
              </div>
            </div>

            <div className="account-actions">
              <button
                type="button"
                className="btn btn-secondary-3d"
                onClick={handleSignOut}
              >
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="account-guest-card">
            <div className="account-hero-pitch">
              <div className="pitch-icon">
                <Sparkles size={28} />
              </div>
              <h4>Sign in to Ai Doodle</h4>
              <p>
                Connect with Google to securely sync your whiteboard animations, access projects across devices, and export in 8K resolution.
              </p>
            </div>

            <div className="account-login-options">
              <button
                type="button"
                id="btn-modal-google"
                className="btn-google"
                onClick={handleGoogleLogin}
                disabled={busyGoogle}
              >
                <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>{busyGoogle ? 'Connecting…' : 'Continue with Google'}</span>
              </button>

              <button
                type="button"
                className="btn btn-ghost-3d"
                onClick={() => {
                  onClose();
                  navigate('/login');
                }}
              >
                <LogIn size={16} />
                <span>Sign in with Email</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
