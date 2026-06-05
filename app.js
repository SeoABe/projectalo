// GIT DASHBOARD - Main Application Logic

class DashboardApp {
  constructor() {
    this.currentCategory = 'all';
    this.currentImpactFilter = 'all';
    this.currentDateFilter = 'all';
    this.searchQuery = '';
    this.data = null;
    // "전체 개요"에서 제외할 카테고리 (한 곳에서 관리)
    this.overviewExclude = ['competitor'];
  }

  async init() {
    // 로그인 세션 보장 (없으면 로그인 오버레이가 뜨고 여기서 대기)
    if (window.GitAuth) await window.GitAuth.ensureSession();
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        this.data = await res.json();
      } else {
        throw new Error('API failed');
      }
    } catch (e) {
      console.warn('Falling back to static data:', e);
      this.data = typeof DASHBOARD_DATA !== 'undefined' ? DASHBOARD_DATA : null;
    }

    if (!this.data) return;

    if (this.data.meta) {
      const weekBadge = document.getElementById('weekBadge');
      if (weekBadge) weekBadge.innerText = `${this.data.meta.date} ${this.data.meta.prevWeek}→${this.data.meta.week}`;
      const lastUpdated = document.getElementById('lastUpdated');
      if (lastUpdated) lastUpdated.innerText = this.data.meta.updatedAt;
    }

    this.renderTabs();
    this.renderFilters();
    this.renderContent();
    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderContent();
    });
    document.getElementById('impactFilter').addEventListener('change', (e) => {
      this.currentImpactFilter = e.target.value;
      this.renderContent();
    });
    const dateEl = document.getElementById('dateFilter');
    if (dateEl) dateEl.addEventListener('change', (e) => {
      this.currentDateFilter = e.target.value;
      this.renderContent();
    });
  }

  async switchTab(categoryId) {
    this.currentCategory = categoryId;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${categoryId}"]`).classList.add('active');
    await this.ensureCategoryData(categoryId);
    this.renderContent();
  }

  // 특정 카테고리 탭의 데이터를 필요 시 추가로 불러와 병합 (전체 개요엔 없는 카테고리 대응)
  async ensureCategoryData(categoryId) {
    if (categoryId === 'all') return;
    if (this.data.cards && this.data.cards[categoryId]) return; // 이미 로드됨
    try {
      const res = await fetch('/api/dashboard?category=' + encodeURIComponent(categoryId));
      if (!res.ok) return;
      const d = await res.json();
      Object.assign(this.data.cards, d.cards || {});
      Object.assign(this.data.profiles, d.profiles || {});
      if (d.summary) Object.assign(this.data.summary, d.summary);
      if (Array.isArray(d.urgent)) {
        const have = new Set(this.data.urgent.map(u => u.id));
        d.urgent.forEach(u => { if (!have.has(u.id)) this.data.urgent.push(u); });
      }
    } catch (e) {
      console.warn('[Dashboard] category load failed:', categoryId, e);
    }
  }

  renderTabs() {
    const container = document.getElementById('navTabs');
    container.innerHTML = this.data.categories.map(cat => `
      <button class="nav-tab ${cat.id === this.currentCategory ? 'active' : ''}"
              data-tab="${cat.id}" onclick="app.switchTab('${cat.id}')">
        <i data-lucide="${cat.icon}" style="width:16px;height:16px"></i>
        ${cat.label}
        ${cat.badge ? `<span class="tab-badge">${cat.badge}</span>` : ''}
      </button>
    `).join('');
    if (window.lucide) lucide.createIcons();
  }

  renderFilters() {
    const select = document.getElementById('impactFilter');
    select.innerHTML = this.data.filterOptions.impactTypes.map(opt =>
      `<option value="${opt.value}">${opt.label}</option>`
    ).join('');

    const dateSel = document.getElementById('dateFilter');
    if (dateSel && this.data.filterOptions.dateRange) {
      dateSel.innerHTML = this.data.filterOptions.dateRange.map(opt =>
        `<option value="${opt.value}">${opt.label}</option>`
      ).join('');
    }
  }

  // 'YYYY.MM.DD' 형식 날짜가 현재 기간 필터에 해당하는지
  matchesDate(dateStr) {
    if (this.currentDateFilter === 'all' || !dateStr) return true;
    const m = String(dateStr).match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
    if (!m) return true; // 형식 모르면 통과
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(d.getTime())) return true;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (this.currentDateFilter === 'today') {
      return d.getTime() === today.getTime();
    }
    if (this.currentDateFilter === 'week') {
      const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 6); // 오늘 포함 최근 7일
      return d >= weekAgo && d <= today;
    }
    if (this.currentDateFilter === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    return true;
  }

  getFilteredCards(categoryId) {
    let cardKeys = categoryId === 'all'
      ? Object.keys(this.data.cards).filter(k => !this.overviewExclude.includes(k))
      : [categoryId];

    let allCards = [];
    cardKeys.forEach(key => {
      if (this.data.cards[key]) {
        allCards = allCards.concat(this.data.cards[key]);
      }
    });

    // Impact filter
    if (this.currentImpactFilter !== 'all') {
      allCards = allCards.map(card => {
        const filtered = card.items.filter(item =>
          item.impact === this.currentImpactFilter
        );
        return filtered.length > 0 ? { ...card, items: filtered } : null;
      }).filter(Boolean);
    }

    // Date range filter
    if (this.currentDateFilter !== 'all') {
      allCards = allCards.map(card => {
        const filtered = card.items.filter(item => this.matchesDate(item.date));
        return filtered.length > 0 ? { ...card, items: filtered } : null;
      }).filter(Boolean);
    }

    // Search filter
    if (this.searchQuery) {
      allCards = allCards.map(card => {
        const filtered = card.items.filter(item =>
          item.title.toLowerCase().includes(this.searchQuery) ||
          item.description.toLowerCase().includes(this.searchQuery) ||
          (card.tags && card.tags.some(t => t.toLowerCase().includes(this.searchQuery)))
        );
        return filtered.length > 0 ? { ...card, items: filtered } : null;
      }).filter(Boolean);
    }

    return allCards;
  }

  renderContent() {
    const main = document.getElementById('mainContent');
    const cat = this.currentCategory;

    // Urgent
    const urgents = cat === 'all'
      ? this.data.urgent.filter(u => !this.overviewExclude.includes(u.category))
      : this.data.urgent.filter(u => u.category === cat);

    // Summary
    let summaryKeys = cat === 'all'
      ? Object.keys(this.data.summary).filter(k => !this.overviewExclude.includes(k))
      : [cat];

    // Cards
    const cards = this.getFilteredCards(cat);

    // Profiles
    let profileKeys = cat === 'all'
      ? Object.keys(this.data.profiles).filter(k => !this.overviewExclude.includes(k))
      : [cat];

    let html = '';

    // URGENT
    if (urgents.length > 0) {
      html += `<div class="urgent-bar-inner">`;
      urgents.forEach((u, i) => {
        html += `
          <div class="urgent-card animate-in" style="animation-delay:${i * 80}ms; margin-bottom:8px">
            <div class="urgent-badge">
              <i data-lucide="alert-triangle" style="width:13px;height:13px"></i> URGENT
            </div>
            <div class="urgent-text">${this.highlightText(u.message)}</div>
          </div>`;
      });
      html += `</div>`;
    }

    // SUMMARY (데이터 있는 카테고리만 — 없으면 섹션 자체를 숨김)
    const summaryEntries = summaryKeys.filter(key => this.data.summary[key]);
    if (summaryEntries.length > 0) {
      html += `<div class="section-label" style="margin-top:24px">WK${this.data.meta.week.replace('WK','')} UPDATE SUMMARY — 지난 주 대비 변경사항</div>`;
      html += `<div class="summary-grid">`;
      summaryEntries.forEach((key, i) => {
        const s = this.data.summary[key];
        html += `
          <div class="summary-card animate-in" style="animation-delay:${i * 100}ms">
            <div style="position:absolute;left:0;top:0;width:4px;height:100%;background:${s.color}"></div>
            <div class="summary-source" style="color:${s.color};background:${s.color}15">
              ${s.source}
            </div>
            <div class="summary-content">${this.highlightText(s.content)}</div>
          </div>`;
      });
      html += `</div>`;
    }

    // SECTION: Cards
    if (cards.length > 0) {
      html += `<div class="section-label">A. 상세 분석 — 주요 동향 카드</div>`;
      html += `<div class="bento-grid">`;
      cards.forEach((card, i) => {
        html += this.renderCard(card, i);
      });
      html += `</div>`;
    }

    // SECTION: Profiles
    let profiles = [];
    profileKeys.forEach(key => {
      if (this.data.profiles[key]) {
        profiles = profiles.concat(this.data.profiles[key]);
      }
    });

    if (profiles.length > 0) {
      html += `<div class="section-label">B. 주요 인물 프로필</div>`;
      html += `<div class="bento-grid">`;
      html += `<div class="bento-card animate-in" style="grid-column: span ${Math.min(profiles.length > 4 ? 3 : profiles.length <= 2 ? 1 : 2, 3)}">`;
      html += `<div class="bento-card-header">
        <div class="bento-card-title">
          <div class="card-icon"><i data-lucide="users" style="width:18px;height:18px;color:var(--accent-blue)"></i></div>
          <h3>핵심 인물</h3>
        </div>
      </div>`;
      profiles.forEach(p => {
        html += `
          <div class="profile-card">
            <div class="profile-avatar">
              <i data-lucide="user" style="width:20px;height:20px;color:var(--text-muted)"></i>
            </div>
            <div class="profile-info">
              <div class="profile-org">${p.org}</div>
              <div class="profile-name">${p.name}</div>
              <div class="profile-position">${p.position}</div>
              <div class="profile-desc">${p.desc}</div>
            </div>
            <div class="profile-badge">
              <span class="badge" style="background:${p.badge.color}">${p.badge.text}</span>
            </div>
          </div>`;
      });
      html += `</div></div>`;
    }

    // No data at all (Empty State)
    if (cards.length === 0 && urgents.length === 0 && Object.keys(this.data.summary).length === 0 && profiles.length === 0) {
      if (this.searchQuery) {
        html += `
          <div class="no-results">
            <i data-lucide="search-x" style="width:48px;height:48px"></i>
            <p>"${this.searchQuery}"에 대한 검색 결과가 없습니다.</p>
          </div>`;
      } else {
        html += `
          <div class="no-results">
            <i data-lucide="database-zap" style="width:48px;height:48px"></i>
            <p>표시할 데이터가 없습니다.</p>
            <p style="font-size: 14px; opacity: 0.7; margin-top: 8px;">관리자 페이지에서 [즉시 실행] 버튼을 눌러 데이터를 수집해 주세요.</p>
          </div>`;
      }
    }

    main.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  renderCard(card, index) {
    let itemsHtml = card.items.map(item => {
      const isLink = !!item.url;
      const Tag = isLink ? 'a' : 'div';
      const safeUrl = isLink ? item.url.replace(/"/g, '&quot;') : '';
      const clickAttr = isLink ? `href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit; display:block; cursor:pointer;" title="새 창에서 원본 보기"` : 'style="display:block;"';
      return `
      <${Tag} class="card-item" ${clickAttr}>
        <div class="card-item-title">${item.title}</div>
        <div class="card-item-impact" style="color:${item.impactColor}">${item.impact}</div>
        <div class="card-item-desc">${item.description}</div>
        <div class="card-item-meta">
          <span>출처: ${item.source}</span>
          <span>${item.date}</span>
        </div>
      </${Tag}>
    `}).join('');

    const tagsHtml = card.tags ? `
      <div style="padding:6px 20px 14px; display:flex; gap:4px; flex-wrap:wrap">
        ${card.tags.map(t => `<span class="card-item-tag">${t}</span>`).join('')}
      </div>` : '';

    return `
      <div class="bento-card animate-in" style="animation-delay:${index * 80}ms">
        <div class="bento-card-header">
          <div class="bento-card-title">
            <div class="card-icon">
              <i data-lucide="${card.icon}" style="width:18px;height:18px;color:var(--accent-blue)"></i>
            </div>
            <div>
              <h3>${card.title}</h3>
              <div class="card-date">${card.dateRange}</div>
            </div>
          </div>
          ${card.badge ? `<span class="badge" style="background:${card.badge.color}">${card.badge.text}</span>` : ''}
        </div>
        <div class="card-items">${itemsHtml}</div>
        ${tagsHtml}
      </div>`;
  }

  highlightText(text) {
    return text.replace(/([^.]*?(핵심|주요|긴급|중요|전면|대규모|임박|돌파|확대|강화)[^.]*\.?)/g,
      '<strong>$1</strong>');
  }
}

let app;
document.addEventListener('DOMContentLoaded', () => { app = new DashboardApp(); app.init(); });
