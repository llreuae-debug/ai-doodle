import { AlertCircle, CheckCircle2, ExternalLink, Eye, EyeOff, KeyRound, Loader2, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getClientApiKey, setClientApiKey, testApiKey, getAiStatus } from '../services/ai';

interface ApiKeyModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

export function ApiKeyModal({ onClose, onSaved }: ApiKeyModalProps) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ configured: boolean; provider: string | null; keySource?: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    const existing = getClientApiKey();
    if (existing) {
      setKey(existing);
    }
    void checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const s = await getAiStatus();
      setStatus({ ...s, keySource: getClientApiKey() ? 'browser' : 'server' });
    } catch {
      const k = getClientApiKey();
      setStatus({ configured: !!k, provider: 'gemini', keySource: k ? 'browser' : 'none' });
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = key.trim();
    if (!cleanKey) {
      setMessage({ type: 'error', text: 'Please enter a valid Google Gemini API key.' });
      return;
    }

    setTesting(true);
    setMessage({ type: 'info', text: 'Validating key with Google AI...' });

    try {
      const testRes = await testApiKey(cleanKey);
      if (testRes.ok) {
        setClientApiKey(cleanKey);
        setMessage({ type: 'success', text: `Key verified successfully! Using model: ${testRes.model}` });
        await checkStatus();
        if (onSaved) onSaved();
      } else {
        setMessage({ type: 'error', text: testRes.error || 'Google AI rejected this key. Please check it and try again.' });
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to validate key.' });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    setClientApiKey('');
    setKey('');
    setMessage({ type: 'info', text: 'API key removed from browser storage.' });
    void checkStatus();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="api-key-title">
      <div className="modal-card api-key-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="title-row">
            <div className="icon-badge">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 id="api-key-title">Google Gemini API Key</h2>
              <p className="subtitle">Connect your Google AI key to generate storyboards, vector doodles, and voiceovers.</p>
            </div>
          </div>
          <button type="button" className="btn icon ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {status?.configured ? (
            <div className="status-banner success" role="status">
              <CheckCircle2 size={18} />
              <div>
                <strong>AI is active and ready</strong>
                <p>Configured via {status.keySource === 'browser' ? 'browser storage' : 'environment file'}. All AI features are enabled.</p>
              </div>
            </div>
          ) : (
            <div className="status-banner warning" role="status">
              <AlertCircle size={18} />
              <div>
                <strong>No API key active</strong>
                <p>Enter your Google Gemini key below to enable AI story writing, doodle creation, and narration.</p>
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
                placeholder="AIzaSy... or AQ..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="btn icon ghost input-action-btn"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide key' : 'Show key'}
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
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
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer noopener"
                className="link-btn"
              >
                <span>Get a free Google Gemini key</span>
                <ExternalLink size={14} />
              </a>
              <span className="privacy-note">Keys are stored locally in your browser and used only for Google AI calls.</span>
            </div>

            <div className="modal-actions">
              {key && (
                <button type="button" className="btn ghost danger" onClick={handleClear} disabled={testing}>
                  <Trash2 size={16} />
                  <span>Remove</span>
                </button>
              )}
              <div className="spacer" />
              <button type="button" className="btn" onClick={onClose} disabled={testing}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={testing || !key.trim()}>
                {testing ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Verifying…</span>
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
