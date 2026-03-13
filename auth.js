// JMC Auth & Submissions

const SESSION_KEY    = 'jmc_session';
const SUBMISSIONS_KEY = 'jmc_submissions';

// ---- Session ----

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function setSession(username, role, displayName) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username, role, displayName }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function requireAuth() {
  const session = getSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  return session;
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

// ---- localStorage cache (offline fallback only) ----

function getSubmissions() {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function _cacheSubmission(submission) {
  const list = getSubmissions();
  list.unshift(submission);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list));
}

// ---- Supabase Storage: image upload ----

// Convert a base64 dataUrl to a Blob for upload.
function _dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime  = parts[0].match(/:(.*?);/)[1];
  const bin   = atob(parts[1]);
  const arr   = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// Upload every image in ImageStore format to Supabase Storage.
// Returns a URL-based map: { qid: [{ id, name, url, path }] }
// Base64 dataUrls are never sent to the database.
async function uploadImagesToStorage(submissionId, username, imagesStore) {
  if (typeof supabaseClient === 'undefined' || !imagesStore) return {};
  const urlMap = {};
  for (const [qid, images] of Object.entries(imagesStore)) {
    if (!images?.length) continue;
    urlMap[qid] = [];
    for (const img of images) {
      if (!img.dataUrl) continue;
      try {
        const path = `${username}/${submissionId}/${qid}/${img.id}.jpg`;
        const blob = _dataUrlToBlob(img.dataUrl);
        const { error } = await supabaseClient.storage
          .from('inspection-images')
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (error) { console.warn('[Storage] Upload failed:', error.message); continue; }
        const { data: { publicUrl } } = supabaseClient.storage
          .from('inspection-images').getPublicUrl(path);
        urlMap[qid].push({ id: img.id, name: img.name, url: publicUrl, path });
        console.log('[Storage] Uploaded:', path);
      } catch (e) {
        console.warn('[Storage] Exception:', e.message);
      }
    }
    if (!urlMap[qid].length) delete urlMap[qid];
  }
  return urlMap;
}

// ---- Primary save ----
// Returns { localOk, cloudOk, error }.
// localOk is always true — _cacheSubmission is synchronous and never throws.
// cloudOk reflects whether Supabase accepted the row.
// onProgress(statusString) is called to update UI during long operations.
async function saveSubmission(submission, onProgress) {
  // 1. Cache locally first — preserves base64 images for offline display.
  _cacheSubmission(submission);

  if (typeof supabaseClient === 'undefined') {
    console.warn('[Supabase] Client not available — saved to localStorage only.');
    return { localOk: true, cloudOk: false, error: 'Supabase client not initialized' };
  }

  try {
    // 2. Upload images to Supabase Storage. Get back URL map.
    const hasImages = submission.images && Object.keys(submission.images).length > 0;
    if (hasImages && onProgress) onProgress('Uploading photos\u2026');
    const cloudImages = hasImages
      ? await uploadImagesToStorage(submission.id, submission.username, submission.images)
      : {};

    // 3. Insert row to DB. Images field stores URLs, never base64.
    if (onProgress) onProgress('Saving\u2026');
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
      images:         cloudImages
    };

    const timeoutPromise = new Promise(resolve =>
      setTimeout(() => resolve({
        data: null,
        error: { message: 'Request timed out (15s)', code: 'TIMEOUT', details: '', hint: '' }
      }), 15000)
    );

    const { data, error } = await Promise.race([
      supabaseClient.from('inspections').insert([row]),
      timeoutPromise
    ]);

    if (error) {
      console.error('[Supabase] Insert FAILED — code:', error.code, '| msg:', error.message, '| hint:', error.hint);
      return { localOk: true, cloudOk: false, error: error.message };
    }

    console.log('[Supabase] Insert SUCCESS:', data);
    return { localOk: true, cloudOk: true, error: null };

  } catch (e) {
    console.error('[Supabase] Unexpected exception:', e);
    return { localOk: true, cloudOk: false, error: e.message || 'Unknown error' };
  }
}

// ---- Primary read ----
// username = null → fetch all (admin only).
// Falls back to localStorage if Supabase is unavailable.
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
    return getSubmissions();
  }

  return (data || []).map(r => ({
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
    images:        r.images   // URL-based from DB; base64 only in localStorage cache
  }));
}

// ---- Utilities ----

function generateId() {
  const ts   = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WT-${ts}-${rand}`;
}
