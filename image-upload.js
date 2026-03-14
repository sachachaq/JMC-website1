// JMC Portal — Image Upload Module
// Reusable across all portal forms.

var ImageStore = (function () {
  var _store = {};
  return {
    get:       function (qid)       { return _store[qid] ? _store[qid].slice() : []; },
    add:       function (qid, entry){ if (!_store[qid]) _store[qid] = []; _store[qid].push(entry); },
    remove:    function (qid, id)   {
      if (_store[qid]) {
        _store[qid] = _store[qid].filter(function (e) { return e.id !== id; });
        if (!_store[qid].length) delete _store[qid];
      }
    },
    clear:     function (qid)       { delete _store[qid]; },
    all:       function ()          { return _store; },
    count:     function (qid)       { return _store[qid] ? _store[qid].length : 0; },
    totalCount:function ()          {
      return Object.keys(_store).reduce(function (n, k) { return n + _store[k].length; }, 0);
    }
  };
})();

var IMG_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB raw
var IMG_MAX_PX         = 1200;
var IMG_QUALITY        = 0.78;
var IMG_MAX_PER_Q      = 5;

function _compressImage(file, callback) {
  var allowed = /^image\/(jpeg|jpg|png|webp)$/i;
  if (!allowed.test(file.type)) {
    return callback('Unsupported format — use JPG, PNG, or WEBP.');
  }
  if (file.size > IMG_MAX_FILE_BYTES) {
    return callback('File too large — max 10 MB.');
  }
  var reader = new FileReader();
  reader.onerror = function () { callback('Could not read file.'); };
  reader.onload  = function (e) {
    var img = new Image();
    img.onerror = function () { callback('Invalid image file.'); };
    img.onload  = function () {
      var w = img.width, h = img.height;
      var scale  = Math.min(1, IMG_MAX_PX / Math.max(w, h));
      var canvas = document.createElement('canvas');
      canvas.width  = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(null, canvas.toDataURL('image/jpeg', IMG_QUALITY));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function _handleFiles(qid, files, thumbsEl, zoneEl) {
  Array.prototype.forEach.call(files, function (file) {
    if (ImageStore.count(qid) >= IMG_MAX_PER_Q) {
      _showMsg(zoneEl, 'Max ' + IMG_MAX_PER_Q + ' photos per item.');
      return;
    }
    _compressImage(file, function (err, dataUrl) {
      if (err) { _showMsg(zoneEl, err); return; }
      var entry = {
        id:      Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        name:    file.name,
        dataUrl: dataUrl
      };
      ImageStore.add(qid, entry);
      _renderThumb(qid, entry, thumbsEl);
      _syncBtnLabel(qid);
    });
  });
}

function _renderThumb(qid, entry, thumbsEl) {
  var wrap = document.createElement('div');
  wrap.className = 'imu-thumb';
  wrap.id = 'imu-thumb-' + entry.id;

  var img = document.createElement('img');
  img.src = entry.dataUrl;
  img.alt = entry.name;

  var rmBtn = document.createElement('button');
  rmBtn.type = 'button';
  rmBtn.className = 'imu-thumb-rm';
  rmBtn.setAttribute('aria-label', 'Remove photo');
  rmBtn.textContent = '\u00d7';
  rmBtn.addEventListener('click', function () {
    ImageStore.remove(qid, entry.id);
    wrap.remove();
    _syncBtnLabel(qid);
  });

  wrap.appendChild(img);
  wrap.appendChild(rmBtn);
  thumbsEl.appendChild(wrap);
}

function _syncBtnLabel(qid) {
  var btn = document.getElementById('imu-btn-' + qid);
  if (!btn) return;
  var n = ImageStore.count(qid);
  btn.querySelector('.imu-btn-label').textContent =
    btn.dataset.state === 'required'   ? (n ? 'Evidence (' + n + ')' : 'Add Evidence Photo') :
    btn.dataset.state === 'encouraged' ? (n ? 'Evidence (' + n + ')' : 'Add Evidence')       :
                                         (n ? 'Photo (' + n + ')'    : 'Add Photo');
}

function _showMsg(zoneEl, msg) {
  var old = zoneEl.querySelector('.imu-msg');
  if (old) old.remove();
  var el = document.createElement('span');
  el.className = 'imu-msg';
  el.textContent = msg;
  zoneEl.appendChild(el);
  setTimeout(function () { if (el.parentNode) el.remove(); }, 3200);
}

// Public API ----------------------------------------------------------------

function createUploadZone(qid) {
  var zone = document.createElement('div');
  zone.className = 'imu-zone';
  zone.id = 'imu-zone-' + qid;

  // Hidden file input
  var input = document.createElement('input');
  input.type    = 'file';
  input.accept  = 'image/jpeg,image/png,image/webp';
  input.multiple = true;
  input.className = 'imu-input';
  input.id = 'imu-input-' + qid;
  zone.appendChild(input);

  // Button row
  var btnRow = document.createElement('div');
  btnRow.className = 'imu-btn-row';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'imu-btn';
  btn.id = 'imu-btn-' + qid;
  btn.dataset.state = 'default';
  btn.innerHTML =
    '<svg class="imu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>' +
      '<circle cx="12" cy="13" r="4"/>' +
    '</svg>' +
    '<span class="imu-btn-label">Add Photo</span>';
  btn.addEventListener('click', function () { input.click(); });
  btnRow.appendChild(btn);
  zone.appendChild(btnRow);

  // Thumbnails container
  var thumbs = document.createElement('div');
  thumbs.className = 'imu-thumbs';
  thumbs.id = 'imu-thumbs-' + qid;
  zone.appendChild(thumbs);

  // File input change
  input.addEventListener('change', function () {
    _handleFiles(qid, input.files, thumbs, zone);
    input.value = '';
  });

  // Drag and drop
  zone.addEventListener('dragover', function (e) {
    e.preventDefault();
    zone.classList.add('imu-drag');
  });
  zone.addEventListener('dragleave', function (e) {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove('imu-drag');
  });
  zone.addEventListener('drop', function (e) {
    e.preventDefault();
    zone.classList.remove('imu-drag');
    _handleFiles(qid, e.dataTransfer.files, thumbs, zone);
  });

  return zone;
}

// state: 'default' | 'encouraged' | 'required'
function setUploadZoneState(qid, state) {
  var zone = document.getElementById('imu-zone-' + qid);
  var btn  = document.getElementById('imu-btn-' + qid);
  if (!zone || !btn) return;

  zone.className = 'imu-zone' +
    (state === 'required'   ? ' imu-zone-required'   :
     state === 'encouraged' ? ' imu-zone-encouraged'  : '');

  btn.className = 'imu-btn' +
    (state === 'required'   ? ' imu-btn-required'   :
     state === 'encouraged' ? ' imu-btn-encouraged'  : '');

  btn.dataset.state = state;
  _syncBtnLabel(qid);
}

function clearUploadZone(qid) {
  ImageStore.clear(qid);
  var thumbs = document.getElementById('imu-thumbs-' + qid);
  if (thumbs) thumbs.innerHTML = '';
  setUploadZoneState(qid, 'default');
}

// Restore a saved image entry into its upload zone (used when resuming a draft).
// entry: { id, name, dataUrl }
function restoreImageToZone(qid, entry) {
  if (!entry || !entry.dataUrl) return;
  var thumbsEl = document.getElementById('imu-thumbs-' + qid);
  if (!thumbsEl) return;
  ImageStore.add(qid, entry);
  _renderThumb(qid, entry, thumbsEl);
  _syncBtnLabel(qid);
}
