'use strict';
/* BBK opponent brain. Pure functions shared by the house bots (server) and the vs-AI mode (browser, copy in /bot-brain.js).
   They read only what a human sees: own hand, locked slots, the opponent's hand COUNT and the cards the opponent has
   already revealed. Never the opponent's hidden cards.
   easy   -> purely random legal placement and random discard
   medium -> knows the combos (CHARGE, MESS UP, 777, 000) and goes for them, and reads the opponent's slot habits
             (which numbers they like to put in which slot) from a few sampled opponent hands
   hard   -> counts cards: it tracks which of the opponent's 30 cards it has seen, which must have returned to their
             hand and which may have been discarded, samples consistent opponent hands from that, models their habits,
             then scores every move by expected damage, round win chance, combos both ways and the hand it keeps */
(function (root) {
const SUITS = ['hammer', 'paper', 'scissors'];
const LEVELS = {
  easy:   { samples: 0,   topN: 99, habits: false, counting: false, charge: 0,   messup: 0 },
  medium: { samples: 16,  topN: 2,  habits: true,  counting: false, charge: 10,  messup: 9 },
  hard:   { samples: 110, topN: 1,  habits: true,  counting: true,  charge: 4.5, messup: 3.5 },
};
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const keyOf = c => c.suit + c.n;
const fullPool = () => SUITS.flatMap(suit => Array.from({ length: 10 }, (_, n) => ({ suit, n })));

// Same round rule as the game: 2+ slot wins, or 1-1 with the third slot tied and more damage dealt; shortened rounds compare wins.
function evaluate(clash, mine, theirs, shortened) {
  let wm = 0, wt = 0, dm = 0, dt = 0;
  for (let i = 0; i < 3; i++) {
    const a = mine[i], b = theirs[i];
    if (!a || !b) continue;
    const r = clash(a, b);
    if (r.winner === 0) { wm++; dm += r.damage; } else if (r.winner === 1) { wt++; dt += r.damage; }
  }
  let net = dm - dt;
  if (wm === 3) net += 5; if (wt === 3) net -= 5;
  let win = 0, lose = 0;
  if (shortened) { win = wm > wt; lose = wt > wm; }
  else if (wm >= 2) win = 1; else if (wt >= 2) lose = 1;
  else if (wm === 1 && wt === 1) { win = dm > dt; lose = dt > dm; }
  return { net, win: +win, lose: +lose };
}

function permutations(cards, k) {
  const out = [];
  const go = (chosen, rest) => {
    if (chosen.length === k) { out.push(chosen); return; }
    rest.forEach((c, i) => go([...chosen, c], rest.filter((_, j) => j !== i)));
  };
  go([], cards);
  return out;
}

const isCharge = r => r.every(Boolean) && r[1].n === r[0].n + 1 && r[2].n === r[1].n + 1;
const isMessUp = r => r.every(Boolean) && r[1].n === r[0].n - 1 && r[2].n === r[1].n - 1 && r[0].suit === r[1].suit && r[1].suit === r[2].suit;
const isTriple = (r, n) => r.length === 3 && r.every(c => c && c.n === n);

/* ---------- reading the opponent ---------- */

// Did the opponent win that revealed round (so one of the cards they played was discarded)?
function oppWonRound(h) {
  const played = (h.cards || []).filter(Boolean).length;
  const ow = h.oppWins || 0, mw = h.myWins || 0;
  if (played < 3) return ow > mw;
  if (ow >= 2) return true;
  if (ow === 1 && mw === 1) return (h.oppDealt || 0) > (h.myDealt || 0);
  return ow === 0 && mw === 0;            // all tied: both players pick a discard
}

/* Card counting. Each player owns a private 30-card deck (3 suits x 0..9). For every card of the opponent's that we have
   seen played we know its latest fate: back in hand for sure (they lost or tied that round) or possibly discarded (they won:
   one of the played cards left, low cards more likely). Never-seen cards are either still in their deck or were drawn into hand.
   Returns the chance that each of the 30 cards is in the opponent's hand right now. */
function handBelief(state) {
  const last = new Map();
  for (const h of state.history || []) {
    const cards = (h.cards || []).filter(Boolean);
    let drop = cards.map(() => 0);
    if (oppWonRound(h) && cards.length) {
      const w = cards.map(c => 11 - c.n), t = w.reduce((a, b) => a + b, 0);
      drop = w.map(x => x / t);
    }
    cards.forEach((c, i) => last.set(keyOf(c), 1 - drop[i]));
  }
  const total = Math.max(0, state.opponentHandCount || 0);
  let known = 0; last.forEach(p => { known += p; });
  const scale = known > total && known > 0 ? total / known : 1;   // some of them are in play this round, not in hand
  const unseen = 30 - last.size;
  const rem = Math.max(0, total - known * scale);
  const q = unseen > 0 ? Math.min(1, rem / unseen) : 0;
  const p = new Map();
  for (const c of fullPool()) {
    const k = keyOf(c);
    p.set(k, last.has(k) ? Math.max(0.02, last.get(k) * scale) : Math.max(0.03, q));
  }
  return { p, total };
}

// What the opponent tends to put in each slot: mean card number per slot and how often each suit shows up.
function habits(state) {
  const slots = [0, 1, 2].map(() => ({ sum: 0, n: 0, suit: { hammer: 1, paper: 1, scissors: 1 } }));
  const recent = (state.history || []).slice(-10);
  for (const h of recent) (h.cards || []).forEach((c, i) => { if (c) { slots[i].sum += c.n; slots[i].n++; slots[i].suit[c.suit]++; } });
  const all = recent.flatMap(h => (h.cards || []).filter(Boolean));
  const high = all.length ? all.filter(c => c.n >= 6).length / all.length : 0.5;
  return { slots, high, rounds: recent.length };
}

function habitWeight(card, slot, hb, strength) {
  const s = hb.slots[slot];
  if (!hb.rounds || !s.n) return 1;
  const mean = s.sum / s.n;
  const suitTotal = s.suit.hammer + s.suit.paper + s.suit.scissors;
  const w = Math.exp(-Math.abs(card.n - mean) / 3.5) * (0.5 + 1.5 * s.suit[card.suit] / suitTotal * 1.5);
  return Math.pow(w, strength) + 0.04;
}

function weightedPick(items, weights) {
  let t = 0; for (const w of weights) t += w;
  if (t <= 0) return rnd(items.length);
  let r = Math.random() * t;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return i; }
  return items.length - 1;
}
function weightedSample(items, weights, k) {        // without replacement
  const idx = items.map((_, i) => i), out = [];
  const ws = [...weights];
  for (let n = 0; n < k && idx.length; n++) {
    const j = weightedPick(idx, idx.map(i => ws[i]));
    out.push(items[idx[j]]); idx.splice(j, 1);
  }
  return out;
}

/* One possible opponent row for the open slots. */
function sampleWorld(cfg, ctx) {
  const { oppOpen, oppCount, pool, belief, hb } = ctx;
  let hand;
  if (cfg.counting) {
    const cards = fullPool();
    hand = weightedSample(cards, cards.map(c => belief.p.get(keyOf(c))), Math.min(belief.total, cards.length));
    if (hand.length < oppCount) hand = shuffle(cards).slice(0, oppCount);
  } else hand = pool;
  const row = [null, null, null], left = [...hand];
  for (const s of shuffle(oppOpen).slice(0, oppCount)) {
    if (!left.length) break;
    const w = left.map(c => cfg.habits ? habitWeight(c, s, hb, cfg.counting ? 1 : 0.8) : 1);
    const j = weightedPick(left, w);
    row[s] = left[j]; left.splice(j, 1);
  }
  return row;
}

/* ---------- planning ---------- */

/* Returns [{cardId, slot}] for every slot the bot must fill this round. */
function planMove(state, level, clash) {
  const cfg = LEVELS[level] || LEVELS.easy;
  const open = [0, 1, 2].filter(i => !state.lockedOwn.includes(i));
  const need = Math.min(state.needed, open.length, state.hand.length);
  if (need <= 0) return [];
  const oppOpen = [0, 1, 2].filter(i => !(state.lockedOpponent || []).includes(i));
  const oppCount = Math.min(oppOpen.length, state.opponentHandCount);
  const shortened = need < 3 || oppCount < 3 || open.length < 3 || oppOpen.length < 3;

  const options = permutations(state.hand, need);
  let scored;
  if (!cfg.samples) {
    scored = [{ move: options[rnd(options.length)], score: 0 }];                 // EASY: pure random
  } else {
    const ctx = { oppOpen, oppCount, pool: fullPool(), belief: cfg.counting ? handBelief(state) : null, hb: habits(state) };
    const worlds = Array.from({ length: cfg.samples }, () => sampleWorld(cfg, ctx));
    const full = need === 3 && open.length === 3;
    scored = options.map(move => {
      const row = [null, null, null];
      move.forEach((c, i) => { row[open[i]] = c; });
      let total = 0;
      for (const w of worlds) {
        const r = evaluate(clash, row, w, shortened);
        let v = r.net + 7 * (r.win - r.lose);
        if (full) {
          if (isTriple(row, 7) && r.win) v += 90;                                   // PACK JOT: instant victory
          if (isTriple(row, 0) && r.win) v += 6;                                    // ZERO TO HERO seals a slot
          if (isTriple(row, 9) && r.lose) v -= 14;                                  // KIANTS GILLER hurts the loser
          if (cfg.counting && !shortened) {
            if (isTriple(w, 7) && r.lose) v -= 90;                                  // they would win on the spot
            if (isTriple(w, 9) && r.win) v += 8;                                    // their 999 backfires
          }
        }
        total += v;
      }
      let score = total / worlds.length;
      if (full) {
        if (isCharge(row)) score += cfg.charge;                                     // draw 2 next round
        if (isMessUp(row)) score += cfg.messup;                                     // their hand loses a card to the deck
      }
      return { move, score };
    }).sort((a, b) => b.score - a.score);
  }
  const pick = cfg.topN === 2 ? (Math.random() < 0.7 ? 0 : 1) : rnd(Math.min(cfg.topN, scored.length));   // medium: usually its best idea, sometimes the runner-up
  const best = scored[Math.min(pick, scored.length - 1)].move;
  return best.map((c, i) => ({ cardId: c.id, slot: open[i] }));
}

/* How much a hand is worth keeping: strong cards, sets heading for 777 / 000, and straights for CHARGE / MESS UP. */
function handValue(cards) {
  const cnt = n => cards.filter(c => c.n === n).length;
  let v = cards.reduce((s, c) => s + c.n * 0.35, 0);
  const n7 = cnt(7), n0 = cnt(0);
  v += n7 === 3 ? 30 : n7 === 2 ? 9 : 0;
  v += n0 === 3 ? 12 : n0 === 2 ? 4 : 0;
  if (cnt(9) === 3) v -= 3;
  const has = new Set(cards.map(c => c.n));
  for (let n = 0; n <= 7; n++) if (has.has(n) && has.has(n + 1) && has.has(n + 2)) { v += 2.5; break; }
  return v;
}

/* Which of the played slots to discard (only asked when the bot picks). */
function discardMove(state, level) {
  const opts = state.discardOptions || [];
  if (!opts.length) return null;
  if (level === 'easy') return opts[rnd(opts.length)];
  const slots = state.ownSlots || [];
  if (level === 'medium' || !(state.hand || []).length) {
    let best = opts[0];
    for (const i of opts) if (slots[i] && slots[best] && slots[i].n < slots[best].n) best = i;
    return best;
  }
  let best = opts[0], bestV = -Infinity;
  for (const i of opts) {
    const kept = slots.filter((c, j) => c && j !== i);
    const v = handValue([...state.hand, ...kept]) + Math.random() * 0.1;
    if (v > bestV) { bestV = v; best = i; }
  }
  return best;
}

/* Server snapshot history entry -> the shape the brain reads (from the viewpoint of `seat`). */
function normEntry(h, seat) {
  const w = h.result && h.result.wins, t = h.result && h.result.damageTaken;
  if (!w || !t) return null;
  return { round: h.round, cards: h.cards, oppWins: w[1 - seat], myWins: w[seat], oppDealt: t[seat], myDealt: t[1 - seat] };
}

const levelForRating = r => (r < 1200 ? 'easy' : r < 1500 ? 'medium' : 'hard');
const api = { planMove, discardMove, levelForRating, evaluate, handBelief, oppWonRound, normEntry, handValue, LEVELS };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BBKBrain = api;
})(typeof window !== 'undefined' ? window : globalThis);
