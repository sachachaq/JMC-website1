// inspection-engine.js
// Shared state + persistence engine for all JMC inspection templates.
//
// Requires (loaded before this file):
//   auth.js  — saveDraft(), generateId(), DRAFT_PREFIX
//
// Each template HTML file:
//   1. Loads this script
//   2. Calls InspectionEngine.init(config, session)  → returns saved draft or null
//   3. References IE.answers and IE.questionNotes directly for state
//   4. Calls IE.scheduleSave(getFormFieldsFn) on any change
//   5. Calls IE.saveSync(getFormFieldsFn) in beforeunload
//   6. Calls IE.clearDraft() after a successful submit
//
// Template config shape:
// {
//   templateId:     'walkthrough',           // machine id
//   templateName:   'Walkthrough',           // display name / stored as inspection_type
//   idPrefix:       'WT',                    // for generateId()
//   allQuestionIds: [...],                   // used for scoring and progress
//   scoring: { passThreshold: 80, warnThreshold: 60,
//              passLabel, warnLabel, failLabel }
// }

var InspectionEngine = (function () {
  'use strict';

  // ---- Private ----
  var _config  = null;
  var _session = null;
  var _timer   = null;

  // ---- Public mutable state (shared by reference with template HTML) ----
  // Template does: const answers = IE.answers;  → same object, no copy.
  var answers       = {};
  var questionNotes = {};

  // ---- Draft ID ----
  var _draftId = null;

  // ---- Init ----
  // Call once after requireAuth() and before restore / form use.
  // Returns the raw saved draft object if resuming, otherwise null.
  function init(config, session) {
    _config  = config;
    _session = session;

    var params   = new URLSearchParams(window.location.search);
    var resumeId = params.get('draft');
    _draftId = resumeId || generateId(config.idPrefix || 'WT');

    // Reset state objects (in case of page re-use)
    Object.keys(answers).forEach(function (k) { delete answers[k]; });
    Object.keys(questionNotes).forEach(function (k) { delete questionNotes[k]; });

    if (!resumeId) return null;

    // Load saved draft from localStorage (has full data including images)
    try {
      var raw = localStorage.getItem(DRAFT_PREFIX + resumeId);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // ---- Snapshot ----
  // extraFields: { storeNumber, storeName, conductedOn, preparedBy, notes }
  function buildSnapshot(extraFields) {
    return Object.assign({
      id:             _draftId,
      username:       _session ? _session.username : '',
      inspectionType: _config  ? _config.templateName : '',
      answers:        Object.assign({}, answers),
      questionNotes:  Object.assign({}, questionNotes),
      images:         (typeof ImageStore !== 'undefined') ? ImageStore.all() : {},
      lastModified:   new Date().toISOString()
    }, extraFields || {});
  }

  // ---- Auto-save ----

  // Call on any form change. Debounces 2 s then writes localStorage + Supabase.
  // getExtraFn(): returns { storeNumber, storeName, conductedOn, preparedBy, notes }
  function scheduleSave(getExtraFn) {
    clearTimeout(_timer);
    _timer = setTimeout(function () { _doSave(getExtraFn); }, 2000);
    _setIndicator('saving');
  }

  async function _doSave(getExtraFn) {
    if (!_draftId) return;
    var snap = buildSnapshot(getExtraFn ? getExtraFn() : {});
    snap.status = 'draft';
    // Always write localStorage synchronously inside saveDraft
    var result = await saveDraft(snap);
    _setIndicator(result.localOk ? 'saved' : 'error');
  }

  // Synchronous-only localStorage save (call from beforeunload).
  function saveSync(getExtraFn) {
    if (!_draftId) return;
    var snap = buildSnapshot(getExtraFn ? getExtraFn() : {});
    snap.status = 'draft';
    try { localStorage.setItem(DRAFT_PREFIX + _draftId, JSON.stringify(snap)); } catch (e) {}
  }

  // ---- Scoring ----

  function calcScore() {
    var ids   = (_config && _config.allQuestionIds) || [];
    var yes   = ids.filter(function (q) { return answers[q] === 'Yes'; }).length;
    var no    = ids.filter(function (q) { return answers[q] === 'No';  }).length;
    var total = yes + no;
    return {
      yes:      yes,
      no:       no,
      total:    total,
      allCount: ids.length,
      answered: ids.filter(function (q) { return !!answers[q]; }).length,
      pct:      total > 0 ? Math.round(yes / total * 100) : null
    };
  }

  function getUnanswered() {
    var ids = (_config && _config.allQuestionIds) || [];
    return ids.filter(function (id) { return !answers[id]; });
  }

  // ---- Cleanup after successful submit ----
  function clearDraft() {
    clearTimeout(_timer);
    if (_draftId) {
      try { localStorage.removeItem(DRAFT_PREFIX + _draftId); } catch (e) {}
    }
    _draftId = null;
  }

  // ---- Draft status indicator ----
  function _setIndicator(state) {
    var el = document.getElementById('draftIndicator');
    if (!el) return;
    el.dataset.state = state;
    el.textContent = state === 'saving' ? 'Saving\u2026'
                   : state === 'saved'  ? 'Draft saved'
                   : state === 'error'  ? 'Save failed'
                   : '';
  }

  // ---- Public API ----
  return {
    // Shared state objects — template uses these directly by reference
    answers:       answers,
    questionNotes: questionNotes,

    // Draft ID getter
    get draftId() { return _draftId; },

    // Config getter (for reading templateName, scoring etc. from template)
    get config() { return _config; },

    // Core lifecycle
    init:          init,
    buildSnapshot: buildSnapshot,
    scheduleSave:  scheduleSave,
    saveSync:      saveSync,
    calcScore:     calcScore,
    getUnanswered: getUnanswered,
    clearDraft:    clearDraft
  };
})();
