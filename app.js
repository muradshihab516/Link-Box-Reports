/* ===== CONFIGURATION ===== */
// আপনার Supabase ড্যাশবোর্ড থেকে নিন
const SUPABASE_URL = "https://xzgozwylnfpcicdipjhw.supabase.co";
const SUPABASE_KEY = "sb_publishable_mjndYPAxtmjjulEtV3brkA_CPhU4BA_";

// আপনার Cloudinary ড্যাশবোর্ড থেকে নিন
const CLOUDINARY_CLOUD_NAME = "dm0f7l6qa"; 
const CLOUDINARY_PRESET = "Reports"; // অবশ্যই Unsigned হতে হবে

// Initialize Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ===== ADMIN LIST ===== */
var ADMIN_NAMES = {
    'shihab@linkbox.com': 'Md Shihab Khan',
    'mamun@linkbox.com': 'Mamun Aravi',
    'shuvo@linkbox.com': 'Shuvo Sutradhar',
    'shadat@linkbox.com': 'ShaDat Hossain',
    'rubel@linkbox.com': 'Ariyan Ahmed Rubel',
    'mustakim@linkbox.com': 'MD Mustakim Islam', // এখানে কমা যোগ করা হয়েছে
    'Hanif@linkbox.com': 'Mohammad Abu Hanif'
};
    // টেস্ট করার জন্য আপনার নিজের ইমেইল এখানে যোগ করতে পারেন
};

var currentAdmin = null;
var allReports = {};
var singleFiles = [];
var multipleFiles = [];
var realtimeChannel = null;

function $(id) { return document.getElementById(id); }

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', function() {
    initAuthListener();
    initEvents();
    setDefaultDate();
});

/* ===== AUTH STATE LISTENER ===== */
async function initAuthListener() {
    // Check current session
    const { data: { session } } = await supabase.auth.getSession();
    handleUserSession(session);

    // Listen for changes
    supabase.auth.onAuthStateChange((_event, session) => {
        handleUserSession(session);
    });
}

function handleUserSession(session) {
    if (session && session.user) {
        const email = session.user.email;
        if (ADMIN_NAMES.hasOwnProperty(email)) {
            currentAdmin = {
                uid: session.user.id,
                email: email,
                name: ADMIN_NAMES[email]
            };
            showApp();
        } else {
            alert('Access Denied: You are not an authorized admin.');
            supabase.auth.signOut();
            showLogin();
        }
    } else {
        currentAdmin = null;
        if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
        showLogin();
    }
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

/* ===== EVENT LISTENERS ===== */
function initEvents() {
    $('loginForm').addEventListener('submit', handleLogin);
    
    $('togglePass').addEventListener('click', function() {
        var inp = $('loginPass');
        var ic = $('togglePass');
        if (inp.type === 'password') {
            inp.type = 'text'; ic.classList.remove('fa-eye'); ic.classList.add('fa-eye-slash');
        } else {
            inp.type = 'password'; ic.classList.remove('fa-eye-slash'); ic.classList.add('fa-eye');
        }
    });

    $('logoutBtn').addEventListener('click', function() {
        supabase.auth.signOut();
    });

    // Tabs & Type Buttons (Same as before)
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
                $('singleForm').classList.remove('hidden'); $('multipleForm').classList.add('hidden');
            } else {
                $('singleForm').classList.add('hidden'); $('multipleForm').classList.remove('hidden');
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
        $('searchInput').value = ''; $('searchClear').classList.add('hidden');
        $('searchSuggestions').classList.add('hidden'); renderReports();
    });
    $('modalClose').addEventListener('click', closeModal);
    var overlay = document.querySelector('.modal-overlay');
    if(overlay) overlay.addEventListener('click', closeModal);

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) $('searchSuggestions').classList.add('hidden');
    });
}

function setDefaultDate() {
    var today = new Date();
    $('multipleDate').value = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');
}

/* ===== LOGIN (Supabase Auth) ===== */
async function handleLogin(e) {
    e.preventDefault();
    var email = $('loginEmail').value.trim();
    var pass = $('loginPass').value;
    $('loginError').textContent = '';

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass,
    });

    if (error) {
        $('loginError').textContent = error.message;
    } else {
        $('loginEmail').value = ''; $('loginPass').value = '';
    }
}

