// src/lib/auth.js
//
// OAuth flow for Tauri — loopback redirect, no deep-link plugin.
//
// Flow:
//   1. JS calls Rust command `start_oauth_listener` → gets back the bound port.
//   2. JS opens the Google consent URL in the system browser via opener plugin.
//   3. Google redirects to http://127.0.0.1:{port}/oauth/callback?code=…
//   4. Rust captures the code, serves a "you can close this tab" page,
//      emits Tauri event `oauth://code` with { code } or { error }.
//   5. JS receives the event, POSTs to the Cloudflare Worker, stores tokens.

import { get, set, del } from './idb.js';

const CLIENT_ID      = '683800181639-9f3sqmubhckpvtlgdon4rl9uq1ocqgb3.apps.googleusercontent.com';
                         
const SCOPE = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');
const TOKEN_KEY      = 'googleTokens';
const VERIFIER_KEY   = 'pkce_verifier';
const TOKEN_ENDPOINT = 'https://wfmarket-worker.warframe-tracker.workers.dev/oauth/token';

const { invoke } = window.__TAURI_INTERNALS__;
const { listen } = window.__TAURI__.event;
// tauri-plugin-opener exposes openUrl via the opener plugin
const { openUrl }  = window.__TAURI__.opener;

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function base64urlEncode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function generateCodeVerifier() {
  return base64urlEncode(crypto.getRandomValues(new Uint8Array(64)));
}
async function generateCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64urlEncode(digest);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function isConnected() {
  const tokens = await get(TOKEN_KEY);
  if (!tokens?.access_token) return false;
  return Date.now() < (tokens.expires_at - 60_000);
}

export async function startOAuthFlow() {
  const verifier  = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  await set(VERIFIER_KEY, verifier);

  // Ask Rust to bind a one-shot TCP listener; it returns the actual bound port.
  const port        = await invoke('start_oauth_listener');
  const redirectUri = `http://127.0.0.1:${port}/oauth/callback`;

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    redirect_uri:          redirectUri,
    response_type:         'code',
    scope:                 SCOPE,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    access_type:           'offline',
    prompt:                'consent',
  });

  // Open the consent screen in the user's default browser (not the webview).
  await openUrl(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);

  // Wait for Rust to emit the auth code (timeout after 5 minutes).
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unlisten.then(fn => fn());
      reject(new Error('OAuth timeout — no response within 5 minutes'));
    }, 300_000);

    const unlisten = listen('oauth://code', event => {
      clearTimeout(timer);
      unlisten.then(fn => fn());
      if (event.payload?.error) reject(new Error(event.payload.error));
      else                      resolve(event.payload.code);
    });
  });

  // Exchange the code for tokens via the Cloudflare Worker.
  const storedVerifier = await get(VERIFIER_KEY);
  await del(VERIFIER_KEY);

  const body = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  redirectUri,
    grant_type:    'authorization_code',
    code,
    code_verifier: storedVerifier,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${err.error_description ?? res.status}`);
  }

  const data = await res.json();

  await set(TOKEN_KEY, {
    access_token:  data.access_token,
    refresh_token: data.refresh_token ?? null,
    expires_at:    Date.now() + (data.expires_in * 1000),
  });
}

export async function getAccessToken() {
  const tokens = await get(TOKEN_KEY);
  if (!tokens) throw new Error('Not connected to Google');

  if (Date.now() < (tokens.expires_at - 60_000)) return tokens.access_token;

  if (!tokens.refresh_token) throw new Error('No refresh token — user must reconnect');

  const body = new URLSearchParams({
    client_id:     CLIENT_ID,
    grant_type:    'refresh_token',
    refresh_token: tokens.refresh_token,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    await del(TOKEN_KEY);
    throw new Error('Token refresh failed — user must reconnect');
  }

  const data    = await res.json();
  const updated = {
    ...tokens,
    access_token: data.access_token,
    expires_at:   Date.now() + (data.expires_in * 1000),
    ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
  };

  await set(TOKEN_KEY, updated);
  return updated.access_token;
}

export async function disconnect() {
  await del(TOKEN_KEY);
  await del('userProfile');
}

export async function getUserProfile() {
  const cached = await get('userProfile');
  if (cached?.expires_at && Date.now() < cached.expires_at) return cached;

  const token = await getAccessToken();
  const res   = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch profile');

  const data   = await res.json();
  await set('userProfile', { ...data, expires_at: Date.now() + 3_600_000 });
  return data;
}

export async function getConnectedEmail() {
  try   { return (await getUserProfile()).email; }
  catch { return null; }
}
