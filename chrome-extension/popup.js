const els = {
  userBadge: document.getElementById('user-badge'),
  toggleSettings: document.getElementById('toggle-settings'),
  settingsPanel: document.getElementById('settings-panel'),
  apiUrl: document.getElementById('api-url'),
  apiToken: document.getElementById('api-token'),
  saveSettings: document.getElementById('save-settings'),
  clientSelect: document.getElementById('client-select'),
  competitorSelect: document.getElementById('competitor-select'),
  platform: document.getElementById('platform'),
  authorHandle: document.getElementById('author-handle'),
  sourceUrl: document.getElementById('source-url'),
  caption: document.getElementById('caption'),
  mediaCount: document.getElementById('media-count'),
  mediaList: document.getElementById('media-list'),
  rescanBtn: document.getElementById('rescan-btn'),
  extraFiles: document.getElementById('extra-files'),
  isViral: document.getElementById('is-viral'),
  modelTier: document.getElementById('model-tier'),
  sendBtn: document.getElementById('send-btn'),
  status: document.getElementById('status'),
  resultBox: document.getElementById('result-box'),
};

let clientsCache = [];
let detectedMedia = [];

function setStatus(msg, kind = '') {
  els.status.textContent = msg;
  els.status.className = `status ${kind}`;
}

async function getConfig() {
  const stored = await chrome.storage.local.get(['apiUrl', 'apiToken']);
  return {
    apiUrl: (stored.apiUrl || 'http://localhost:3000').replace(/\/+$/, ''),
    apiToken: stored.apiToken || '',
  };
}

function renderCompetitors(clientId) {
  const client = clientsCache.find((c) => c.id === clientId);
  els.competitorSelect.innerHTML = '<option value="">Nenhum específico</option>';
  if (!client || !client.competitors) return;
  for (const comp of client.competitors) {
    const opt = document.createElement('option');
    opt.value = comp.id;
    opt.textContent = comp.instagramHandle
      ? `${comp.name} (${comp.instagramHandle})`
      : comp.name;
    els.competitorSelect.appendChild(opt);
  }
}

async function loadClients() {
  const { apiUrl, apiToken } = await getConfig();
  if (!apiToken) {
    els.userBadge.textContent = 'Token não configurado';
    els.settingsPanel.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch(`${apiUrl}/api/public/extension/clients`, {
      headers: { 'x-extension-token': apiToken },
    });
    if (!res.ok) throw new Error('Token inválido ou expirado.');
    const data = await res.json();
    clientsCache = data.clients || [];
    els.userBadge.textContent = `Conectado: ${data.user?.name || 'Equipe'}`;
    els.clientSelect.innerHTML = '';

    for (const c of clientsCache) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.tradeName;
      els.clientSelect.appendChild(opt);
    }

    if (clientsCache.length > 0) {
      renderCompetitors(clientsCache[0].id);
    }
    setStatus('');
  } catch (err) {
    els.userBadge.textContent = 'Erro de conexão';
    els.settingsPanel.classList.remove('hidden');
    setStatus(err.message || 'Falha ao conectar.', 'err');
  }
}

function extractPageDataInTab() {
  const url = window.location.href;
  const host = window.location.hostname.toLowerCase();
  let platform = 'WEB';
  if (host.includes('instagram.com')) platform = 'INSTAGRAM';
  else if (host.includes('tiktok.com')) platform = 'TIKTOK';
  else if (host.includes('youtube.com') || host.includes('youtu.be')) platform = 'YOUTUBE';

  let authorHandle = '';
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (platform === 'INSTAGRAM' && pathParts[0] && !['p', 'reel', 'reels', 'stories', 'explore'].includes(pathParts[0])) {
    authorHandle = `@${pathParts[0].replace(/^@/, '')}`;
  } else if (platform === 'TIKTOK' && pathParts[0]?.startsWith('@')) {
    authorHandle = pathParts[0];
  } else {
    const profileLink = document.querySelector('header a[href^="/"], a[href^="/@"]');
    const href = profileLink?.getAttribute('href')?.split('/').filter(Boolean)[0];
    if (href && !['p', 'reel', 'explore'].includes(href)) {
      authorHandle = href.startsWith('@') ? href : `@${href}`;
    }
  }

  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const articleText = Array.from(document.querySelectorAll('article h1, article span, main h1, main p'))
    .slice(0, 20)
    .map((el) => (el.textContent || '').trim())
    .filter((t) => t.length > 15)
    .join('\n');

  const caption = (articleText || ogDesc || metaDesc || document.title || '').slice(0, 4000);

  const media = [];
  const seen = new Set();

  const pushMedia = (kind, mediaUrl, label) => {
    if (!mediaUrl || !mediaUrl.startsWith('http') || seen.has(mediaUrl)) return;
    seen.add(mediaUrl);
    media.push({ kind, url: mediaUrl, label });
  };

  document.querySelectorAll('video').forEach((v, idx) => {
    const src = v.currentSrc || v.src || v.querySelector('source')?.src;
    if (src && !src.startsWith('blob:')) {
      pushMedia('video', src, `Vídeo ${idx + 1}`);
    }
  });

  document.querySelectorAll('audio').forEach((a, idx) => {
    const src = a.currentSrc || a.src || a.querySelector('source')?.src;
    if (src && !src.startsWith('blob:')) {
      pushMedia('audio', src, `Áudio ${idx + 1}`);
    }
  });

  document.querySelectorAll('img').forEach((img, idx) => {
    const rect = img.getBoundingClientRect();
    const src = img.currentSrc || img.src;
    if (src && (rect.width >= 180 || img.naturalWidth >= 240)) {
      pushMedia('image', src, `Imagem ${idx + 1}`);
    }
  });

  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (ogImage) pushMedia('image', ogImage, 'Capa (OG Image)');

  return {
    url,
    platform,
    authorHandle,
    title: document.title,
    caption,
    media: media.slice(0, 8),
  };
}

