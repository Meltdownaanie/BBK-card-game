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
        h('div', { class: 'bbk-head' }, h('h2', { text: title }), h('button', { type: 'button', class: 'bbk-x', 'aria-label': 'Close', onclick: closeModal, text: '✕' })),
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
    const rate = p.games ? Math.round((p.wins / p.games) * 100) + '%' : '—';
    const rankBox = h('b', { text: '…' });
    body.append(
      h('div', { class: 'bbk-who' }, h('small', { text: session.user.email || '' })),
      h('div', { class: 'bbk-h3', text: 'Display name · you can change it any time' }), nameForm, nameMsg,
      h('div', { class: 'bbk-stats' },
        h('div', { class: 'bbk-stat' }, h('b', { text: p.games < PLACEMENT ? 'Unranked' : tier(p.rating, p.games) }), h('small', { text: p.games < PLACEMENT ? 'Placement ' + p.games + '/' + PLACEMENT + ' · no points lost' : 'Tier' })),
        h('div', { class: 'bbk-stat' }, h('b', { text: p.rating }), h('small', { text: 'Rating' })),
        h('div', { class: 'bbk-stat' }, rankBox, h('small', { text: 'Rank' })),
        h('div', { class: 'bbk-stat' }, h('b', { text: p.peak_rating }), h('small', { text: 'Peak' })),
        h('div', { class: 'bbk-stat' }, h('b', { text: p.wins }), h('small', { text: 'Wins' })),
        h('div', { class: 'bbk-stat' }, h('b', { text: p.losses }), h('small', { text: 'Losses' })),
        h('div', { class: 'bbk-stat' }, h('b', { text: rate }), h('small', { text: 'Win rate' }))));
    if (focusName === true || isDefaultName(p.display_name)) setTimeout(() => { try { nameIn.focus(); nameIn.select(); } catch { /* ignore */ } }, 60);
    const hist = h('div');
    body.append(h('div', { class: 'bbk-h3', text: 'Recent ranked matches' }), hist,
      h('div', { class: 'bbk-row', style: 'margin-top:14px' },
        h('button', { type: 'button', class: 'bbk-btn alt', onclick: openLeaderboard, text: '🏆 LEADERBOARD' }),
        h('button', { type: 'button', class: 'bbk-btn alt', onclick: async () => { closeModal(); await signOut(); }, text: 'SIGN OUT' })));
    myRank().then((r) => { rankBox.textContent = r ? '#' + r : '—'; }, () => { rankBox.textContent = '—'; });
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

  /* ---------- leaderboard view ---------- */
  async function openLeaderboard() {
    const body = openModal('🏆 Leaderboard');
    const box = h('div', null, h('div', { class: 'bbk-empty', text: 'Loading…' }));
    body.append(box);
    async function load() {
      box.replaceChildren(h('div', { class: 'bbk-empty', text: 'Loading…' }));
      try {
        const rows = await api('/rest/v1/leaderboard?select=id,display_name,rating,games,wins,losses,rank&order=rank.asc,display_name.asc&limit=50');
        if (!rows || !rows.length) { box.replaceChildren(h('div', { class: 'bbk-empty', text: 'No ranked matches have been played yet. Be the first on the board!' })); return; }
        const me = session && session.user.id;
        const table = h('table', { class: 'bbk-table' },
          h('thead', null, h('tr', null, h('th', { text: '#' }), h('th', { text: 'Player' }), h('th', { text: 'Tier' }), h('th', { class: 'num', text: 'Rating' }), h('th', { class: 'num', text: 'W-L' }))),
          h('tbody', null, rows.map((r) => h('tr', { class: r.id === me ? 'me' : '' },
            h('td', { text: r.rank }), h('td', { class: 'name', text: r.display_name }), h('td', { text: tier(r.rating, r.games) }), h('td', { class: 'num', text: r.rating }), h('td', { class: 'num', text: r.wins + '-' + r.losses })))));
        box.replaceChildren(table);
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
    mount, openAuth, openProfile, openLeaderboard, signOut,
    getToken: freshToken,
    refreshProfile: loadProfile,
    tier, placement: PLACEMENT,
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
