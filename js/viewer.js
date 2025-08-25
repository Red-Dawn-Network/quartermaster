(function(){
  const STORAGE_KEY = 'rdqm-state-v1';
  const AUTH_KEY = 'rdqm-admin-auth';
  let state;

  function esc(s){
    return (s ?? '').toString().replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  }

  function formatSize(m){
    if (m.sizeValue == null) return '';
    return `${m.sizeValue} ${m.sizeUnit}`;
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

  function render(){
    const title = window.RDQM_CONFIG?.title || 'Mods';
    document.title = title;
    document.getElementById('app-title').textContent = title;

    const server = state.servers[state.active] || { name: 'Server', mods: [] };
    document.getElementById('server-name').textContent = server.name;

    const tbody = document.getElementById('mods-tbody');
    tbody.innerHTML = '';
    server.mods.forEach((m, i) => {
      const tr = document.createElement('tr');
      const idCell = (m.id && m.id.length === 16)
        ? `<a href="https://reforger.armaplatform.com/workshop/${encodeURIComponent(m.id)}" target="_blank" rel="noopener">${esc(m.id)}</a>`
        : esc(m.id || '');
      tr.innerHTML = `<td>${i + 1}</td><td>${esc(m.name)}</td><td>${idCell}</td><td>${esc(formatSize(m))}</td>`;
      tbody.appendChild(tr);
    });
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
  const authModal = document.getElementById('auth-modal');
  const authForm = document.getElementById('auth-form');
  const authPasswordEl = document.getElementById('auth-password');
  const authErrorEl = document.getElementById('auth-error');

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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !authModal.classList.contains('hidden')) closeModal(authModal);
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
