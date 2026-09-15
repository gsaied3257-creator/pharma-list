/* ============ Constants ============ */
var STORAGE_KEY = 'pharmacy_v4_items';
var THEME_KEY = 'pharmacy_v4_theme';

/* ============ State ============ */
var items = [];
var nextId = 1;
var currentFilter = 'all';
var searchTerm = '';

/* ============ Helpers ============ */
function $(id) { return document.getElementById(id); }

function save() {
try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch(e) {}
}

function load() {
try {
var raw = localStorage.getItem(STORAGE_KEY);
if (raw) {
var parsed = JSON.parse(raw);
if (Object.prototype.toString.call(parsed) === '[object Array]') {
items = parsed;
for (var n = 0; n < items.length; n++) {
items[n].name = cleanProductName(items[n].name);
}
nextId = 1;
for (var i = 0; i < items.length; i++) {
var id = parseInt(items[i].id, 10) || 0;
if (id >= nextId) nextId = id + 1;
}
return;
}
}
} catch(e) {}
items = [];
nextId = 1;
}

function computeQty(cons, bal) {
var c = Number(cons) || 0;
var b = Number(bal) || 0;
var d = c - b;
return d > 0 ? Math.ceil(d - 1e-9) : 0;
}

function escapeHtml(s) {
return String(s == null ? '' : s)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;');
}

function findItem(id) {
for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
return null;
}

function toast(msg) {
var t = $('toast');
if (!t) return;
t.textContent = msg;
t.classList.add('show');
clearTimeout(toast._t);
toast._t = setTimeout(function() { t.classList.remove('show'); }, 2000);
}

/* ============ Render ============ */
function render() {
var list = $('list');
if (!list) return;
var term = (searchTerm || '').trim().toLowerCase();
var html = '';
var visible = 0;

for (var i = 0; i < items.length; i++) {
var it = items[i];
if (currentFilter === 'pending' && it.done) continue;
if (currentFilter === 'done' && !it.done) continue;
if (term && String(it.name || '').toLowerCase().indexOf(term) === -1) continue;
visible++;
html += renderItem(it);
}

list.innerHTML = html;

var empty = $('emptyState');
if (empty) empty.style.display = (visible === 0) ? 'block' : 'none';

updateProgress();
}

function renderItem(it) {
var cls = it.done ? 'item done' : 'item';
var bal = (it.bal != null) ? it.bal : 0;
var cons = (it.cons != null) ? it.cons : 0;
var qty = (it.qty != null) ? it.qty : 0;
return ''
+ '<div class="' + cls + '">'
+ '<div class="item-top">'
+ '<div class="check" data-action="toggle" data-id="' + it.id + '">'
+ '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
+ '</div>'
+ '<input class="item-name" data-action="name" data-id="' + it.id + '" value="' + escapeHtml(it.name) + '">'
+ '<button class="del-btn" type="button" data-action="delete" data-id="' + it.id + '" title="حذف" aria-label="حذف الصنف">'
+ '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>'
+ '</button>'
+ '</div>'
+ '<div class="stat-row">'
+ '<div class="stat-field"><label>الرصيد</label>'
+ '<input type="number" step="any" inputmode="decimal" data-action="bal" data-id="' + it.id + '" value="' + bal + '">'
+ '</div>'
+ '<div class="stat-field"><label>معدل الاستهلاك</label>'
+ '<input type="number" step="any" inputmode="decimal" data-action="cons" data-id="' + it.id + '" value="' + cons + '">'
+ '</div>'
+ '<div class="stat-field result"><label>عدد العلب</label>'

+ '<input type="number" min="0" inputmode="numeric" data-action="qty" data-id="' + it.id + '" value="' + qty + '">'
+ '</div>'
+ '</div>'
+ '<div class="item-bottom">'
+ '<div class="qty">'
+ '<button type="button" data-action="dec" data-id="' + it.id + '">−</button>'
+ '<span>تعديل يدوي</span>'
+ '<button type="button" data-action="inc" data-id="' + it.id + '">+</button>'
+ '</div>'
+ '<button class="copy-btn" type="button" data-action="copy" data-id="' + it.id + '">📋 نسخ الاسم</button>'
+ '</div>'
+ '</div>';
}

