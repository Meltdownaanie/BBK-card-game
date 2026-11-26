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
const SUIT_VI = ['Hammer', 'Paper', 'Scissors'];
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
  [H0]: ["Win slot", "Heal HP equal to the damage this card deals."],
  [H1]: ["Win slot", "Draw Hammer 7 from your deck. If Hammer 7 is already in your hand (or not in the deck), draw nothing."],
  [H2]: ["Deck building", "Lets you enable 4 Tier 3 cards instead of 3."],
  [H3]: ["Lose slot", "Take 9 less damage this round."],
  [P0]: ["Lose round", "If you lose the round (and Paper 0 was played), the card you discard is Paper 0."],
  [P1]: ["Win slot", "You may swap 1 card in your hand for 1 card from your discard pile. You choose both cards (or skip)."],
  [P2]: ["Win slot", "Take 1 random card from your discard pile."],
  [P3]: ["Win slot", "Draw 1 random card from your deck."],
  [S0]: ["Win slot", "Draw 1 random Paper card from your deck."],
  [S1]: ["When chosen for discard", "From your hand or a slot: is not discarded and returns to your hand, your discard counter +1. In the deck it is discarded normally."],
  [S2]: ["When chosen for discard", "From your hand or a slot: your discard counter +2. In the deck it is discarded normally."],
  [S3]: ["Win slot", "Damage = this slot's damage + your discard counter (cards discarded by your own card effects, on either side)."],
  [H4]: ["Win slot", "Heal HP equal to all the damage you deal this round."],
  [H5]: ["Win slot", "Search your deck for 1 Hammer card. No Hammer left: draw 1 random card."],
  [H6]: ["Win slot", "The opponent cannot play Paper next round."],
  [P4]: ["Win slot", "Draw 2 random Paper cards from your deck. No Paper left: draw 2 random cards."],
  [P5]: ["Win slot", "Once this triggers, none of the opponent's card effects trigger from this slot onward (order: slot 1 → 2 → 3, winner before loser)."],
  [P6]: ["Win slot", "Search your deck for 1 card numbered 7."],
  [S4]: ["Win / Lose slot", "Win: discard 1 random card from the opponent's deck. Lose: discard 2 cards from your own deck. If the deck is empty, discard from the hand instead."],
  [S5]: ["Win / Lose slot", "Win: all damage you deal this round × 2. Lose: all damage the opponent deals this round × 2."],
  [S6]: ["Win slot", "The opponent discards 1 random card from their hand."],
  [H7]: ["Win / Lose slot", "Win: take 2 Hammer cards from your discard pile. Lose: draw 1 Hammer card from your deck."],
  [H8]: ["Win slot", "Choose a suit: the opponent cannot play it next round."],
  [H9]: ["Win slot · first play only", "Only works the first time this card is played. If it wins its slot that time: from the next round until the end of the game, your total damage each round is +10 and your healing is +10. If it does not win, the effect is lost."],
  [P7]: ["Win slot", "Damage = this slot's damage + cards you have drawn by your own card effects (draws, searches in deck and discard pile). None yet: + 20."],
  [P8]: ["Win slot", "Search for 1 card numbered 9 and 1 card numbered 7, in both your deck and your discard pile."],
  [P9]: ["Win slot", "Search for 2 cards numbered 7 and 1 card numbered 6, in both your deck and your discard pile."],
  [S7]: ["Win / Lose slot", "Win: look at the opponent's deck and choose 1 card to discard. Lose: choose 1 card in your own deck and discard it."],
  [S8]: ["Win slot", "The opponent discards 2 random cards from their deck. Damage = this slot's damage + your discard counter (cards discarded by your own card effects, on either side)."],
  [S9]: ["Win slot", "The opponent discards 3 cards from their deck. If the deck is empty, they discard from their hand. Your discard counter +3."],
};

