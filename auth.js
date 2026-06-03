// GIT DASHBOARD — 프론트 로그인/인증 (Supabase Auth)
// - /api/config 에서 공개 설정을 받아 Supabase 클라이언트 생성
// - 세션 없으면 로그인 오버레이 표시
// - window.fetch 를 패치하여 /api 요청에 Bearer 토큰 자동 첨부
// - window.GitAuth.ensureSession() 으로 앱 시작을 게이트
(function () {
  let supaClient = null;
  let currentToken = null;
  let resolveReady;
  const readyPromise = new Promise((r) => (resolveReady = r));

  // /api 요청에 토큰 자동 첨부
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.startsWith('/api/') && url.indexOf('/api/config') !== 0 && currentToken) {
      init = init || {};
      init.headers = { ...(init.headers || {}), Authorization: 'Bearer ' + currentToken };
    }
    return origFetch(input, init);
  };

  function injectStyles() {
    if (document.getElementById('git-auth-style')) return;
    const s = document.createElement('style');
    s.id = 'git-auth-style';
    s.textContent = `
      #git-auth-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;
        background:#0f1117;font-family:'Inter',system-ui,sans-serif;}
      #git-auth-overlay .box{width:340px;max-width:90vw;background:#1a1d27;border:1px solid rgba(255,255,255,.08);
        border-radius:14px;padding:28px 26px;box-shadow:0 20px 60px rgba(0,0,0,.5);}
      #git-auth-overlay .logo{width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);
        display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;margin-bottom:16px;}
      #git-auth-overlay h2{color:#e8eaf6;font-size:18px;margin:0 0 4px;}
      #git-auth-overlay p{color:#6b7280;font-size:13px;margin:0 0 20px;}
      #git-auth-overlay label{display:block;color:#9aa0b4;font-size:12px;margin:12px 0 6px;}
      #git-auth-overlay input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.1);
        background:#21263a;color:#e8eaf6;font-size:14px;outline:none;}
      #git-auth-overlay input:focus{border-color:#3b82f6;}
      #git-auth-overlay button{width:100%;margin-top:18px;padding:11px;border:none;border-radius:8px;cursor:pointer;
        background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;font-size:14px;font-weight:600;}
      #git-auth-overlay button:disabled{opacity:.6;cursor:default;}
      #git-auth-overlay .err{color:#f87171;font-size:12px;margin-top:12px;min-height:16px;}
      #git-auth-logout{position:fixed;top:12px;right:14px;z-index:9999;background:rgba(255,255,255,.06);
        color:#cbd2e6;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 12px;font-size:12px;
        cursor:pointer;font-family:'Inter',system-ui,sans-serif;}
      #git-auth-logout:hover{background:rgba(255,255,255,.12);}
    `;
    document.head.appendChild(s);
  }

  function showLogin() {
    injectStyles();
    const wrap = document.createElement('div');
    wrap.id = 'git-auth-overlay';
    wrap.innerHTML = `
      <div class="box">
        <div class="logo">GIT</div>
        <h2>GIT DASHBOARD</h2>
        <p>계속하려면 로그인하세요.</p>
        <form id="git-auth-form">
          <label>이메일</label>
          <input type="email" id="git-auth-email" autocomplete="username" required>
          <label>비밀번호</label>
          <input type="password" id="git-auth-pw" autocomplete="current-password" required>
          <button type="submit" id="git-auth-submit">로그인</button>
          <div class="err" id="git-auth-err"></div>
        </form>
      </div>`;
    document.body.appendChild(wrap);

    const form = wrap.querySelector('#git-auth-form');
    const errEl = wrap.querySelector('#git-auth-err');
    const btn = wrap.querySelector('#git-auth-submit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.textContent = '';
      btn.disabled = true;
      btn.textContent = '로그인 중...';
      const email = wrap.querySelector('#git-auth-email').value.trim();
      const password = wrap.querySelector('#git-auth-pw').value;
      const { data, error } = await supaClient.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        errEl.textContent = '로그인 실패: ' + (error ? error.message : '세션을 만들 수 없습니다.');
        btn.disabled = false;
        btn.textContent = '로그인';
        return;
      }
      currentToken = data.session.access_token;
      wrap.remove();
      addLogoutButton();
      resolveReady();
    });
  }

  function addLogoutButton() {
    if (document.getElementById('git-auth-logout')) return;
    injectStyles();
    const b = document.createElement('button');
    b.id = 'git-auth-logout';
    b.textContent = '로그아웃';
    b.onclick = () => window.GitAuth.logout();
    document.body.appendChild(b);
  }

  async function init() {
    let cfg;
    try {
      cfg = await origFetch('/api/config').then((r) => r.json());
    } catch (e) {
      console.error('[Auth] /api/config 로드 실패', e);
      return;
    }
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      console.error('[Auth] Supabase 설정(SUPABASE_URL / SUPABASE_ANON_KEY)이 비어 있습니다.');
      showLogin();
      return;
    }
    if (!window.supabase || !window.supabase.createClient) {
      console.error('[Auth] supabase-js CDN 로드 실패');
      return;
    }
    supaClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    supaClient.auth.onAuthStateChange((_e, session) => {
      currentToken = session ? session.access_token : null;
    });
    const { data } = await supaClient.auth.getSession();
    currentToken = data.session ? data.session.access_token : null;
    if (currentToken) {
      addLogoutButton();
      resolveReady();
    } else {
      showLogin();
    }
  }

  window.GitAuth = {
    ensureSession: () => readyPromise,
    logout: async () => {
      if (supaClient) await supaClient.auth.signOut();
      location.reload();
    },
  };

  document.addEventListener('DOMContentLoaded', init);
})();
