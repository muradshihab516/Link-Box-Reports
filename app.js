var firebaseConfig = {
    apiKey: "AIzaSyDuzmtCpChGwOsVuRReNq1JwXkSc9LyHg0",
    authDomain: "support-link-box-reports.firebaseapp.com",
    databaseURL: "https://support-link-box-reports-default-rtdb.firebaseio.com",
    projectId: "support-link-box-reports",
    storageBucket: "support-link-box-reports.firebasestorage.app",
    messagingSenderId: "181357185091",
    appId: "1:181357185091:web:9b1609aec9efdab254ecf6"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.database();

var ADMINS = {
    'Md_Shihab_Khan': { password: 'Shihab909', name: 'Md Shihab Khan' },
    'Mamun_Aravi': { password: 'Mamun809', name: 'Mamun Aravi' },
    'Shuvo_Sutradhar': { password: 'Shuvo709', name: 'Shuvo Sutradhar' },
    'ShaDat_Hossain': { password: 'Shadat609', name: 'ShaDat Hossain' },
    'Ariyan_Ahmed_Rubel': { password: 'Rubel509', name: 'Ariyan Ahmed Rubel' },
    'MD_Mustakim_Islam': { password: 'Mustakim409', name: 'MD Mustakim Islam' }
};

var currentAdmin = null;
var allReports = {};
var singleFiles = [];
var multipleFiles = [];

function $(id) { return document.getElementById(id); }

document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    initEvents();
    setDefaultDate();
});

function checkSession() {
    var s = localStorage.getItem('reportAdmin');
    if (s) {
        try {
            var a = JSON.parse(s);
            if (ADMINS[a.userId]) { currentAdmin = a; showApp(); return; }
        } catch(e) {}
    }
    showLogin();
}

function showLogin() {
    $('loginScreen').classList.remove('hidden');
    $('mainApp').classList.add('hidden');
}

function showApp() {
    $('loginScreen').classList.add('hidden');
    $('mainApp').classList.remove('hidden');
    $('adminBadge').textContent = currentAdmin.name;
    loadReports();
}

function initEvents() {
    $('loginForm').addEventListener('submit', handleLogin);

    $('togglePass').addEventListener('click', function() {
        var inp = $('loginPass');
        var ic = $('togglePass');
        if (inp.type === 'password') {
            inp.type = 'text';
            ic.classList.remove('fa-eye');
            ic.classList.add('fa-eye-slash');
        } else {
            inp.type = 'password';
            ic.classList.remove('fa-eye-slash');
            ic.classList.add('fa-eye');
        }
    });

    $('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('reportAdmin');
        currentAdmin = null;
        showLogin();
    });

    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() {
            var allTabs = document.querySelectorAll('.tab');
            var allContents = document.querySelectorAll('.tab-content');
            for (var j = 0; j < allTabs.length; j++) allTabs[j].classList.remove('active');
            for (var j = 0; j < allContents.length; j++) allContents[j].classList.remove('active');
            this.classList.add('active');
            var n = this.dataset.tab;
            if (n === 'reports') $('reportsTab').classList.add('active');
            else if (n === 'dismissed') $('dismissedTab').classList.add('active');
            else if (n === 'submit') $('submitTab').classList.add('active');
        });
    }

    var typeBtns = document.querySelectorAll('.type-btn');
    for (var i = 0; i < typeBtns.length; i++) {
        typeBtns[i].addEventListener('click', function() {
            var all = document.querySelectorAll('.type-btn');
            for (var j = 0; j < all.length; j++) all[j].classList.remove('active');
            this.classList.add('active');
            if (this.dataset.type === 'single') {
                $('singleForm').classList.remove('hidden');
                $('multipleForm').classList.add('hidden');
            } else {
                $('singleForm').classList.add('hidden');
                $('multipleForm').classList.remove('hidden');
            }
        });
    }

    $('singleFile').addEventListener('change', function(e) { handleFileSelect(e, 'single'); });
    $('multipleFile').addEventListener('change', function(e) { handleFileSelect(e, 'multiple'); });
    $('singleSubmit').addEventListener('click', handleSingleSubmit);
    $('parseBtn').addEventListener('click', handleParse);
    $('multipleSubmit').addEventListener('click', handleMultipleSubmit);

    $('searchInput').addEventListener('input', handleSearch);
    $('searchClear').addEventListener('click', function() {
        $('searchInput').value = '';
        $('searchClear').classList.add('hidden');
        $('searchSuggestions').classList.add('hidden');
        renderReports();
    });

    $('modalClose').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            $('searchSuggestions').classList.add('hidden');
        }
    });
}

