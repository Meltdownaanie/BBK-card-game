'use strict';
/* House bot brain. Pure functions: they read the same snapshot a human client gets (own hand, locked slots,
   opponent card COUNT, history of revealed cards), never the opponent's hidden cards.
   level 'easy'   -> random legal placement, discards its weakest card
   level 'medium' -> scores moves against a few sampled opponent hands and picks one of the best two
   level 'hard'   -> scores moves against many sampled opponent hands and plays the best */
const SUITS = ['hammer', 'paper', 'scissors'];
const LEVELS = { easy: { samples: 0, topN: 99 }, medium: { samples: 14, topN: 2 }, hard: { samples: 90, topN: 1 } };
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fullPool = () => SUITS.flatMap(suit => Array.from({ length: 10 }, (_, n) => ({ suit, n })));

// Same round rule as the server: 2+ slot wins, or 1-1 with the third slot tied and more damage dealt; shortened rounds compare wins.
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

/* Returns [{cardId, slot}] for every slot the bot must fill this round. */
function planMove(state, level, clash) {
  const cfg = LEVELS[level] || LEVELS.easy;
  const open = [0, 1, 2].filter(i => !state.lockedOwn.includes(i));
  const need = Math.min(state.needed, open.length, state.hand.length);
  if (need <= 0) return [];
  // Opponent cards: everything except cards already seen played (a played card may return to their hand, so this is only a hint).
  const seen = new Set((state.history || []).slice(-3).flatMap(h => (h.cards || []).filter(Boolean).map(c => c.suit + c.n)));
  let pool = fullPool().filter(c => !seen.has(c.suit + c.n));
  if (pool.length < 9) pool = fullPool();
  const oppOpen = [0, 1, 2].filter(i => !(state.lockedOpponent || []).includes(i));
  const oppCount = Math.min(oppOpen.length, state.opponentHandCount);
  const shortened = need < 3 || oppCount < 3 || open.length < 3 || oppOpen.length < 3;

  const options = permutations(state.hand, need);
  let scored;
  if (!cfg.samples) {
    scored = [{ move: options[rnd(options.length)], score: 0 }];
  } else {
    const worlds = Array.from({ length: cfg.samples }, () => {
      const cards = shuffle(pool).slice(0, oppCount);
      const slots = shuffle(oppOpen).slice(0, oppCount);
      const row = [null, null, null];
      slots.forEach((s, i) => { row[s] = cards[i]; });
      return row;
    });
    scored = options.map(move => {
      const row = [null, null, null];
      move.forEach((c, i) => { row[open[i]] = c; });
      let total = 0;
      for (const w of worlds) {
        const r = evaluate(clash, row, w, shortened);
        total += r.net + 7 * (r.win - r.lose);
      }
      let score = total / worlds.length;
      if (need === 3 && move.every(c => c.n === 7)) score += 1000;   // PACK JOT: instant win when the round is won
      return { move, score };
    }).sort((a, b) => b.score - a.score);
  }
  const best = scored[rnd(Math.min(cfg.topN, scored.length))].move;
  return best.map((c, i) => ({ cardId: c.id, slot: open[i] }));
}

/* Which of the played slots to discard (only asked when the bot picks). The weakest card goes. */
function discardMove(state, level) {
  const opts = state.discardOptions || [];
  if (!opts.length) return null;
  if (level === 'easy') return opts[rnd(opts.length)];
  let best = opts[0];
  for (const i of opts) {
    const a = state.ownSlots[i], b = state.ownSlots[best];
    if (a && b && a.n < b.n) best = i;
  }
  return best;
}

const levelForRating = r => (r < 1200 ? 'easy' : r < 1500 ? 'medium' : 'hard');
module.exports = { planMove, discardMove, levelForRating, evaluate, LEVELS };
