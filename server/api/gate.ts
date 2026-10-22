/**
 * The access-password page shown when ACCESS_PASSWORD is set and the visitor has no session yet.
 * Used by the Node servers (server/api/router.ts) and the Vercel proxy (proxy.ts). Self-contained:
 * nothing else on the site loads until the password is accepted.
 */
export const SESSION_COOKIE = 'ad_session';

export function gateHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Ai Doodle</title>
<style>
  :root { --accent: #7f56d9; --bg: #f9fafb; --panel: #fff; --fg: #101828; --muted: #475467; --line: #eaecf0; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0c111d; --panel: #161b26; --fg: #f5f5f6; --muted: #94969c; --line: #1f242f; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; }
  form { width: 100%; max-width: 380px; padding: 28px; border: 1px solid var(--line); border-radius: 16px; background: var(--panel); box-shadow: 0 12px 32px rgba(16,24,40,.08); }
  h1 { margin: 0 0 4px; font-size: 22px; }
  p { margin: 0 0 20px; color: var(--muted); font-size: 14px; }
  label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; }
  input { width: 100%; padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); color: var(--fg); font: inherit; }
  input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
  button { width: 100%; margin-top: 16px; padding: 11px; border: 0; border-radius: 10px; background: var(--accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  button:disabled { opacity: .6; cursor: progress; }
  .err { color: #d92d20; font-size: 14px; margin: 10px 0 0; min-height: 1.5em; }
</style>
</head>
<body>
<form id="f">
  <h1>Ai Doodle</h1>
  <p>This site is private. Enter the access password to continue.</p>
  <label for="pw">Access password</label>
  <input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
  <button id="go" type="submit">Continue</button>
  <p class="err" id="err" role="alert"></p>
</form>
<script>
  // Site is public; redirect directly to application
  if (typeof window !== 'undefined') {
    window.location.replace('/');
  }
  const f = document.getElementById('f'), go = document.getElementById('go'), err = document.getElementById('err');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    go.disabled = true; err.textContent = '';
    try {
      const r = await fetch('/api/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: f.password.value }) });
      if (r.ok) return location.reload();
      const d = await r.json().catch(() => ({}));
      err.textContent = d.message || 'That password is not right.';
    } catch { err.textContent = "Couldn't reach the server. Try again."; }
    go.disabled = false;
  });
</script>
</body>
</html>`;
}