function setDefaultDate() {
    var today = new Date();
    var y = today.getFullYear();
    var m = String(today.getMonth() + 1).padStart(2, '0');
    var d = String(today.getDate()).padStart(2, '0');
    $('multipleDate').value = y + '-' + m + '-' + d;
}

function handleLogin(e) {
    e.preventDefault();
    var u = $('loginUser').value.trim();
    var p = $('loginPass').value;
    if (ADMINS[u] && ADMINS[u].password === p) {
        currentAdmin = { userId: u, name: ADMINS[u].name };
        localStorage.setItem('reportAdmin', JSON.stringify(currentAdmin));
        $('loginError').textContent = '';
        showApp();
    } else {
        $('loginError').textContent = 'Invalid User ID or Password';
        $('loginUser').value = '';
        $('loginPass').value = '';
    }
}

function handleFileSelect(e, type) {
    var files = Array.from(e.target.files);
    files.forEach(function(file) {
        if (file.size > 5 * 1024 * 1024) {
            showToast('Max 5MB per file', 'error');
            return;
        }
        var reader = new FileReader();
        reader.onload = function(ev) {
            if (type === 'single') singleFiles.push(ev.target.result);
            else multipleFiles.push(ev.target.result);
            renderPreviews(type);
        };
        reader.readAsDataURL(file);
    });
}

function renderPreviews(type) {
    var f = type === 'single' ? singleFiles : multipleFiles;
    var c = $(type === 'single' ? 'singlePreview' : 'multiplePreview');
    var html = '';
    for (var i = 0; i < f.length; i++) {
        html += '<div class="file-preview-item">';
        html += '<img src="' + f[i] + '">';
        html += '<button class="remove-file" onclick="removeFile(\'' + type + '\',' + i + ')"><i class="fas fa-times"></i></button>';
        html += '</div>';
    }
    c.innerHTML = html;
}

function removeFile(type, i) {
    if (type === 'single') singleFiles.splice(i, 1);
    else multipleFiles.splice(i, 1);
    renderPreviews(type);
}

function handleSingleSubmit() {
    var name = $('singleName').value.trim();
    var reason = $('singleReason').value;
    var desc = $('singleDesc').value.trim();
    if (!name) { showToast('Enter member name', 'error'); return; }
    if (!reason) { showToast('Select report reason', 'error'); return; }
    showLoading();
    db.ref('reports').push({
        name: name, reason: reason, description: desc || '',
        screenshots: singleFiles.length > 0 ? singleFiles : [],
        linkNumber: '', gapDetails: '',
        admin: currentAdmin.name, adminId: currentAdmin.userId,
        timestamp: Date.now(), reportDate: '',
        dismissed: false, dismissedBy: '', dismissedAt: 0
    }).then(function() {
        hideLoading();
        showToast('Report submitted!', 'success');
        $('singleName').value = ''; $('singleReason').value = '';
        $('singleDesc').value = ''; singleFiles = [];
        $('singlePreview').innerHTML = ''; $('singleFile').value = '';
    }).catch(function(err) {
        hideLoading();
        showToast('Failed: ' + err.message, 'error');
    });
}

