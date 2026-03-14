// JMC Auth & Submissions

const SESSION_KEY    = 'jmc_session';
const SUBMISSIONS_KEY = 'jmc_submissions';
const DRAFT_PREFIX   = 'jmc_draft_';

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

// ---- Supabase Storage: image upload + retrieval ----

const STORAGE_BUCKET = 'JMC-Website-Images';

// Convert a base64 dataUrl to a Blob for upload.
function _dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime  = parts[0].match(/:(.*?);/)[1];
  const bin   = atob(parts[1]);
  const arr   = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// Upload every image in ImageStore format to the private Storage bucket.
// Path structure: {shortId}/{qid}_{imageId}.jpg
// Returns a path-only map: { qid: [{ id, name, path }] }
async function uploadImagesToStorage(submissionId, username, imagesStore) {
  if (typeof supabaseClient === 'undefined' || !imagesStore) return {};
  const pathMap = {};
  for (const [qid, images] of Object.entries(imagesStore)) {
    if (!images?.length) continue;
    pathMap[qid] = [];
    for (const img of images) {
      if (!img.dataUrl) continue;
      try {
        const shortId = submissionId.split('-').pop();
        const path = `${shortId}/${qid}_${img.id}.jpg`;
        const blob = _dataUrlToBlob(img.dataUrl);
        const { error } = await supabaseClient.storage
          .from(STORAGE_BUCKET)
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (error) { console.warn('[Storage] Upload failed:', path, error.message); continue; }
        pathMap[qid].push({ id: img.id, name: img.name, path });
        console.log('[Storage] Uploaded:', path);
      } catch (e) {
        console.warn('[Storage] Exception:', e.message);
      }
    }
    if (!pathMap[qid].length) delete pathMap[qid];
  }
  return pathMap;
}

// Generate signed URLs for every image path across a set of submissions.
async function _enrichWithSignedUrls(submissions) {
  if (typeof supabaseClient === 'undefined') return submissions;

  const allPaths = [];
  submissions.forEach(s => {
    if (!s.images) return;
    Object.values(s.images).forEach(imgs => {
      (imgs || []).forEach(img => { if (img.path) allPaths.push(img.path); });
    });
  });

  if (!allPaths.length) return submissions;

  console.log('[Storage] Requesting signed URLs for', allPaths.length, 'image(s)...');
  const urlMap = {};

  try {
    const { data: signed, error } = await supabaseClient.storage
      .from(STORAGE_BUCKET).createSignedUrls(allPaths, 3600);
    if (error) throw new Error(error.message);
    if (!signed?.length) throw new Error('Empty response');
    signed.forEach(item => { if (item.signedUrl) urlMap[item.path] = item.signedUrl; });
    console.log('[Storage] Signed URLs OK:', Object.keys(urlMap).length);
  } catch (batchErr) {
    console.warn('[Storage] Batch failed, trying individual calls:', batchErr.message);
    for (const path of allPaths) {
      try {
        const { data, error } = await supabaseClient.storage
          .from(STORAGE_BUCKET).createSignedUrl(path, 3600);
        if (!error && data?.signedUrl) urlMap[path] = data.signedUrl;
        else if (error) console.warn('[Storage] createSignedUrl failed:', path, error.message);
      } catch (e) { console.warn('[Storage] exception:', path, e.message); }
    }
  }

  return submissions.map(s => {
    if (!s.images) return s;
    const enriched = {};
    Object.entries(s.images).forEach(([qid, imgs]) => {
      enriched[qid] = (imgs || []).map(img => ({
        ...img,
        url: img.path ? (urlMap[img.path] || img.url || null) : img.url
      }));
    });
    return { ...s, images: enriched };
  });
}

// ---- Primary save (submitted inspections) ----
// Returns { localOk, cloudOk, error }.
async function saveSubmission(submission, onProgress) {
  _cacheSubmission(submission);

  if (typeof supabaseClient === 'undefined') {
    console.warn('[Supabase] Client not available — saved to localStorage only.');
    return { localOk: true, cloudOk: false, error: 'Supabase client not initialized' };
  }

  try {
    const hasImages = submission.images && Object.keys(submission.images).length > 0;
    if (hasImages && onProgress) onProgress('Uploading photos\u2026');
    const cloudImages = hasImages
      ? await uploadImagesToStorage(submission.id, submission.username, submission.images)
      : {};

    if (onProgress) onProgress('Saving\u2026');
    const row = {
      id:              submission.id,
      username:        submission.username,
      status:          'submitted',
      inspection_type: submission.inspectionType || null,
      date_submitted:  submission.dateSubmitted,
      last_modified:   submission.dateSubmitted,
      store_number:    submission.storeNumber,
      store_name:      submission.storeName,
      conducted_on:    submission.conductedOn,
      prepared_by:     submission.preparedBy,
      notes:           submission.notes,
      answers:         submission.answers,
      question_notes:  submission.questionNotes,
      images:          cloudImages
    };

    const timeoutPromise = new Promise(resolve =>
      setTimeout(() => resolve({
        data: null,
        error: { message: 'Request timed out (15s)', code: 'TIMEOUT', details: '', hint: '' }
      }), 15000)
    );

    const { data, error } = await Promise.race([
      supabaseClient.from('inspections').upsert([row], { onConflict: 'id' }),
      timeoutPromise
    ]);

    if (error) {
      console.error('[Supabase] Upsert FAILED — code:', error.code, '| msg:', error.message);
      return { localOk: true, cloudOk: false, error: error.message };
    }

    // Clean up localStorage draft on successful cloud submit
    try { localStorage.removeItem(DRAFT_PREFIX + submission.id); } catch (e) {}

    console.log('[Supabase] Upsert SUCCESS:', data);
    return { localOk: true, cloudOk: true, error: null };

  } catch (e) {
    console.error('[Supabase] Unexpected exception:', e);
    return { localOk: true, cloudOk: false, error: e.message || 'Unknown error' };
  }
}

