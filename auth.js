// JMC Auth & Submissions

const SESSION_KEY = 'jmc_session';
const SUBMISSIONS_KEY = 'jmc_submissions';

// --- Session ---
function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setSession(username, role, displayName) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username, role, displayName }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

// --- Submissions ---
function getSubmissions() {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveSubmission(submission) {
  const submissions = getSubmissions();
  submissions.unshift(submission); // newest first
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
}

function generateId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WT-${ts}-${rand}`;
}