async function scanActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageDataInTab,
    });
    if (!result) return;

    els.platform.value = result.platform || 'WEB';
    els.sourceUrl.value = result.url || '';
    if (result.authorHandle) els.authorHandle.value = result.authorHandle;
    els.caption.value = result.caption || '';

    detectedMedia = result.media || [];
    els.mediaCount.textContent = String(detectedMedia.length);
    els.mediaList.innerHTML = '';

    detectedMedia.forEach((item, idx) => {
      const label = document.createElement('label');
      label.className = 'media-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = idx < 3;
      cb.dataset.index = String(idx);
      const span = document.createElement('span');
      span.textContent = `[${item.kind.toUpperCase()}] ${item.label} — ${item.url}`;
      label.appendChild(cb);
      label.appendChild(span);
      els.mediaList.appendChild(label);
    });
  } catch {
    setStatus('Não foi possível ler esta aba automaticamente. Preencha manualmente.', 'err');
  }
}

els.toggleSettings.addEventListener('click', () => {
  els.settingsPanel.classList.toggle('hidden');
});

els.saveSettings.addEventListener('click', async () => {
  const apiUrl = els.apiUrl.value.trim().replace(/\/+$/, '') || 'http://localhost:3000';
  const apiToken = els.apiToken.value.trim();
  await chrome.storage.local.set({ apiUrl, apiToken });
  els.settingsPanel.classList.add('hidden');
  await loadClients();
});

els.clientSelect.addEventListener('change', (e) => {
  renderCompetitors(e.target.value);
});

els.rescanBtn.addEventListener('click', () => {
  void scanActiveTab();
});

els.sendBtn.addEventListener('click', async () => {
  const { apiUrl, apiToken } = await getConfig();
  if (!apiToken) {
    els.settingsPanel.classList.remove('hidden');
    setStatus('Configure o token da extensão primeiro.', 'err');
    return;
  }
  const clientId = els.clientSelect.value;
  if (!clientId) {
    setStatus('Selecione um cliente.', 'err');
    return;
  }

  els.sendBtn.disabled = true;
  els.resultBox.classList.add('hidden');
  setStatus('Baixando mídias selecionadas e analisando com Gemini...');

  try {
    const form = new FormData();
    form.append('clientId', clientId);
    if (els.competitorSelect.value) form.append('competitorId', els.competitorSelect.value);
    form.append('platform', els.platform.value);
    if (els.sourceUrl.value.trim()) form.append('sourceUrl', els.sourceUrl.value.trim());
    if (els.authorHandle.value.trim()) form.append('authorHandle', els.authorHandle.value.trim());
    if (els.caption.value.trim()) form.append('caption', els.caption.value.trim());
    form.append('isViral', String(els.isViral.checked));
    form.append('modelTier', els.modelTier.value);
    form.append('analyzeNow', 'true');

    const selectedCheckboxes = els.mediaList.querySelectorAll('input[type="checkbox"]:checked');
    for (const cb of selectedCheckboxes) {
      const item = detectedMedia[Number(cb.dataset.index)];
      if (!item) continue;
      try {
        const mediaRes = await fetch(item.url);
        if (mediaRes.ok) {
          const blob = await mediaRes.blob();
          const ext = blob.type.split('/')[1]?.split(';')[0] || 'bin';
          form.append('media', blob, `captura-${Date.now()}.${ext}`);
        }
      } catch {
        // Mídia protegida por blob/stream continua analisada via legenda/texto
      }
    }

    for (const file of els.extraFiles.files || []) {
      form.append('media', file, file.name);
    }

    const res = await fetch(`${apiUrl}/api/public/extension/ingest`, {
      method: 'POST',
      headers: { 'x-extension-token': apiToken },
      body: form,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erro ao enviar referência.');

    setStatus('Salvo no Swipe File do cliente e analisado pela IA!', 'ok');
    els.resultBox.textContent = [
      data.aiAnalysis ? `ANÁLISE:\n${data.aiAnalysis}` : '',
      data.extractedHooks?.length
        ? `\nHOOKS EXTRAÍDOS:\n- ${data.extractedHooks.join('\n- ')}`
        : '',
      data.adaptedAngles ? `\nCOMO ADAPTAR:\n${data.adaptedAngles}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    els.resultBox.classList.remove('hidden');
  } catch (err) {
    setStatus(err.message || 'Erro ao enviar.', 'err');
  } finally {
    els.sendBtn.disabled = false;
  }
});

(async function init() {
  const { apiUrl, apiToken } = await getConfig();
  els.apiUrl.value = apiUrl;
  els.apiToken.value = apiToken;
  await Promise.all([loadClients(), scanActiveTab()]);
})();