function handleParse() {
    var text = $('multipleList').value.trim();
    var reason = $('multipleReason').value;
    if (!text) { showToast('Paste the list first', 'error'); return; }
    if (!reason) { showToast('Select report type first', 'error'); return; }
    var parsed = [];
    if (reason === 'Late All Done') parsed = parseLateAllDone(text);
    else if (reason === 'Support Gap') parsed = parseSupportGap(text);
    else parsed = parseGeneric(text);
    if (parsed.length === 0) { showToast('Could not parse names', 'error'); return; }
    var html = '';
    for (var i = 0; i < parsed.length; i++) {
        html += '<div class="parsed-item">';
        html += '<div class="parsed-number">' + (i + 1) + '</div>';
        html += '<div class="parsed-name">' + esc(parsed[i].name) + '</div>';
        html += '<div class="parsed-extra">' + esc(parsed[i].extra || '') + '</div>';
        html += '</div>';
    }
    $('parsedList').innerHTML = html;
    $('parsePreview').classList.remove('hidden');
    $('parsePreview').dataset.parsed = JSON.stringify(parsed);
    showToast(parsed.length + ' member(s) parsed', 'info');
}

function parseLateAllDone(text) {
    var results = [];
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var atMatch = line.match(/@([^@\n]+)/);
        var pinMatch = line.match(/📌\s*\/?\s*(\d+)/);
        if (atMatch && pinMatch) {
            var name = atMatch[1].trim();
            name = name.replace(/^[\d️⃣\s\.\)\-]+/, '').trim();
            name = name.replace(/\s*📌.*$/, '').trim();
            if (name.length > 0) {
                results.push({
                    name: name,
                    extra: '📌/' + pinMatch[1],
                    linkNumber: '📌/' + pinMatch[1]
                });
            }
        }
    }
    return results;
}

function parseSupportGap(text) {
    var results = [];
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var atIdx = line.indexOf('@');
        if (atIdx === -1) continue;
        var gapWord = 'সাপোর্ট গ্যাপ';
        var gapIdx = line.indexOf(gapWord, atIdx);
        if (gapIdx === -1) {
            gapWord = 'গ্যাপ';
            gapIdx = line.indexOf(gapWord, atIdx);
        }
        if (gapIdx === -1) continue;
        var name = line.substring(atIdx + 1, gapIdx).trim();
        name = name.replace(/^[\d️⃣\s\.\)\-]+/, '').trim();
        var rest = line.substring(gapIdx);
        var numMatch = rest.match(/(\d+)\s*পোস্ট/);
        var bracketMatch = rest.match(/\(([^)]+)\)/);
        var gapCount = numMatch ? numMatch[1] : '?';
        var postNums = bracketMatch ? bracketMatch[1].trim() : '';
        if (name.length > 0) {
            var gapDetail = 'সাপোর্ট গ্যাপ ' + gapCount + ' পোস্ট';
            if (postNums) gapDetail += ' (' + postNums + ')';
            results.push({
                name: name,
                extra: 'গ্যাপ ' + gapCount + (postNums ? ' (' + postNums + ')' : ''),
                gapDetails: gapDetail
            });
        }
    }
    return results;
}

function parseGeneric(text) {
    var results = [];
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var match = lines[i].match(/@([^@\n]+)/);
        if (match) {
            var name = match[1].trim();
            name = name.replace(/^[\d️⃣\s\.\)\-]+/, '').trim();
            if (name.length > 1) results.push({ name: name, extra: '' });
        }
    }
    return results;
}

function handleMultipleSubmit() {
    var reason = $('multipleReason').value;
    var desc = $('multipleDesc').value.trim();
    var dateVal = $('multipleDate').value;
    var pd = $('parsePreview').dataset.parsed;
    if (!reason) { showToast('Select report type', 'error'); return; }
    if (!pd) { showToast('Parse the list first', 'error'); return; }
    var parsed;
    try { parsed = JSON.parse(pd); } catch(e) { showToast('Parse error', 'error'); return; }
    if (parsed.length === 0) { showToast('No members', 'error'); return; }
    showLoading();
    var updates = {};
    var ts = Date.now();
    for (var i = 0; i < parsed.length; i++) {
        var key = db.ref('reports').push().key;
        updates['reports/' + key] = {
            name: parsed[i].name, reason: reason, description: desc || '',
            screenshots: multipleFiles.length > 0 ? multipleFiles : [],
            linkNumber: parsed[i].linkNumber || '',
            gapDetails: parsed[i].gapDetails || parsed[i].extra || '',
            admin: currentAdmin.name, adminId: currentAdmin.userId,
            timestamp: ts + i, reportDate: dateVal || '',
            dismissed: false, dismissedBy: '', dismissedAt: 0
        };
    }
    db.ref().update(updates).then(function() {
        hideLoading();
        showToast(parsed.length + ' reports submitted!', 'success');
        $('multipleList').value = ''; $('multipleReason').value = '';
        $('multipleDesc').value = ''; $('parsePreview').classList.add('hidden');
        $('parsedList').innerHTML = ''; delete $('parsePreview').dataset.parsed;
        multipleFiles = []; $('multiplePreview').innerHTML = '';
        $('multipleFile').value = ''; setDefaultDate();
    }).catch(function(err) {
        hideLoading();
        showToast('Failed: ' + err.message, 'error');
    });
}

