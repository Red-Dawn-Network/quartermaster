(function(){
  const STORAGE_KEY = 'rdqm-state-v1';

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

  function render(){
    const title = window.RDQM_CONFIG?.title || 'Mods';
    document.title = title;
    document.getElementById('app-title').textContent = title;

    const { servers, active } = loadState();
    const server = servers[active] || { name: 'Server', mods: [] };
    document.getElementById('server-name').textContent = server.name;

    const tbody = document.getElementById('mods-tbody');
    tbody.innerHTML = '';
    server.mods.forEach((m, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${esc(m.name)}</td><td>${esc(m.id)}</td><td>${esc(formatSize(m))}</td>`;
      tbody.appendChild(tr);
    });
  }

  render();
})();
