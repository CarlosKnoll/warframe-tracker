// src/lib/drive.js
// Google Drive appDataFolder helpers.
// All files are stored in the app's private appDataFolder —
// invisible to the user in their Google Drive UI.

import { getAccessToken } from './auth.js';

const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES_URL  = 'https://www.googleapis.com/drive/v3/files';
const SPACE            = 'appDataFolder';

// ── Internal helpers ──────────────────────────────────────────────────────────

async function authHeaders() {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
}

// Returns the Drive file ID for a given filename, or null if not found.
async function getFileId(filename) {
  const headers = await authHeaders();
  const params  = new URLSearchParams({
    spaces: SPACE,
    q:      `name = '${filename}'`,
    fields: 'files(id)',
  });

  const res = await fetch(`${DRIVE_FILES_URL}?${params}`, { headers });
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);

  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

// ── Public API ────────────────────────────────────────────────────────────────

// Upload (create or update) a file in appDataFolder.
// content must be a string (JSON.stringify before passing).
export async function driveUpload(filename, content) {
  const headers = await authHeaders();
  const existingId = await getFileId(filename);

  const metadata = { name: filename, ...(existingId ? {} : { parents: [SPACE] }) };
  const blob     = new Blob([content], { type: 'application/json' });

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const url = existingId
    ? `${DRIVE_UPLOAD_URL}/${existingId}?uploadType=multipart`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart`;

  const method = existingId ? 'PATCH' : 'POST';

  const res = await fetch(url, { method, headers, body: form });
  if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`);

  return await res.json();
}

// Download a file's content string from appDataFolder.
// Returns null if the file doesn't exist.
export async function driveDownload(filename) {
  const headers = await authHeaders();
  const fileId  = await getFileId(filename);
  if (!fileId) return null;

  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, { headers });
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);

  return await res.text();
}

// Returns the server-side modifiedTime (ISO string) of a file without
// downloading its content. Returns null if the file doesn't exist.
export async function driveGetModifiedTime(filename) {
  const headers = await authHeaders();
  const params  = new URLSearchParams({
    spaces: SPACE,
    q:      `name = '${filename}'`,
    fields: 'files(id,modifiedTime)',
  });

  const res = await fetch(`${DRIVE_FILES_URL}?${params}`, { headers });
  if (!res.ok) throw new Error(`Drive metadata failed: ${res.status}`);

  const data = await res.json();
  return data.files?.[0]?.modifiedTime ?? null;
}

// Lists all files in appDataFolder. Useful for first-time setup detection.
export async function driveListFiles() {
  const headers = await authHeaders();
  const params  = new URLSearchParams({
    spaces: SPACE,
    fields: 'files(id,name,modifiedTime)',
  });

  const res = await fetch(`${DRIVE_FILES_URL}?${params}`, { headers });
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);

  const data = await res.json();
  return data.files ?? [];
}