/* 184 Standard mode rules core (TEST BUILD). Shared by the standard.html test page and the headless simulator.
   Cards are ints: suit*10+n, suit 0=Hammer(Búa) 1=Paper(Bao) 2=Scissors(Kéo). Classic rules mirror server/index.js;
   Standard adds per-player "active" effect cards (max 9 Tier 1, 6 Tier 2, 3 Tier 3; 4 Tier 3 with Búa 2). */
(function (root) {
'use strict';
let seed = 1;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const ri = n => Math.floor(rnd() * n);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
const S = c => (c / 10) | 0, N = c => c % 10, BEATS = [2, 0, 1];
const H0=0,H1=1,H2=2,H3=3,H4=4,H5=5,H6=6,H7=7,H8=8,H9=9,P0=10,P1=11,P2=12,P3=13,P4=14,P5=15,P6=16,P7=17,P8=18,P9=19,S0=20,S1=21,S2=22,S3=23,S4=24,S5=25,S6=26,S7=27,S8=28,S9=29;
const NAME = c => 'HPS'[S(c)] + N(c);
const SUIT_VI = ['Búa', 'Bao', 'Kéo'];
const VI = c => SUIT_VI[S(c)] + ' ' + N(c);
const parse = s => 'HPS'.indexOf(s[0]) * 10 + (+s[1]);
const bit = c => 1 << c;
function clash(a, b) {
  if (S(a) === S(b)) { if (N(a) === N(b)) return [-1, 0]; return [N(a) > N(b) ? 0 : 1, Math.abs(N(a) - N(b))]; }
  return [BEATS[S(a)] === S(b) ? 0 : 1, N(a) === N(b) ? (N(a) || 10) * 2 : Math.abs(N(a) - N(b))];
}
const tier = c => N(c) <= 3 ? 0 : N(c) <= 6 ? 1 : 2;
function keepValue(g, p, c) { return N(c) + ((g.active[p] & bit(c)) ? [3, 5, 8][tier(c)] : 0) + (N(c) === 7 ? 3 : 0); }

/* What each card does when its effect is switched on (shown in the deck builder and the in-game list). */
const FX = {
  [H0]: ['Thắng slot', 'Hồi HP bằng sát thương lá này gây ra.'],
  [H1]: ['Thắng slot', 'Rút Búa 9 từ deck. Nếu Búa 9 đã trên tay: rút 1 lá ngẫu nhiên.'],
  [H2]: ['Khi xây deck', 'Cho phép bật 4 lá Tier 3 thay vì 3.'],
  [H3]: ['Thua slot', 'Giảm 9 sát thương phải nhận trong round này.'],
  [P0]: ['Thua slot', 'Nếu thua round, lá bị discard sẽ là Bao 0.'],
  [P1]: ['Thắng slot', 'Được đổi 1 lá trên tay lấy 1 lá từ discard pile (tùy chọn).'],
  [P2]: ['Thắng slot', 'Lấy 1 lá ngẫu nhiên từ discard pile.'],
  [P3]: ['Thắng slot', 'Rút 1 lá ngẫu nhiên từ deck.'],
  [S0]: ['Thắng slot', 'Rút 1 lá Bao ngẫu nhiên từ deck.'],
  [S1]: ['Khi bị chọn discard', 'Không bị discard, quay lại tay. Bộ đếm discard +1.'],
  [S2]: ['Khi bị chọn discard', 'Bộ đếm discard +2.'],
  [S3]: ['Thắng slot', 'Sát thương + tổng số các lá của mình đã bị discard do hiệu ứng.'],
  [H4]: ['Thắng slot', 'Hồi HP bằng tổng sát thương gây ra trong cả round.'],
  [H5]: ['Thắng slot', 'Tìm 1 lá Búa trong deck. Hết Búa: rút 1 lá ngẫu nhiên.'],
  [H6]: ['Thắng slot', 'Đối thủ không được dùng Bao ở round tiếp theo.'],
  [P4]: ['Thắng slot', 'Rút x lá, x = số lần hiệu ứng rút bài đã kích hoạt (không tính Bao 4).'],
  [P5]: ['Thắng slot', 'Mọi hiệu ứng bài của đối thủ trong round này không kích hoạt.'],
  [P6]: ['Thắng slot', 'Tìm 1 lá số 7 trong deck.'],
  [S4]: ['Thắng / Thua slot', 'Thắng: discard ngẫu nhiên 2 lá từ deck đối thủ. Thua: discard 1 lá từ deck của mình.'],
  [S5]: ['Thắng slot', 'Nhân đôi sát thương của lá này.'],
  [S6]: ['Thua slot', 'Đối thủ discard ngẫu nhiên 1 lá trên tay.'],
  [H7]: ['Thắng / Thua slot', 'Thắng: lấy 2 lá Búa từ discard pile. Thua: rút 2 lá Búa từ deck.'],
  [H8]: ['Thắng slot', 'Chọn 1 chất: cả hai không được chơi chất đó ở round tiếp theo.'],
  [H9]: ['Thắng slot', 'Từ round sau đến hết game: nhân đôi sát thương gây ra và HP hồi của bạn.'],
  [P7]: ['Thắng slot', 'Gây thêm sát thương = số lá đã rút bằng hiệu ứng × 2 (chưa rút lá nào: 20).'],
  [P8]: ['Thắng slot', 'Tìm 1 lá số 9 và 1 lá số 7 trong deck.'],
  [P9]: ['Thắng slot', 'Tìm 2 lá số 8 và 1 lá số 6 từ deck hoặc discard pile.'],
  [S7]: ['Thắng / Thua slot', 'Thắng: xem deck đối thủ, chọn 2 lá để discard. Thua: chọn 1 lá.'],
  [S8]: ['Thắng slot', 'Đối thủ discard 2 lá từ deck và nhận sát thương = bộ đếm discard × 2.'],
  [S9]: ['Thắng slot', 'Đối thủ discard 3 lá từ deck. Mỗi lá thiếu gây 10 sát thương.'],
};

function newGame(activeA, activeB) {
  const g = { hp: [100, 100], deck: [[], []], hand: [[], []], disc: [[], []], eff: [0, 0], active: [activeA, activeB], cnt: [0, 0], drawTrig: [0, 0], drawnN: [0, 0],
    dbl: [false, false], dblNext: [false, false], ban: [0, 0], nextBan: [0, 0], blocked: [-1, -1], nextBlocked: [-1, -1], nextDraw: [1, 1], messUp: [false, false],
    round: 1, over: false, winner: -1, reason: '', trig: null, log: null, ask: null, human: -1 };
  for (let p = 0; p < 2; p++) {
    const d = shuffle(Array.from({ length: 30 }, (_, i) => i));
    for (let s = 0; s < 3; s++) { const i = d.findIndex(c => S(c) === s); g.hand[p].push(d.splice(i, 1)[0]); }
    while (g.hand[p].length < 5) g.hand[p].push(d.pop());
    g.deck[p] = d;
  }
  return g;
}
/* Copy for look-ahead and for replaying a round: no log, no questions (the AI heuristics answer every choice). */
function clone(g) {
  return { hp: [g.hp[0], g.hp[1]], deck: [g.deck[0].slice(), g.deck[1].slice()], hand: [g.hand[0].slice(), g.hand[1].slice()], disc: [g.disc[0].slice(), g.disc[1].slice()],
    eff: [g.eff[0], g.eff[1]], active: g.active, cnt: [g.cnt[0], g.cnt[1]], drawTrig: [g.drawTrig[0], g.drawTrig[1]], drawnN: [g.drawnN[0], g.drawnN[1]],
    dbl: [g.dbl[0], g.dbl[1]], dblNext: [g.dblNext[0], g.dblNext[1]], ban: [g.ban[0], g.ban[1]], nextBan: [g.nextBan[0], g.nextBan[1]], blocked: [g.blocked[0], g.blocked[1]], nextBlocked: [g.nextBlocked[0], g.nextBlocked[1]],
    nextDraw: [g.nextDraw[0], g.nextDraw[1]], messUp: [g.messUp[0], g.messUp[1]], round: g.round, over: false, winner: -1, reason: '', trig: null, log: null, ask: null, human: -1 };
}
const take = (arr, c) => { const i = arr.indexOf(c); if (i < 0) return false; arr.splice(i, 1); return true; };
/* A card is "chosen to be discarded": an active Kéo 1 refuses (counter +1), an active Kéo 2 counts twice. Returns true if it really went to the pile. */
function discardCard(g, owner, c, byEffect, on) {
  if (c === S1 && on[owner] && (g.active[owner] & bit(S1))) { g.cnt[owner]++; if (g.log) g.log.push({ p: owner, c: S1, slot: -1, t: 'Không bị discard, quay lại tay (bộ đếm +1)' }); return false; }
  if (c === S2 && on[owner] && (g.active[owner] & bit(S2))) { g.cnt[owner] += 2; if (g.log) g.log.push({ p: owner, c: S2, slot: -1, t: 'Bị discard: bộ đếm +2' }); }
  g.disc[owner].push(c); if (byEffect) g.eff[owner] |= bit(c); else g.eff[owner] &= ~bit(c);
  return true;
}
function effDraw(g, p, n) { let k = 0; while (n-- > 0 && g.deck[p].length) { g.hand[p].push(g.deck[p].pop()); k++; } g.drawnN[p] += k; return k; }
function effTake(g, p, c) { if (!take(g.deck[p], c)) return 0; g.hand[p].push(c); g.drawnN[p]++; return 1; }
function bestOf(g, p, list) { let b = -1, bv = -1; for (const c of list) { const v = keepValue(g, p, c); if (v > bv) { bv = v; b = c; } } return b; }
/* Discard up to k cards from owner's deck by an effect. picks = cards chosen by a player (Kéo 7) or null for random. Returns how many really left. */
function millDeck(g, owner, k, on, picks) {
  let n = 0;
  for (let j = 0; j < k && g.deck[owner].length; j++) {
    const c = picks ? picks[j] : g.deck[owner][ri(g.deck[owner].length)];
    if (c === undefined || !g.deck[owner].includes(c)) continue;
    if (c === S1 && on[owner] && (g.active[owner] & bit(S1))) { g.cnt[owner]++; continue; }   // Kéo 1 stays in the deck
    take(g.deck[owner], c); discardCard(g, owner, c, true, on); n++;
  }
  return n;
}
/* Slot results before any effect: who wins each slot and the base damage (card vs card, or a direct hit on an empty slot). */
function outcomes(rows) {
  const out = [null, null, null];
  for (let i = 0; i < 3; i++) {
    const a = rows[0][i], b = rows[1][i]; if (a < 0 && b < 0) continue;
    if (a >= 0 && b >= 0) out[i] = clash(a, b); else out[i] = [a >= 0 ? 0 : 1, N(a >= 0 ? a : b) || 10];
  }
  return out;
}
/* Which side has its effects shut off this round (an active Bao 5 that won its slot). */
function blockedSides(g, rows, out) {
  const blk = [false, false];
  for (let p = 0; p < 2; p++) for (let i = 0; i < 3; i++) if (rows[p][i] === P5 && (g.active[p] & bit(P5)) && out[i] && out[i][0] === p) blk[1 - p] = true;
  return blk;
}

/* Resolve one round. rows[p] = [card|-1, card|-1, card|-1] (already removed from the hands). Mutates g. Returns ctx for the discard step. */
function resolve(g, rows) {
  const out = outcomes(rows), wins = [0, 0], dmgTo = [0, 0], slotDmg = [0, 0, 0], heal = [0, 0], healTotal = [false, false], reduce = [0, 0], p0lost = [false, false];
  const blk = blockedSides(g, rows, out), on = [!blk[0], !blk[1]];
  const isOn = (p, c) => on[p] && (g.active[p] & bit(c)) !== 0;
  const T = g.trig, L = g.log;
  const mark = (p, c) => { if (T) T[p][c] = (T[p][c] || 0) + 1; };
  const say = (p, c, i, t) => { if (L) L.push({ p, c, slot: i, t }); };
  const ask = (p, spec, auto) => (g.ask && p === g.human) ? g.ask(spec) : auto();
  for (let p = 0; p < 2; p++) if (blk[1 - p]) { mark(p, P5); say(p, P5, rows[p].indexOf(P5), 'Chặn mọi hiệu ứng bài của đối thủ trong round này'); }
  for (let i = 0; i < 3; i++) {
    const r = out[i]; if (!r || r[0] < 0) continue;
    const w = r[0], c = rows[w][i]; let d = r[1];
    if (c === S5 && isOn(w, c)) { d *= 2; mark(w, c); say(w, c, i, 'Nhân đôi sát thương: ' + d); }
    if (c === S3 && isOn(w, c)) { let s = 0; for (const x of g.disc[w]) if (g.eff[w] & bit(x)) s += N(x); d += s; mark(w, c); say(w, c, i, 'Cộng ' + s + ' sát thương từ các lá đã bị discard do hiệu ứng'); }
    slotDmg[i] = d; dmgTo[1 - w] += d; wins[w]++;
  }
  if (wins[0] === 3) dmgTo[1] += 5; if (wins[1] === 3) dmgTo[0] += 5;
  // effects: slot 1 -> 3, winner first then loser
  for (let i = 0; i < 3; i++) {
    const r = out[i]; if (!r || r[0] < 0) continue;
    const w = r[0];
    for (const p of [w, 1 - w]) {
      const c = rows[p][i]; if (c < 0 || !isOn(p, c)) continue;
      const won = p === w, o = 1 - p;
      let fired = false;
      switch (c) {
        case H0: if (won) { heal[p] += slotDmg[i]; fired = true; say(p, c, i, 'Hồi ' + slotDmg[i] + ' HP'); } break;
        case H1: if (won) {
          if (g.hand[p].includes(H9)) { if (effDraw(g, p, 1)) { g.drawTrig[p]++; fired = true; say(p, c, i, 'Búa 9 đã trên tay: rút 1 lá ngẫu nhiên'); } }
          else if (effTake(g, p, H9)) { g.drawTrig[p]++; fired = true; say(p, c, i, 'Rút Búa 9 từ deck'); }
        } break;
        case H3: if (!won) { reduce[p] = 9; fired = true; say(p, c, i, 'Giảm 9 sát thương phải nhận trong round này'); } break;
        case P0: if (!won) { p0lost[p] = true; fired = true; say(p, c, i, 'Nếu thua round, lá bị discard sẽ là Bao 0'); } break;
        case P1: if (won && g.disc[p].length && g.hand[p].length) {
          const auto = () => { const best = bestOf(g, p, g.disc[p]); let worst = g.hand[p][0]; for (const x of g.hand[p]) if (keepValue(g, p, x) < keepValue(g, p, worst)) worst = x; return keepValue(g, p, best) > keepValue(g, p, worst) + 2 ? [best, worst] : null; };
          const pickD = ask(p, { kind: 'cards', key: 'P1a', title: 'Bao 1: chọn 1 lá trong discard pile để lấy về (hoặc bỏ qua)', list: g.disc[p].slice(), k: 1, optional: true }, () => { const a = auto(); return a ? [a[0]] : []; });
          if (pickD && pickD.length) {
            const pickH = ask(p, { kind: 'cards', key: 'P1b', title: 'Bao 1: chọn 1 lá trên tay để đổi vào discard pile', list: g.hand[p].slice(), k: 1 }, () => { const a = auto(); return [a ? a[1] : g.hand[p][0]]; });
            const best = pickD[0], worst = pickH[0];
            if (take(g.disc[p], best)) { g.eff[p] &= ~bit(best); take(g.hand[p], worst); g.hand[p].push(best); if (discardCard(g, p, worst, true, on)) g.cnt[p]++; else g.hand[p].push(worst); fired = true; say(p, c, i, 'Đổi ' + VI(worst) + ' lấy ' + VI(best) + ' từ discard pile'); }
          }
        } break;
        case P2: if (won && g.disc[p].length) { const x = g.disc[p][ri(g.disc[p].length)]; take(g.disc[p], x); g.eff[p] &= ~bit(x); g.hand[p].push(x); fired = true; say(p, c, i, 'Lấy ' + VI(x) + ' từ discard pile'); } break;
        case P3: if (won && effDraw(g, p, 1)) { g.drawTrig[p]++; fired = true; say(p, c, i, 'Rút 1 lá từ deck'); } break;
        case S0: if (won) { const l = g.deck[p].filter(x => S(x) === 1); if (l.length) { const x = l[ri(l.length)]; if (effTake(g, p, x)) { g.drawTrig[p]++; fired = true; say(p, c, i, 'Rút 1 lá Bao từ deck'); } } } break;
        case H4: if (won) { healTotal[p] = true; fired = true; say(p, c, i, 'Hồi HP bằng tổng sát thương gây ra trong round'); } break;
        case H5: if (won) {
          const l = g.deck[p].filter(x => S(x) === 0);
          if (l.length) { const pk = ask(p, { kind: 'cards', key: 'H5', title: 'Búa 5: tìm 1 lá Búa trong deck', list: l, k: 1 }, () => [bestOf(g, p, l)]); effTake(g, p, pk[0]); g.drawTrig[p]++; fired = true; say(p, c, i, 'Tìm 1 lá Búa trong deck'); }
          else if (effDraw(g, p, 1)) { g.drawTrig[p]++; fired = true; say(p, c, i, 'Deck hết Búa: rút 1 lá ngẫu nhiên'); }
        } break;
        case H6: if (won) { g.nextBan[o] |= 2; fired = true; say(p, c, i, 'Đối thủ không được dùng Bao ở round tiếp theo'); } break;
        case P4: if (won && g.drawTrig[p] > 0) { const k = effDraw(g, p, g.drawTrig[p]); if (k) { fired = true; say(p, c, i, 'Rút ' + k + ' lá'); } } break;   // Bao 4 itself is not counted for later Bao 4s
        case P6: if (won) { const l = g.deck[p].filter(x => N(x) === 7); if (l.length) { const pk = ask(p, { kind: 'cards', key: 'P6', title: 'Bao 6: tìm 1 lá số 7 trong deck', list: l, k: 1 }, () => [bestOf(g, p, l)]); effTake(g, p, pk[0]); g.drawTrig[p]++; fired = true; say(p, c, i, 'Tìm 1 lá số 7 trong deck'); } } break;
        case S4: if (won) { const k = millDeck(g, o, 2, on, null); if (k) { g.cnt[p] += k; fired = true; say(p, c, i, 'Discard ' + k + ' lá từ deck đối thủ'); } }
                 else { const k = millDeck(g, p, 1, on, null); if (k) { g.cnt[p] += k; fired = true; say(p, c, i, 'Thua slot: discard 1 lá từ deck của mình'); } } break;
        case S6: if (!won && g.hand[o].length) { const x = g.hand[o][ri(g.hand[o].length)]; take(g.hand[o], x); if (!discardCard(g, o, x, true, on)) g.hand[o].push(x); g.cnt[p]++; fired = true; say(p, c, i, 'Đối thủ discard ngẫu nhiên 1 lá trên tay'); } break;
        case H7: if (!won) { let k = 0; for (let j = 0; j < 2; j++) { const l = g.deck[p].filter(x => S(x) === 0); if (!l.length) break; k += effTake(g, p, l[ri(l.length)]); } if (k) { g.drawTrig[p]++; fired = true; say(p, c, i, 'Thua slot: rút ' + k + ' lá Búa từ deck'); } }
                 else { let k = 0; for (let j = 0; j < 2; j++) { const l = g.disc[p].filter(x => S(x) === 0); if (!l.length) break; const x = l[ri(l.length)]; take(g.disc[p], x); g.eff[p] &= ~bit(x); g.hand[p].push(x); k++; } if (k) { fired = true; say(p, c, i, 'Lấy ' + k + ' lá Búa từ discard pile'); } } break;
        case H8: if (won) {   // AI: ban the suit it holds least of
          const auto = () => { const cs = [0, 0, 0]; for (const x of g.hand[p]) cs[S(x)]++; for (let j = 0; j < 3; j++) if (rows[p][j] >= 0) cs[S(rows[p][j])]++; let s = 0; for (let j = 1; j < 3; j++) if (cs[j] < cs[s]) s = j; return s; };
          const s = ask(p, { kind: 'suit', key: 'H8', title: 'Búa 8: chọn 1 chất bị cấm với cả hai ở round tiếp theo' }, auto);
          g.nextBan[0] |= 1 << s; g.nextBan[1] |= 1 << s; fired = true; say(p, c, i, 'Cấm chất ' + SUIT_VI[s] + ' với cả hai ở round tiếp theo'); } break;
        case H9: if (won) { if (!g.dbl[p] && !g.dblNext[p]) { g.dblNext[p] = true; say(p, c, i, 'Từ round sau: nhân đôi sát thương gây ra và HP hồi'); } fired = true; } break;
        case P7: if (won) { const d = g.drawnN[p] > 0 ? g.drawnN[p] * 2 : 20; dmgTo[o] += d; fired = true; say(p, c, i, 'Gây thêm ' + d + ' sát thương'); } break;
        case P8: if (won) { let k = 0; for (const n of [9, 7]) { const l = g.deck[p].filter(x => N(x) === n); if (l.length) { const pk = ask(p, { kind: 'cards', key: 'P8' + n, title: 'Bao 8: tìm 1 lá số ' + n + ' trong deck', list: l, k: 1 }, () => [bestOf(g, p, l)]); k += effTake(g, p, pk[0]); } } if (k) { g.drawTrig[p]++; fired = true; say(p, c, i, 'Tìm ' + k + ' lá trong deck'); } } break;
        case P9: if (won) { let k = 0, dk = 0, j = 0; for (const n of [8, 8, 6]) { j++; const ld = g.deck[p].filter(x => N(x) === n), lp = g.disc[p].filter(x => N(x) === n), l = ld.concat(lp); if (!l.length) continue;
            const pk = ask(p, { kind: 'cards', key: 'P9' + j, title: 'Bao 9: tìm 1 lá số ' + n + ' (deck hoặc discard pile)', list: l, k: 1 }, () => [ld.length ? bestOf(g, p, ld) : bestOf(g, p, lp)]); const x = pk[0];
            if (g.deck[p].includes(x)) { dk += effTake(g, p, x); k++; } else if (take(g.disc[p], x)) { g.eff[p] &= ~bit(x); g.hand[p].push(x); k++; } }
          if (dk) g.drawTrig[p]++; if (k) { fired = true; say(p, c, i, 'Tìm được ' + k + ' lá'); } } break;
        case S7: { const k = won ? 2 : 1, kk = Math.min(k, g.deck[o].length);
          const auto = () => { const l = g.deck[o].slice().sort((a, b) => keepValue(g, o, b) - keepValue(g, o, a)); return l.slice(0, kk); };
          const pk = kk ? ask(p, { kind: 'cards', key: 'S7', title: 'Kéo 7: chọn ' + kk + ' lá trong deck đối thủ để discard', list: g.deck[o].slice().sort((a, b) => a - b), k: kk, owner: o }, auto) : [];
          const n = millDeck(g, o, kk, on, pk); g.cnt[p] += k; shuffle(g.deck[o]); fired = true; say(p, c, i, 'Discard ' + n + ' lá đã chọn từ deck đối thủ'); } break;
        case S8: if (won) { const n = millDeck(g, o, 2, on, null); g.cnt[p] += n; const d = g.cnt[p] * 2; dmgTo[o] += d; fired = true; say(p, c, i, 'Discard ' + n + ' lá từ deck đối thủ, gây thêm ' + d + ' sát thương'); } break;
        case S9: if (won) { const n = millDeck(g, o, 3, on, null); g.cnt[p] += 3; const d = (3 - n) * 10; dmgTo[o] += d; fired = true; say(p, c, i, 'Discard ' + n + ' lá từ deck đối thủ' + (d ? ', thiếu bài gây thêm ' + d + ' sát thương' : '')); } break;
      }
      if (fired) mark(p, c);
    }
  }
  const pre = [dmgTo[0], dmgTo[1]];
  for (let p = 0; p < 2; p++) {
    const o = 1 - p, m = g.dbl[p] ? 2 : 1;
    heal[p] = (heal[p] + (healTotal[p] ? pre[o] : 0)) * m;
    dmgTo[o] = Math.max(0, pre[o] * m - reduce[o]);
  }
  const before = [g.hp[0], g.hp[1]];
  for (let p = 0; p < 2; p++) g.hp[p] = Math.min(100, g.hp[p] - dmgTo[p] + heal[p]);
  // round winner
  const shortened = g.blocked[0] >= 0 || g.blocked[1] >= 0 || rows[0].includes(-1) || rows[1].includes(-1);
  let winner = -1;
  if (shortened) winner = wins[0] === wins[1] ? -1 : wins[0] > wins[1] ? 0 : 1;
  else if (wins[0] >= 2) winner = 0; else if (wins[1] >= 2) winner = 1;
  else if (wins[0] === 1 && wins[1] === 1) { let d0 = 0, d1 = 0; for (let i = 0; i < 3; i++) if (out[i]) { if (out[i][0] === 0) d0 += slotDmg[i]; else if (out[i][0] === 1) d1 += slotDmg[i]; } winner = d0 === d1 ? -1 : d0 > d1 ? 0 : 1; }
  const triple = (p, n) => rows[p][0] >= 0 && rows[p][1] >= 0 && rows[p][2] >= 0 && N(rows[p][0]) === n && N(rows[p][1]) === n && N(rows[p][2]) === n;
  const combo = { pack: -1, zero: -1, charge: [false, false], messup: [false, false] };
  if (winner >= 0 && triple(winner, 7)) { g.over = true; g.winner = winner; g.reason = 'pack'; combo.pack = winner; }
  if (!g.over && (g.hp[0] <= 0 || g.hp[1] <= 0)) { g.over = true; g.winner = g.hp[0] <= 0 && g.hp[1] <= 0 ? -1 : g.hp[0] <= 0 ? 1 : 0; g.reason = 'hp'; }
  if (!g.over) {
    if (winner >= 0 && triple(winner, 0)) { g.nextBlocked[1 - winner] = ri(3); combo.zero = winner; }
    for (let p = 0; p < 2; p++) {
      const r = rows[p]; if (r[0] < 0 || r[1] < 0 || r[2] < 0) continue;
      if (N(r[1]) === N(r[0]) + 1 && N(r[2]) === N(r[1]) + 1) { g.nextDraw[p] = 2; combo.charge[p] = true; }
      if (N(r[1]) === N(r[0]) - 1 && N(r[2]) === N(r[1]) - 1 && S(r[0]) === S(r[1]) && S(r[1]) === S(r[2])) { g.messUp[1 - p] = true; combo.messup[p] = true; }
    }
  }
  const bothPick = winner === -1 && !shortened && out.every(o => o && o[0] < 0);
  return { winner, wins, on, p0lost, bothPick, dmg: dmgTo, heal, out, slotDmg, combo, before, sweep: wins[0] === 3 ? 0 : wins[1] === 3 ? 1 : -1 };
}

/* Discard step + end-of-round bookkeeping + next round draws. chooseDiscard(g,p,played,on) -> card (only asked for a side that may pick). */
function finishRound(g, rows, ctx, chooseDiscard) {
  const on = ctx.on, L = g.log;
  const note = (p, c, t) => { if (L) L.push({ p, c, slot: -1, t, sys: true }); };
  for (let p = 0; p < 2; p++) {
    const played = rows[p].filter(c => c >= 0);
    if (!played.length) {   // played nothing: a random hand card is discarded
      if (g.hand[p].length) { const x = g.hand[p][ri(g.hand[p].length)]; take(g.hand[p], x); if (!discardCard(g, p, x, false, on)) g.hand[p].push(x); else note(p, x, 'Không đánh lá nào: bị discard ngẫu nhiên'); }
      continue;
    }
    let pick;
    if (ctx.winner === p || ctx.bothPick) pick = chooseDiscard(g, p, played, on);
    else { pick = played[ri(played.length)]; if (ctx.p0lost[p] && played.includes(P0)) pick = P0; }
    for (const c of played) { if (c === pick) { if (!discardCard(g, p, c, false, on)) g.hand[p].push(c); else note(p, c, 'Bị discard sau round'); } else g.hand[p].push(c); }
  }
  for (let p = 0; p < 2; p++) if (g.messUp[p]) { g.messUp[p] = false; if (g.hand[p].length) { const x = g.hand[p][ri(g.hand[p].length)]; take(g.hand[p], x); g.deck[p].push(x); shuffle(g.deck[p]); note(p, x, 'MESS UP: 1 lá bị xào lại vào deck'); } }
  for (let p = 0; p < 2; p++) { if (g.dblNext[p]) { g.dbl[p] = true; g.dblNext[p] = false; } }
  g.ban = [g.nextBan[0], g.nextBan[1]]; g.nextBan = [0, 0];
  g.blocked = [g.nextBlocked[0], g.nextBlocked[1]]; g.nextBlocked = [-1, -1];
  g.round++;
  const allOn = [true, true]; const drawn = [[], []];
  for (let p = 0; p < 2; p++) {
    let n = g.nextDraw[p]; g.nextDraw[p] = 1;
    while (n-- > 0 && g.deck[p].length) { const c = g.deck[p].pop(); g.hand[p].push(c); drawn[p].push(c); }
    let guard = 0;
    while (g.hand[p].length > 10 && guard++ < 30) {   // hand limit: random discard; an active Kéo 1 is skipped (counter +1) and another card goes
      let x = g.hand[p][ri(g.hand[p].length)];
      if (x === S1 && (g.active[p] & bit(S1))) { g.cnt[p]++; const others = g.hand[p].filter(c => c !== S1); x = others[ri(others.length)]; }
      take(g.hand[p], x); discardCard(g, p, x, false, allOn); note(p, x, 'Quá 10 lá trên tay: bị discard ngẫu nhiên');
    }
  }
  const byHp = () => { g.over = true; g.winner = g.hp[0] === g.hp[1] ? -1 : g.hp[0] > g.hp[1] ? 0 : 1; g.reason = 'cards'; };
  if (g.deck[0].length === 0 && g.hand[0].length === 0 && g.deck[1].length === 0 && g.hand[1].length === 0) byHp();
  else if (g.deck[0].length === 0 && g.deck[1].length === 0 && (g.hand[0].length === 0 || g.hand[1].length === 0)) byHp();
  return { drawn };
}

/* ---------- players ---------- */
const allowed = (g, p, c) => !(g.ban[p] & (1 << S(c)));
function legalRows(g, p, handOverride, cap) {
  const hand = (handOverride || g.hand[p]).filter(c => allowed(g, p, c));
  const open = [0, 1, 2].filter(i => g.blocked[p] !== i);
  const need = Math.min(open.length, hand.length);
  const rows = [];
  if (need === 0) return [[-1, -1, -1]];
  const slotSets = []; (function pick(st, acc) { if (acc.length === need) { slotSets.push(acc); return; } for (let i = st; i < open.length; i++) pick(i + 1, acc.concat(open[i])); })(0, []);
  let cards = hand;
  if (cap && hand.length > cap) { cards = hand.slice().sort((a, b) => keepValue(g, p, b) - keepValue(g, p, a)); const top = cards.slice(0, cap - 2), rest = cards.slice(cap - 2); rest.sort((a, b) => N(a) - N(b)); cards = top.concat(rest.slice(0, 2)); }
  const n = cards.length, used = new Array(n).fill(false), cur = [];
  (function perm() {
    if (cur.length === need) { for (const ss of slotSets) { const r = [-1, -1, -1]; for (let k = 0; k < need; k++) r[ss[k]] = cur[k]; rows.push(r); } return; }
    for (let i = 0; i < n; i++) if (!used[i]) { used[i] = true; cur.push(cards[i]); perm(); cur.pop(); used[i] = false; }
  })();
  return rows;
}
function randomRow(g, p) {
  const hand = g.hand[p].filter(c => allowed(g, p, c)); const open = [0, 1, 2].filter(i => g.blocked[p] !== i);
  const need = Math.min(open.length, hand.length), r = [-1, -1, -1]; if (!need) return r;
  const h = shuffle(hand.slice()), sl = shuffle(open.slice());
  for (let k = 0; k < need; k++) r[sl[k]] = h[k];
  return r;
}
function score(g, p, ctx) {
  const o = 1 - p;
  if (g.over) return g.winner === p ? 10000 : g.winner === o ? -10000 : 0;
  let v = (g.hp[p] - g.hp[o]);
  v += 1.5 * ((g.hand[p].length + g.deck[p].length) - (g.hand[o].length + g.deck[o].length));
  v += 0.8 * (g.hand[p].length - g.hand[o].length);
  v += 14 * ((g.dbl[p] || g.dblNext[p] ? 1 : 0) - (g.dbl[o] || g.dblNext[o] ? 1 : 0));
  if (ctx.winner === p) v += 3; else if (ctx.winner === o) v -= 3;
  if (g.nextBlocked[o] >= 0) v += 5; if (g.nextBlocked[p] >= 0) v -= 5;
  v += 1.5 * (g.nextDraw[p] - g.nextDraw[o]);
  if (g.messUp[o]) v += 2; if (g.messUp[p]) v -= 2;
  for (let s = 0; s < 3; s++) { if (g.nextBan[o] & (1 << s)) v += 1.5; if (g.nextBan[p] & (1 << s)) v -= 1.5; }
  if ((g.active[p] & bit(S8)) && !g.disc[p].includes(S8)) v += 0.5 * g.cnt[p];
  if ((g.active[o] & bit(S8)) && !g.disc[o].includes(S8)) v -= 0.5 * g.cnt[o];
  return v;
}
function withoutRow(hand, row) { const h = hand.slice(); for (const c of row) if (c >= 0) take(h, c); return h; }
/* Expert: counts cards perfectly (knows the opponent's hand) but not where they will be placed; samples K placements and keeps the best average. */
function planExpert(g, p, K, cap) {
  const o = 1 - p, mine = legalRows(g, p, null, cap);
  if (mine.length === 1) return mine[0];
  const opp = []; for (let k = 0; k < K; k++) opp.push(randomRow(g, o));
  let best = null, bv = -1e18;
  const hp = g.hand[p], ho = g.hand[o];
  for (const r of mine) {
    let tot = 0;
    for (const q of opp) {
      const c = clone(g);
      c.hand[p] = withoutRow(hp, r); c.hand[o] = withoutRow(ho, q);
      const ctx = resolve(c, p === 0 ? [r, q] : [q, r]);
      tot += score(c, p, ctx);
    }
    if (tot > bv) { bv = tot; best = r; }
  }
  return best;
}
function chooseDiscardSmart(g, p, played, on) {
  if (played.includes(S1) && on[p] && (g.active[p] & bit(S1))) return S1;
  let w = played[0]; for (const c of played) if (keepValue(g, p, c) < keepValue(g, p, w)) w = c; return w;
}
function playGame(activeA, activeB, opt) {
  const g = newGame(activeA, activeB); g.trig = [{}, {}];
  const K = opt.K || 10, cap = opt.cap || 7;
  let rounds = 0;
  while (!g.over && rounds < 80) {
    const rA = planExpert(g, 0, K, cap), rB = planExpert(g, 1, K, cap);
    g.hand[0] = withoutRow(g.hand[0], rA); g.hand[1] = withoutRow(g.hand[1], rB);
    const ctx = resolve(g, [rA, rB]); rounds++;
    if (g.over) break;
    finishRound(g, [rA, rB], ctx, chooseDiscardSmart);
  }
  if (!g.over) { g.over = true; g.winner = g.hp[0] === g.hp[1] ? -1 : g.hp[0] > g.hp[1] ? 0 : 1; g.reason = 'cap'; }
  return { winner: g.winner, reason: g.reason, rounds, hp: g.hp, trig: g.trig, dbl: g.dbl, cnt: g.cnt };
}
function mask(list) { let m = 0; for (const s of list) m |= bit(typeof s === 'string' ? parse(s) : s); return m; }
function unmask(m) { const l = []; for (let c = 0; c < 30; c++) if (m & bit(c)) l.push(c); return l; }
/* Deck-building limits: 9 / 6 / 3 active cards per tier, 4 Tier 3 when Búa 2 is active. */
function limits(list) { const cs = list.map(s => typeof s === 'string' ? parse(s) : s); return [9, 6, cs.includes(H2) ? 4 : 3]; }
function validDeck(list) {
  const cs = list.map(s => typeof s === 'string' ? parse(s) : s), t = [0, 0, 0], lim = limits(cs); for (const c of cs) t[tier(c)]++;
  return new Set(cs).size === cs.length && t[0] <= lim[0] && t[1] <= lim[1] && t[2] <= lim[2];
}
const PRESETS = {
  'Búa 9 (mạnh nhất khi mô phỏng)': ['H1','H2','H0','H3','P3','S0','S1','P0','P2','H5','H6','P6','P5','S6','H4','H9','P8','H7','S8'],
  'Combo 7 7 7': ['H2','H1','P3','S0','P2','P1','H0','H3','S1','P6','P5','H5','P4','S5','H4','P8','H9','S9','P7'],
  'Rút bài': ['P3','S0','H1','H2','P1','P2','H3','S1','H0','P4','P6','H5','P5','S5','H4','P7','P8','P9','H7'],
  'Discard / bộ đếm': ['S1','S2','S3','H2','H3','P0','H0','P3','S0','S4','S6','S5','P5','H4','H6','S7','S8','S9','H9'],
  'Kiểm soát / hồi máu': ['H0','H3','P0','S1','P1','P2','P3','H2','S3','H4','H6','P5','S6','S5','H5','H8','H9','S9','P7'],
};
const api = { newGame, clone, resolve, finishRound, outcomes, blockedSides, legalRows, randomRow, planExpert, chooseDiscardSmart, playGame, mask, unmask, limits, validDeck, parse, NAME, VI, SUIT_VI, FX, PRESETS, tier, bit, S, N, allowed, withoutRow, keepValue,
  setSeed: s => { seed = s | 0; }, getSeed: () => seed, rnd, ri };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Std184 = api;

if (typeof module !== 'undefined' && typeof require !== 'undefined' && require.main === module) {
  const [, , a, b, n, sd, K] = process.argv;
  const A = JSON.parse(a), B = JSON.parse(b); seed = +sd || 1;
  const res = { n: +n, w: [0, 0], d: 0, rounds: 0, reason: {}, trig: [{}, {}], roundsList: [] };
  for (let i = 0; i < +n; i++) {
    const sw = i % 2 === 1;   // swap seats to cancel any seat bias
    const r = playGame(mask(sw ? B : A), mask(sw ? A : B), { K: +K || 10 });
    const w = r.winner < 0 ? -1 : sw ? 1 - r.winner : r.winner;
    if (w < 0) res.d++; else res.w[w]++;
    res.rounds += r.rounds; res.roundsList.push(r.rounds); res.reason[r.reason] = (res.reason[r.reason] || 0) + 1;
    for (let p = 0; p < 2; p++) { const t = r.trig[sw ? 1 - p : p]; for (const c in t) res.trig[p][NAME(+c)] = (res.trig[p][NAME(+c)] || 0) + t[c]; }
    res['win_' + r.reason] = res['win_' + r.reason] || [0, 0]; if (w >= 0) res['win_' + r.reason][w]++;
  }
  console.log(JSON.stringify(res));
}
})(typeof self !== 'undefined' ? self : this);
