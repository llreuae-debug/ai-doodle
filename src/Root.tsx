import App from './App';
import { ForgotPasswordPage } from './auth/ForgotPasswordPage';
import { LoginPage } from './auth/LoginPage';
import { usePath } from './router';
import { HowItWorksPage } from './site/HowItWorksPage';
import { BlogIndexPage } from './site/BlogIndexPage';
import { BlogPostPage } from './site/BlogPostPage';
import { AboutPage } from './site/AboutPage';
import { ContactPage } from './site/ContactPage';
import { PrivacyPolicyPage } from './site/PrivacyPolicyPage';
import { TermsOfServicePage } from './site/TermsOfServicePage';
import { CookiePolicyPage } from './site/CookiePolicyPage';
import { NotFoundPage } from './site/NotFoundPage';

export default function Root() {
  const path = usePath();

  // Core Tool / Homepage
  if (path === '/' || path === '') {
    return <App />;
  }

  // Educational & User Guides
  if (path === '/how-it-works') {
    return <HowItWorksPage />;
  }

  // Blog Index
  if (path === '/blog') {
    return <BlogIndexPage />;
  }

  // Blog Single Post
  if (path.startsWith('/blog/')) {
    const slug = path.replace('/blog/', '').replace(/\/$/, '');
    if (slug) {
      return <BlogPostPage slug={slug} />;
    }
    return <BlogIndexPage />;
  }

  // Trust & Info Pages
  if (path === '/about') {
    return <AboutPage />;
  }
  if (path === '/contact') {
    return <ContactPage />;
  }
  if (path === '/privacy-policy') {
    return <PrivacyPolicyPage />;
  }
  if (path === '/terms-of-service') {
    return <TermsOfServicePage />;
  }
  if (path === '/cookie-policy') {
    return <CookiePolicyPage />;
  }

  // Auth pages
  if (path === '/login') {
    return <LoginPage />;
  }
  if (path === '/forgot-password') {
    return <ForgotPasswordPage />;
  }

  // Explicit 404 and all unhandled routes
  return <NotFoundPage />;
}