function loadReports() {
    db.ref('reports').on('value', function(snap) {
        allReports = snap.exists() ? snap.val() : {};
        renderReports();
        updateCounts();
    });
}

function renderReports(filter) {
    filter = filter || '';
    var active = [];
    var dismissed = [];
    var keys = Object.keys(allReports);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var r = allReports[k];
        r._key = k;
        if (filter) {
            var s = ((r.name||'') + ' ' + (r.reason||'') + ' ' + (r.description||'') + ' ' + (r.admin||'')).toLowerCase();
            if (s.indexOf(filter.toLowerCase()) === -1) continue;
        }
        if (r.dismissed) dismissed.push(r);
        else active.push(r);
    }
    active.sort(function(a, b) { return b.timestamp - a.timestamp; });
    dismissed.sort(function(a, b) { return (b.dismissedAt || b.timestamp) - (a.dismissedAt || a.timestamp); });
    renderList($('reportsList'), active, false);
    renderList($('dismissedList'), dismissed, true);
}

function renderList(container, reports, isDismissed) {
    if (reports.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-' +
            (isDismissed ? 'check-double' : 'inbox') + '"></i><p>' +
            (isDismissed ? 'No dismissed reports' : 'No active reports') + '</p></div>';
        return;
    }
    var html = '';
    for (var i = 0; i < reports.length; i++) {
        var r = reports[i];
        var rc = getReasonClass(r.reason);
        var t = fmtTime(r.timestamp);
        var hasImg = r.screenshots && r.screenshots.length > 0;
        html += '<div class="report-card ' + (isDismissed ? 'dismissed' : '') + '">';
        html += '<div class="report-card-header">';
        html += '<div class="report-name">' + esc(r.name) + '</div>';
        html += '<span class="report-reason-badge ' + rc + '">' + esc(r.reason) + '</span>';
        html += '</div>';
        if (r.linkNumber) html += '<div class="report-link-numbers">Link: ' + esc(r.linkNumber) + '</div>';
        if (r.gapDetails) html += '<div class="report-link-numbers">' + esc(r.gapDetails) + '</div>';
        if (r.description) {
            var ds = r.description.length > 80 ? r.description.substring(0, 80) + '...' : r.description;
            html += '<div class="report-desc-preview">' + esc(ds) + '</div>';
        }
        html += '<div class="report-card-info">';
        html += '<div class="report-info-item"><i class="fas fa-clock"></i> ' + t + '</div>';
        html += '<div class="report-info-item"><i class="fas fa-user-shield"></i> ' + esc(r.admin) + '</div>';
        if (hasImg) html += '<div class="report-info-item"><i class="fas fa-image"></i> ' + r.screenshots.length + '</div>';
        if (isDismissed && r.dismissedBy) html += '<div class="report-info-item"><i class="fas fa-check"></i> ' + esc(r.dismissedBy) + '</div>';
        html += '</div>';
        html += '<div class="report-card-actions">';
        html += '<button class="btn-view" onclick="event.stopPropagation();viewReport(\'' + r._key + '\')"><i class="fas fa-eye"></i> View</button>';
        if (!isDismissed) {
            html += '<button class="btn-dismiss" onclick="event.stopPropagation();dismissReport(\'' + r._key + '\')"><i class="fas fa-check"></i> Dismiss</button>';
        } else {
            html += '<button class="btn-restore" onclick="event.stopPropagation();restoreReport(\'' + r._key + '\')"><i class="fas fa-undo"></i> Restore</button>';
        }
        html += '<button class="btn-delete" onclick="event.stopPropagation();deleteReport(\'' + r._key + '\')"><i class="fas fa-trash"></i></button>';
        html += '</div></div>';
    }
    container.innerHTML = html;
}

