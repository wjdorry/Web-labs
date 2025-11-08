const API_BASE = 'http://localhost:3001';
const STORAGE_KEY = 'lawshop.currentUser';
const SESSION_EVENT = 'app:session-changed';

function dispatchSessionEvent(detail) {
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail }));
}

function safeParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse stored user session', error);
    return null;
  }
}

export function getCurrentUser() {
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function setCurrentUser(user) {
  if (!user) {
    clearCurrentUser();
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  dispatchSessionEvent({ user });
}

export function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEY);
  dispatchSessionEvent({ user: null });
}

export function isAdmin(user = getCurrentUser()) {
  return Boolean(user && String(user.role).toLowerCase() === 'administrator');
}

export async function fetchUserById(id) {
  if (!id) return null;
  const response = await fetch(`${API_BASE}/users/${encodeURIComponent(id)}`);
  if (!response.ok) return null;
  return response.json();
}

export async function refreshCurrentUser() {
  const current = getCurrentUser();
  if (!current || !current.id) return null;
  const fresh = await fetchUserById(current.id);
  if (fresh) {
    setCurrentUser(fresh);
  }
  return fresh;
}

export function onSessionChange(callback) {
  if (typeof callback !== 'function') return () => {};
  const handler = (event) => {
    callback(event.detail ? event.detail.user : null);
  };
  window.addEventListener(SESSION_EVENT, handler);
  return () => window.removeEventListener(SESSION_EVENT, handler);
}

export { API_BASE };