function updateProgress() {
var total = items.length;
var done = 0;
for (var i = 0; i < items.length; i++) if (items[i].done) done++;
var pc = $('progressCount');
var pf = $('progressFill');
if (pc) pc.textContent = done + ' / ' + total;
if (pf) pf.style.width = total ? (done / total * 100) + '%' : '0%';
}

/* ============ List events ============ */
function handleAction(action, id, el) {
var it = findItem(id);
if (!it) return;
if (action === 'toggle') {
it.done = !it.done; save(); render();
} else if (action === 'inc') {
it.qty = (parseInt(it.qty, 10) || 0) + 1; save(); render();
} else if (action === 'dec') {
it.qty = Math.max(0, (parseInt(it.qty, 10) || 0) - 1); save(); render();
} else if (action === 'delete') {
items = items.filter(function(x) { return x.id !== id; });
save(); render();
} else if (action === 'copy') {
copyText(it.name);
toast('اتنسخ اسم الصنف');
}
}

function handleInput(action, id, el) {
var it = findItem(id);
if (!it) return;
if (action === 'name') {
it.name = el.value; save();
} else if (action === 'qty') {
var v = parseInt(el.value, 10);
if (isNaN(v) || v < 0) v = 0;
it.qty = v; save(); updateProgress();
} else if (action === 'bal' || action === 'cons') {
var val = parseFloat(el.value);
if (isNaN(val) || val < 0) val = 0;
if (action === 'bal') it.bal = val;
else it.cons = val;
it.qty = computeQty(it.cons, it.bal);
var node = el;
while (node && node !== document.body) {
if (node.classList && node.classList.contains('item')) break;
node = node.parentNode;
}
if (node && node.querySelector) {
var qf = node.querySelector('[data-action="qty"]');
if (qf) qf.value = it.qty;
}
save();
}
}

function attachListEvents() {
var list = $('list');
if (!list) return;

list.addEventListener('click', function(e) {
var el = e.target;
while (el && el !== list && !(el.getAttribute && el.getAttribute('data-action'))) {
el = el.parentNode;
}
if (!el || el === list) return;
var action = el.getAttribute('data-action');
if (!action) return;
var id = parseInt(el.getAttribute('data-id'), 10);
handleAction(action, id, el);
});

list.addEventListener('input', function(e) {
var el = e.target;
if (!el || !el.getAttribute) return;
var action = el.getAttribute('data-action');
if (!action) return;
var id = parseInt(el.getAttribute('data-id'), 10);
handleInput(action, id, el);
});
}

/* ============ Copy ============ */
function copyText(text) {
text = String(text || '');
try {
if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(text).catch(function() { fallbackCopy(text); });
return;
}
} catch(e) {}
fallbackCopy(text);
}

function fallbackCopy(text) {
try {
var ta = document.createElement('textarea');
ta.value = text;
ta.style.position = 'fixed';
ta.style.opacity = '0';
document.body.appendChild(ta);
ta.select();
document.execCommand('copy');
document.body.removeChild(ta);
} catch(e) {}
}

/* ============ Theme ============ */
function setTheme(theme) {
document.documentElement.setAttribute('data-theme', theme);
var btn = $('themeToggle');
if (btn) btn.textContent = (theme === 'dark') ? '☀️' : '🌙';
try { localStorage.setItem(THEME_KEY, theme); } catch(e) {}
}

function initTheme() {
var theme = 'light';
try {
var saved = localStorage.getItem(THEME_KEY);
if (saved === 'dark' || saved === 'light') {
theme = saved;
} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
theme = 'dark';
}
} catch(e) {}
setTheme(theme);
}

function toggleTheme() {
var cur = document.documentElement.getAttribute('data-theme') || 'light';
setTheme(cur === 'dark' ? 'light' : 'dark');
}

