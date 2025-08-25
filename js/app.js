// Red Dawn Quartermaster — multi-server support + persistence (localStorage)
// Persists servers[], all mods, the active server index, and theme preference.

// =============================
// State
// =============================
const palette = [
  '#60a5fa', // blue
  '#34d399', // green
  '#fbbf24', // amber
  '#f87171', // red
  '#a78bfa', // purple
  '#f472b6', // pink
  '#22d3ee', // cyan
];
const servers = [];         // each: { id, name, color, mods: [{ name, id, sizeValue, sizeUnit }] }
let active = 0;             // index of the active server

function uid(){ return Math.random().toString(36).slice(2,9); }
function makeServer(name){
  const color = palette[servers.length % palette.length];
  return { id: uid(), name, color, mods: [] };
}

// =============================
// Persistence
// =============================
const STORAGE_KEY = 'rdqm-state-v1'; // { servers: [...], active: 0 }

function saveState(){
  try {
    const data = { servers, active };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

function loadState(){
  let ok = false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw){
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.servers)){
        // Replace servers contents in-place so references stay valid
        servers.splice(0, servers.length, ...parsed.servers.map(normalizeServer));
        active = Number.isInteger(parsed.active) ? parsed.active : 0;
        active = Math.min(Math.max(0, active), Math.max(servers.length - 1, 0));
        ok = true;
      }
    }
  } catch (e) {
    console.warn('Load failed, using defaults:', e);
  }
  if (!ok) {
    if (!servers.length) servers.push(makeServer('Server 1'));
    active = 0;
    saveState();
  }
}

function normalizeServer(s){
  return {
    id: s?.id ?? uid(),
    name: String(s?.name ?? 'Server'),
    color: String(s?.color ?? palette[0]),
    mods: Array.isArray(s?.mods) ? s.mods.map(m => ({
      name: String(m?.name ?? ''),
      id: String(m?.id ?? ''),
      sizeValue: (m?.sizeValue ?? null) === null ? null : Number(m.sizeValue),
      sizeUnit: String(m?.sizeUnit ?? ''),
    })) : []
  };
}

// =============================
// DOM refs — existing elements
// =============================
const form = document.getElementById('mod-form');
const nameEl = document.getElementById('name');
const idEl = document.getElementById('modid');
const sizeValueEl = document.getElementById('sizeValue');
const sizeUnitEl = document.getElementById('sizeUnit');

const tbody = document.getElementById('mods-tbody');
const clearAllBtn = document.getElementById('clear-all');
const themeToggle = document.getElementById('theme-toggle');
const nameHeader = document.getElementById('name-header');
const sizeHeader = document.getElementById('size-header');

// =============================
// Theme (dark/light)
// =============================
const THEME_KEY = 'rdqm-theme';

function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  if (themeToggle) themeToggle.checked = t === 'light';
}

function initTheme(){
  const stored = localStorage.getItem(THEME_KEY);
  const prefers = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(stored || prefers);
}

themeToggle?.addEventListener('change', (e) => {
  const next = e.target.checked ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { console.warn('Theme save failed:', e); }
});

initTheme();

const SORT_KEY = 'rdqm-sort';
let sortMode = localStorage.getItem(SORT_KEY) || 'name-asc';

function setSortMode(mode){
  sortMode = mode;
  try { localStorage.setItem(SORT_KEY, sortMode); } catch (err) { console.warn('Sort save failed:', err); }
}

function updateSortHeaders(){
  nameHeader?.classList.remove('asc','desc');
  sizeHeader?.classList.remove('asc','desc');
  if (sortMode.startsWith('name')){
    nameHeader?.classList.add(sortMode.endsWith('asc') ? 'asc' : 'desc');
  } else if (sortMode.startsWith('size')){
    sizeHeader?.classList.add(sortMode.endsWith('asc') ? 'asc' : 'desc');
  }
}

nameHeader?.addEventListener('click', () => {
  if (sortMode.startsWith('name')){
    setSortMode(sortMode === 'name-asc' ? 'name-desc' : 'name-asc');
  } else {
    setSortMode('name-asc');
  }
  render();
  saveState();
});

sizeHeader?.addEventListener('click', () => {
  if (sortMode.startsWith('size')){
    setSortMode(sortMode === 'size-asc' ? 'size-desc' : 'size-asc');
  } else {
    setSortMode('size-asc');
  }
  render();
  saveState();
});

// Edit modal elements
const modal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editIndexEl = document.getElementById('edit-index');
const editNameEl = document.getElementById('edit-name');
const editIdEl = document.getElementById('edit-id');
const editSizeValueEl = document.getElementById('edit-size-value');
const editSizeUnitEl = document.getElementById('edit-size-unit');

// Confirm modal (reused for Clear All)
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmDeleteBtn = document.getElementById('confirm-delete-all');