/* ===== FILE HANDLING ===== */
function handleFileSelect(e, type) {
    var files = Array.from(e.target.files);
    files.forEach(function(file) {
        if (file.size > 5 * 1024 * 1024) { showToast('Max 5MB per file', 'error'); return; }
        var reader = new FileReader();
        reader.onload = function(ev) {
            var obj = { dataUrl: ev.target.result, file: file };
            if (type === 'single') singleFiles.push(obj);
            else multipleFiles.push(obj);
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
        html += '<img src="' + f[i].dataUrl + '">';
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

/* ===== UPLOAD TO CLOUDINARY ===== */
async function uploadFiles(fileObjects) {
    if (!fileObjects || fileObjects.length === 0) {
        return Promise.resolve([]);
    }

    const promises = fileObjects.map(async (fileObj) => {
        const formData = new FormData();
        formData.append('file', fileObj.file);
        formData.append('upload_preset', CLOUDINARY_PRESET);
        formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            return data.secure_url;
        } catch (err) {
            console.error("Upload failed", err);
            throw new Error("Image upload failed");
        }
    });

    return Promise.all(promises);
}

/* ===== SINGLE REPORT SUBMIT (Supabase) ===== */
function handleSingleSubmit() {
    var name = $('singleName').value.trim();
    var reason = $('singleReason').value;
    var desc = $('singleDesc').value.trim();
    
    if (!name) { showToast('Enter member name', 'error'); return; }
    if (!reason) { showToast('Select report reason', 'error'); return; }
    showLoading();

    uploadFiles(singleFiles).then(async function(urls) {
        const { error } = await supabase.from('reports').insert({
            name: name,
            reason: reason,
            description: desc || '',
            screenshots: urls, // Supabase stores array directly
            link_number: '',
            gap_details: '',
            admin_name: currentAdmin.name,
            admin_email: currentAdmin.email,
            created_at: new Date().toISOString(),
            report_date: '',
            dismissed: false
        });

        if (error) throw error;

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

/* ===== PARSE FUNCTIONS (Same as before) ===== */
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
        html += '<div class="parsed-item"><div class="parsed-number">' + (i + 1) + '</div>';
        html += '<div class="parsed-name">' + esc(parsed[i].name) + '</div>';
        html += '<div class="parsed-extra">' + esc(parsed[i].extra || '') + '</div></div>';
    }
    $('parsedList').innerHTML = html;
    $('parsePreview').classList.remove('hidden');
    $('parsePreview').dataset.parsed = JSON.stringify(parsed);
    showToast(parsed.length + ' member(s) parsed', 'info');
}

// ... (parseLateAllDone, parseSupportGap, parseGeneric ফাংশনগুলো আগের মতোই থাকবে, কোনো পরিবর্তন নেই) ...
function parseLateAllDone(text) {
    var results = []; var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var atMatch = line.match(/@([^@\n]+)/);
        var pinMatch = line.match(/📌\s*\/?\s*(\d+)/);
        if (atMatch && pinMatch) {
            var name = atMatch[1].trim().replace(/^[\d️⃣\s\.\)\-]+/, '').trim().replace(/\s*📌.*$/, '').trim();
            if (name.length > 0) results.push({ name: name, extra: '📌/' + pinMatch[1], linkNumber: '📌/' + pinMatch[1] });
        }
    }
    return results;
}

function parseSupportGap(text) {
    var results = []; var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i]; var atIdx = line.indexOf('@');
        if (atIdx === -1) continue;
        var gapIdx = line.indexOf('সাপোর্ট গ্যাপ', atIdx);
        if (gapIdx === -1) gapIdx = line.indexOf('গ্যাপ', atIdx);
        if (gapIdx === -1) continue;
        var name = line.substring(atIdx + 1, gapIdx).trim().replace(/^[\d️⃣\s\.\)\-]+/, '').trim();
        var rest = line.substring(gapIdx);
        var numMatch = rest.match(/(\d+)\s*পোস্ট/);
        var bracketMatch = rest.match(/\(([^)]+)\)/);
        var gapCount = numMatch ? numMatch[1] : '?';
        var postNums = bracketMatch ? bracketMatch[1].trim() : '';
        if (name.length > 0) {
            var gapDetail = 'সাপোর্ট গ্যাপ ' + gapCount + ' পোস্ট';
            if (postNums) gapDetail += ' (' + postNums + ')';
            results.push({ name: name, extra: 'গ্যাপ ' + gapCount + (postNums ? ' (' + postNums + ')' : ''), gapDetails: gapDetail });
        }
    }
    return results;
}