/* ============ PDF: extract text ============ */
function extractPdfText(arrayBuffer) {
if (!window.pdfjsLib) return Promise.reject(new Error('مكتبة PDF مش محمّلة'));
return pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(function(pdf) {
var fullText = '';
var chain = Promise.resolve();
var pages = [];
for (var p = 1; p <= pdf.numPages; p++) pages.push(p);

pages.forEach(function(p) {
chain = chain.then(function() {
return pdf.getPage(p).then(function(page) {
return page.getTextContent().then(function(content) {
var pageItems = [];
for (var i = 0; i < content.items.length; i++) {
var it = content.items[i];
if (it.str && it.str.length) {
pageItems.push({ str: it.str, x: it.transform[4], y: it.transform[5] });
}
}
pageItems.sort(function(a, b) { return b.y - a.y || a.x - b.x; });
var lines = [];
var line = [];
var lastY = null;
for (var k = 0; k < pageItems.length; k++) {
var item = pageItems[k];
if (lastY === null || Math.abs(item.y - lastY) <= 3) {
line.push(item);
} else {
lines.push(line);
line = [item];
}
lastY = item.y;
}
if (line.length) lines.push(line);

for (var L = 0; L < lines.length; L++) {
lines[L].sort(function(a, b) { return a.x - b.x; });
var parts = [];
for (var m = 0; m < lines[L].length; m++) parts.push(lines[L][m].str);
fullText += parts.join(' ') + '\n';
}
});
});
});
});

return chain.then(function() { return fullText; });
});
}

/* ============ PDF: parse text ============ */
function parseInventoryText(text) {
var results = [];
var lines = String(text || '').split(/\r?\n/);
var seen = {};

for (var i = 0; i < lines.length; i++) {
var line = lines[i].replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
if (!line) continue;

var numberMatches = [];
var numberPattern = /-?\d+(?:[.,]\d{1,3})?/g;
var match;
while ((match = numberPattern.exec(line)) !== null) {
numberMatches.push({ value: match[0], end: numberPattern.lastIndex });
}
if (numberMatches.length < 5) continue;

var values = numberMatches.slice(0, 5).map(function (entry) {
return Number(entry.value.replace(',', '.'));
});
if (values.some(function (value) { return !Number.isFinite(value); })) continue;

var rest = line.slice(numberMatches[4].end)
 .replace(/^\s*[-|:؛،]+\s*/, '')
 .replace(/\s+/g, ' ')
 .trim();

// Ignore report headers, print metadata, totals, and page/footer information.
if (/(?:طباعة|المستخدم|التاريخ|الوقت|الصفحة|صفحة|اجمالي|إجمالي|الإجمالي|كشكول|تقرير|printed|print date|page|total|report)/i.test(line)) {
continue;
}

// Remove the product code, not dosage numbers that belong to the product name.
// The report can place the code before or after the name.
rest = rest
.replace(/^\s*[A-Z]?\d{3,8}\s*[-|:؛،]?\s*/i, '')
.replace(/\s+\d{4,8}\s*$/, '')
.replace(/\s*[-|:؛،]?\s*[A-Z]?\d{3,8}\s*$/i, '')
.replace(/\s+/g, ' ')
.trim();
rest = rest.replace(/\s+(?:ل|شركة)\s+.+$/i, '').trim();
if (!rest || !/[A-Za-z\u0600-\u06FF]/.test(rest)) continue;
if (/^(الصنف|الاسم|الكود|الشركة|الرصيد|الكمية|معدل|المطلوبة)/i.test(rest)) continue;
if (/(?:طباعة|التاريخ|الوقت|الصفحة|صفحة|اجمالي|إجمالي|الإجمالي|تقرير|printed|print date|page|total|report)/i.test(rest)) {
continue;
}

rest = cleanProductName(rest);
if (!rest) continue;
var key = rest.toLowerCase();
if (seen[key]) continue;
seen[key] = true;
results.push({
name: rest,
cons: values[1],
bal: values[2]
});
}
return results;
}

function cleanProductName(name) {
return String(name || '')
 .replace(/\u00a0/g, ' ')
 .replace(/\s+/g, ' ')
 .replace(/[\s|:؛،-]+$/, '')
 .replace(/\s+\d{4,8}\s*$/, '')
 .replace(/\s+[A-Z]?\d{4,8}\s*$/i, '')
 .trim();
}

