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
    question_notes: submission.questionNotes,
    images:         submission.images
  };

  if (typeof supabaseClient !== 'undefined') {
    const { error } = await supabaseClient.from('inspections').insert(row);
    if (error) {
      console.error('[Supabase] Save error:', error.message);
      _cacheSubmission(submission); // offline fallback
      return { ok: false, error: error.message };
    }
    console.log('[Supabase] Inspection saved:', submission.id);
    _cacheSubmission(submission); // keep local cache in sync
    return { ok: true, error: null };
  }

  // No Supabase available — localStorage only
  _cacheSubmission(submission);
  return { ok: true, error: null };
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