function parseGeneric(text) {
    var results = []; var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var match = lines[i].match(/@([^@\n]+)/);
        if (match) {
            var name = match[1].trim().replace(/^[\d️⃣\s\.\)\-]+/, '').trim();
            if (name.length > 1) results.push({ name: name, extra: '' });
        }
    }
    return results;
}
// ... (Parsing functions end) ...


/* ===== MULTIPLE REPORT SUBMIT (Supabase Batch) ===== */
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

    uploadFiles(multipleFiles).then(async function(urls) {
        // Prepare array for bulk insert
        const rows = parsed.map(p => ({
            name: p.name,
            reason: reason,
            description: desc || '',
            screenshots: urls,
            link_number: p.linkNumber || '',
            gap_details: p.gapDetails || p.extra || '',
            admin_name: currentAdmin.name,
            admin_email: currentAdmin.email,
            created_at: new Date().toISOString(),
            report_date: dateVal || '',
            dismissed: false
        }));

        const { error } = await supabase.from('reports').insert(rows);
        if (error) throw error;

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

/* ===== LOAD REPORTS (Supabase Realtime) ===== */
function loadReports() {
    fetchInitialData();

    // Subscribe to changes
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    
    realtimeChannel = supabase
        .channel('public:reports')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
            // Reload data on any change (Insert/Update/Delete)
            fetchInitialData();
        })
        .subscribe();
}

async function fetchInitialData() {
    // Load last 50 reports
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        showToast('Error loading reports', 'error');
        console.error(error);
        return;
    }

    allReports = {};
    data.forEach(row => {
        allReports[row.id] = row;
    });
    renderReports();
    updateCounts();
}

/* ===== RENDER REPORTS ===== */
function renderReports(filter) {
    filter = filter || '';
    var active = []; var dismissed = [];
    var keys = Object.keys(allReports);
    
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i]; var r = allReports[k];
        if (filter) {
            var s = ((r.name||'') + ' ' + (r.reason||'') + ' ' + (r.description||'') + ' ' + (r.admin_name||'')).toLowerCase();
            if (s.indexOf(filter.toLowerCase()) === -1) continue;
        }
        if (r.dismissed) dismissed.push(r); else active.push(r);
    }
    
    // Sorting happens in SQL fetch mostly, but good to keep JS sort for filtered view
    active.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    dismissed.sort(function(a, b) { return new Date(b.dismissed_at || b.created_at) - new Date(a.dismissed_at || a.created_at); });
    
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
        var r = reports[i]; var rc = getReasonClass(r.reason);
        var t = fmtTime(r.created_at);
        var hasImg = r.screenshots && r.screenshots.length > 0;
        
        // Note: r.id is numeric in Supabase, handle carefully in onclick
        html += '<div class="report-card ' + (isDismissed ? 'dismissed' : '') + '">';
        html += '<div class="report-card-header">';
        html += '<div class="report-name">' + esc(r.name) + '</div>';
        html += '<span class="report-reason-badge ' + rc + '">' + esc(r.reason) + '</span></div>';
        if (r.link_number) html += '<div class="report-link-numbers">Link: ' + esc(r.link_number) + '</div>';
        if (r.gap_details) html += '<div class="report-link-numbers">' + esc(r.gap_details) + '</div>';
        if (r.description) {
            var ds = r.description.length > 80 ? r.description.substring(0, 80) + '...' : r.description;
            html += '<div class="report-desc-preview">' + esc(ds) + '</div>';
        }
        html += '<div class="report-card-info">';
        html += '<div class="report-info-item"><i class="fas fa-clock"></i> ' + t + '</div>';
        html += '<div class="report-info-item"><i class="fas fa-user-shield"></i> ' + esc(r.admin_name) + '</div>';
        if (hasImg) html += '<div class="report-info-item"><i class="fas fa-image"></i> ' + r.screenshots.length + '</div>';
        if (isDismissed && r.dismissed_by) html += '<div class="report-info-item"><i class="fas fa-check"></i> ' + esc(r.dismissed_by) + '</div>';
        html += '</div><div class="report-card-actions">';
        html += '<button class="btn-view" onclick="event.stopPropagation();viewReport(' + r.id + ')"><i class="fas fa-eye"></i> View</button>';
        if (!isDismissed) html += '<button class="btn-dismiss" onclick="event.stopPropagation();dismissReport(' + r.id + ')"><i class="fas fa-check"></i> Dismiss</button>';
        else html += '<button class="btn-restore" onclick="event.stopPropagation();restoreReport(' + r.id + ')"><i class="fas fa-undo"></i> Restore</button>';
        html += '<button class="btn-delete" onclick="event.stopPropagation();deleteReport(' + r.id + ')"><i class="fas fa-trash"></i></button>';
        html += '</div></div>';
    }
    container.innerHTML = html;
}