/* ============ PDF: handle file ============ */
function handlePdfFile(file) {
var status = $('uploadStatus');
if (status) {
status.className = 'upload-status';
status.innerHTML = '<span class="spinner"></span> بيقرأ الملف...';
}

file.arrayBuffer().then(function(buf) {
return extractPdfText(buf);
}).then(function(text) {
var parsed = parseInventoryText(text);
console.log('[PDF] raw length:', text.length, 'parsed:', parsed.length);
console.log('[PDF] first 5:', parsed.slice(0, 5));

if (!parsed.length) {
if (status) {
status.className = 'upload-status err';
status.textContent = 'معرفش أستخرج أصناف من الملف ده.';
}
return;
}

var existing = {};
for (var i = 0; i < items.length; i++) {
var k = String(items[i].name || '').trim().toLowerCase();
if (k) existing[k] = true;
}

var added = 0;
var skipped = 0;
for (var j = 0; j < parsed.length; j++) {
var p = parsed[j];
var cleanName = cleanProductName(p.name);
var key = cleanName.toLowerCase();
if (!key) continue;
if (existing[key]) { skipped++; continue; }
existing[key] = true;
items.push({
id: nextId++,
name: cleanName,
cons: p.cons,
bal: p.bal,
qty: computeQty(p.cons, p.bal),
done: false
});
added++;
}

save();
render();

if (status) {
if (added === 0 && skipped > 0) {
status.className = 'upload-status';
status.textContent = 'مفيش أصناف جديدة -- كل ' + skipped + ' صنف موجودين بالفعل.';
} else {
status.className = 'upload-status ok';
status.textContent = 'تمام! اتضاف ' + added + ' صنف' + (skipped ? ' (واتجاهل ' + skipped + ' مكرر)' : '') + '.';
}
}
toast('اتضاف ' + added + ' صنف');
}).catch(function(err) {
console.error('[PDF] error:', err);
if (status) {
status.className = 'upload-status err';
status.textContent = 'خطأ: ' + (err && err.message ? err.message : 'مش معروف');
}
});
}

/* ============ Export ============ */
function buildJSON() {
var out = [];
for (var i = 0; i < items.length; i++) {
var q = parseInt(items[i].qty, 10) || 0;
if (q > 0) out.push({ name: items[i].name, qty: q });
}
out.sort(function(a, b) {
return String(a.name || '').localeCompare(String(b.name || ''));
});
return JSON.stringify(out, null, 2);
}

function downloadJSON() {
try {
var content = buildJSON();
var blob = new Blob([content], { type: 'application/json;charset=utf-8' });
var url = URL.createObjectURL(blob);
var a = document.createElement('a');
a.href = url;
a.download = 'order_list.json';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
} catch(e) { console.warn(e); }
}

function buildExportText() {
var parts = [];
for (var i = 0; i < items.length; i++) {
var q = parseInt(items[i].qty, 10) || 0;
if (q > 0) parts.push(items[i].name + '\n' + q);
}
return parts.join('\n\n');
}

/* ============ Manual add ============ */
function addManual() {
var nn = $('newName');
var nq = $('newQty');
var name = (nn.value || '').trim();
if (!name) { toast('اكتب اسم الصنف'); return; }
var qty = parseInt(nq.value, 10);
if (isNaN(qty) || qty < 0) qty = 1;
items.push({ id: nextId++, name: name, qty: qty, done: false, cons: 0, bal: 0 });
save();
nn.value = '';
nq.value = '1';
render();
toast('اتضاف الصنف');
}

