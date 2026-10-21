import App from './App';
import { ForgotPasswordPage } from './auth/ForgotPasswordPage';
import { LoginPage } from './auth/LoginPage';
import { usePath } from './router';

export default function Root() {
  const path = usePath();
  if (path === '/login') return <LoginPage />;
  if (path === '/forgot-password') return <ForgotPasswordPage />;
  return <App />;
}