function updateCounts() {
    var a = 0, d = 0; var keys = Object.keys(allReports);
    for (var i = 0; i < keys.length; i++) { if (allReports[keys[i]].dismissed) d++; else a++; }
    $('reportCount').textContent = a; $('dismissedCount').textContent = d;
}

/* ===== ACTIONS (Supabase) ===== */
async function dismissReport(id) {
    const { error } = await supabase.from('reports').update({
        dismissed: true,
        dismissed_by: currentAdmin.name,
        dismissed_at: new Date().toISOString()
    }).eq('id', id);

    if (error) showToast('Error: ' + error.message, 'error');
    else showToast('Dismissed', 'success');
}

async function restoreReport(id) {
    const { error } = await supabase.from('reports').update({
        dismissed: false,
        dismissed_by: null,
        dismissed_at: null
    }).eq('id', id);

    if (error) showToast('Error: ' + error.message, 'error');
    else showToast('Restored', 'info');
}

async function deleteReport(id) {
    if (confirm('Permanently delete this report?')) {
        const { error } = await supabase.from('reports').delete().eq('id', id);
        if (error) showToast('Error: ' + error.message, 'error');
        else showToast('Deleted', 'success');
    }
}

/* ===== VIEW REPORT MODAL ===== */
function viewReport(id) {
    var r = allReports[id]; if (!r) return;
    var rc = getReasonClass(r.reason);
    var h = '';
    h += '<div class="modal-detail-row"><div class="modal-detail-label">Member Name</div>';
    h += '<div class="modal-detail-value" style="font-size:17px;font-weight:700">' + esc(r.name) + '</div></div>';
    h += '<div class="modal-detail-row"><div class="modal-detail-label">Report Reason</div>';
    h += '<div class="modal-detail-value"><span class="report-reason-badge ' + rc + '" style="font-size:12px;padding:5px 12px">' + esc(r.reason) + '</span></div></div>';
    if (r.link_number) { h += '<div class="modal-detail-row"><div class="modal-detail-label">Link Number</div>'; h += '<div class="modal-detail-value" style="color:var(--accent);font-weight:600">' + esc(r.link_number) + '</div></div>'; }
    if (r.gap_details) { h += '<div class="modal-detail-row"><div class="modal-detail-label">Gap Details</div>'; h += '<div class="modal-detail-value" style="color:var(--danger);font-weight:600">' + esc(r.gap_details) + '</div></div>'; }
    if (r.description) { h += '<div class="modal-detail-row"><div class="modal-detail-label">Description</div>'; h += '<div class="modal-detail-value">' + esc(r.description) + '</div></div>'; }
    if (r.report_date) { h += '<div class="modal-detail-row"><div class="modal-detail-label">Report Date</div>'; h += '<div class="modal-detail-value">' + esc(r.report_date) + '</div></div>'; }
    h += '<div class="modal-detail-row"><div class="modal-detail-label">Reported By</div>';
    h += '<div class="modal-detail-value"><i class="fas fa-user-shield" style="color:var(--accent);margin-right:6px"></i>' + esc(r.admin_name) + '</div></div>';
    h += '<div class="modal-detail-row"><div class="modal-detail-label">Submitted At</div>';
    h += '<div class="modal-detail-value">' + fmtTime(r.created_at) + '</div></div>';
    if (r.dismissed) {
        h += '<div class="modal-detail-row"><div class="modal-detail-label">Status</div>';
        h += '<div class="modal-detail-value" style="color:var(--success)"><i class="fas fa-check-circle"></i> Dismissed by ' + esc(r.dismissed_by || 'Unknown');
        if (r.dismissed_at) h += ' - ' + fmtTime(r.dismissed_at);
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
    $('modalBody').innerHTML = h; $('reportModal').classList.remove('hidden');
}

function closeModal() { $('reportModal').classList.add('hidden'); }

function openImg(src) {
    var v = document.createElement('div'); v.className = 'image-viewer';
    var img = document.createElement('img'); img.src = src; v.appendChild(img);
    v.addEventListener('click', function() { v.remove(); });
    document.body.appendChild(v);
}

/* ===== SEARCH ===== */
function handleSearch() {
    var q = $('searchInput').value.trim();
    if (q.length > 0) $('searchClear').classList.remove('hidden');
    else { $('searchClear').classList.add('hidden'); $('searchSuggestions').classList.add('hidden'); renderReports(); return; }
    var sg = []; var keys = Object.keys(allReports);
    for (var i = 0; i < keys.length; i++) {
        var r = allReports[keys[i]];
        if (((r.name||'') + ' ' + (r.reason||'')).toLowerCase().indexOf(q.toLowerCase()) !== -1)
            sg.push({ k: keys[i], r: r });
    }
    var html = '';
    if (sg.length > 0) {
        var max = Math.min(sg.length, 12);
        for (var i = 0; i < max; i++) {
            html += '<div class="search-suggestion-item" onclick="selectSug(' + sg[i].k + ')">';
            html += '<div class="suggestion-icon"><i class="fas fa-user"></i></div><div>';
            html += '<div class="suggestion-name">' + esc(sg[i].r.name) + '</div>';
            html += '<div class="suggestion-reason">' + esc(sg[i].r.reason) + ' - ' + fmtTime(sg[i].r.created_at) + '</div></div></div>';
        }
    } else {
        html = '<div class="search-suggestion-item"><div class="suggestion-icon"><i class="fas fa-search"></i></div><div><div class="suggestion-name" style="color:var(--text-muted)">No results</div></div></div>';
    }
    $('searchSuggestions').innerHTML = html; $('searchSuggestions').classList.remove('hidden');
    renderReports(q);
}

function selectSug(k) { $('searchSuggestions').classList.add('hidden'); viewReport(k); }

/* ===== HELPERS ===== */
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
    var d = new Date(ts); // Supabase returns ISO string, convert to Date object
    var now = new Date();
    var diff = now - d;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function esc(t) {
    if (!t) return '';
    var d = document.createElement('div'); d.textContent = t; return d.innerHTML;
}

function showToast(msg, type) {
    var c = $('toastContainer'); var t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    var ic = 'fa-info-circle';
    if (type === 'success') ic = 'fa-check-circle';
    if (type === 'error') ic = 'fa-exclamation-circle';
    t.innerHTML = '<i class="fas ' + ic + '"></i><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(function() { t.style.animation = 'toastOut 0.4s ease forwards'; setTimeout(function() { t.remove(); }, 400); }, 3000);
}

function showLoading() { $('loadingOverlay').classList.remove('hidden'); }
function hideLoading() { $('loadingOverlay').classList.add('hidden'); }

// Expose to window
window.removeFile = removeFile;
window.dismissReport = dismissReport;
window.restoreReport = restoreReport;
window.deleteReport = deleteReport;
window.viewReport = viewReport;
window.selectSug = selectSug;
window.openImg = openImg;