// Aggressively disable autofill/autocorrect/suggestions
[form, editForm].forEach(f => {
  f.setAttribute('autocomplete','off');
  f.setAttribute('autocapitalize','off');
  f.setAttribute('autocorrect','off');
  f.setAttribute('spellcheck','false');
});
[nameEl, idEl, sizeValueEl, sizeUnitEl, editNameEl, editIdEl, editSizeValueEl, editSizeUnitEl].forEach(inp => {
  inp.setAttribute('autocomplete','off');
  inp.setAttribute('autocapitalize','off');
  inp.setAttribute('autocorrect','off');
  inp.setAttribute('spellcheck','false');
  inp.name = 'rdqm_' + inp.id; // reduce autofill heuristics
});
[idEl, editIdEl].forEach(el => {
  el.addEventListener('input', () => el.setCustomValidity(''));
  el.addEventListener('invalid', () => el.setCustomValidity('ID must be 16 characters.'));
});

// =============================
// Server Toolbar (injected)
// =============================
function mountServerBar(){
  const main = document.querySelector('main');
  if (!main) return;
  let bar = document.getElementById('server-toolbar');
  if (!bar){
    bar = document.createElement('section');
    bar.className = 'card';
    bar.id = 'server-toolbar';
    bar.innerHTML = `
      <div class="serverbar">
        <div class="serverbar-left">
          <span id="server-color" class="server-badge" title="Click to change color"></span>
          <select id="server-select"></select>
        </div>
        <div class="serverbar-right">
          <span id="mod-counts" class="server-counts"></span>
          <button class="btn btn-small" id="btn-add-server">Add Server</button>
          <button class="btn btn-small" id="btn-rename-server">Rename</button>
        </div>
      </div>`;
    main.prepend(bar);

    // Listeners
    const select = bar.querySelector('#server-select');
    select.addEventListener('change', (e)=>{
      active = +e.target.value;
      refreshServerBar();
      render();
      saveState();
    });

    bar.querySelector('#btn-add-server').addEventListener('click', ()=>{
      const n = prompt('New server name:', `Server ${servers.length+1}`);
      if (!n) return;
      servers.push(makeServer(n.trim()));
      active = servers.length - 1;
      refreshServerBar();
      render();
      saveState();
    });

    bar.querySelector('#btn-rename-server').addEventListener('click', ()=>{
      const cur = servers[active];
      const n = prompt('Rename server:', cur.name);
      if (!n) return;
      cur.name = n.trim();
      refreshServerBar();
      render();
      saveState();
    });

    bar.querySelector('#server-color').addEventListener('click', ()=>{
      const cur = servers[active];
      const i = (palette.indexOf(cur.color)+1) % palette.length;
      cur.color = palette[i];
      refreshServerBar();
      saveState();
    });
  }
  refreshServerBar();
}

function refreshServerBar(){
  const bar = document.getElementById('server-toolbar');
  if (!bar) return;
  const select = bar.querySelector('#server-select');
  const colorDot = bar.querySelector('#server-color');

  // options
  select.innerHTML = servers.map((s,i)=>`<option value="${i}">${esc(s.name)}</option>`).join('');
  select.value = String(active);

  // color dot
  colorDot.style.background = servers[active].color;

  // Reflect in the Mods table header
  const h2 = document.querySelector('.table-head h2');
  if (h2){
    const s = servers[active];
    h2.innerHTML = `Mods <span class="server-chip"><span class="server-badge" style="background:${s.color}"></span>${esc(s.name)}</span>`;
  }

  // Update confirm title to include server name
  confirmTitle.textContent = `Delete all mods in "${servers[active].name}"?`;
}

