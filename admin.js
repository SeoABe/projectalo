// GIT ADMIN - Main JS
const API = '/api';
let kwData = { keywords: {}, impactRules: [] };

// ── Navigation ────────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.getElementById('nav-' + id)?.classList.add('active');
  const loaders = { dashboard: loadDashboard, collector: loadCollectorPage, keywords: loadKeywords, impact: loadKeywords, cards: loadCards, urgents: loadUrgents, profiles: loadProfiles };
  loaders[id]?.();
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const colors = { info:'#60a5fa', success:'#4ade80', error:'#f87171' };
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.style.borderLeftColor = colors[type] || colors.info;
  el.style.borderLeftWidth = '3px';
  el.innerHTML = msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────
async function apiFetch(url, opts = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return r.json();
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const stats = await apiFetch(`${API}/admin/stats`);
  document.getElementById('statCards').textContent = stats.cards ?? '—';
  document.getElementById('statItems').textContent = stats.items ?? '—';
  document.getElementById('statProfiles').textContent = stats.profiles ?? '—';
  document.getElementById('statUrgents').textContent = stats.urgents ?? '—';

  const ll = stats.lastLog;
  document.getElementById('lastCollectInfo').innerHTML = ll && ll.status !== 'never'
    ? `<div style="display:grid;gap:6px;">
        <div><span style="color:var(--muted)">실행시각:</span> ${ll.run_at}</div>
        <div><span style="color:var(--muted)">상태:</span> <span class="badge ${ll.status==='success'?'badge-green':ll.status==='partial'?'badge-orange':'badge-red'}">${ll.status}</span></div>
        <div><span style="color:var(--muted)">수집 아이템:</span> ${ll.items_collected}개</div>
        ${ll.errors ? `<div style="color:#f87171;font-size:12px">오류: ${ll.errors}</div>` : ''}
       </div>`
    : `<div style="color:var(--muted)">수집 이력 없음</div>`;

  const logs = await apiFetch(`${API}/admin/logs`);
  renderRecentLogs(logs.slice(0,5), 'recentLogs');
}

