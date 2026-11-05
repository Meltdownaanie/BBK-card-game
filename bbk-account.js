/* BBK accounts: sign-in, profile and leaderboard, talking to Supabase over plain REST (no SDK, no CDN).
   Only the publishable key lives here. It is safe in a browser because Row Level Security decides what it can do.
   Every piece of text that comes from the database is inserted with textContent, never as HTML. */
(function () {
  'use strict';
  const SUPABASE_URL = 'https://uqhaldjxcsqlvgyrceiu.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_ZBrcGYq6YxnOeCheFJzXkQ_55PG6JCa';
  const STORE_KEY = 'bbk.session.v1';
  const PROFILE_COLS = 'id,display_name,rating,peak_rating,games,wins,losses,draws,tutorial_step';

  let session = null;   // {access_token, refresh_token, expires_at, user:{id,email}}
  let profile = null;   // row of public.profiles for the signed-in user
  const listeners = new Set();
  const mounts = new Set();

  /* ---------- tiny helpers ---------- */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; } },
    set(v) { try { v ? localStorage.setItem(STORE_KEY, JSON.stringify(v)) : localStorage.removeItem(STORE_KEY); } catch { /* private mode */ } }
  };
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const now = () => Math.floor(Date.now() / 1000);

  function friendly(d, status) {
    const raw = d && (d.msg || d.error_description || d.message || d.error);
    const code = d && (d.error_code || d.code);
    const m = String(raw || '');
    if (/invalid login credentials/i.test(m)) return 'Wrong email or password.';
    if (/already registered|already been registered/i.test(m) || code === 'user_already_exists') return 'This email is already registered. Try signing in.';
    if (/email not confirmed/i.test(m) || code === 'email_not_confirmed') return 'Please confirm your email first (check your inbox), then sign in.';
    if (code === 'over_email_send_rate_limit' || /rate limit/i.test(m)) return 'Too many emails were requested. Please wait a few minutes and try again.';
    if (/password should be at least|weak_password/i.test(m) || code === 'weak_password') return m || 'Password is too weak.';
    if (/unable to validate email|invalid email/i.test(m)) return 'Please enter a valid email address.';
    if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
    return m || 'Something went wrong (' + status + ').';
  }

  async function api(path, opts) {
    const { method = 'GET', body, token, prefer } = opts || {};
    const headers = { apikey: PUBLISHABLE_KEY };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;   // the user's own JWT; the publishable key never goes here
    if (prefer) headers.Prefer = prefer;
    let res;
    try {
      res = await fetch(SUPABASE_URL + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch {
      const err = new Error('Cannot reach the server. Check your connection and try again.');
      err.network = true;
      throw err;
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    if (!res.ok) {
      const err = new Error(friendly(data, res.status));
      err.status = res.status;
      err.code = data && (data.code || data.error_code);
      throw err;
    }
    return data;
  }

  /* ---------- session ---------- */
  function toSession(t) {
    return {
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: t.expires_at || now() + (t.expires_in || 3600),
      user: { id: t.user && t.user.id, email: t.user && t.user.email }
    };
  }
  function setSession(s) { session = s; store.set(s); }
  let refreshing = null;
  async function freshToken() {
    if (!session) return null;
    if (session.expires_at - now() > 60) return session.access_token;
    if (!refreshing) {
      refreshing = (async () => {
        try {
          const t = await api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } });
          setSession(toSession(t));
        } catch (e) {
          // A rejected refresh token means the sign-in is really over; a network hiccup does not.
          if (e.status === 400 || e.status === 401 || e.status === 403) { setSession(null); profile = null; emit(); }
        } finally { refreshing = null; }
      })();
    }
    await refreshing;
    return session ? session.access_token : null;
  }

  /* ---------- rank tiers ---------- */
  const PLACEMENT = 5;   // ranked games before a player is placed (no points lost until then); keep in sync with record_match()
  const TIERS = [{ name: 'SSS', min: 1800 }, { name: 'Alpha-Wolf', min: 1500 }, { name: 'B-Player', min: 1200 }, { name: 'C-troop', min: 0 }];
  function tier(rating, games) {
    if (games != null && games < PLACEMENT) return 'Unranked';
    const r = Number(rating) || 0;
    return TIERS.find((t) => r >= t.min).name;
  }
  const TIER_INFO = {
    'C-troop': { cls: 'c', range: '0 – 1199', text: 'Where every journey starts. You land here after placement (rating starts at 1000).' },
    'B-Player': { cls: 'b', range: '1200 – 1499', text: 'You win more than you lose against steady opponents.' },
    'Alpha-Wolf': { cls: 'a', range: '1500 – 1799', text: 'Top players. Every mistake is punished.' },
    'SSS': { cls: 's', range: '1800 +', text: 'The best of BBK. There is no upper limit.' }
  };
  const tierCls = (name) => (TIER_INFO[name] ? TIER_INFO[name].cls : 'u');
  const tierPill = (name) => h('span', { class: 'bbk-tier t-' + tierCls(name), text: name });
  const tierLine = (p) => p.games < PLACEMENT ? 'Unranked · placement ' + p.games + '/' + PLACEMENT : tier(p.rating, p.games) + ' · ' + p.rating;

  /* ---------- tutorial progress (0-5; 5 unlocks ranked) ---------- */
  const TUT_KEY = 'bbk.tutorial.v1';
  const localTutorial = () => { try { const n = parseInt(localStorage.getItem(TUT_KEY), 10); return n >= 0 && n <= 5 ? n : 0; } catch { return 0; } };
  const tutorialStep = () => Math.max(localTutorial(), profile ? Number(profile.tutorial_step) || 0 : 0);
  async function pushTutorial(step) {
    const token = await freshToken();
    if (!token || !session) return;
    try {
      const rows = await api('/rest/v1/profiles?id=eq.' + encodeURIComponent(session.user.id), { method: 'PATCH', token, body: { tutorial_step: step }, prefer: 'return=representation' });
      if (rows && rows[0] && profile) profile = Object.assign({}, profile, rows[0]);
    } catch { /* kept locally; synced on the next sign-in */ }
  }
  async function setTutorial(step) {
    step = Math.max(0, Math.min(5, Math.floor(Number(step)) || 0));
    if (step <= tutorialStep()) return tutorialStep();
    try { localStorage.setItem(TUT_KEY, String(step)); } catch { /* private mode: still pushed below when signed in */ }
    if (profile) profile = Object.assign({}, profile, { tutorial_step: Math.max(step, Number(profile.tutorial_step) || 0) });
    await pushTutorial(step);
    emit();
    return tutorialStep();
  }

  async function loadProfile() {
    const token = await freshToken();
    if (!token || !session) { profile = null; emit(); return null; }
    try {
      const rows = await api('/rest/v1/profiles?select=' + PROFILE_COLS + '&id=eq.' + encodeURIComponent(session.user.id), { token });
      profile = (rows && rows[0]) || null;
    } catch { /* keep the old profile on a transient error */ }
    if (profile && localTutorial() > (Number(profile.tutorial_step) || 0)) { await pushTutorial(localTutorial()); }   // progress made as a guest
    emit();
    return profile;
  }

  async function signUp(email, password) {
    const t = await api('/auth/v1/signup', { method: 'POST', body: { email, password } });
    if (t && t.access_token) { setSession(toSession(t)); await loadProfile(); return { signedIn: true }; }
    return { signedIn: false, needsConfirm: true };   // project requires email confirmation
  }
  async function signIn(email, password) {
    const t = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
    setSession(toSession(t));
    await loadProfile();
  }
  async function signOut() {
    const token = session && session.access_token;
    setSession(null); profile = null; emit();
    if (token) { try { await api('/auth/v1/logout', { method: 'POST', token }); } catch { /* already signed out locally */ } }
  }
  async function setDisplayName(name) {
    const token = await freshToken();
    if (!token || !session) throw new Error('Please sign in first.');
    try {
      const rows = await api('/rest/v1/profiles?id=eq.' + encodeURIComponent(session.user.id), {
        method: 'PATCH', token, body: { display_name: name }, prefer: 'return=representation'
      });
      if (!rows || !rows.length) throw new Error('Could not save your name.');
      profile = Object.assign({}, profile, rows[0]);
      emit();
    } catch (e) {
      if (e.code === '23505') throw new Error('That name is already taken.');
      if (e.code === '23514') throw new Error('Use 3 to 20 characters, with no spaces at the start or end.');
      throw e;
    }
  }

  function emit() {
    for (const m of mounts) renderMount(m);
    for (const fn of listeners) { try { fn({ session, profile }); } catch (e) { console.error(e); } }
    document.dispatchEvent(new CustomEvent('bbk:auth', { detail: { signedIn: !!session } }));
  }

  /* ---------- styles ---------- */
  const css = `
.bbk-signin,.bbk-chip{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:8px 12px;border-radius:12px;border:1px solid var(--line,#35434a);background:var(--felt3,#2a343a);color:var(--ink,#eaf0f1);font:inherit;text-align:left;cursor:pointer}
.bbk-pen{margin-left:auto;flex:none;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(255,255,255,.12);font-size:16px}
.bbk-signin:hover,.bbk-chip:hover{filter:brightness(1.12)}
.bbk-signin:focus-visible,.bbk-chip:focus-visible,.bbk-ov button:focus-visible,.bbk-ov input:focus-visible{outline:2px solid var(--gold,#e7b94a);outline-offset:2px}
.bbk-avatar{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#38d39f;color:#0d2a21;font-weight:900;font-size:16px}
.bbk-who{min-width:0;flex:1}.bbk-who b{display:block;font-size:14px;letter-spacing:.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bbk-who small{display:block;font-size:11px;color:var(--muted,#9aabb1);margin-top:1px}
.mb-board{background:#26303a!important;color:#cfe6ff!important;border-color:#4d6a86!important}
.bbk-ov{position:fixed;inset:0;z-index:400;background:#0a0e10ec;display:flex;align-items:center;justify-content:center;padding:14px}
.bbk-box{width:min(460px,100%);max-height:min(90dvh,760px);overflow:auto;background:var(--felt2,#1f272b);border:1px solid var(--line,#35434a);border-radius:16px;box-shadow:0 22px 60px #000a;color:var(--ink,#eaf0f1);padding:16px 16px 18px}
.bbk-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.bbk-head h2{margin:0;font-size:20px;letter-spacing:.04em}
.bbk-back{min-width:0!important;padding:0 14px!important;font-size:14px!important;white-space:nowrap;margin-right:12px}
.bbk-x{border:1px solid var(--line,#35434a);background:var(--felt3,#2a343a);color:inherit;border-radius:9px;min-width:40px;min-height:40px;font-size:16px;cursor:pointer}
.bbk-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}
.bbk-tab{min-height:42px;border-radius:10px;border:1px solid var(--line,#35434a);background:var(--felt3,#2a343a);color:inherit;font:inherit;font-weight:800;cursor:pointer}
.bbk-tab[aria-selected="true"]{background:#483e26;border-color:var(--gold,#e7b94a)}
.bbk-form{display:flex;flex-direction:column;gap:10px}
.bbk-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:800;letter-spacing:.06em;color:var(--muted,#9aabb1);text-transform:uppercase}
.bbk-form input{min-height:46px;border-radius:9px;border:1px solid #6c7a7e;background:#16242a;color:var(--ink,#eaf0f1);font-size:16px;padding:8px 10px;text-transform:none;letter-spacing:0;font-weight:600}
.bbk-btn{min-height:46px;border-radius:10px;border:0;background:var(--gold,#e7b94a);color:#201b0b;font:inherit;font-weight:900;cursor:pointer;padding:10px 14px}
.bbk-btn.alt{background:var(--felt3,#2a343a);color:var(--ink,#eaf0f1);border:1px solid var(--line,#35434a)}
.bbk-btn:disabled{opacity:.55;cursor:not-allowed}
.bbk-msg{min-height:20px;font-size:13px;color:#ff9b93}.bbk-msg.ok{color:#6fdc9b}
.bbk-note{font-size:12px;color:var(--muted,#9aabb1);line-height:1.45;margin:10px 0 0}
.bbk-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}
.bbk-stat{background:var(--felt3,#2a343a);border:1px solid var(--line,#35434a);border-radius:10px;padding:8px;text-align:center}
.bbk-stat b{display:block;font-size:20px}.bbk-stat small{font-size:10px;letter-spacing:.08em;color:var(--muted,#9aabb1);text-transform:uppercase}
.bbk-row{display:flex;gap:8px}.bbk-row input{flex:1;min-width:0}
.bbk-h3{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#9aabb1);margin:14px 0 6px}
.bbk-table{width:100%;border-collapse:collapse;font-size:14px}
.bbk-table th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#9aabb1);text-align:left;padding:4px 6px}
.bbk-table td{padding:8px 6px;border-top:1px solid var(--line,#35434a)}
.bbk-table td.num,.bbk-table th.num{text-align:right;font-variant-numeric:tabular-nums}
.bbk-table td.name{max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bbk-you{position:sticky;bottom:0;margin-top:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px;border-radius:12px;border:2px solid var(--gold,#e7b94a);background:var(--felt3,#2a343a)}.bbk-you b{font-size:15px}.bbk-you small{display:block;color:var(--muted,#9aabb1);margin-top:3px}.bbk-you-rank{font-weight:900;font-size:20px;color:var(--gold,#e7b94a);min-width:52px}.bbk-you-name{flex:1;min-width:0}.bbk-you-rating{font-weight:900;font-size:18px}
.bbk-table tr.me td{background:#483e2655;font-weight:800}
.bbk-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.bbk-list li{display:flex;justify-content:space-between;gap:8px;background:var(--felt3,#2a343a);border:1px solid var(--line,#35434a);border-radius:9px;padding:8px 10px;font-size:13px}
.bbk-win{color:#6fdc9b;font-weight:800}.bbk-loss{color:#ff9b93;font-weight:800}.bbk-draw{color:#e7b94a;font-weight:800}
.bbk-empty{color:var(--muted,#9aabb1);text-align:center;padding:18px 6px;font-size:14px}
.bbk-legend{margin-bottom:10px}
.bbk-tchips{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}
.bbk-tchip{border:2px solid var(--tc);border-radius:8px;padding:5px 4px;text-align:center;background:var(--felt3,#2a343a)}
.bbk-tchip b{display:block;font-size:11px;color:var(--tc);line-height:1.2}.bbk-tchip small{font-size:10px;color:var(--muted,#9aabb1)}
.bbk-how{width:100%;min-height:40px;font-size:13px}
.t-c{--tc:#a99bd9}.t-b{--tc:#5aa9e8}.t-a{--tc:#ff7a59}.t-s{--tc:#e6c15a}.t-u{--tc:#c9bfe6}
.bbk-tier{display:inline-block;padding:2px 8px;border-radius:6px;border:2px solid var(--tc);color:var(--tc);font-size:11px;font-weight:900;white-space:nowrap}
.bbk-table tbody tr{box-shadow:inset 4px 0 0 var(--tc)}
.bbk-table td.rk{font-weight:900;font-variant-numeric:tabular-nums;width:34px}
.bbk-table tr.pod1 td.rk{color:#e6c15a}.bbk-table tr.pod2 td.rk{color:#d9dde2}.bbk-table tr.pod3 td.rk{color:#d99a66}
.bbk-table td.num:nth-child(4){font-weight:900}
.bbk-tiers{display:flex;flex-direction:column;gap:8px}
.bbk-tcard{display:flex;gap:12px;align-items:flex-start;padding:10px;border-radius:10px;border:2px solid var(--tc);background:var(--felt3,#2a343a)}
.bbk-tcard.mine{box-shadow:0 0 0 3px var(--gold,#e7b94a)}
.bbk-tbadge{flex:none;width:40px;height:40px;border-radius:8px;background:var(--tc);color:#1a1030;font-weight:900;font-size:18px;display:flex;align-items:center;justify-content:center}
.bbk-tinfo b{font-size:16px;color:var(--tc)}.bbk-tinfo small{display:block;color:var(--muted,#9aabb1);font-size:12px;margin-top:2px}.bbk-tinfo p{margin:6px 0 0;font-size:13px;line-height:1.4}
.bbk-rules{margin:0;padding-left:18px;font-size:13px;line-height:1.5;display:flex;flex-direction:column;gap:6px}
.bbk-hero{border:2px solid var(--tc);border-radius:12px;background:var(--felt3,#2a343a);padding:12px;margin:10px 0}
.bbk-hero-top{display:flex;align-items:center;gap:12px}
.bbk-tbadge.big{width:52px;height:52px;font-size:24px;border-radius:10px}
.bbk-hero-id{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.bbk-hero-tier{font-size:18px;color:var(--tc)}.bbk-hero-name{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bbk-hero-rank{color:var(--muted,#9aabb1);font-size:12px}
.bbk-hero-rating{text-align:right;display:flex;flex-direction:column;line-height:1.1}
.bbk-hero-rating b{font-size:30px;font-variant-numeric:tabular-nums}.bbk-hero-rating small{font-size:10px;letter-spacing:.14em;color:var(--muted,#9aabb1)}
.bbk-hero-rating .peak{letter-spacing:.02em;font-size:12px;margin-top:3px;color:var(--ink,#eaf0f1)}
.bbk-prog{margin-top:12px}.bbk-prog p{margin:6px 0 0;font-size:12px;color:var(--muted,#9aabb1);text-align:center;line-height:1.4}
.bbk-prog-lab{display:flex;justify-content:space-between;gap:8px;font-size:12px;font-weight:800}.bbk-prog-lab span:first-child{color:var(--tc)}.bbk-prog-lab span:last-child{color:var(--muted,#9aabb1)}
.bbk-bar{height:12px;border-radius:6px;background:#0007;overflow:hidden;margin-top:5px}.bbk-bar i{display:block;height:100%;border-radius:6px;background:var(--tc)}
.bbk-pips{display:flex;gap:6px}.bbk-pips i{flex:1;height:12px;border-radius:4px;background:#0007}.bbk-pips i.on{background:#6fd3a0}
.bbk-ps{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 4px}
.bbk-wl{grid-column:1 / -1;background:var(--felt3,#2a343a);border:1px solid var(--line,#35434a);border-radius:10px;padding:10px}
.bbk-wlbar{display:flex;height:12px;border-radius:6px;overflow:hidden;background:#0007;gap:2px}
.bbk-wlbar .w{background:#6fd3a0}.bbk-wlbar .d{background:#e6c15a}.bbk-wlbar .l{background:#ff7a59}.bbk-wlbar .e{background:#0007}
.bbk-wllab{display:flex;gap:14px;justify-content:center;margin-top:7px;font-size:13px;font-weight:800}
.bbk-wllab .w{color:#6fd3a0}.bbk-wllab .l{color:#ff9b93}.bbk-wllab .d{color:#e6c15a}
.bbk-table{table-layout:fixed}
.bbk-table th:nth-child(1){width:30px}.bbk-table th:nth-child(3){width:92px}.bbk-table th:nth-child(4){width:50px}.bbk-table th:nth-child(5){width:58px}.bbk-table td.num{white-space:nowrap}
.bbk-table td{padding:8px 4px}.bbk-table td .bbk-tier{font-size:10px;padding:2px 6px}
.bbk-table td.name{max-width:none}
`;
  function injectCss() {
    if (document.getElementById('bbk-account-css')) return;
    const s = document.createElement('style');
    s.id = 'bbk-account-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- account chip (menu) ---------- */
  function displayName() {
    if (profile && profile.display_name) return profile.display_name;
    return session && session.user && session.user.email ? session.user.email.split('@')[0] : 'Player';
  }
  function renderMount(el) {
    el.replaceChildren();
    if (!session) {
      el.append(h('button', { type: 'button', class: 'bbk-signin', onclick: () => openAuth('in') },
        h('span', { class: 'bbk-avatar', 'aria-hidden': 'true', text: '👤' }),
        h('span', { class: 'bbk-who' }, h('b', { text: 'SIGN IN / REGISTER' }), h('small', { text: 'Save your rating and join the leaderboard' }))));
    } else {
      const name = displayName();
      el.append(h('button', { type: 'button', class: 'bbk-chip', onclick: () => openProfile(isDefaultName(name)), 'aria-label': 'Open profile of ' + name + ' (change name, see stats)' },
        h('span', { class: 'bbk-avatar', 'aria-hidden': 'true', text: name.charAt(0).toUpperCase() }),
        h('span', { class: 'bbk-who' }, h('b', { text: name }),
          h('small', { text: profile ? (isDefaultName(name) ? 'Tap to choose your name' : tierLine(profile)) : 'Loading profile…' })),
        h('span', { class: 'bbk-pen', 'aria-hidden': 'true', title: 'Change name', text: '✎' })));
    }
  }
  function mount(el) { if (!el) return; injectCss(); mounts.add(el); renderMount(el); }

  /* ---------- modal ---------- */
  let overlay = null, lastFocus = null;
  function closeModal() {
    if (!overlay) return;
    overlay.remove(); overlay = null;
    document.removeEventListener('keydown', onKey, true);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch { /* element gone */ } }
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeModal(); }
  }
  function openModal(title) {
    injectCss();
    closeModal();
    lastFocus = document.activeElement;
    const body = h('div', { class: 'bbk-body' });
    overlay = h('div', { class: 'bbk-ov', role: 'dialog', 'aria-modal': 'true', 'aria-label': title,
      onmousedown: (e) => { if (e.target === overlay) closeModal(); } },
      h('div', { class: 'bbk-box' },
        h('div', { class: 'bbk-head' }, h('button', { type: 'button', class: 'bbk-x bbk-back', 'aria-label': 'Back', onclick: closeModal, text: '← BACK' }), h('h2', { text: title })),
        body));
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey, true);   // capture: Escape must not reach the game's "forfeit" shortcut
    return body;
  }

  /* ---------- auth view ---------- */
  function openAuth(mode) {
    mode = mode === 'up' ? 'up' : 'in';
    const body = openModal(mode === 'in' ? 'Sign in' : 'Create account');
    const msg = h('div', { class: 'bbk-msg', role: 'status', 'aria-live': 'polite' });
    const email = h('input', { type: 'email', name: 'email', autocomplete: 'email', required: true, inputmode: 'email', maxlength: '254' });
    const pass = h('input', { type: 'password', name: 'password', autocomplete: mode === 'in' ? 'current-password' : 'new-password', required: true, minlength: '8', maxlength: '72' });
    const submit = h('button', { type: 'submit', class: 'bbk-btn', text: mode === 'in' ? 'SIGN IN' : 'CREATE ACCOUNT' });
    const tab = (m, label) => h('button', { type: 'button', class: 'bbk-tab', role: 'tab', 'aria-selected': String(m === mode), onclick: () => openAuth(m), text: label });
    const form = h('form', { class: 'bbk-form', novalidate: true,
      onsubmit: async (ev) => {
        ev.preventDefault();
        msg.className = 'bbk-msg'; msg.textContent = '';
        const em = email.value.trim(), pw = pass.value;
        if (!/^\S+@\S+\.\S+$/.test(em)) { msg.textContent = 'Please enter a valid email address.'; email.focus(); return; }
        if (pw.length < 8) { msg.textContent = 'Password must be at least 8 characters.'; pass.focus(); return; }
        submit.disabled = true;
        try {
          if (mode === 'up') {
            const r = await signUp(em, pw);
            if (r.needsConfirm) { msg.className = 'bbk-msg ok'; msg.textContent = 'Account created! Check your email and click the confirmation link, then come back and sign in.'; submit.disabled = false; return; }
          } else {
            await signIn(em, pw);
          }
          closeModal();
        } catch (e) { msg.textContent = e.message; submit.disabled = false; }
      } },
      h('label', null, 'Email', email), h('label', null, 'Password', pass), submit, msg);
    body.append(h('div', { class: 'bbk-tabs', role: 'tablist' }, tab('in', 'SIGN IN'), tab('up', 'REGISTER')), form,
      h('p', { class: 'bbk-note', text: 'You do not need an account to play against the AI or to play a friend in a room. An account is only needed for ranked matches, your rating and the leaderboard.' }));
    email.focus();
  }

  /* ---------- profile view ---------- */
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; } };
  const isDefaultName = (n) => /^player_[0-9a-f]{8}$/.test(n || '');
  async function openProfile(focusName) {
    if (!session) { openAuth('in'); return; }
    await loadProfile();
    const body = openModal('Your profile');
    const p = profile;
    if (!p) { body.append(h('div', { class: 'bbk-empty', text: 'Could not load your profile. Please try again.' })); return; }
    const nameMsg = h('div', { class: 'bbk-msg', role: 'status', 'aria-live': 'polite' });
    const nameIn = h('input', { type: 'text', value: p.display_name, maxlength: '20', autocomplete: 'nickname', 'aria-label': 'Display name' });
    const save = h('button', { type: 'submit', class: 'bbk-btn', text: 'SAVE' });
    const nameForm = h('form', { class: 'bbk-row', novalidate: true,
      onsubmit: async (ev) => {
        ev.preventDefault();
        nameMsg.className = 'bbk-msg'; nameMsg.textContent = '';
        const v = nameIn.value.trim();
        if (v.length < 3 || v.length > 20) { nameMsg.textContent = 'Use 3 to 20 characters.'; return; }
        if (v === profile.display_name) { nameMsg.className = 'bbk-msg ok'; nameMsg.textContent = 'That is already your name.'; return; }
        save.disabled = true;
        try { await setDisplayName(v); nameMsg.className = 'bbk-msg ok'; nameMsg.textContent = 'Name saved.'; }
        catch (e) { nameMsg.textContent = e.message; }
        finally { save.disabled = false; }
      } }, nameIn, save);
    const placing = p.games < PLACEMENT;
    const tn = placing ? 'Unranked' : tier(p.rating, p.games);
    const rate = p.games ? Math.round((p.wins / p.games) * 100) + '%' : '—';
    const rankLine = h('small', { class: 'bbk-hero-rank', text: placing ? 'Not on the leaderboard yet' : 'Leaderboard rank …' });
    let progress;
    if (placing) {
      progress = h('div', { class: 'bbk-prog' },
        h('div', { class: 'bbk-pips', 'aria-hidden': 'true' }, Array.from({ length: PLACEMENT }, (_, i) => h('i', { class: i < p.games ? 'on' : '' }))),
        h('p', { text: 'Placement ' + p.games + ' / ' + PLACEMENT + ' · no points are lost. ' + (PLACEMENT - p.games) + ' more ranked ' + (PLACEMENT - p.games === 1 ? 'match' : 'matches') + ' to get your tier.' }));
    } else {
      const cur = TIERS.find((t) => p.rating >= t.min), next = TIERS[TIERS.indexOf(cur) - 1];
      const pct = next ? Math.max(2, Math.min(100, Math.round(((p.rating - cur.min) / (next.min - cur.min)) * 100))) : 100;
      progress = h('div', { class: 'bbk-prog' },
        h('div', { class: 'bbk-prog-lab' }, h('span', { text: cur.name + ' ' + cur.min }), h('span', { text: next ? next.name + ' ' + next.min : 'Top tier' })),
        h('div', { class: 'bbk-bar' }, h('i', { style: 'width:' + pct + '%' })),
        h('p', { text: next ? (next.min - p.rating) + ' points to ' + next.name : 'No limit above SSS.' }));
    }
    const total = (p.wins || 0) + (p.losses || 0) + (p.draws || 0);
    const seg = (n, c) => (total && n ? h('i', { class: c, style: 'flex:' + n }) : null);
    const hero = h('div', { class: 'bbk-hero t-' + tierCls(tn) },
      h('div', { class: 'bbk-hero-top' },
        h('span', { class: 'bbk-tbadge big', 'aria-hidden': 'true', text: placing ? '?' : (tn === 'SSS' ? 'S' : tn[0]) }),
        h('div', { class: 'bbk-hero-id' }, h('b', { class: 'bbk-hero-tier', text: tn }), h('span', { class: 'bbk-hero-name', text: p.display_name }), rankLine),
        h('div', { class: 'bbk-hero-rating' }, h('b', { text: p.rating }), h('small', { text: 'ELO' }), h('small', { class: 'peak', text: 'Peak ' + p.peak_rating }))),
      progress);
    const stats = h('div', { class: 'bbk-ps' },
      h('div', { class: 'bbk-stat' }, h('b', { text: p.games }), h('small', { text: 'Ranked matches' })),
      h('div', { class: 'bbk-stat' }, h('b', { text: rate }), h('small', { text: 'Win rate' })),
      h('div', { class: 'bbk-wl' },
        h('div', { class: 'bbk-wlbar', role: 'img', 'aria-label': p.wins + ' wins, ' + p.losses + ' losses, ' + p.draws + ' draws' }, total ? [seg(p.wins, 'w'), seg(p.draws, 'd'), seg(p.losses, 'l')] : h('i', { class: 'e', style: 'flex:1' })),
        h('div', { class: 'bbk-wllab' }, h('span', { class: 'w', text: p.wins + ' W' }), h('span', { class: 'l', text: p.losses + ' L' }), p.draws ? h('span', { class: 'd', text: p.draws + ' D' }) : null)));
    body.append(
      h('div', { class: 'bbk-who' }, h('small', { text: session.user.email || '' })),
      hero, stats,
      h('div', { class: 'bbk-h3', text: 'Display name · you can change it any time' }), nameForm, nameMsg);
    if (focusName === true || isDefaultName(p.display_name)) setTimeout(() => { try { nameIn.focus(); nameIn.select(); } catch { /* ignore */ } }, 60);
    const hist = h('div');
    body.append(h('div', { class: 'bbk-h3', text: 'Recent ranked matches' }), hist,
      h('div', { class: 'bbk-row', style: 'margin-top:14px' },
        h('button', { type: 'button', class: 'bbk-btn alt', onclick: openLeaderboard, text: '🏆 LEADERBOARD' }),
        h('button', { type: 'button', class: 'bbk-btn alt', onclick: async () => { closeModal(); await signOut(); }, text: 'SIGN OUT' })));
    myRank().then((r) => { rankLine.textContent = r ? 'Leaderboard #' + r : 'Not on the leaderboard yet'; }, () => { rankLine.textContent = 'Leaderboard rank unavailable'; });
    loadHistory(hist);
  }
  async function myRank() {
    if (!session) return null;
    const rows = await api('/rest/v1/leaderboard?select=rank&id=eq.' + encodeURIComponent(session.user.id));
    return rows && rows[0] ? rows[0].rank : null;
  }
  async function loadHistory(box) {
    box.replaceChildren(h('div', { class: 'bbk-empty', text: 'Loading…' }));
    try {
      const token = await freshToken();
      const me = session && session.user.id;
      const ms = await api('/rest/v1/matches?select=id,player1,player2,result,reason,p1_rating_before,p1_rating_after,p2_rating_before,p2_rating_after,ranked,ended_at&ranked=eq.true&order=ended_at.desc&limit=10', { token });
      if (!ms || !ms.length) { box.replaceChildren(h('div', { class: 'bbk-empty', text: 'No ranked matches yet. Press RANKED in Multiplayer to play your first one.' })); return; }
      const oppIds = [...new Set(ms.map((m) => (m.player1 === me ? m.player2 : m.player1)).filter(Boolean))];
      const names = {};
      if (oppIds.length) {
        const ps = await api('/rest/v1/profiles?select=id,display_name&id=in.(' + oppIds.map(encodeURIComponent).join(',') + ')', { token });
        for (const r of ps || []) names[r.id] = r.display_name;
      }
      const list = h('ul', { class: 'bbk-list' });
      for (const m of ms) {
        const mine = m.player1 === me ? 1 : 2;
        const opp = mine === 1 ? m.player2 : m.player1;
        const won = m.result === 'player' + mine, drew = m.result === 'draw';
        const before = mine === 1 ? m.p1_rating_before : m.p2_rating_before;
        const after = mine === 1 ? m.p1_rating_after : m.p2_rating_after;
        const delta = after != null && before != null ? after - before : 0;
        list.append(h('li', null,
          h('span', null, h('span', { class: drew ? 'bbk-draw' : won ? 'bbk-win' : 'bbk-loss', text: drew ? 'DRAW' : won ? 'WIN' : 'LOSS' }), ' vs ', names[opp] || 'Deleted player'),
          h('span', null, (delta > 0 ? '+' : '') + delta + ' · ' + fmtDate(m.ended_at))));
      }
      box.replaceChildren(list);
    } catch (e) { box.replaceChildren(h('div', { class: 'bbk-empty', text: e.message })); }
  }

  /* ---------- rank explanation ---------- */
  function openRanks() {
    const body = openModal('Rank tiers');
    const mineName = profile && profile.games >= PLACEMENT ? tier(profile.rating, profile.games) : null;
    body.append(
      h('div', { class: 'bbk-tiers' }, ['SSS', 'Alpha-Wolf', 'B-Player', 'C-troop'].map((n) => h('div', { class: 'bbk-tcard t-' + tierCls(n) + (n === mineName ? ' mine' : '') },
        h('span', { class: 'bbk-tbadge', text: n === 'SSS' ? 'S' : n[0] }),
        h('div', { class: 'bbk-tinfo' }, h('b', { text: n + (n === mineName ? ' · you' : '') }), h('small', { text: TIER_INFO[n].range + ' rating' }), h('p', { text: TIER_INFO[n].text }))))),
      h('div', { class: 'bbk-h3', text: 'How it works' }),
      h('ul', { class: 'bbk-rules' },
        h('li', { text: 'Unranked: your first ' + PLACEMENT + ' ranked matches are placement. Wins add points, losses never subtract. After that you get your tier.' }),
        h('li', { text: 'Rating starts at 1000. Beating a stronger player earns more; losing to a weaker one costs more. Against an equal opponent a match moves about 16 points.' }),
        h('li', { text: 'Your tier always follows your current rating, so it can go up or down.' }),
        h('li', { text: 'Matchmaking looks for opponents within 100 points and widens the search while you wait, up to 300 points (one tier). Players still in placement are matched with each other first.' }),
        h('li', { text: 'Only placed players appear on the leaderboard.' })));
  }

  /* ---------- leaderboard view ---------- */
  async function openLeaderboard() {
    const body = openModal('🏆 Leaderboard');
    const legend = () => h('div', { class: 'bbk-legend' },
      h('div', { class: 'bbk-tchips' }, ['SSS', 'Alpha-Wolf', 'B-Player', 'C-troop'].map((n) => h('span', { class: 'bbk-tchip t-' + tierCls(n) }, h('b', { text: n }), h('small', { text: TIER_INFO[n].range })))),
      h('button', { type: 'button', class: 'bbk-btn alt bbk-how', onclick: openRanks, text: 'ℹ HOW RANKS WORK' }));
    const box = h('div', null, h('div', { class: 'bbk-empty', text: 'Loading…' }));
    body.append(box);
    async function load() {
      box.replaceChildren(h('div', { class: 'bbk-empty', text: 'Loading…' }));
      try {
        const rows = await api('/rest/v1/leaderboard?select=id,display_name,rating,games,wins,losses,rank&order=rank.asc,display_name.asc&limit=50');
        if (!rows || !rows.length) { box.replaceChildren(legend(), h('div', { class: 'bbk-empty', text: 'No ranked matches have been played yet. Be the first on the board!' })); return; }
        const me = session && session.user.id;
        const table = h('table', { class: 'bbk-table' },
          h('thead', null, h('tr', null, h('th', { text: '#' }), h('th', { text: 'Player' }), h('th', { text: 'Tier' }), h('th', { class: 'num', text: 'Rating' }), h('th', { class: 'num', text: 'W-L' }))),
          h('tbody', null, rows.map((r) => { const tn = tier(r.rating, r.games); return h('tr', { class: (r.id === me ? 'me ' : '') + 't-' + tierCls(tn) + (r.rank <= 3 ? ' podium pod' + r.rank : '') },
            h('td', { class: 'rk', text: r.rank }), h('td', { class: 'name', text: r.display_name }), h('td', null, tierPill(tn)), h('td', { class: 'num', text: r.rating }), h('td', { class: 'num', text: r.wins + '-' + r.losses })); })));
        box.replaceChildren(legend(), table);
        let you;
        if (!me) {
          you = h('div', { class: 'bbk-you' }, h('b', { text: 'Sign in to see your rank' }), h('small', { text: 'Play 5 ranked matches to get placed.' }),
            h('button', { type: 'button', class: 'bbk-btn alt', onclick: () => openAuth('in'), text: 'SIGN IN' }));
        } else {
          let mine = null;
          try { const r = await api('/rest/v1/leaderboard?select=rank,rating,wins,losses&id=eq.' + encodeURIComponent(me)); mine = r && r[0]; } catch { /* shown as unranked */ }
          const name = (profile && profile.display_name) || 'You';
          you = mine
            ? h('div', { class: 'bbk-you' }, h('span', { class: 'bbk-you-rank', text: '#' + mine.rank }), h('span', { class: 'bbk-you-name' }, h('b', { text: name + ' (you)' }), h('small', { text: tier(mine.rating, 99) + ' · ' + mine.wins + 'W ' + mine.losses + 'L' })), h('span', { class: 'bbk-you-rating', text: String(mine.rating) }))
            : h('div', { class: 'bbk-you' }, h('b', { text: name + ' (you)' }), h('small', { text: (profile && profile.games > 0 ? 'Unranked · placement ' + profile.games + '/' + PLACEMENT : 'Unranked · play ' + PLACEMENT + ' ranked matches to get your tier') + '. You will not lose points until placed.' }));
        }
        box.append(you);
      } catch (e) {
        box.replaceChildren(h('div', { class: 'bbk-empty', text: e.message }), h('button', { type: 'button', class: 'bbk-btn alt', onclick: load, text: 'TRY AGAIN' }));
      }
    }
    load();
  }

  /* ---------- public API ---------- */
  window.BBK = {
    mount, openAuth, openProfile, openLeaderboard, openRanks, signOut,
    getToken: freshToken,
    refreshProfile: loadProfile,
    tier, placement: PLACEMENT, tiers: TIERS.map((t) => ({ name: t.name, min: t.min })),
    tutorial: { get: tutorialStep, set: setTutorial, total: 5 },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get session() { return session; },
    get profile() { return profile; }
  };

  /* ---------- start ---------- */
  session = store.get();
  if (session && session.access_token && session.user && session.user.id) {
    loadProfile();
  } else { session = null; }
  window.addEventListener('storage', (e) => {   // sign in or out in another tab
    if (e.key !== STORE_KEY) return;
    session = store.get();
    if (session) loadProfile(); else { profile = null; emit(); }
  });
})();