function updateCounts() {
    var a = 0, d = 0;
    var keys = Object.keys(allReports);
    for (var i = 0; i < keys.length; i++) {
        if (allReports[keys[i]].dismissed) d++; else a++;
    }
    $('reportCount').textContent = a;
    $('dismissedCount').textContent = d;
}

function dismissReport(k) {
    db.ref('reports/' + k).update({
        dismissed: true, dismissedBy: currentAdmin.name, dismissedAt: Date.now()
    }).then(function() { showToast('Dismissed', 'success'); });
}

function restoreReport(k) {
    db.ref('reports/' + k).update({
        dismissed: false, dismissedBy: '', dismissedAt: 0
    }).then(function() { showToast('Restored', 'info'); });
}

function deleteReport(k) {
    if (confirm('Permanently delete this report?')) {
        db.ref('reports/' + k).remove().then(function() { showToast('Deleted', 'success'); });
    }
}

function viewReport(k) {
    var r = allReports[k];
    if (!r) return;
    var rc = getReasonClass(r.reason);
    var h = '';
    h += '<div class="modal-detail-row"><div class="modal-detail-label">Member Name</div>';
    h += '<div class="modal-detail-value" style="font-size:17px;font-weight:700">' + esc(r.name) + '</div></div>';
    h += '<div class="modal-detail-row"><div class="modal-detail-label">Report Reason</div>';
    h += '<div class="modal-detail-value"><span class="report-reason-badge ' + rc + '" style="font-size:12px;padding:5px 12px">' + esc(r.reason) + '</span></div></div>';
    if (r.linkNumber) {
        h += '<div class="modal-detail-row"><div class="modal-detail-label">Link Number</div>';
        h += '<div class="modal-detail-value" style="color:var(--accent);font-weight:600">' + esc(r.linkNumber) + '</div></div>';
    }
    if (r.gapDetails) {
        h += '<div class="modal-detail-row"><div class="modal-detail-label">Gap Details</div>';
        h += '<div class="modal-detail-value" style="color:var(--danger);font-weight:600">' + esc(r.gapDetails) + '</div></div>';
    }
    if (r.description) {
        h += '<div class="modal-detail-row"><div class="modal-detail-label">Description</div>';
        h += '<div class="modal-detail-value">' + esc(r.description) + '</div></div>';
    }
    if (r.reportDate) {
        h += '<div class="modal-detail-row"><div class="modal-detail-label">Report Date</div>';
        h += '<div class="modal-detail-value">' + esc(r.reportDate) + '</div></div>';
    }
    h += '<div class="modal-detail-row"><div class="modal-detail-label">Reported By</div>';
    h += '<div class="modal-detail-value"><i class="fas fa-user-shield" style="color:var(--accent);margin-right:6px"></i>' + esc(r.admin) + '</div></div>';
    h += '<div class="modal-detail-row"><div class="modal-detail-label">Submitted At</div>';
    h += '<div class="modal-detail-value">' + fmtTime(r.timestamp) + '</div></div>';
    if (r.dismissed) {
        h += '<div class="modal-detail-row"><div class="modal-detail-label">Status</div>';
        h += '<div class="modal-detail-value" style="color:var(--success)"><i class="fas fa-check-circle"></i> Dismissed by ' + esc(r.dismissedBy || 'Unknown');
        if (r.dismissedAt) h += ' - ' + fmtTime(r.dismissedAt);
        h += '</div></div>';
    }
    if (r.screenshots && r.screenshots.length > 0) {
        h += '<div class="modal-detail-row"><div class="modal-detail-label">Screenshots (' + r.screenshots.length + ')</div>';
        h += '<div class="modal-screenshots">';
        for (var i = 0; i < r.screenshots.length; i++) {
            h += '<div class="modal-screenshot" onclick="openImg(this.querySelector(\'img\').src)"><img src="' + r.screenshots[i] + '" loading="lazy"></div>';
        }
        h += '</div></div>';
    }
    $('modalBody').innerHTML = h;
    $('reportModal').classList.remove('hidden');
}