function renderRecentLogs(logs, containerId) {
  const el = document.getElementById(containerId);
  if (!logs.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;">로그 없음</div>'; return; }
  el.innerHTML = logs.map(l => `
    <div class="log-row">
      <div style="color:var(--muted)">${l.run_at}</div>
      <div><span class="status-dot ${l.status==='success'?'dot-green':l.status==='partial'?'dot-orange':'dot-red'}"></span>${l.status}</div>
      <div>${l.items_collected ?? 0}개 수집</div>
      <div style="color:var(--muted);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.errors || '—'}</div>
    </div>`).join('');
}

// ── COLLECTOR ─────────────────────────────────────────────────────────────────
async function loadCollectorPage() {
  const logs = await apiFetch(`${API}/admin/logs`);
  renderLogs(logs);
}

function renderLogs(logs) {
  const el = document.getElementById('logsContainer');
  if (!logs.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;">수집 로그 없음</div>'; return; }
  el.innerHTML = `<table class="table">
    <thead><tr><th>실행 시각</th><th>상태</th><th>수집 수</th><th>오류 내용</th></tr></thead>
    <tbody>${logs.map(l => `<tr>
      <td>${l.run_at}</td>
      <td><span class="badge ${l.status==='success'?'badge-green':l.status==='partial'?'badge-orange':'badge-red'}">${l.status}</span></td>
      <td>${l.items_collected ?? 0}</td>
      <td style="font-size:11px;color:var(--muted);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.errors || '—'}</td>
    </tr>`).join('')}</tbody></table>`;
}

async function loadLogs() {
  const logs = await apiFetch(`${API}/admin/logs`);
  renderLogs(logs);
}

async function runCollect() {
  const btn = document.getElementById('btnCollect');
  const res_el = document.getElementById('collectResult');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>수집 중...';
  toast('수집을 시작합니다...', 'info');
  try {
    const r = await apiFetch(`${API}/collect/run`, { method: 'POST' });
    if (r.status === 'done') {
      toast(`✅ 수집 완료: ${r.totalItems}개 항목`, 'success');
      res_el.innerHTML = `<div class="alert alert-success"><i data-lucide="check-circle" style="width:16px;height:16px"></i>수집 완료 — ${r.totalItems}개 아이템 수집${r.errors?.length ? ` (오류 ${r.errors.length}건)` : ''}</div>`;
    } else {
      res_el.innerHTML = `<div class="alert alert-info">${r.reason || '이미 실행 중'}</div>`;
    }
    await loadLogs();
    lucide.createIcons();
  } catch(e) {
    toast('수집 실패: ' + e.message, 'error');
    res_el.innerHTML = `<div class="alert alert-error">오류: ${e.message}</div>`;
  }
  btn.disabled = false;
  btn.innerHTML = '<i data-lucide="play" style="width:14px;height:14px"></i>지금 수집 실행';
  lucide.createIcons();
}

// ── KEYWORDS & IMPACT RULES ───────────────────────────────────────────────────
const CAT_LABELS = { kt: 'KT이동통신 경쟁사', joongang: '중앙일보', hanhwa: '한화전략부문' };
const CAT_COLORS = { kt: '#ef4444', joongang: '#3b82f6', hanhwa: '#f59e0b' };

async function loadKeywords() {
  const data = await apiFetch(`${API}/admin/keywords`);
  kwData = data;
  renderKeywords();
  renderImpactRules();
}

function renderKeywords() {
  const el = document.getElementById('keywordsContainer');
  if (!el) return;
  el.innerHTML = Object.entries(kwData.keywords).map(([catId, conf]) => `
    <div class="keyword-block">
      <div class="keyword-block-title">
        <span style="width:10px;height:10px;border-radius:50%;background:${CAT_COLORS[catId]||'#6b7280'};display:inline-block;"></span>
        ${CAT_LABELS[catId] || catId}
      </div>
      
      <!-- 포함 키워드 -->
      <div class="input-group">
        <label class="input-label">검색 키워드 (포함)</label>
        <div class="tag-list" id="terms-${catId}">
          ${(conf.searchTerms||[]).map(t => `<span class="tag">${t}<span class="del" onclick="removeTerm('${catId}','${t}')">×</span></span>`).join('')}
        </div>
        <div class="tag-input-row" style="margin-top:8px;">
          <input class="input" placeholder="포함할 키워드 추가 후 Enter" id="termInput-${catId}" onkeydown="if(event.key==='Enter'){addTerm('${catId}');}" style="flex:1;">
          <button class="btn btn-ghost btn-sm" onclick="addTerm('${catId}')">추가</button>
        </div>
      </div>

      <!-- 제외 키워드 -->
      <div class="input-group">
        <label class="input-label">제외 키워드 (해당 단어 포함 기사 제외)</label>
        <div class="tag-list" id="excludes-${catId}">
          ${(conf.excludeTerms||[]).map(t => `<span class="tag" style="background:var(--bg-red);color:#fca5a5;border-color:var(--border-red)">${t}<span class="del" onclick="removeExcludeTerm('${catId}','${t}')">×</span></span>`).join('')}
        </div>
        <div class="tag-input-row" style="margin-top:8px;">
          <input class="input" placeholder="제외할 키워드 추가 후 Enter" id="excludeInput-${catId}" onkeydown="if(event.key==='Enter'){addExcludeTerm('${catId}');}" style="flex:1;">
          <button class="btn btn-ghost btn-sm" onclick="addExcludeTerm('${catId}')">추가</button>
        </div>
      </div>

      <!-- 뉴스 카테고리 -->
      <div class="input-group">
        <label class="input-label">뉴스 카테고리 필터 (예: 정치, 사회, IT/과학 등)</label>
        <div class="tag-list" id="categories-${catId}">
          ${(conf.categories||[]).map(t => `<span class="tag" style="background:var(--bg-blue);color:#93c5fd;border-color:var(--border-blue)">${t}<span class="del" onclick="removeCategory('${catId}','${t}')">×</span></span>`).join('')}
        </div>
        <div class="tag-input-row" style="margin-top:8px;">
          <select class="input" id="categoryInput-${catId}" style="flex:1;">
            <option value="">-- 카테고리 선택 --</option>
            <option value="정치">정치</option>
            <option value="경제">경제</option>
            <option value="사회">사회</option>
            <option value="생활/문화">생활/문화</option>
            <option value="IT/과학">IT/과학</option>
            <option value="세계">세계</option>
          </select>
          <button class="btn btn-ghost btn-sm" onclick="addCategory('${catId}')">추가</button>
        </div>
      </div>

      <!-- RSS URL -->
      <div class="input-group">
        <label class="input-label">RSS 피드 URL</label>
        <div class="tag-list" id="feeds-${catId}">
          ${(conf.rssFeeds||[]).map(f => `<span class="tag" style="max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${f}">${f}<span class="del" onclick="removeFeed('${catId}','${encodeURIComponent(f)}')">×</span></span>`).join('')}
        </div>
        <div class="tag-input-row" style="margin-top:8px;">
          <input class="input" placeholder="RSS URL 추가 후 Enter" id="feedInput-${catId}" onkeydown="if(event.key==='Enter'){addFeed('${catId}');}" style="flex:1;">
          <button class="btn btn-ghost btn-sm" onclick="addFeed('${catId}')">추가</button>
        </div>
      </div>
    </div>`).join('');
}

function addTerm(catId) {
  const inp = document.getElementById(`termInput-${catId}`);
  const val = inp.value.trim();
  if (!val) return;
  if (!kwData.keywords[catId].searchTerms.includes(val)) {
    kwData.keywords[catId].searchTerms.push(val);
    renderKeywords();
  }
  inp.value = '';
}

function removeTerm(catId, term) {
  kwData.keywords[catId].searchTerms = kwData.keywords[catId].searchTerms.filter(t => t !== term);
  renderKeywords();
}

function addExcludeTerm(catId) {
  const inp = document.getElementById(`excludeInput-${catId}`);
  const val = inp.value.trim();
  if (!val) return;
  if (!kwData.keywords[catId].excludeTerms) kwData.keywords[catId].excludeTerms = [];
  if (!kwData.keywords[catId].excludeTerms.includes(val)) {
    kwData.keywords[catId].excludeTerms.push(val);
    renderKeywords();
  }
  inp.value = '';
}

function removeExcludeTerm(catId, term) {
  kwData.keywords[catId].excludeTerms = (kwData.keywords[catId].excludeTerms || []).filter(t => t !== term);
  renderKeywords();
}

function addCategory(catId) {
  const inp = document.getElementById(`categoryInput-${catId}`);
  const val = inp.value.trim();
  if (!val) return;
  if (!kwData.keywords[catId].categories) kwData.keywords[catId].categories = [];
  if (!kwData.keywords[catId].categories.includes(val)) {
    kwData.keywords[catId].categories.push(val);
    renderKeywords();
  }
  inp.value = '';
}

function removeCategory(catId, term) {
  kwData.keywords[catId].categories = (kwData.keywords[catId].categories || []).filter(t => t !== term);
  renderKeywords();
}

function addFeed(catId) {
  const inp = document.getElementById(`feedInput-${catId}`);
  const val = inp.value.trim();
  if (!val) return;
  if (!kwData.keywords[catId].rssFeeds) kwData.keywords[catId].rssFeeds = [];
  if (!kwData.keywords[catId].rssFeeds.includes(val)) {
    kwData.keywords[catId].rssFeeds.push(val);
    renderKeywords();
  }
  inp.value = '';
}

function removeFeed(catId, encodedUrl) {
  const url = decodeURIComponent(encodedUrl);
  kwData.keywords[catId].rssFeeds = (kwData.keywords[catId].rssFeeds || []).filter(f => f !== url);
  renderKeywords();
}

function renderImpactRules() {
  const el = document.getElementById('impactContainer');
  if (!el) return;
  el.innerHTML = kwData.impactRules.map((rule, idx) => `
    <div class="impact-row" id="impactRow-${idx}">
      <div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">${rule.impact}</div>
        <div class="tag-list">
          ${rule.keywords.map(k => `<span class="tag">${k}<span class="del" onclick="removeImpactKw(${idx},'${k}')">×</span></span>`).join('')}
          <span class="tag" style="cursor:pointer;border-style:dashed;" onclick="promptAddImpactKw(${idx})">+ 추가</span>
        </div>
      </div>
      <input class="input" value="${rule.impact}" oninput="kwData.impactRules[${idx}].impact=this.value" placeholder="Impact 이름">
      <input type="color" class="impact-color-swatch" value="${rule.color}" oninput="kwData.impactRules[${idx}].color=this.value">
      <button class="btn btn-danger btn-sm" onclick="removeImpactRule(${idx})"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button>
    </div>`).join('') || '<div style="color:var(--muted);font-size:13px;">규칙 없음</div>';
  lucide.createIcons();
}

function removeImpactRule(idx) {
  kwData.impactRules.splice(idx, 1);
  renderImpactRules();
}

function removeImpactKw(idx, kw) {
  kwData.impactRules[idx].keywords = kwData.impactRules[idx].keywords.filter(k => k !== kw);
  renderImpactRules();
}

function promptAddImpactKw(idx) {
  const kw = prompt('추가할 키워드:');
  if (kw && kw.trim()) { kwData.impactRules[idx].keywords.push(kw.trim()); renderImpactRules(); }
}

function addImpactRule() {
  kwData.impactRules.push({ keywords: [], impact: 'NEW RULE', color: '#6b7280' });
  renderImpactRules();
}

async function saveKeywords() {
  try {
    const r = await apiFetch(`${API}/admin/keywords`, { method: 'PUT', body: JSON.stringify(kwData) });
    if (r.success) toast('✅ 키워드 설정이 저장되었습니다.', 'success');
    else toast('저장 실패: ' + (r.error||'알 수 없는 오류'), 'error');
  } catch(e) { toast('저장 오류: ' + e.message, 'error'); }
}

// ── CARDS ─────────────────────────────────────────────────────────────────────
async function loadCards() {
  const cat = document.getElementById('cardCatFilter')?.value || '';
  const url = cat ? `${API}/admin/cards?category=${cat}` : `${API}/admin/cards`;
  const cards = await apiFetch(url);
  const el = document.getElementById('cardsContainer');
  if (!cards.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;">카드 없음</div>'; return; }
  el.innerHTML = `<table class="table">
    <thead><tr><th>ID</th><th>제목</th><th>카테고리</th><th>기간</th><th>아이템</th><th>생성일</th><th></th></tr></thead>
    <tbody>${cards.map(c => `<tr>
      <td style="font-size:11px;color:var(--muted)">${c.id}</td>
      <td><strong>${c.title}</strong>${c.badge_text?`<span class="badge badge-blue" style="margin-left:6px;">${c.badge_text}</span>`:''}</td>
      <td><span class="badge ${c.category_id==='kt'?'badge-red':c.category_id==='joongang'?'badge-blue':'badge-orange'}">${CAT_LABELS[c.category_id]||c.category_id}</span></td>
      <td style="font-size:12px;color:var(--muted)">${c.date_range||'—'}</td>
      <td style="text-align:center">${c.items?.length||0}</td>
      <td style="font-size:11px;color:var(--muted)">${(c.created_at||'').slice(0,16)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteCard('${c.id}')"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button></td>
    </tr>`).join('')}</tbody></table>`;
  lucide.createIcons();
}

async function deleteCard(id) {
  if (!confirm(`카드 "${id}"를 삭제하시겠습니까?`)) return;
  const r = await apiFetch(`${API}/admin/cards/${id}`, { method: 'DELETE' });
  if (r.success) { toast('카드가 삭제되었습니다.', 'success'); loadCards(); }
  else toast('삭제 실패', 'error');
}

// ── URGENTS ───────────────────────────────────────────────────────────────────
async function loadUrgents() {
  const urgents = await apiFetch(`${API}/admin/urgents`);
  const el = document.getElementById('urgentsContainer');
  if (!urgents.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;">알림 없음</div>'; return; }
  el.innerHTML = `<table class="table">
    <thead><tr><th>카테고리</th><th>중요도</th><th>상태</th><th>메시지</th><th>생성일</th><th></th></tr></thead>
    <tbody>${urgents.map(u => `<tr>
      <td><span class="badge ${u.category_id==='kt'?'badge-red':u.category_id==='joongang'?'badge-blue':'badge-orange'}">${CAT_LABELS[u.category_id]||u.category_id}</span></td>
      <td><span class="badge ${u.level==='high'?'badge-red':u.level==='medium'?'badge-orange':'badge-gray'}">${u.level}</span></td>
      <td><span class="badge ${u.is_active?'badge-green':'badge-gray'}">${u.is_active?'활성':'비활성'}</span></td>
      <td style="font-size:12px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${u.message}</td>
      <td style="font-size:11px;color:var(--muted)">${(u.created_at||'').slice(0,16)}</td>
      <td style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm" onclick="toggleUrgent(${u.id},${u.is_active},${JSON.stringify(u).replace(/"/g,"'")})" title="${u.is_active?'비활성화':'활성화'}"><i data-lucide="${u.is_active?'eye-off':'eye'}" style="width:12px;height:12px"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteUrgent(${u.id})"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button>
      </td>
    </tr>`).join('')}</tbody></table>`;
  lucide.createIcons();
}

async function addUrgent() {
  const msg = document.getElementById('newUrgentMsg').value.trim();
  const cat = document.getElementById('newUrgentCat').value;
  const level = document.getElementById('newUrgentLevel').value;
  if (!msg) { toast('메시지를 입력하세요.', 'error'); return; }
  const r = await apiFetch(`${API}/admin/urgents`, { method: 'POST', body: JSON.stringify({ message: msg, category_id: cat, level }) });
  if (r.success) { toast('✅ 알림이 추가되었습니다.', 'success'); document.getElementById('newUrgentMsg').value = ''; loadUrgents(); }
  else toast('추가 실패', 'error');
}

async function toggleUrgent(id, isActive, u) {
  await apiFetch(`${API}/admin/urgents/${id}`, { method: 'PUT', body: JSON.stringify({ ...u, is_active: isActive ? 0 : 1 }) });
  toast(`알림이 ${isActive ? '비활성화' : '활성화'}되었습니다.`, 'success');
  loadUrgents();
}

async function deleteUrgent(id) {
  if (!confirm('이 알림을 삭제하시겠습니까?')) return;
  const r = await apiFetch(`${API}/admin/urgents/${id}`, { method: 'DELETE' });
  if (r.success) { toast('알림이 삭제되었습니다.', 'success'); loadUrgents(); }
}

// ── PROFILES ──────────────────────────────────────────────────────────────────
async function loadProfiles() {
  const profiles = await apiFetch(`${API}/admin/profiles`);
  const el = document.getElementById('profilesContainer');
  if (!profiles.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;">프로필 없음</div>'; return; }
  el.innerHTML = `<table class="table">
    <thead><tr><th>이름</th><th>직책</th><th>조직</th><th>카테고리</th><th>배지</th><th></th></tr></thead>
    <tbody>${profiles.map(p => `<tr>
      <td><strong>${p.name}</strong></td>
      <td style="font-size:12px">${p.position}</td>
      <td style="font-size:12px;color:var(--muted)">${p.org}</td>
      <td><span class="badge ${p.category_id==='kt'?'badge-red':p.category_id==='joongang'?'badge-blue':'badge-orange'}">${CAT_LABELS[p.category_id]||p.category_id}</span></td>
      <td><span class="badge" style="background:${p.badge_color||'#6b7280'}">${p.badge_text||'—'}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteProfile(${p.id})"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button></td>
    </tr>`).join('')}</tbody></table>`;
  lucide.createIcons();
}

async function deleteProfile(id) {
  if (!confirm('이 프로필을 삭제하시겠습니까?')) return;
  const r = await apiFetch(`${API}/admin/profiles/${id}`, { method: 'DELETE' });
  if (r.success) { toast('프로필이 삭제되었습니다.', 'success'); loadProfiles(); }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  // 로그인 세션 보장 (없으면 로그인 오버레이 표시 후 대기)
  if (window.GitAuth) await window.GitAuth.ensureSession();
  addAdminRefresh();
  loadDashboard();
});

function addAdminRefresh() {
  if (document.getElementById('admin-refresh-btn')) return;
  const b = document.createElement('button');
  b.id = 'admin-refresh-btn';
  b.textContent = '새로고침';
  b.title = '새로고침';
  b.onclick = () => location.reload();
  b.style.cssText = 'position:fixed;top:12px;right:110px;z-index:9999;background:rgba(255,255,255,.06);' +
    'color:#cbd2e6;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 12px;' +
    'font-size:12px;cursor:pointer;font-family:inherit;';
  document.body.appendChild(b);
}