// =============================
// Rendering
// =============================
function render(){
  updateSortHeaders();
  const list = servers[active].mods;
  list.sort((a, b) => {
    switch (sortMode) {
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'size-asc':
        return modSizeGB(a) - modSizeGB(b);
      case 'size-desc':
        return modSizeGB(b) - modSizeGB(a);
      case 'name-asc':
      default:
        return a.name.localeCompare(b.name);
    }
  });
  const frag = document.createDocumentFragment();
  list.forEach((m, i) => {
    const tr = document.createElement('tr');
    const sizeText = (m.sizeValue || m.sizeValue === 0) && m.sizeUnit ? `${m.sizeValue} ${m.sizeUnit}` : '';
    const idCell = (m.id && m.id.length === 16)
      ? `<a href="https://reforger.armaplatform.com/workshop/${encodeURIComponent(m.id)}" target="_blank" rel="noopener">${esc(m.id)}</a>`
      : esc(m.id || '');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${esc(m.name)}</td>
      <td>${idCell}</td>
      <td>${esc(sizeText)}</td>
      <td class="actions">
        <button class="action-btn" data-edit="${i}" aria-label="Edit">Edit</button>
        <button class="action-btn" data-delete="${i}" aria-label="Delete">Delete</button>
      </td>`;
    frag.appendChild(tr);
  });
  tbody.replaceChildren(frag);

  const countEl = document.getElementById('mod-counts');
  if (countEl){
    const currentServer = servers[active];
    const currentGB = currentServer.mods.reduce((sum, m) => sum + modSizeGB(m), 0);
    const totalGB = servers.reduce((sSum, s) => sSum + s.mods.reduce((mSum, m) => mSum + modSizeGB(m), 0), 0);
    countEl.textContent = `${currentServer.name}: ${formatGB(currentGB)} | All servers: ${formatGB(totalGB)}`;
  }

  confirmTitle.textContent = `Delete all mods in "${servers[active].name}"?`;
}

// =============================
// Add
// =============================
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameEl.value.trim();
  const id = idEl.value.trim();
  const sizeValueStr = sizeValueEl.value.trim();
  const sizeUnit = sizeUnitEl.value;
  if (!name) return alert('Name is required.');
  if (id.length !== 16) return alert('ID must be 16 characters.');

  let sizeValue = null;
  if (sizeValueStr !== ''){
    const parsed = Number(sizeValueStr);
    if (Number.isNaN(parsed) || parsed < 0) return alert('Size must be a non-negative number.');
    sizeValue = Number(parsed.toFixed(2));
  }
  servers[active].mods.push({ name, id, sizeValue, sizeUnit: sizeValue !== null ? sizeUnit : '' });
  form.reset();
  render();
  saveState();
});

// =============================
// Table actions (edit/delete)
// =============================
tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const list = servers[active].mods;

  if (btn.dataset.delete !== undefined){
    const idx = +btn.dataset.delete;
    list.splice(idx, 1);
    render();
    saveState();
    return;
  }
  if (btn.dataset.edit !== undefined){
    const idx = +btn.dataset.edit;
    const m = list[idx];
    editIndexEl.value = String(idx);
    editNameEl.value = m.name || '';
    editIdEl.value = m.id || '';
    editSizeValueEl.value = m.sizeValue ?? '';
    editSizeUnitEl.value = m.sizeUnit || 'MB';
    openModal(modal, () => editNameEl.focus({ preventScroll: true }));
  }
});

// =============================
// Clear all — custom confirm modal
// =============================
clearAllBtn.addEventListener('click', () => {
  if (!servers[active].mods.length) return;
  confirmTitle.textContent = `Delete all mods in "${servers[active].name}"?`;
  openModal(confirmModal);
});
confirmDeleteBtn.addEventListener('click', () => {
  servers[active].mods.splice(0, servers[active].mods.length);
  render();
  saveState();
  closeModal(confirmModal);
});

// =============================
// Modal helpers
// =============================
modal.addEventListener('click', (e) => { if (e.target?.dataset?.close !== undefined) closeModal(modal); });
confirmModal.addEventListener('click', (e) => { if (e.target?.dataset?.close !== undefined) closeModal(confirmModal); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape'){
    if (!modal.classList.contains('hidden')) closeModal(modal);
    if (!confirmModal.classList.contains('hidden')) closeModal(confirmModal);
  }
});

editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const list = servers[active].mods;
  const idx = +editIndexEl.value;
  const name = editNameEl.value.trim();
  const id = editIdEl.value.trim();
  const sizeValueStr = editSizeValueEl.value.trim();
  const sizeUnit = editSizeUnitEl.value;
  if (!name) return alert('Name is required.');
  if (id.length !== 16) return alert('ID must be 16 characters.');
  let sizeValue = null;
  if (sizeValueStr !== ''){
    const parsed = Number(sizeValueStr);
    if (Number.isNaN(parsed) || parsed < 0) return alert('Size must be a non-negative number.');
    sizeValue = Number(parsed.toFixed(2));
  }
  list[idx] = { name, id, sizeValue, sizeUnit: sizeValue !== null ? sizeUnit : '' };
  closeModal(modal);
  render();
  saveState();
});

function openModal(m, onOpen){
  m.classList.remove('hidden');
  m.setAttribute('aria-hidden','false');
  if (onOpen) requestAnimationFrame(onOpen);
}
function closeModal(m){
  m.classList.add('hidden');
  m.setAttribute('aria-hidden','true');
  const form = m.querySelector('form');
  if (form && m === modal) form.reset();
}

// Utilities
function esc(s){
  return (s ?? '').toString().replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"
  }[c]));
}

function modSizeGB(m){
  if (m?.sizeValue == null) return 0;
  const v = m.sizeValue;
  switch (m.sizeUnit){
    case 'KB': return v / 1024 / 1024;
    case 'MB': return v / 1024;
    case 'GB': return v;
    default: return 0;
  }
}

function formatGB(gb){
  return `${gb.toFixed(2).replace(/\.00$/, '')} GB`;
}

// =============================
// Boot
// =============================
loadState();        // load from localStorage (or create defaults)
mountServerBar();
render();

// Optional: cross-tab sync — keep two tabs in sync
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    loadState();
    refreshServerBar();
    render();
  }
});