function closeModal() { $('reportModal').classList.add('hidden'); }

function openImg(src) {
    var v = document.createElement('div');
    v.className = 'image-viewer';
    var img = document.createElement('img');
    img.src = src;
    v.appendChild(img);
    v.addEventListener('click', function() { v.remove(); });
    document.body.appendChild(v);
}

function handleSearch() {
    var q = $('searchInput').value.trim();
    if (q.length > 0) $('searchClear').classList.remove('hidden');
    else {
        $('searchClear').classList.add('hidden');
        $('searchSuggestions').classList.add('hidden');
        renderReports(); return;
    }
    var sg = [];
    var keys = Object.keys(allReports);
    for (var i = 0; i < keys.length; i++) {
        var r = allReports[keys[i]];
        var s = ((r.name||'') + ' ' + (r.reason||'')).toLowerCase();
        if (s.indexOf(q.toLowerCase()) !== -1) sg.push({ k: keys[i], r: r });
    }
    var html = '';
    if (sg.length > 0) {
        var max = Math.min(sg.length, 12);
        for (var i = 0; i < max; i++) {
            html += '<div class="search-suggestion-item" onclick="selectSug(\'' + sg[i].k + '\')">';
            html += '<div class="suggestion-icon"><i class="fas fa-user"></i></div><div>';
            html += '<div class="suggestion-name">' + esc(sg[i].r.name) + '</div>';
            html += '<div class="suggestion-reason">' + esc(sg[i].r.reason) + ' - ' + fmtTime(sg[i].r.timestamp) + '</div></div></div>';
        }
    } else {
        html = '<div class="search-suggestion-item"><div class="suggestion-icon"><i class="fas fa-search"></i></div><div><div class="suggestion-name" style="color:var(--text-muted)">No results</div></div></div>';
    }
    $('searchSuggestions').innerHTML = html;
    $('searchSuggestions').classList.remove('hidden');
    renderReports(q);
}

function selectSug(k) { $('searchSuggestions').classList.add('hidden'); viewReport(k); }

function getReasonClass(r) {
    if (!r) return 'reason-others';
    if (r.indexOf('Late') !== -1) return 'reason-late';
    if (r.indexOf('Gap') !== -1) return 'reason-gap';
    if (r.indexOf('Sticker') !== -1 || r.indexOf('Emoji') !== -1 || r.indexOf('NC') !== -1) return 'reason-sticker';
    if (r.indexOf('Duplicate') !== -1) return 'reason-duplicate';
    if (r.indexOf('Obscene') !== -1) return 'reason-obscene';
    if (r.indexOf('Double') !== -1) return 'reason-double';
    return 'reason-others';
}

function fmtTime(ts) {
    if (!ts) return '';
    var diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    var d = new Date(ts);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function esc(t) {
    if (!t) return '';
    var d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

function showToast(msg, type) {
    var c = $('toastContainer');
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    var ic = 'fa-info-circle';
    if (type === 'success') ic = 'fa-check-circle';
    if (type === 'error') ic = 'fa-exclamation-circle';
    t.innerHTML = '<i class="fas ' + ic + '"></i><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(function() {
        t.style.animation = 'toastOut 0.4s ease forwards';
        setTimeout(function() { t.remove(); }, 400);
    }, 3000);
}

function showLoading() { $('loadingOverlay').classList.remove('hidden'); }
function hideLoading() { $('loadingOverlay').classList.add('hidden'); }

window.removeFile = removeFile;
window.dismissReport = dismissReport;
window.restoreReport = restoreReport;
window.deleteReport = deleteReport;
window.viewReport = viewReport;
window.selectSug = selectSug;
window.openImg = openImg;