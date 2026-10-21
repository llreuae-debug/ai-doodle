import { AlertCircle, CheckCircle2, ExternalLink, Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AiError, getAiStatus, setAiApiKey } from '../services/ai';
import { useDialog } from './modals';

interface ApiKeyModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Connects a Google Gemini key. The key is sent once to this app's server, checked with Google and
 * saved in the server's .env.local; the browser never stores it.
 */
export function ApiKeyModal({ onClose, onSaved }: ApiKeyModalProps) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, onClose);

  const checkStatus = async () => {
    try {
      setConfigured((await getAiStatus()).configured);
    } catch {
      setConfigured(false);
    }
  };

  useEffect(() => {
    void checkStatus();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = key.trim();
    if (!clean) return setMessage({ type: 'error', text: 'Enter your Google Gemini API key.' });
    setSaving(true);
    setMessage({ type: 'info', text: 'Checking the key with Google AI…' });
    try {
      await setAiApiKey(clean);
      setKey('');
      setMessage({ type: 'success', text: 'Key checked and saved. AI now uses it.' });
      await checkStatus();
      onSaved?.();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof AiError ? err.message : "Couldn't save the key. Try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="api-key-title">
      <div className="modal-card api-key-modal" ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="title-row">
            <div className="icon-badge">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 id="api-key-title">Google Gemini API Key</h2>
              <p className="subtitle">Connect your Google AI key to generate storyboards, doodles, voices and music.</p>
            </div>
          </div>
          <button type="button" className="btn icon ghost" data-close onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {configured === null ? null : configured ? (
            <div className="status-banner success" role="status">
              <CheckCircle2 size={18} />
              <div>
                <strong>AI is active and ready</strong>
                <p>The server has a Google AI key. Paste a new one below to replace it; it applies within a minute.</p>
              </div>
            </div>
          ) : (
            <div className="status-banner warning" role="status">
              <AlertCircle size={18} />
              <div>
                <strong>No API key on the server</strong>
                <p>Enter your Google Gemini key below to turn on story writing, doodles, voices and music.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="api-key-form">
            <label htmlFor="gemini-key-input" className="form-label">
              API Key
            </label>
            <div className="input-with-actions">
              <input
                id="gemini-key-input"
                type={showKey ? 'text' : 'password'}
                className="input-field"
                placeholder="AIzaSy…"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" className="btn icon ghost input-action-btn" onClick={() => setShowKey(!showKey)} title={showKey ? 'Hide key' : 'Show key'} aria-label={showKey ? 'Hide key' : 'Show key'}>
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {message && (
              <div className={`feedback-msg ${message.type}`} role="status">
                {message.type === 'error' && <AlertCircle size={16} />}
                {message.type === 'success' && <CheckCircle2 size={16} />}
                {message.type === 'info' && <Loader2 size={16} className="spin" />}
                <span>{message.text}</span>
              </div>
            )}

            <div className="helper-links">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer noopener" className="link-btn">
                <span>Get a free Google Gemini key</span>
                <ExternalLink size={14} />
              </a>
              <span className="privacy-note">The key is checked with Google and saved encrypted on this app's server, never in your browser.</span>
            </div>

            <div className="modal-actions">
              <div className="spacer" />
              <button type="button" className="btn" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={saving || !key.trim()}>
                {saving ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Checking…</span>
                  </>
                ) : (
                  <span>Save & Connect</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