const MAXHP = 150;   // Standard starts at 150 HP (Classic: 100); healing caps here too
function newGame(activeA, activeB) {
  const g = { hp: [MAXHP, MAXHP], deck: [[], []], hand: [[], []], disc: [[], []], eff: [0, 0], active: [activeA, activeB], cnt: [0, 0], dn: [0, 0], drawTrig: [0, 0], drawnN: [0, 0],
    dbl: [false, false], dblNext: [false, false], ban: [0, 0], nextBan: [0, 0], blocked: [-1, -1], nextBlocked: [-1, -1], nextDraw: [1, 1], messUp: [false, false],
    h9: [false, false], round: 1, over: false, winner: -1, reason: '', trig: null, log: null, ask: null, human: -1 };
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
    eff: [g.eff[0], g.eff[1]], active: g.active, cnt: [g.cnt[0], g.cnt[1]], dn: [g.dn[0], g.dn[1]], drawTrig: [g.drawTrig[0], g.drawTrig[1]], drawnN: [g.drawnN[0], g.drawnN[1]],
    dbl: [g.dbl[0], g.dbl[1]], dblNext: [g.dblNext[0], g.dblNext[1]], ban: [g.ban[0], g.ban[1]], nextBan: [g.nextBan[0], g.nextBan[1]], blocked: [g.blocked[0], g.blocked[1]], nextBlocked: [g.nextBlocked[0], g.nextBlocked[1]],
    nextDraw: [g.nextDraw[0], g.nextDraw[1]], messUp: [g.messUp[0], g.messUp[1]], h9: [g.h9[0], g.h9[1]], round: g.round, over: false, winner: -1, reason: '', trig: null, log: null, ask: null, human: -1 };
}
const take = (arr, c) => { const i = arr.indexOf(c); if (i < 0) return false; arr.splice(i, 1); return true; };
/* A card is "chosen to be discarded". dn = times the owner was discarded (any cause, shown only).
   cnt = the discard counter (Kéo 3, Kéo 8): only cards discarded by the player's OWN card effects (on either side), plus Kéo 1 (+1) / Kéo 2 (+2).
   Kéo 1 / Kéo 2 work only from the hand or a slot; a copy discarded from the deck (fromDeck) is just discarded. Returns true if the card really went to the pile. */