// ---- Primary read (submitted only) ----
// username = null → fetch all (admin only).
async function getSubmissionsFromCloud(username) {
  if (typeof supabaseClient === 'undefined') return getSubmissions();

  let query = supabaseClient
    .from('inspections')
    .select('*')
    .or('status.eq.submitted,status.is.null')
    .order('date_submitted', { ascending: false });

  if (username) query = query.eq('username', username);

  const { data, error } = await query;
  if (error) {
    console.error('[Supabase] Fetch error:', error.message);
    return getSubmissions();
  }

  const submissions = (data || []).map(r => ({
    id:             r.id,
    username:       r.username,
    inspectionType: r.inspection_type || null,
    dateSubmitted:  r.date_submitted,
    storeNumber:    r.store_number,
    storeName:      r.store_name,
    conductedOn:    r.conducted_on,
    preparedBy:     r.prepared_by,
    notes:          r.notes,
    answers:        r.answers,
    questionNotes:  r.question_notes,
    images:         r.images
  }));
  return _enrichWithSignedUrls(submissions);
}

// ---- Draft CRUD ----

// Save draft to localStorage (always) and Supabase (async, best-effort).
// Images stay in localStorage only — they are uploaded on final submit.
async function saveDraft(draft) {
  try {
    localStorage.setItem(DRAFT_PREFIX + draft.id, JSON.stringify(draft));
  } catch (e) { console.warn('[Draft] localStorage write failed:', e.message); }

  if (typeof supabaseClient === 'undefined') return { localOk: true, cloudOk: false };

  try {
    const row = {
      id:              draft.id,
      username:        draft.username,
      status:          'draft',
      inspection_type: draft.inspectionType || null,
      date_submitted:  null,
      last_modified:   draft.lastModified || new Date().toISOString(),
      store_number:    draft.storeNumber  || null,
      store_name:      draft.storeName    || null,
      conducted_on:    draft.conductedOn  || null,
      prepared_by:     draft.preparedBy   || null,
      notes:           draft.notes        || null,
      answers:         draft.answers      || {},
      question_notes:  draft.questionNotes || {},
      images:          {}   // images kept in localStorage only during draft
    };
    const { error } = await supabaseClient
      .from('inspections').upsert([row], { onConflict: 'id' });
    if (error) { console.warn('[Draft] Cloud save failed:', error.message); return { localOk: true, cloudOk: false }; }
    return { localOk: true, cloudOk: true };
  } catch (e) {
    console.warn('[Draft] Exception:', e.message);
    return { localOk: true, cloudOk: false };
  }
}

// Fetch drafts for a user. Falls back to scanning localStorage.
async function getDraftsFromCloud(username) {
  // Scan localStorage as fast offline fallback
  const localDrafts = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(DRAFT_PREFIX)) continue;
    try {
      const d = JSON.parse(localStorage.getItem(key));
      if (d && d.username === username) localDrafts.push(d);
    } catch (e) { /* skip corrupt */ }
  }

  if (typeof supabaseClient === 'undefined') return localDrafts;

  const { data, error } = await supabaseClient
    .from('inspections')
    .select('id, username, inspection_type, store_number, store_name, conducted_on, prepared_by, answers, last_modified, status')
    .eq('username', username)
    .eq('status', 'draft')
    .order('last_modified', { ascending: false });

  if (error) {
    console.error('[Draft] Fetch error:', error.message);
    return localDrafts;
  }

  return (data || []).map(r => ({
    id:             r.id,
    username:       r.username,
    inspectionType: r.inspection_type || 'Walkthrough',
    storeNumber:    r.store_number,
    storeName:      r.store_name,
    conductedOn:    r.conducted_on,
    preparedBy:     r.prepared_by,
    answers:        r.answers || {},
    lastModified:   r.last_modified
  }));
}

// Delete a draft. Safety guard: never deletes submitted rows.
async function deleteDraft(id) {
  try { localStorage.removeItem(DRAFT_PREFIX + id); } catch (e) {}
  if (typeof supabaseClient === 'undefined') return { ok: true };
  try {
    const { error } = await supabaseClient
      .from('inspections').delete().eq('id', id).eq('status', 'draft');
    if (error) console.warn('[Draft] Delete error:', error.message);
    return { ok: !error };
  } catch (e) { return { ok: false }; }
}

// Delete a submitted inspection. Safety guard: never deletes drafts.
async function deleteSubmission(id) {
  const list = getSubmissions().filter(s => s.id !== id);
  try { localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list)); } catch (e) {}
  if (typeof supabaseClient === 'undefined') return { ok: true };
  try {
    const { error } = await supabaseClient
      .from('inspections').delete().eq('id', id).eq('status', 'submitted');
    if (error) console.warn('[Delete] Error:', error.message);
    return { ok: !error };
  } catch (e) { return { ok: false }; }
}

// ---- Utilities ----

// prefix: 'WT' (Walkthrough), 'OA' (Operations Assessment), 'FSE', 'EV' (Evaluation), etc.
function generateId(prefix) {
  const ts   = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return (prefix || 'WT') + '-' + ts + '-' + rand;
}
