import { useEffect, type ReactNode } from 'react';
import { Logomark } from '../brand/Logomark';
import './auth.css';

const YEAR = new Date().getFullYear();

interface Props {
  /** Browser tab title. */
  pageTitle: string;
  title: string;
  subtitle: string;
  /** Narrow forms (one field) hug their content, like the login page's sibling screens. */
  narrow?: boolean;
  children: ReactNode;
}

/** Split auth screen: form column on the left, doodle wall fading in on the right. */
export function AuthLayout({ pageTitle, title, subtitle, narrow, children }: Props) {
  useEffect(() => {
    document.title = `${pageTitle} · Ai Doodle`;
  }, [pageTitle]);

  return (
    <div className="auth">
      <div className="auth-art" aria-hidden="true" />
      <div className="auth-container">
        <main className="auth-main">
          <div className="auth-box">
            <Logomark className="auth-logo" />
            <div className={narrow ? 'auth-block narrow' : 'auth-block'}>
              <h1 className="auth-title">{title}</h1>
              <p className="auth-subtitle">{subtitle}</p>
              {children}
            </div>
          </div>
        </main>
        <footer className="auth-footer">© Ai Doodle {YEAR}</footer>
      </div>
    </div>
  );
}