function discardCard(g, owner, c, byEffect, on, fromDeck) {
  if (!fromDeck && c === S1 && on[owner] && (g.active[owner] & bit(S1))) { g.dn[owner]++; g.cnt[owner]++; if (g.log) g.log.push({ p: owner, c: S1, slot: -1, t: 'Not discarded: returns to hand (discard counter +1)' }); return false; }
  if (!fromDeck && c === S2 && on[owner] && (g.active[owner] & bit(S2))) { g.dn[owner]++; g.cnt[owner] += 2; if (g.log) g.log.push({ p: owner, c: S2, slot: -1, t: 'Discarded: discard counter +2' }); }
  else g.dn[owner]++;
  g.disc[owner].push(c); if (byEffect) g.eff[owner] |= bit(c); else g.eff[owner] &= ~bit(c);
  return true;
}
function effDraw(g, p, n) { let k = 0; while (n-- > 0 && g.deck[p].length) { g.hand[p].push(g.deck[p].pop()); k++; } g.drawnN[p] += k; return k; }
function effTake(g, p, c) { if (!take(g.deck[p], c)) return 0; g.hand[p].push(c); g.drawnN[p]++; return 1; }
/* Search: take card c into the hand from the deck or, failing that, from the discard pile. Counts as drawn (Bao 7). */
function effFind(g, p, c) { if (effTake(g, p, c)) return 1; if (!take(g.disc[p], c)) return 0; g.eff[p] &= ~bit(c); g.hand[p].push(c); g.drawnN[p]++; return 1; }
function bestOf(g, p, list) { let b = -1, bv = -1; for (const c of list) { const v = keepValue(g, p, c); if (v > bv) { bv = v; b = c; } } return b; }
/* Discard up to k cards from owner's deck by an effect. picks = cards chosen by a player (Kéo 7) or null for random. Returns how many really left. */
function millDeck(g, owner, k, on, picks) {
  let n = 0;
  for (let j = 0; j < k && g.deck[owner].length; j++) {
    const c = picks ? picks[j] : g.deck[owner][ri(g.deck[owner].length)];
    if (c === undefined || !g.deck[owner].includes(c)) continue;
    take(g.deck[owner], c); discardCard(g, owner, c, true, on, true); n++;   // from the deck: Kéo 1 / Kéo 2 do nothing here
  }
  return n;
}
/* Discard k random cards of owner by an effect: from the deck first, and from the hand once the deck is empty. Returns how many really left. */
function millOrHand(g, owner, k, on) {
  let n = millDeck(g, owner, Math.min(k, g.deck[owner].length), on, null);
  for (let j = k - n, guard = 0; j > 0 && g.deck[owner].length === 0 && g.hand[owner].length && guard < 12; guard++) {
    const x = g.hand[owner][ri(g.hand[owner].length)]; take(g.hand[owner], x);
    if (discardCard(g, owner, x, true, on)) n++; else g.hand[owner].push(x);
    j--;
  }
  return n;
}
/* Card movements caused by one effect (for the UI animations): draw = deck->hand, back = pile->hand, mill = deck->pile, drop = hand->pile. */
function cardMoves(snap, g) {
  const mv = [];
  for (let q = 0; q < 2; q++) {
    for (const c of g.hand[q]) if (!snap[q].includes(c)) mv.push({ k: snap[2 + q].includes(c) ? 'draw' : 'back', p: q, c });
    for (const c of g.disc[q]) if (!snap[4 + q].includes(c)) mv.push({ k: snap[2 + q].includes(c) ? 'mill' : 'drop', p: q, c });
  }
  return mv;
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
  const out = outcomes(rows), wins = [0, 0], dmgTo = [0, 0], slotDmg = [0, 0, 0], heal = [0, 0], healTotal = [false, false], reduce = [0, 0], extra = [0, 0], mult = [1, 1], p0lost = [false, false];
  const on = [true, true];   // an opponent's Bao 5 turns a side off from the slot where it fires until the end of the discard step
  const isOn = (p, c) => on[p] && (g.active[p] & bit(c)) !== 0;
  const T = g.trig, L = g.log;
  const mark = (p, c) => { if (T) T[p][c] = (T[p][c] || 0) + 1; };
  const say = (p, c, i, t) => { if (L) L.push({ p, c, slot: i, t }); };
  const ask = (p, spec, auto) => (g.ask && p === g.human) ? g.ask(spec) : auto();
  // Búa 9 only works the first time it is played: that play uses the effect up whether it wins, loses, ties or is blocked.
  const h9first = [false, false];
  for (let p = 0; p < 2; p++) if (rows[p].includes(H9) && (g.active[p] & bit(H9)) && !g.h9[p]) { h9first[p] = true; g.h9[p] = true; }
  for (let i = 0; i < 3; i++) { const r = out[i]; if (!r || r[0] < 0) continue; slotDmg[i] = r[1]; wins[r[0]]++; }
  g.slotDmg = slotDmg; g.curSlot = -1;
  // effects: slot 1 -> 3, winner first then loser
  for (let i = 0; i < 3; i++) {
    const r = out[i]; g.curSlot = i;
    for (let p = 0; p < 2; p++) if (rows[p][i] === H9 && h9first[p] && !(on[p] && r && r[0] === p)) say(p, H9, i, 'First play did not win its slot: effect lost, now a plain card');
    if (!r || r[0] < 0) continue;
    const w = r[0];
    for (const p of [w, 1 - w]) {
      const c = rows[p][i]; if (c < 0 || !isOn(p, c)) continue;
      const won = p === w, o = 1 - p;
      let fired = false;
      const snap = L ? [g.hand[0].slice(), g.hand[1].slice(), g.deck[0].slice(), g.deck[1].slice(), g.disc[0].slice(), g.disc[1].slice()] : null, L0 = L ? L.length : 0;
      switch (c) {
        case H0: if (won) { heal[p] += slotDmg[i]; fired = true; say(p, c, i, 'Heal ' + slotDmg[i] + ' HP'); } break;
        case H1: if (won && effTake(g, p, H7)) { g.drawTrig[p]++; fired = true; say(p, c, i, 'Draw Hammer 7 from the deck'); } break;
        case H3: if (!won) { reduce[p] = 9; fired = true; say(p, c, i, 'Take 9 less damage this round'); } break;
        case P1: if (won && g.disc[p].length && g.hand[p].length) {
          const auto = () => { const best = bestOf(g, p, g.disc[p]); let worst = g.hand[p][0]; for (const x of g.hand[p]) if (keepValue(g, p, x) < keepValue(g, p, worst)) worst = x; return keepValue(g, p, best) > keepValue(g, p, worst) + 2 ? [best, worst] : null; };
          const pickD = ask(p, { kind: 'cards', key: 'P1a', title: 'Paper 1: choose 1 card in your discard pile to take back (or skip)', list: g.disc[p].slice(), k: 1, optional: true }, () => { const a = auto(); return a ? [a[0]] : []; });
          if (pickD && pickD.length) {
            const pickH = ask(p, { kind: 'cards', key: 'P1b', title: 'Paper 1: choose 1 card in your hand to put in the discard pile', list: g.hand[p].slice(), k: 1 }, () => { const a = auto(); return [a ? a[1] : g.hand[p][0]]; });
            const best = pickD[0], worst = pickH[0];
            if (take(g.disc[p], best)) { g.eff[p] &= ~bit(best); take(g.hand[p], worst); g.hand[p].push(best); g.drawnN[p]++; if (!discardCard(g, p, worst, true, on)) g.hand[p].push(worst); fired = true; say(p, c, i, 'Swap ' + VI(worst) + ' for ' + VI(best) + ' from the discard pile'); }
          }
        } break;
        case P2: if (won && g.disc[p].length) { const x = g.disc[p][ri(g.disc[p].length)]; take(g.disc[p], x); g.eff[p] &= ~bit(x); g.hand[p].push(x); g.drawnN[p]++; fired = true; say(p, c, i, 'Take ' + VI(x) + ' from the discard pile'); } break;
        case P3: if (won && effDraw(g, p, 1)) { g.drawTrig[p]++; fired = true; say(p, c, i, 'Draw 1 card from the deck'); } break;
        case S0: if (won) { const l = g.deck[p].filter(x => S(x) === 1); if (l.length) { const x = l[ri(l.length)]; if (effTake(g, p, x)) { g.drawTrig[p]++; fired = true; say(p, c, i, 'Draw 1 Paper card from the deck'); } } } break;
        case H4: if (won) { healTotal[p] = true; fired = true; say(p, c, i, 'Heal HP equal to all damage dealt this round'); } break;
        case H5: if (won) {
          const l = g.deck[p].filter(x => S(x) === 0);
          if (l.length) { const pk = ask(p, { kind: 'cards', key: 'H5', title: 'Hammer 5: choose 1 Hammer card from your deck', list: l, k: 1 }, () => [bestOf(g, p, l)]); effTake(g, p, pk[0]); g.drawTrig[p]++; fired = true; say(p, c, i, 'Search 1 Hammer card from the deck'); }
          else if (effDraw(g, p, 1)) { g.drawTrig[p]++; fired = true; say(p, c, i, 'No Hammer left: draw 1 random card'); }
        } break;
        case H6: if (won) { g.nextBan[o] |= 2; fired = true; say(p, c, i, 'Opponent cannot play Paper next round'); } break;
        case P4: if (won) {
          let k = 0; const any = g.deck[p].some(x => S(x) === 1);
          if (any) { for (let j = 0; j < 2; j++) { const l = g.deck[p].filter(x => S(x) === 1); if (!l.length) break; k += effTake(g, p, l[ri(l.length)]); } if (k) { fired = true; say(p, c, i, 'Draw ' + k + ' Paper card' + (k > 1 ? 's' : '') + ' from the deck'); } }
          else { k = effDraw(g, p, 2); if (k) { fired = true; say(p, c, i, 'No Paper left: draw ' + k + ' random card' + (k > 1 ? 's' : '')); } }
        } break;
        case P5: if (won) { on[o] = false; fired = true; say(p, c, i, "From this slot on, the opponent's card effects do not trigger"); } break;
        case S5: if (won) { mult[o] *= 2; fired = true; say(p, c, i, 'All your damage this round × 2'); } else { mult[p] *= 2; fired = true; say(p, c, i, 'Lost slot: all opponent damage this round × 2'); } break;
        case S3: if (won) { const b = g.cnt[p]; slotDmg[i] += b; fired = true; say(p, c, i, '+' + b + ' damage (discard counter): ' + slotDmg[i]); } break;
        case P6: if (won) { const l = g.deck[p].filter(x => N(x) === 7); if (l.length) { const pk = ask(p, { kind: 'cards', key: 'P6', title: 'Paper 6: choose 1 card numbered 7 from your deck', list: l, k: 1 }, () => [bestOf(g, p, l)]); effTake(g, p, pk[0]); g.drawTrig[p]++; fired = true; say(p, c, i, 'Search 1 card numbered 7 from the deck'); } } break;
        case S4: if (won) { const fromHand = g.deck[o].length < 1, k = millOrHand(g, o, 1, on); if (k) { g.cnt[p] += k; fired = true; say(p, c, i, 'Discard ' + k + ' opponent card' + (k > 1 ? 's' : '') + (fromHand ? ' (deck empty: from hand)' : ' from the deck')); } }
                 else { const fromHand = g.deck[p].length < 2, k = millOrHand(g, p, 2, on); if (k) { g.cnt[p] += k; fired = true; say(p, c, i, 'Lost slot: discard ' + k + ' card' + (k > 1 ? 's' : '') + ' ' + (fromHand ? 'from own hand (deck empty)' : 'from own deck')); } } break;
        case S6: if (won && g.hand[o].length) { const x = g.hand[o][ri(g.hand[o].length)]; take(g.hand[o], x); if (!discardCard(g, o, x, true, on)) g.hand[o].push(x); g.cnt[p]++; fired = true; say(p, c, i, 'Opponent discards 1 random card from hand'); } break;
        case H7: if (!won) { let k = 0; for (let j = 0; j < 1; j++) { const l = g.deck[p].filter(x => S(x) === 0); if (!l.length) break; k += effTake(g, p, l[ri(l.length)]); } if (k) { g.drawTrig[p]++; fired = true; say(p, c, i, 'Lost slot: draw ' + k + ' Hammer card from the deck'); } }
                 else { let k = 0; for (let j = 0; j < 2; j++) { const l = g.disc[p].filter(x => S(x) === 0); if (!l.length) break; const x = l[ri(l.length)]; take(g.disc[p], x); g.eff[p] &= ~bit(x); g.hand[p].push(x); g.drawnN[p]++; k++; } if (k) { fired = true; say(p, c, i, 'Take ' + k + ' Hammer card' + (k > 1 ? 's' : '') + ' from the discard pile'); } } break;
        case H8: if (won) {   // AI: ban the suit the opponent holds most of
          const auto = () => { const cs = [0, 0, 0]; for (const x of g.hand[o]) cs[S(x)]++; let s = 0; for (let j = 1; j < 3; j++) if (cs[j] > cs[s]) s = j; return s; };
          const s = ask(p, { kind: 'suit', key: 'H8', title: 'Hammer 8: choose a suit the opponent cannot play next round' }, auto);
          g.nextBan[o] |= 1 << s; fired = true; say(p, c, i, SUIT_VI[s] + ' is banned for the opponent next round'); } break;
        case H9: if (won && h9first[p]) { g.dblNext[p] = true; say(p, c, i, 'From next round: +10 damage dealt and +10 HP healed each round'); fired = true; } break;
        case P7: if (won) { const d = g.drawnN[p] > 0 ? g.drawnN[p] : 20; slotDmg[i] += d; fired = true; say(p, c, i, '+' + d + ' damage (' + (g.drawnN[p] ? g.drawnN[p] + ' cards drawn by effects' : 'none drawn yet') + '): ' + slotDmg[i]); } break;
        case P8: if (won) { let k = 0; for (const n of [9, 7]) { const ld = g.deck[p].filter(x => N(x) === n), lp = g.disc[p].filter(x => N(x) === n), l = ld.concat(lp); if (!l.length) continue;
            const pk = ask(p, { kind: 'cards', key: 'P8' + n, title: 'Paper 8: choose 1 card numbered ' + n + ' (deck or discard pile)', list: l, k: 1 }, () => [ld.length ? bestOf(g, p, ld) : bestOf(g, p, lp)]); k += effFind(g, p, pk[0]); }
          if (k) { g.drawTrig[p]++; fired = true; say(p, c, i, 'Found ' + k + ' card' + (k > 1 ? 's' : '')); } } break;
        case P9: if (won) { let k = 0, j = 0; for (const n of [7, 7, 6]) { j++; const ld = g.deck[p].filter(x => N(x) === n), lp = g.disc[p].filter(x => N(x) === n), l = ld.concat(lp); if (!l.length) continue;
            const pk = ask(p, { kind: 'cards', key: 'P9' + j, title: 'Paper 9: choose 1 card numbered ' + n + ' (deck or discard pile)', list: l, k: 1 }, () => [ld.length ? bestOf(g, p, ld) : bestOf(g, p, lp)]); const x = pk[0];
            k += effFind(g, p, x); }
          if (k) g.drawTrig[p]++; if (k) { fired = true; say(p, c, i, 'Found ' + k + ' card' + (k > 1 ? 's' : '')); } } break;
        case S7: if (won) { const kk = Math.min(1, g.deck[o].length);
            const auto = () => g.deck[o].slice().sort((a, b) => keepValue(g, o, b) - keepValue(g, o, a)).slice(0, kk);
            const pk = kk ? ask(p, { kind: 'cards', key: 'S7', title: 'Scissors 7: choose ' + kk + ' card' + (kk > 1 ? 's' : '') + ' in the opponent\'s deck to discard', list: g.deck[o].slice().sort((a, b) => a - b), k: kk, owner: o }, auto) : [];
            const n = millDeck(g, o, kk, on, pk); g.cnt[p] += 1; shuffle(g.deck[o]); fired = true; say(p, c, i, 'Discard ' + n + ' chosen card' + (n > 1 ? 's' : '') + ' from the opponent\'s deck'); }
          else if (g.deck[p].length) {
            const auto = () => g.deck[p].slice().sort((a, b) => keepValue(g, p, a) - keepValue(g, p, b)).slice(0, 1);
            const pk = ask(p, { kind: 'cards', key: 'S7', title: 'Scissors 7 lost: choose 1 card in your own deck to discard', list: g.deck[p].slice().sort((a, b) => a - b), k: 1, owner: p }, auto);
            const n = millDeck(g, p, 1, on, pk); g.cnt[p] += n; shuffle(g.deck[p]); fired = true; say(p, c, i, n ? 'Lost slot: discard 1 chosen card from own deck' : 'Lost slot: the chosen card was not discarded'); } break;
        case S8: if (won) { const n = millDeck(g, o, 2, on, null); g.cnt[p] += n; const d = g.cnt[p]; slotDmg[i] += d; fired = true; say(p, c, i, 'Discard ' + n + ' card' + (n > 1 ? 's' : '') + ' from the opponent\'s deck, +' + d + ' damage (discard counter ' + g.cnt[p] + '): ' + slotDmg[i]); } break;
        case S9: if (won) { const fromHand = g.deck[o].length < 3, n = millOrHand(g, o, 3, on); g.cnt[p] += 3; fired = true; say(p, c, i, 'Discard ' + n + ' opponent card' + (n > 1 ? 's' : '') + (fromHand ? ' (deck empty: from hand)' : ' from the deck')); } break;
      }
      if (fired) mark(p, c);
      if (L) { const mv = cardMoves(snap, g); if (mv.length) { if (L.length === L0) say(p, c, i, ''); L[L.length - 1].mv = mv; } }
    }
  }
  // total of the round: slot damage (after Kéo 3 / Bao 7 / Kéo 8), +5 for a sweep, then × 2 per Kéo 5
  for (let i = 0; i < 3; i++) if (out[i] && out[i][0] >= 0) dmgTo[1 - out[i][0]] += slotDmg[i];
  dmgTo[0] += extra[0]; dmgTo[1] += extra[1];
  if (wins[0] === 3) dmgTo[1] += 5; if (wins[1] === 3) dmgTo[0] += 5;
  // Kéo 5: the whole round's damage to that side × 2 (before Búa 9's +10 and Búa 3's -9)
  dmgTo[0] *= mult[0]; dmgTo[1] *= mult[1];
  const pre = [dmgTo[0], dmgTo[1]];
  for (let p = 0; p < 2; p++) {
    // Búa 9 (active from the round after it triggered): +10 to the round's total damage dealt and +10 to the round's total healing, only when there is damage / healing to add to.
    const o = 1 - p, b = g.dbl[p] ? 10 : 0, h = heal[p] + (healTotal[p] ? pre[o] : 0);
    heal[p] = h > 0 ? h + b : 0;
    dmgTo[o] = Math.max(0, (pre[o] > 0 ? pre[o] + b : 0) - reduce[o]);
  }
  const before = [g.hp[0], g.hp[1]];
  for (let p = 0; p < 2; p++) g.hp[p] = Math.min(MAXHP, g.hp[p] - dmgTo[p] + heal[p]);
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
function finishRound(g, rows, ctx, chooseDiscard, lossPick) {   // lossPick[p]: the UI's pre-drawn random discard for a side that does not choose (so it can be shown first)
  const on = ctx.on, L = g.log;
  const note = (p, c, t) => { if (L) L.push({ p, c, slot: -1, t, sys: true }); };
  for (let p = 0; p < 2; p++) {
    const played = rows[p].filter(c => c >= 0);
    if (!played.length) {   // played nothing: a random hand card is discarded
      if (g.hand[p].length) { const x = g.hand[p][ri(g.hand[p].length)]; take(g.hand[p], x); if (!discardCard(g, p, x, false, on)) g.hand[p].push(x); else note(p, x, 'No card played: random discard'); }
      continue;
    }
    let pick;
    if (ctx.winner === p || ctx.bothPick) pick = chooseDiscard(g, p, played, on);
    else { pick = lossPick && lossPick[p] != null && played.includes(lossPick[p]) ? lossPick[p] : played[ri(played.length)]; if (ctx.winner === 1 - p && played.includes(P0) && on[p] && (g.active[p] & bit(P0))) { pick = P0; if (g.trig) g.trig[p][P0] = (g.trig[p][P0] || 0) + 1; if (L) L.push({ p, c: P0, slot: -1, t: 'Lost the round: the discard is Paper 0' }); } }
    for (const c of played) { if (c === pick) { if (!discardCard(g, p, c, false, on)) g.hand[p].push(c); else note(p, c, 'Discarded after the round'); } else g.hand[p].push(c); }
  }
  for (let p = 0; p < 2; p++) if (g.messUp[p]) { g.messUp[p] = false; if (g.hand[p].length) { const x = g.hand[p][ri(g.hand[p].length)]; take(g.hand[p], x); g.deck[p].push(x); shuffle(g.deck[p]); note(p, x, 'MESS UP: 1 card shuffled back into the deck'); } }
  for (let p = 0; p < 2; p++) { if (g.dblNext[p]) { g.dbl[p] = true; g.dblNext[p] = false; } }
  g.ban = [g.nextBan[0], g.nextBan[1]]; g.nextBan = [0, 0];
  g.blocked = [g.nextBlocked[0], g.nextBlocked[1]]; g.nextBlocked = [-1, -1];
  g.round++;
  const allOn = [true, true]; const drawn = [[], []];
  for (let p = 0; p < 2; p++) {
    let n = g.nextDraw[p]; g.nextDraw[p] = 1;
    while (n-- > 0 && g.deck[p].length) { const c = g.deck[p].pop(); g.hand[p].push(c); drawn[p].push(c); }   // round draws do not count for Bao 7
    let guard = 0;
    while (g.hand[p].length > 10 && guard++ < 30) {   // hand limit: random discard; an active Kéo 1 is skipped (counter +1) and another card goes
      let x = g.hand[p][ri(g.hand[p].length)];
      if (x === S1 && (g.active[p] & bit(S1))) { g.dn[p]++; g.cnt[p]++; const others = g.hand[p].filter(c => c !== S1); x = others[ri(others.length)]; }
      take(g.hand[p], x); discardCard(g, p, x, false, allOn); note(p, x, 'Over 10 cards in hand: random discard');
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
  v += 9 * ((g.dbl[p] || g.dblNext[p] ? 1 : 0) - (g.dbl[o] || g.dblNext[o] ? 1 : 0));
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
  'Hammer 9 core': ['H1','H2','H0','H3','P3','S0','S1','P0','P2','H5','H6','P6','P5','S6','H4','H9','P8','H7','S8'],
  'Combo 7 7 7': ['H2','H1','P3','S0','P2','P1','H0','H3','S1','P6','P5','H5','P4','S5','H4','P8','H9','S9','P7'],
  'Card draw': ['P3','S0','H1','H2','P1','P2','H3','S1','H0','P4','P6','H5','P5','S5','H4','P7','P8','P9','H7'],
  'Discard counter': ['S1','S2','S3','H2','H3','P0','H0','P3','S0','S4','S6','S5','P5','H4','H6','S7','S8','S9','H9'],
  'Control / heal': ['H0','H3','P0','S1','P1','P2','P3','H2','S3','H4','H6','P5','S6','S5','H5','H8','H9','S9','P7'],
};
const api = { MAXHP, newGame, clone, resolve, finishRound, outcomes, blockedSides, legalRows, randomRow, planExpert, chooseDiscardSmart, playGame, mask, unmask, limits, validDeck, parse, NAME, VI, SUIT_VI, FX, PRESETS, tier, bit, S, N, allowed, withoutRow, keepValue,
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
