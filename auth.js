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

// localStorage cache (offline fallback only)
function getSubmissions() {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function _cacheSubmission(submission) {
  const submissions = getSubmissions();
  submissions.unshift(submission);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
}

// Primary save: Supabase first, localStorage as offline cache
async function saveSubmission(submission) {
  // Images are base64 dataUrls — kept in localStorage only to avoid
  // exceeding Supabase's HTTP payload limit (~1 MB).
  const row = {
    id:             submission.id,
    username:       submission.username,
    date_submitted: submission.dateSubmitted,
    store_number:   submission.storeNumber,
    store_name:     submission.storeName,
    conducted_on:   submission.conductedOn,
    prepared_by:    submission.preparedBy,
    notes:          submission.notes,
    answers:        submission.answers,
    question_notes: submission.questionNotes
  };

  // Always cache locally first (includes images)
  _cacheSubmission(submission);

  if (typeof supabaseClient === 'undefined') {
    console.warn('[Supabase] Client not available — saved to localStorage only.');
    return { ok: true, error: null };
  }

  console.log('[Supabase] Attempting insert for submission:', submission.id);
  console.log('[Supabase] Row being sent:', JSON.stringify(row).slice(0, 300) + '…');

  try {
    const { data, error } = await supabaseClient
      .from('inspections')
      .insert([row]);

    if (error) {
      console.error('[Supabase] Insert FAILED:', error);
      console.error('[Supabase] Error code:', error.code);
      console.error('[Supabase] Error message:', error.message);
      console.error('[Supabase] Error details:', error.details);
      console.error('[Supabase] Error hint:', error.hint);
      return { ok: false, error: error.message };
    }

    console.log('[Supabase] Insert SUCCESS. Response:', data);
    return { ok: true, error: null };
  } catch (e) {
    console.error('[Supabase] Unexpected exception during insert:', e);
    return { ok: false, error: e.message || 'Unknown error' };
  }
}

// Primary read: Supabase first, localStorage fallback
async function getSubmissionsFromCloud(username) {
  if (typeof supabaseClient === 'undefined') return getSubmissions();

  let query = supabaseClient
    .from('inspections')
    .select('*')
    .order('date_submitted', { ascending: false });

  if (username) query = query.eq('username', username);

  const { data, error } = await query;
  if (error) {
    console.error('[Supabase] Fetch error:', error.message);
    return getSubmissions(); // fallback
  }

  return (data || []).map(function (r) {
    return {
      id:            r.id,
      username:      r.username,
      dateSubmitted: r.date_submitted,
      storeNumber:   r.store_number,
      storeName:     r.store_name,
      conductedOn:   r.conducted_on,
      preparedBy:    r.prepared_by,
      notes:         r.notes,
      answers:       r.answers,
      questionNotes: r.question_notes,
      images:        r.images
    };
  });
}

function generateId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WT-${ts}-${rand}`;
}
