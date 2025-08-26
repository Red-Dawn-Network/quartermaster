(function(){
  const STORAGE_KEY = 'rdqm-state-v1';
  const AUTH_KEY = 'rdqm-admin-auth';
  const SORT_KEY = 'rdqm-sort';
  let state;
  let sortMode = localStorage.getItem(SORT_KEY) || 'name-asc';

  function esc(s){
    return (s ?? '').toString().replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  }

  function formatSize(m){
    if (m.sizeValue == null) return '';
    return `${m.sizeValue} ${m.sizeUnit}`;
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

  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { servers: [], active: 0 };
      const data = JSON.parse(raw);
      if (!Array.isArray(data.servers)) return { servers: [], active: 0 };
      return data;
    } catch (e){
      console.warn('Failed to load state', e);
      return { servers: [], active: 0 };
    }
  }

  function saveState(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e){ console.warn('Failed to save state', e); }
  }

  function refreshServerSelect(){
    const select = document.getElementById('server-select');
    const colorDot = document.getElementById('server-color');
    if (select){
      select.innerHTML = state.servers.map((s,i)=>`<option value="${i}">${esc(s.name)}</option>`).join('');
      select.value = String(state.active);
    }
    if (colorDot){
      colorDot.style.background = state.servers[state.active]?.color || '#ccc';
    }
  }

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

  function render(){
    const title = window.RDQM_CONFIG?.title || 'Mods';
    document.title = title;
    document.getElementById('app-title').textContent = title;

    const server = state.servers[state.active] || { name: 'Server', mods: [] };
    document.getElementById('server-name').textContent = server.name;

    const tbody = document.getElementById('mods-tbody');
    tbody.innerHTML = '';
    const mods = [...server.mods].sort((a, b) => {
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
    mods.forEach((m, i) => {
      const tr = document.createElement('tr');
      const idCell = (m.id && m.id.length === 16)
        ? `<a href="https://reforger.armaplatform.com/workshop/${encodeURIComponent(m.id)}" target="_blank" rel="noopener">${esc(m.id)}</a>`
        : esc(m.id || '');
      tr.innerHTML = `<td>${i + 1}</td><td>${esc(m.name)}</td><td>${idCell}</td><td>${esc(formatSize(m))}</td>`;
      tbody.appendChild(tr);
    });
    updateSortHeaders();
  }

function openModal(m, onOpen){
    m.classList.remove('hidden');
    m.setAttribute('aria-hidden','false');
    if (onOpen) requestAnimationFrame(onOpen);
  }
  function closeModal(m){
    m.classList.add('hidden');
    m.setAttribute('aria-hidden','true');
    const form = m.querySelector('form');
    if (form) form.reset();
    const err = m.querySelector('#auth-error');
    if (err) err.textContent = '';
  }

  const adminLink = document.getElementById('admin-link');
  const nameHeader = document.getElementById('name-header');
  const sizeHeader = document.getElementById('size-header');
  const authModal = document.getElementById('auth-modal');
  const authForm = document.getElementById('auth-form');
  const authPasswordEl = document.getElementById('auth-password');
  const authErrorEl = document.getElementById('auth-error');
  const listBtn = document.getElementById('btn-mod-list');
  const includeSizeEl = document.getElementById('include-size');
  const includeIdEl = document.getElementById('include-id');
  const listModal = document.getElementById('mod-list-modal');
  const listTextEl = document.getElementById('mod-list-text');
  const copyListBtn = document.getElementById('copy-mod-list-text');

  adminLink?.addEventListener('click', (e) => {
    if (localStorage.getItem(AUTH_KEY) === '1') return;
    e.preventDefault();
    openModal(authModal, () => authPasswordEl.focus({ preventScroll: true }));
  });

  authForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const expected = window.RDQM_CONFIG?.adminPassword || 'admin';
    if (authPasswordEl.value === expected){
      try { localStorage.setItem(AUTH_KEY, '1'); } catch (err) {}
      window.location.href = 'admin.html';
    } else {
      authErrorEl.textContent = 'Incorrect password';
      authPasswordEl.select();
    }
  });

  authModal?.addEventListener('click', (e) => {
    if (e.target?.dataset?.close !== undefined) closeModal(authModal);
  });
   listModal?.addEventListener('click', (e) => {
    if (e.target?.dataset?.close !== undefined) closeModal(listModal);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){
      if (!authModal.classList.contains('hidden')) closeModal(authModal);
      if (!listModal.classList.contains('hidden')) closeModal(listModal);
    }
  });

  function updateModListText(){
    const server = state.servers[state.active] || { mods: [] };
    const mods = [...server.mods].sort((a, b) => a.name.localeCompare(b.name));
    const includeSize = includeSizeEl?.checked;
    const includeId = includeIdEl?.checked;
    const lines = mods.map(m => {
      let line = m.name;
      if (includeSize){
        const sizeText = (m.sizeValue || m.sizeValue === 0) && m.sizeUnit ? `${m.sizeValue} ${m.sizeUnit}` : '';
        if (sizeText) line += ` - ${sizeText}`;
      }
      if (includeId) line += ` - ${m.id}`;
      return line;
    });
    if (listTextEl) listTextEl.value = lines.join('\n');
  }

  listBtn?.addEventListener('click', () => {
    updateModListText();
    openModal(listModal);
  });
  includeSizeEl?.addEventListener('change', updateModListText);
  includeIdEl?.addEventListener('change', updateModListText);
  copyListBtn?.addEventListener('click', () => {
    if (!listTextEl) return;
    navigator.clipboard.writeText(listTextEl.value).catch(err => console.warn('Copy failed:', err));
  });

  nameHeader?.addEventListener('click', () => {
    if (sortMode.startsWith('name')){
      setSortMode(sortMode === 'name-asc' ? 'name-desc' : 'name-asc');
    } else {
      setSortMode('name-asc');
    }
    render();
  });

  sizeHeader?.addEventListener('click', () => {
    if (sortMode.startsWith('size')){
      setSortMode(sortMode === 'size-asc' ? 'size-desc' : 'size-asc');
    } else {
      setSortMode('size-asc');
    }
    render();
  });

  state = loadState();
  refreshServerSelect();
  document.getElementById('server-select')?.addEventListener('change', (e) => {
    state.active = +e.target.value;
    saveState();
    refreshServerSelect();
    render();
  });

  render();
})();