/* ============ Attach events ============ */
function attachEvents() {
var tt = $('themeToggle');
if (tt) tt.addEventListener('click', toggleTheme);

var rb = $('resetIconBtn');
if (rb) rb.addEventListener('click', function() {
if (!confirm('استرجاع؟ هيمسح الليستة كلها.')) return;
items = []; nextId = 1; save(); render();
toast('اتصفّرت الليستة');
});

var rdb = $('removeDoneBtn');
if (rdb) rdb.addEventListener('click', function() {
var doneCount = 0;
for (var i = 0; i < items.length; i++) {
if (items[i].done) doneCount++;
}
if (!doneCount) {
toast('مفيش أصناف متعلمة');
return;
}
if (!confirm('حذف ' + doneCount + ' صنف متعلم؟')) return;
items = items.filter(function(item) { return !item.done; });
save();
render();
toast('اتحذفت الأصناف المعلمة');
});

var si = $('searchInput');
if (si) si.addEventListener('input', function(e) {
searchTerm = e.target.value;
render();
});

var fbs = document.querySelectorAll('.filter-btn');
for (var i = 0; i < fbs.length; i++) {
(function(btn) {
btn.addEventListener('click', function() {
for (var j = 0; j < fbs.length; j++) fbs[j].classList.remove('active');
btn.classList.add('active');
currentFilter = btn.getAttribute('data-filter');
render();
});
})(fbs[i]);
}

var ab = $('addBtn');
if (ab) ab.addEventListener('click', addManual);
var nn = $('newName');
if (nn) nn.addEventListener('keydown', function(e) {
if (e.key === 'Enter') addManual();
});

var ndb = $('newDayBtn');
if (ndb) ndb.addEventListener('click', function() {
for (var i = 0; i < items.length; i++) items[i].done = false;
save(); render(); toast('يوم جديد ابتدى');
});

var cab = $('clearAllBtn');
if (cab) cab.addEventListener('click', function() {
if (!confirm('متأكد؟ هيمسح كل الأصناف نهائي.')) return;
items = []; save(); render();
});

var ub = $('uploadBtn');
var fi = $('fileInput');
var uc = $('uploadCard');
if (ub && fi) ub.addEventListener('click', function() { fi.click(); });
if (fi) fi.addEventListener('change', function(e) {
var file = e.target.files && e.target.files[0];
if (file) handlePdfFile(file);
e.target.value = '';
});
if (uc) {
uc.addEventListener('dragover', function(e) {
e.preventDefault(); uc.classList.add('dragover');
});
uc.addEventListener('dragleave', function(e) {
e.preventDefault(); uc.classList.remove('dragover');
});
uc.addEventListener('drop', function(e) {
e.preventDefault(); uc.classList.remove('dragover');
var file = e.dataTransfer.files && e.dataTransfer.files[0];
if (file && file.type === 'application/pdf') handlePdfFile(file);
else if (file) toast('الملف لازم يكون PDF');
});
}

var eab = $('exportAllBtn');
if (eab) eab.addEventListener('click', function() {
var text = buildExportText();
if (!text) { toast('مفيش أصناف للطلب'); return; }
var ta = $('exportTextarea');
var overlay = $('exportModal');
if (ta) ta.value = text;
if (overlay) overlay.classList.add('show');
copyText(text);
toast('اتنسخت الليستة كلها');
});

var ecb = $('exportCopyBtn');
if (ecb) ecb.addEventListener('click', function() {
var ta = $('exportTextarea');
if (ta) { ta.select(); copyText(ta.value); toast('اتنسخ تاني'); }
});

var ecl = $('exportCloseBtn');
if (ecl) ecl.addEventListener('click', function() {
var o = $('exportModal');
if (o) o.classList.remove('show');
});

var emo = $('exportModal');
if (emo) emo.addEventListener('click', function(e) {
if (e.target === emo) emo.classList.remove('show');
});

var dcb = $('downloadCsvBtn');
if (dcb) dcb.addEventListener('click', function() {
var has = false;
for (var i = 0; i < items.length; i++) {
if ((parseInt(items[i].qty, 10) || 0) > 0) { has = true; break; }
}
if (!has) { toast('مفيش أصناف للطلب'); return; }
downloadJSON();
toast('اتنزل order_list.json');
});
}

/* ============ Boot ============ */
function init() {
console.log('[app] init start');
try { initTheme(); } catch(e) { console.warn('theme:', e); }
try { load(); } catch(e) { console.warn('load:', e); }
try { attachEvents(); } catch(e) { console.warn('events:', e); }
try { attachListEvents(); } catch(e) { console.warn('list:', e); }
try { render(); } catch(e) { console.warn('render:', e); }
console.log('[app] ready');
}

if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', init);
} else {
init();
}