import { useEffect, useState } from 'react';
import {
  acceptAllCookies,
  getConsentPreferences,
  rejectOptionalCookies,
  saveConsentPreferences,
  subscribeToConsent,
  type ConsentPreferences,
} from './consent';
import { ShieldCheck, Sliders, X } from 'lucide-react';

interface CookieConsentProps {
  forceOpenModal?: boolean;
  onCloseModal?: () => void;
}

export function CookieConsent({ forceOpenModal, onCloseModal }: CookieConsentProps) {
  const [consent, setConsent] = useState<ConsentPreferences | null>(() => getConsentPreferences());
  const [showModal, setShowModal] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);

  useEffect(() => {
    return subscribeToConsent((newPrefs) => {
      setConsent(newPrefs);
      setAnalytics(newPrefs.analytics);
      setAdvertising(newPrefs.advertising);
    });
  }, []);

  useEffect(() => {
    if (forceOpenModal) {
      const current = getConsentPreferences();
      setAnalytics(current?.analytics ?? false);
      setAdvertising(current?.advertising ?? false);
      setShowModal(true);
    }
  }, [forceOpenModal]);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setShowModal(false);
    onCloseModal?.();
  };

  const handleRejectOptional = () => {
    rejectOptionalCookies();
    setShowModal(false);
    onCloseModal?.();
  };

  const handleSaveCustom = () => {
    saveConsentPreferences({ analytics, advertising });
    setShowModal(false);
    onCloseModal?.();
  };

  const openCustomize = () => {
    const current = getConsentPreferences();
    setAnalytics(current?.analytics ?? false);
    setAdvertising(current?.advertising ?? false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    onCloseModal?.();
  };

  const isBannerVisible = consent === null && !showModal;

  return (
    <>
      {isBannerVisible && (
        <aside
          role="region"
          aria-label="Cookie consent banner"
          className="cookie-banner-wrap"
        >
          <div className="cookie-banner-inner">
            <div className="cookie-banner-content">
              <div className="cookie-banner-header">
                <ShieldCheck size={20} className="cookie-banner-icon" aria-hidden="true" />
                <h3 className="cookie-banner-title">Your Privacy & Cookie Choices</h3>
              </div>
              <p className="cookie-banner-text">
                We use cookies and local storage to keep Ai Doodle functional, remember your project work, and provide optimal performance. Optional analytics and advertising cookies help us improve the tool and support ongoing development with your consent. Read our{' '}
                <a href="/cookie-policy" className="cookie-link">Cookie Policy</a> and{' '}
                <a href="/privacy-policy" className="cookie-link">Privacy Policy</a>.
              </p>
            </div>
            <div className="cookie-banner-actions">
              <button
                type="button"
                className="btn-site btn-site-outline btn-site-sm"
                onClick={openCustomize}
              >
                <Sliders size={15} />
                Manage Preferences
              </button>
              <button
                type="button"
                className="btn-site btn-site-ghost btn-site-sm"
                onClick={handleRejectOptional}
              >
                Reject Optional
              </button>
              <button
                type="button"
                className="btn-site btn-site-primary btn-site-sm"
                onClick={handleAcceptAll}
              >
                Accept All
              </button>
            </div>
          </div>
        </aside>
      )}

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
          className="cookie-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="cookie-modal-card">
            <div className="cookie-modal-header">
              <div>
                <h2 id="cookie-modal-title" className="cookie-modal-title">Cookie & Privacy Preferences</h2>
                <p className="cookie-modal-subtitle">Customize which cookies and data processing permissions you grant to Ai Doodle.</p>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={closeModal}
                aria-label="Close preferences modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="cookie-modal-body">
              {/* Category 1: Essential */}
              <div className="cookie-category">
                <div className="cookie-category-header">
                  <div>
                    <h3 className="cookie-category-title">
                      Strictly Essential Cookies & Storage
                      <span className="badge-essential">Always Active</span>
                    </h3>
                    <p className="cookie-category-desc">
                      Required for the whiteboard canvas, local project storage (IndexedDB / localStorage), session security, and basic interface controls. The tool cannot function without these.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked
                    disabled
                    aria-label="Strictly essential cookies, always active"
                    className="toggle-checkbox"
                  />
                </div>
              </div>

              {/* Category 2: Analytics */}
              <div className="cookie-category">
                <div className="cookie-category-header">
                  <div>
                    <h3 className="cookie-category-title">Analytics & Usage Metrics</h3>
                    <p className="cookie-category-desc">
                      Help us understand which drawing tools, templates, and guides are most useful, allowing us to fix crashes and optimize export rendering speeds.
                    </p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={analytics}
                      onChange={(e) => setAnalytics(e.target.checked)}
                      aria-label="Enable analytics cookies"
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {/* Category 3: Advertising */}
              <div className="cookie-category">
                <div className="cookie-category-header">
                  <div>
                    <h3 className="cookie-category-title">Personalized Advertising (Google AdSense)</h3>
                    <p className="cookie-category-desc">
                      Allows Google and certified advertising partners to deliver relevant non-intrusive ads that sustain free access to Ai Doodle without subscriptions.
                    </p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={advertising}
                      onChange={(e) => setAdvertising(e.target.checked)}
                      aria-label="Enable advertising cookies"
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="cookie-modal-footer">
              <button
                type="button"
                className="btn-site btn-site-ghost"
                onClick={handleRejectOptional}
              >
                Reject All Non-Essential
              </button>
              <div className="cookie-modal-footer-right">
                <button
                  type="button"
                  className="btn-site btn-site-outline"
                  onClick={handleSaveCustom}
                >
                  Save My Preferences
                </button>
                <button
                  type="button"
                  className="btn-site btn-site-primary"
                  onClick={handleAcceptAll}
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
