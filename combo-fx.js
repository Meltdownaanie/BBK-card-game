/* BBK cinematic pixel scenes for the secret combos.
   BBKFX.play('zero'|'pack'|'kiants', {label, sub}) -> Promise (resolves when the scene ends or is skipped).
   Everything is drawn procedurally on a 320x180 canvas and scaled up without smoothing. */
(function () {
  'use strict';
  var W = 320, H = 180;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function disc(g, cx, cy, r, c) { g.fillStyle = c; for (var y = -r; y <= r; y++) { var w = Math.floor(Math.sqrt(r * r - y * y + r * .4)); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }
  function line(g, x1, y1, x2, y2, w, c) {
    g.fillStyle = c; var n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
    for (var i = 0; i <= n; i++) { var t = i / n; g.fillRect(Math.round(lerp(x1, x2, t) - w / 2), Math.round(lerp(y1, y2, t) - w / 2), w, w); }
  }
  /* vertical pixel gradient with ordered dithering between two colours */
  function dither(g, x0, y0, x1, y1, c1, c2, from, to) {
    for (var y = y0; y < y1; y++) {
      var k = clamp((y - y0) / (y1 - y0), 0, 1); k = from + (to - from) * k;
      for (var x = x0; x < x1; x++) { g.fillStyle = BAYER[(y & 3) * 4 + (x & 3)] / 16 < k ? c2 : c1; g.fillRect(x, y, 1, 1); }
    }
  }
  function layer() { var c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d'); g.imageSmoothingEnabled = false; return { c: c, g: g }; }
  function glow(g, x, y, r, rgb, a) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(Math.round(x - r), Math.round(y - r), r * 2, r * 2);
  }
  function sparkle(g, x, y, s, c) { R(g, x, y, 1, 1, '#fff'); R(g, x - s, y, s * 2 + 1, 1, c); R(g, x, y - s, 1, s * 2 + 1, c); }

  var icons = {};
  ['hammer', 'paper', 'scissors'].forEach(function (n) { var i = new Image(); i.src = './icons/' + n + '.png?v=20261105e'; icons[n] = i; });

  /* ---------------- silver knight ---------------- */
  var SIL = ['#f7fbff', '#cfd9e6', '#9aa8bd', '#64728b', '#37405a', '#1c2033'];
  function knight(g, x, y, o) {
    var t = o.t || 0, lean = o.lean || 0, face = o.face || 1;
    g.save(); g.translate(x, y); g.scale(face, 1);
    var bob = o.still ? 0 : Math.round(Math.sin(t * 5) * 1);
    // cape
    for (var i = 0; i < 18; i++) {
      var wave = Math.round(Math.sin(t * 7 + i * .55) * (1 + i * .12)) + Math.round(lean * -.4);
      var top = -46 + bob + wave, len = 34 - Math.round(i * .5);
      R(g, -9 - i, top + Math.round(i * .8), 1, len, i % 5 === 0 ? '#1d2f73' : '#2b4aa8');
      if (i % 4 === 1) R(g, -9 - i, top + Math.round(i * .8), 1, len, '#3d63d6');
    }
    // legs
    R(g, -9 + lean, -22, 8, 22, SIL[4]); R(g, -9 + lean, -22, 3, 22, SIL[2]); R(g, -9 + lean, -22, 1, 22, SIL[0]);
    R(g, 2 + lean, -22, 8, 22, SIL[4]); R(g, 2 + lean, -22, 3, 22, SIL[2]); R(g, 2 + lean, -22, 1, 22, SIL[1]);
    R(g, -11 + lean, -3, 11, 4, SIL[5]); R(g, 1 + lean, -3, 12, 4, SIL[5]); R(g, -10 + lean, -3, 9, 1, SIL[3]);
    R(g, -9 + lean, -13, 8, 2, SIL[5]); R(g, 2 + lean, -13, 8, 2, SIL[5]); // knee guards
    // tassets
    R(g, -12 + lean, -28, 25, 8, SIL[3]); R(g, -12 + lean, -28, 25, 2, SIL[1]);
    for (i = 0; i < 4; i++) R(g, -11 + lean + i * 6, -26, 1, 6, SIL[5]);
    // torso: breastplate
    var tx = -12 + Math.round(lean * .6), ty = -50 + bob;
    R(g, tx - 1, ty - 1, 26, 24, SIL[5]);
    for (i = 0; i < 24; i++) R(g, tx + i, ty, 1, 22, i < 3 ? SIL[0] : i < 9 ? SIL[1] : i < 17 ? SIL[2] : i < 21 ? SIL[3] : SIL[4]);
    R(g, tx, ty + 14, 24, 2, SIL[5]);                      // waist line
    R(g, tx + 9, ty + 3, 7, 8, '#b8891c'); R(g, tx + 10, ty + 4, 5, 6, '#ffd34d');   // gold emblem
    R(g, tx + 11, ty + 5, 3, 4, '#7a4f08'); R(g, tx + 12, ty + 6, 1, 2, '#ffd34d');
    R(g, tx + 2, ty + 2, 2, 8, '#ffffff');                 // specular streak
    // pauldrons
    R(g, tx - 6, ty - 3, 11, 10, SIL[5]); R(g, tx - 5, ty - 2, 9, 8, SIL[2]); R(g, tx - 5, ty - 2, 9, 2, SIL[0]); R(g, tx - 5, ty + 3, 9, 3, SIL[3]);
    R(g, tx + 19, ty - 3, 11, 10, SIL[5]); R(g, tx + 20, ty - 2, 9, 8, SIL[2]); R(g, tx + 20, ty - 2, 9, 2, SIL[1]); R(g, tx + 20, ty + 3, 9, 3, SIL[3]);
    // helmet
    var hx = tx + 6, hy = ty - 17;
    R(g, hx - 1, hy - 1, 15, 18, SIL[5]);
    for (i = 0; i < 13; i++) R(g, hx + i, hy, 1, 16, i < 3 ? SIL[0] : i < 8 ? SIL[1] : i < 11 ? SIL[2] : SIL[3]);
    R(g, hx + 1, hy + 6, 12, 3, '#0a0d18'); R(g, hx + 7, hy + 7, 5, 1, '#7fd0ff');                    // visor + glowing slit
    R(g, hx + 6, hy + 9, 1, 7, SIL[4]);                                                                   // face guard line
    R(g, hx + 5, hy - 4, 3, 4, SIL[3]);
    for (i = 0; i < 9; i++) { var pw = Math.round(Math.sin(t * 8 + i * .7) * 1.5); R(g, hx + 5 - i + pw * 0, hy - 5 - Math.round(i * .5) + pw, 4, 3, i % 2 ? '#c8141a' : '#ef3b3b'); }   // plume
    // arms
    var back = o.back || 0, punch = o.punch || 0;
    // rear arm (guard)
    line(g, tx + 21, ty + 4, tx + 25, ty + 14, 6, SIL[5]); line(g, tx + 21, ty + 4, tx + 25, ty + 14, 4, SIL[3]);
    disc(g, tx + 26, ty + 16, 4, SIL[5]); disc(g, tx + 26, ty + 16, 3, SIL[2]);
    // punching arm: shoulder at (tx+23, ty+3)
    var sx = tx + 24, sy = ty + 4;
    var ex = lerp(sx - 4, sx + 12, punch), ey = lerp(sy + 12, sy + 3, punch);                // elbow
    var fx = lerp(sx - 10 - back * 6, sx + 36, punch), fy = lerp(sy + 8, sy + 1, punch);    // fist
    line(g, sx, sy, ex, ey, 7, SIL[5]); line(g, sx, sy, ex, ey, 5, SIL[2]);
    line(g, ex, ey, fx, fy, 8, SIL[5]); line(g, ex, ey, fx, fy, 6, SIL[1]);
    disc(g, fx + 3, fy, 6, SIL[5]); disc(g, fx + 3, fy, 5, SIL[2]); R(g, fx + 1, fy - 4, 6, 2, SIL[0]);
    for (i = 0; i < 3; i++) R(g, fx + 5, fy - 3 + i * 3, 3, 1, SIL[5]);
    g.restore();
  }

  /* ---------------- fire dragon ---------------- */
  function dragon(g, x, y, o) {
    var t = o.t || 0, sag = o.sag || 0, headDrop = o.headDrop || 0, jaw = o.jaw == null ? .5 : o.jaw;
    var RD = ['#2a0707', '#6e0f0f', '#a81818', '#d9381c', '#ff7a1f', '#ffc247'];
    var bx = x, by = y + sag;
    // tail
    for (var i = 0; i < 40; i++) { var tx = bx + 38 + i * 1.6, ty = by - 12 + Math.sin(i * .16 + t * 2) * 6 + i * .12, r = Math.max(1, 8 - i * .18); disc(g, tx, ty, Math.round(r), RD[1]); disc(g, tx, ty - 1, Math.max(1, Math.round(r) - 1), RD[2]); }
    // far wing
    wing(g, bx - 4, by - 48 + sag * -.2, -1, t, RD, .6);
    // legs
    R(g, bx - 16, by - 10, 12, 18 - sag, RD[0]); R(g, bx - 15, by - 10, 9, 18 - sag, RD[1]); R(g, bx - 17, by + 6 - sag, 14, 4, RD[0]);
    R(g, bx + 16, by - 10, 12, 18 - sag, RD[0]); R(g, bx + 17, by - 10, 9, 18 - sag, RD[2]); R(g, bx + 15, by + 6 - sag, 14, 4, RD[0]);
    for (i = 0; i < 3; i++) { R(g, bx - 16 + i * 4, by + 9 - sag, 2, 3, '#ffe9b0'); R(g, bx + 16 + i * 4, by + 9 - sag, 2, 3, '#ffe9b0'); }
    // body
    disc(g, bx, by - 22, 32, RD[0]); disc(g, bx, by - 23, 30, RD[1]); disc(g, bx - 3, by - 26, 25, RD[2]); disc(g, bx - 7, by - 31, 15, RD[3]);
    // belly plates
    for (i = 0; i < 6; i++) R(g, bx - 26 + i * 4, by - 8 - i, 22, 2, '#f1b36a');
    // scales (dither dots)
    for (var sx = -26; sx < 30; sx += 5) for (var sy = -50; sy < -4; sy += 5) { var xx = bx + sx + ((sy / 5) & 1) * 2, yy = by + sy; if ((xx - bx) * (xx - bx) / 900 + (yy - by + 22) * (yy - by + 22) / 700 < 1) R(g, xx, yy, 2, 1, RD[4]); }
    // spines on the back
    for (i = 0; i < 9; i++) { var px = bx - 20 + i * 6, py = by - 50 + Math.abs(i - 4) * 2 - 2; R(g, px, py - 5, 3, 6, RD[0]); R(g, px + 1, py - 4, 1, 4, RD[4]); }
    // neck: curve from body to head (head position moves when cut)
    var hx = bx - 52, hy = by - 52 + headDrop;
    var cut = o.cut;
    for (i = 0; i <= 14; i++) {
      if (cut && i > 7) break;
      var k = i / 14, nx = lerp(bx - 18, hx + 8, k) - Math.sin(k * Math.PI) * 4, ny = lerp(by - 40, hy + 8, k) - Math.sin(k * Math.PI) * 10;
      disc(g, nx, ny, Math.round(lerp(11, 6, k)), RD[1]); disc(g, nx - 1, ny - 1, Math.round(lerp(9, 4, k)), RD[2]); disc(g, nx - 2, ny + 1, 2, RD[4]);
    }
    if (cut) { disc(g, lerp(bx - 18, hx + 8, 7 / 14) - 2, lerp(by - 40, hy + 8, 7 / 14) - 10, 5, '#ff4a2a'); }
    else dragonHead(g, hx, hy, jaw, t, RD, 1);
    // near wing
    wing(g, bx + 6, by - 44 + sag * -.2, 1, t, RD, 1);
    return { hx: hx, hy: hy, RD: RD };
  }
  function dragonHead(g, hx, hy, jaw, t, RD, a) {
    // horns
    line(g, hx + 14, hy - 2, hx + 26, hy - 14, 4, RD[0]); line(g, hx + 14, hy - 2, hx + 26, hy - 14, 2, '#ffe9b0');
    line(g, hx + 6, hy - 2, hx + 14, hy - 16, 4, RD[0]); line(g, hx + 6, hy - 2, hx + 14, hy - 16, 2, '#ffe9b0');
    // skull + snout
    R(g, hx - 1, hy - 1, 30, 18, RD[0]); R(g, hx, hy, 28, 15, RD[2]); R(g, hx + 2, hy, 24, 4, RD[3]);
    R(g, hx - 16, hy + 3, 20, 11, RD[0]); R(g, hx - 15, hy + 4, 19, 9, RD[2]); R(g, hx - 15, hy + 4, 19, 3, RD[3]);
    R(g, hx - 14, hy + 6, 2, 2, '#000'); // nostril
    // lower jaw
    var j = Math.round(jaw * 8);
    R(g, hx - 14, hy + 13 + j, 22, 6, RD[0]); R(g, hx - 13, hy + 14 + j, 20, 4, RD[1]);
    for (var i = 0; i < 5; i++) { R(g, hx - 13 + i * 4, hy + 13, 2, 3 + j / 2, '#fff7e0'); R(g, hx - 12 + i * 4, hy + 11 + j, 2, 3, '#fff7e0'); }
    // mouth glow
    if (jaw > .3) R(g, hx - 12, hy + 14, 18, j - 1, '#ff9a2f');
    // eye
    R(g, hx + 8, hy + 3, 8, 5, '#190303'); R(g, hx + 9, hy + 4, 6, 3, '#ffd23a'); R(g, hx + 12, hy + 4, 2, 3, '#000'); R(g, hx + 9, hy + 4, 2, 1, '#fff');
    R(g, hx + 6, hy + 1, 12, 2, RD[0]);
  }
  function wing(g, x, y, dir, t, RD, a) {
    var flap = Math.sin(t * 3.2) * 6;
    var tips = [[x + dir * 48, y - 34 + flap], [x + dir * 72, y - 18 + flap * 1.1], [x + dir * 80, y + 6 + flap * .8], [x + dir * 56, y + 22]];
    g.fillStyle = a < 1 ? RD[1] : RD[2];
    g.beginPath(); g.moveTo(x, y);
    tips.forEach(function (p) { g.lineTo(Math.round(p[0]), Math.round(p[1])); });
    g.lineTo(x + dir * 6, y + 14); g.closePath(); g.fill();
    g.fillStyle = RD[3]; g.beginPath(); g.moveTo(x, y + 2); g.lineTo(Math.round(tips[0][0] - dir * 8), Math.round(tips[0][1] + 8)); g.lineTo(Math.round(tips[1][0] - dir * 10), Math.round(tips[1][1] + 6)); g.lineTo(x + dir * 6, y + 12); g.closePath(); g.fill();
    tips.forEach(function (p) { line(g, x, y, Math.round(p[0]), Math.round(p[1]), 2, RD[0]); });
    line(g, x, y, x + dir * 24, y - 12 + flap * .5, 3, RD[0]);
  }

  /* ================= scene definitions ================= */
  var scenes = {};

  /* ---- 000: knight punches a slot shut ---- */
  scenes.zero = {
    dur: 5.6,
    init: function () {
      var L = layer(), g = L.g;
      dither(g, 0, 0, W, 120, '#0b0a1a', '#1d1740', 0, 1);
      for (var i = 0; i < 70; i++) R(g, (i * 53) % W, (i * 31) % 90, 1, 1, i % 6 ? '#3b3170' : '#a99bff');
      // stone wall with arches
      for (var y = 70; y < 140; y += 10) for (var x = (y / 10 & 1) * -10; x < W; x += 20) { R(g, x, y, 19, 9, '#2a2547'); R(g, x, y, 19, 1, '#3a3463'); R(g, x + 19, y, 1, 9, '#15122a'); }
      for (var a = 0; a < 4; a++) { var ax = 30 + a * 90; R(g, ax, 40, 34, 70, '#0d0b1f'); disc(g, ax + 17, 42, 17, '#0d0b1f'); R(g, ax + 4, 52, 26, 58, '#171332'); }
      // floor
      R(g, 0, 140, W, 40, '#1b1735'); for (i = 0; i < 20; i++) { R(g, i * 18 - 4, 140, 1, 40, '#120f26'); } for (i = 0; i < 4; i++) R(g, 0, 140 + i * 12, W, 1, '#120f26');
      R(g, 0, 140, W, 2, '#3a3463');
      this.bg = L.c; this._sp = null;
    },
    draw: function (g, t, dt, fx) {
      g.drawImage(this.bg, 0, 0);
      // torches
      [60, 250].forEach(function (tx) { glow(g, tx, 84, 60, '255,150,60', .35 + Math.sin(t * 20 + tx) * .05); R(g, tx - 1, 88, 3, 14, '#4a3018'); R(g, tx - 3, 84, 7, 5, '#6a4520'); disc(g, tx, 80, 4, '#ff7a1f'); disc(g, tx, 78, 2, '#ffd34d'); });
      var wind = ease(clamp((t - .6) / .8, 0, 1)), strike = clamp((t - 1.65) / .12, 0, 1), recoil = clamp((t - 1.8) / .5, 0, 1);
      // enemy slot (a floating card frame) + lock
      var sx = 236, sy = 70, shake = t > 1.74 && t < 2.5 ? Math.round(rnd(-2, 2)) : 0;
      var sealed = t > 1.85, hit = t > 1.75;
      var sxx = sx + (hit ? Math.round(ease(clamp((t - 1.75) / .15, 0, 1)) * 6 * (1 - recoil * .6)) : 0) + shake;
      glow(g, sxx + 20, sy + 30, 55, sealed ? '255,80,80' : '140,110,255', .35);
      R(g, sxx, sy, 42, 60, '#0b0818'); R(g, sxx + 2, sy + 2, 38, 56, sealed ? '#3a1018' : '#2c2160'); R(g, sxx + 5, sy + 5, 32, 50, sealed ? '#25080d' : '#1a1340');
      for (var i = 0; i < 3; i++) R(g, sxx + 5 + i * 11, sy + 5, 10, 1, sealed ? '#ff5a5a' : '#8f7dff');
      if (!sealed) { R(g, sxx + 18, sy + 22, 6, 16, '#8f7dff'); R(g, sxx + 13, sy + 27, 16, 6, '#8f7dff'); }
      else {
        // cracks + chains + padlock
        line(g, sxx + 6, sy + 8, sxx + 22, sy + 30, 1, '#ff9a8a'); line(g, sxx + 22, sy + 30, sxx + 14, sy + 52, 1, '#ff9a8a'); line(g, sxx + 22, sy + 30, sxx + 36, sy + 46, 1, '#ff9a8a');
        for (i = 0; i < 9; i++) { R(g, sxx - 4 + i * 5, sy + 14 + i * 4, 4, 3, i % 2 ? '#8a94a8' : '#cfd9e6'); R(g, sxx + 44 - i * 5, sy + 14 + i * 4, 4, 3, i % 2 ? '#8a94a8' : '#cfd9e6'); }
        var lk = clamp((t - 1.95) / .2, 0, 1) * 3;
        R(g, sxx + 14, sy + 22 - lk, 14, 3, '#b8891c'); R(g, sxx + 14, sy + 22 - lk, 3, 9, '#b8891c'); R(g, sxx + 25, sy + 22 - lk, 3, 9, '#b8891c');
        R(g, sxx + 11, sy + 30, 20, 16, '#ffd34d'); R(g, sxx + 11, sy + 30, 20, 3, '#fff3a8'); R(g, sxx + 11, sy + 43, 20, 3, '#b8891c'); R(g, sxx + 19, sy + 35, 4, 6, '#3a2a08');
      }
      // knight: idle -> wind up -> dash & punch
      var kx = lerp(70, 150, ease(clamp((t - 1.2) / .45, 0, 1))) - recoil * 6;
      var pose = { t: t, punch: strike, back: wind * (1 - strike), lean: Math.round(wind * -3 + strike * 4) };
      // afterimages
      if (t > 1.3 && t < 1.8) for (var k = 3; k >= 1; k--) { g.globalAlpha = .12 * (4 - k) / 3; knight(g, kx - k * 9, 150, { t: t, punch: strike, lean: 3, still: true }); g.globalAlpha = 1; }
      glow(g, kx, 120, 70, '180,210,255', .12 + wind * .12);
      knight(g, kx, 150, pose);
      // shockwave and sparks at impact
      if (t > 1.7) { var s = t - 1.7; if (s < .7) { var rr = s * 130; g.strokeStyle = 'rgba(255,255,255,' + (1 - s / .7) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(sxx, sy + 30, rr, 0, Math.PI * 2); g.stroke(); g.strokeStyle = 'rgba(255,200,120,' + (1 - s / .7) * .8 + ')'; g.lineWidth = 1; g.beginPath(); g.arc(sxx, sy + 30, rr * .7, 0, Math.PI * 2); g.stroke(); }
        if (!this._sp) { this._sp = []; for (i = 0; i < 40; i++) this._sp.push({ x: sxx, y: sy + 30, vx: rnd(-3, 3), vy: rnd(-4, 1), l: rnd(.4, 1) }); }
        this._sp.forEach(function (p) { var a = s / p.l; if (a < 1) { p.x += p.vx; p.y += p.vy; p.vy += .18; R(g, p.x, p.y, 2, 2, a < .5 ? '#fff3a8' : '#ff9a2f'); } });
      }
      if (t > 1.7 && t < 1.82) R(g, 0, 0, W, H, 'rgba(255,255,255,.55)');
      // floor reflection of the light
      g.globalAlpha = .08; R(g, 0, 150, W, 30, '#9fb8ff'); g.globalAlpha = 1;
      // drifting dust / embers
      for (i = 0; i < 16; i++) { var ex = (i * 71 + t * 12) % W, ey = 140 - ((i * 37 + t * 20) % 110); R(g, ex, ey, 1, 1, i % 3 ? '#ff9a2f' : '#fff3a8'); }
      // vignette
      var v = g.createRadialGradient(W / 2, H / 2, 70, W / 2, H / 2, 200); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
      if (t < .5) R(g, 0, 0, W, H, 'rgba(0,0,0,' + (1 - t / .5) + ')');
      return { title: t > 2.4, shake: t > 1.7 && t < 1.95 ? 3 : 0 };
    }
  };

  /* ---- 777: casino jackpot ---- */
  scenes.pack = {
    dur: 8.2,
    init: function () {
      var L = layer(), g = L.g;
      dither(g, 0, 0, W, 110, '#1a0412', '#4a0d2a', 0, 1);
      // wallpaper pattern
      for (var y = 0; y < 110; y += 10) for (var x = (y / 10 & 1) * 6; x < W; x += 12) { R(g, x + 4, y + 3, 2, 2, '#6d1a3c'); R(g, x + 3, y + 4, 4, 1, '#6d1a3c'); }
      // columns
      [14, 88, 232, 306].forEach(function (cx) { R(g, cx - 7, 0, 14, 130, '#2a0a1c'); R(g, cx - 6, 0, 3, 130, '#ffd34d'); R(g, cx - 1, 0, 6, 130, '#b8891c'); R(g, cx - 8, 0, 16, 5, '#ffd34d'); R(g, cx - 8, 122, 16, 6, '#ffd34d'); });
      // background slot machines (silhouettes with lamps)
      [[40, 74], [270, 74], [114, 86], [196, 86]].forEach(function (m, i) { R(g, m[0] - 12, m[1], 24, 56, '#16060f'); R(g, m[0] - 10, m[1] + 4, 20, 14, '#2a0e22'); R(g, m[0] - 8, m[1] + 8, 16, 7, i % 2 ? '#ff3b5c' : '#3bd1ff'); R(g, m[0] - 10, m[1] + 24, 20, 3, '#ffd34d'); });
      // neon sign
      R(g, 118, 8, 84, 22, '#16060f'); R(g, 120, 10, 80, 18, '#2a0e22');
      // carpet floor with diamond pattern
      R(g, 0, 130, W, 50, '#5a0c1e'); for (y = 132; y < 180; y += 8) for (x = (y / 8 & 1) * 8; x < W; x += 16) { R(g, x, y, 8, 4, '#7d1530'); R(g, x + 2, y + 1, 4, 2, '#ffd34d'); }
      R(g, 0, 128, W, 3, '#ffd34d');
      this.bg = L.c;
      this.parts = []; this.conf = []; this.settled = []; this.heap = new Array(W).fill(0);
    },
    draw: function (g, t, dt, fx) {
      var S = this;
      g.drawImage(S.bg, 0, 0);
      // chandeliers
      [[60, 0], [260, 0]].forEach(function (c) { R(g, c[0], 0, 1, 18, '#b8891c'); for (var i = -3; i <= 3; i++) { R(g, c[0] + i * 4 - 1, 18 + Math.abs(i), 3, 6, '#ffd34d'); if ((Math.floor(t * 6) + i) % 3 === 0) sparkle(g, c[0] + i * 4, 16, 3, '#fff3a8'); } glow(g, c[0], 22, 40, '255,220,140', .25); });
      // neon CASINO
      var on = Math.floor(t * 4) % 2, LET = { C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'], A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'], I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'], N: ['10001', '11001', '10101', '10101', '10011', '10001', '10001'], O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'] };
      'CASINO'.split('').forEach(function (ch, i) { LET[ch].forEach(function (row, j) { row.split('').forEach(function (v, k) { if (v === '1') { R(g, 125 + i * 12 + k * 2, 12 + j * 2, 2, 2, on || i % 2 ? '#ff7ac0' : '#ff2a7a'); } }); }); });
      glow(g, 160, 19, 60, '255,60,150', .2);
      // ---- main slot machine ----
      var mx = 100, my = 30, spinEnd = [3.0, 3.9, 4.8], lever = t > 1 && t < 2.2 ? (t < 1.6 ? (t - 1) / .6 : 1 - (t - 1.6) / .6) : 0;
      glow(g, mx + 60, my + 60, 100, '255,200,80', .25);
      R(g, mx - 3, my - 3, 126, 110, '#0b0610');
      for (var i = 0; i < 126; i++) R(g, mx - 2 + i, my - 2, 1, 108, i < 4 ? '#ffe08a' : i < 10 ? '#e6a824' : i < 112 ? '#b8211f' : '#7a0d12');
      R(g, mx - 2, my - 2, 124, 2, '#fff3a8');
      // marquee with chasing bulbs
      R(g, mx, my + 2, 120, 14, '#2a0a10'); for (i = 0; i < 20; i++) { var lit = (i + Math.floor(t * 12)) % 3 === 0; R(g, mx + 3 + i * 6, my + 6, 4, 4, lit ? '#fff7b0' : '#d6881a'); if (lit) glow(g, mx + 5 + i * 6, my + 8, 6, '255,240,150', .4); }
      // reel window
      R(g, mx + 8, my + 22, 104, 52, '#0b0610'); R(g, mx + 10, my + 24, 100, 48, '#f6efe0');
      var wins = true;
      for (var r = 0; r < 3; r++) {
        var rx = mx + 12 + r * 32, ry = my + 26, rw = 30, rh = 44;
        g.save(); g.beginPath(); g.rect(rx, ry, rw, rh); g.clip();
        R(g, rx, ry, rw, rh, '#fffdf4');
        var spinning = t < spinEnd[r] && t > .9;
        var cells = ['hammer', 'paper', 'scissors', 'seven'];
        if (t <= .9) { drawCell(g, 'seven', rx, ry + 6, rw, 30, 0); }
        else if (spinning) {
          var off = ((t * 220 + r * 53) % (cells.length * 40));
          for (i = -1; i <= cells.length; i++) drawCell(g, cells[((i % 4) + 4) % 4], rx, ry - 40 + ((i * 40 + off) % (cells.length * 40)), rw, 40, t);
          R(g, rx, ry, rw, 8, 'rgba(0,0,0,.18)'); R(g, rx, ry + rh - 8, rw, 8, 'rgba(0,0,0,.18)');
        } else {
          var d = t - spinEnd[r], bounce = d < .3 ? Math.round(Math.sin(d / .3 * Math.PI) * -6) : 0;
          drawCell(g, 'seven', rx, ry + 2 + bounce, rw, 40, t);
          if (d < .12) R(g, rx, ry, rw, rh, 'rgba(255,255,255,.7)');
        }
        g.restore();
        R(g, rx + rw, ry, 2, rh, '#cbbd96');
      }
      // glass reflection + payline
      R(g, mx + 12, my + 46, 98, 1, 'rgba(255,60,60,.8)');
      R(g, mx + 12, my + 26, 96, 2, 'rgba(255,255,255,.25)');
      var allStopped = t > spinEnd[2] + .25;
      if (allStopped) { var f = Math.floor((t - spinEnd[2]) * 12) % 2; R(g, mx + 8, my + 22, 104, 2, f ? '#fff35c' : '#ff9a2f'); R(g, mx + 8, my + 72, 104, 2, f ? '#fff35c' : '#ff9a2f'); glow(g, mx + 60, my + 48, 80, '255,240,120', .3 + Math.sin(t * 14) * .08); }
      // control panel and coin tray
      R(g, mx + 6, my + 80, 108, 16, '#7a0d12'); R(g, mx + 8, my + 82, 104, 4, '#ffe08a');
      R(g, mx + 26, my + 90, 68, 12, '#0b0610'); R(g, mx + 28, my + 92, 64, 8, '#2a1a06');
      for (i = 0; i < 3; i++) { disc(g, mx + 20 + i * 40, my + 88, 3, i === 1 ? '#fff35c' : '#d6a31a'); }
      // lever
      R(g, mx + 124, my + 30, 4, 34, '#9aa8bd'); R(g, mx + 124, my + 30, 1, 34, '#f7fbff'); disc(g, mx + 126, my + 28 + Math.round(lever * 32), 5, '#ff3b3b'); disc(g, mx + 125, my + 26 + Math.round(lever * 32), 2, '#ffb3b3');
      // sparkles on the machine after the win
      if (allStopped) for (i = 0; i < 12; i++) { var sp = (t * 3 + i * .37) % 1; if (sp < .5) sparkle(g, mx + ((i * 47) % 124), my + ((i * 29) % 100), 2 + Math.round(sp * 4), '#fff3a8'); }
      // ---- coin + chip fountain, confetti ----
      var go = t > spinEnd[2] + .35;
      if (go && t < 7.0) {
        for (i = 0; i < 6; i++) S.parts.push({ x: mx + 60 + rnd(-8, 8), y: my + 90, vx: rnd(-3.4, 3.4), vy: rnd(-7.5, -3), kind: Math.random() < .28 ? 'chip' : 'coin', c: ['#d4272a', '#2b6bd6', '#1c1c1c', '#2aa84a'][Math.floor(Math.random() * 4)], ph: rnd(0, 6) });
        for (i = 0; i < 3; i++) S.parts.push({ x: rnd(0, W), y: rnd(-40, -4), vx: rnd(-.4, .4), vy: rnd(1, 2.5), kind: 'coin', ph: rnd(0, 6) });
        if (S.conf.length < 240 && t < 5.8) { var side = Math.random() < .5; for (i = 0; i < 5; i++) S.conf.push({ x: side ? 0 : W, y: 150, vx: (side ? 1 : -1) * rnd(1.5, 4.5), vy: rnd(-8.5, -3.5), c: ['#ff4fa3', '#ffd34d', '#4fd1ff', '#7dff8a', '#fff', '#ff7a3d'][Math.floor(Math.random() * 6)], ph: rnd(0, 6), s: Math.random() < .5 ? 3 : 2 }); }
      }
      S.parts = S.parts.filter(function (p) {
        p.vy += .22; p.x += p.vx; p.y += p.vy;
        var floor = H - S.heap[clamp(Math.round(p.x), 0, W - 1)] - 5;
        if (p.y >= floor) {
          if (Math.abs(p.vy) > 2.2 && p.b == null) { p.vy *= -.35; p.vx *= .6; p.b = 1; p.y = floor; }
          else { for (var k = -3; k <= 3; k++) { var ix = clamp(Math.round(p.x) + k, 0, W - 1); S.heap[ix] = Math.max(S.heap[ix], H - floor + (Math.abs(k) < 3 ? 3 : 1)); } S.settled = S.settled || []; S.settled.push({ x: p.x, y: floor, kind: p.kind, c: p.c }); if (S.settled.length > 1100) S.settled.shift(); return false; }
        }
        if (p.kind === 'chip') { R(g, p.x - 3, p.y - 3, 7, 6, '#fff'); R(g, p.x - 2, p.y - 2, 5, 4, p.c); R(g, p.x - 1, p.y - 1, 3, 2, '#fff'); }
        else { var w = Math.abs(Math.cos(t * 9 + p.ph)) * 3 + 1; R(g, p.x - w, p.y - 3, w * 2 + 1, 7, '#b8891c'); R(g, p.x - w + 1, p.y - 2, Math.max(1, w * 2 - 1), 5, '#ffd34d'); R(g, p.x - w + 1, p.y - 2, 1, 4, '#fff6b0'); }
        return p.y < H + 20;
      });
      (S.settled || []).forEach(function (s) {
        if (s.kind === 'chip') { R(g, s.x - 3, s.y - 1, 7, 5, '#fff'); R(g, s.x - 2, s.y, 5, 3, s.c); }
        else { R(g, s.x - 3, s.y - 1, 7, 5, '#b8891c'); R(g, s.x - 2, s.y - 1, 5, 4, '#ffd34d'); R(g, s.x - 2, s.y - 1, 1, 2, '#fff6b0'); }
      });
      S.conf = S.conf.filter(function (c) { c.vy += .12; c.vx *= .985; c.x += c.vx + Math.sin(t * 6 + c.ph) * .4; c.y += c.vy * (c.vy > 0 ? .55 : 1); var flip = Math.abs(Math.sin(t * 8 + c.ph)); R(g, c.x, c.y, Math.max(1, Math.round(c.s * flip)), c.s + 1, c.c); return c.y < H + 6; });
      // golden shimmer overlay
      if (allStopped) { var sh = (t * 90) % 420 - 60; g.save(); g.globalAlpha = .18; g.fillStyle = '#fff3a8'; g.beginPath(); g.moveTo(sh, 0); g.lineTo(sh + 30, 0); g.lineTo(sh - 30, H); g.lineTo(sh - 60, H); g.closePath(); g.fill(); g.restore(); }
      var v = g.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, 210); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
      if (t < .4) R(g, 0, 0, W, H, 'rgba(0,0,0,' + (1 - t / .4) + ')');
      return { title: t > spinEnd[2] + .6, shake: 0 };
    }
  };
  function drawCell(g, kind, x, y, w, h, t) {
    if (kind === 'seven') {
      var cx = x + w / 2, cy = y + h / 2;
      // chunky gold 7 with outline, bevel and shine
      var sevenPx = ['1111111', '1111111', '0000111', '0001110', '0011100', '0011100', '0011100', '0011100', '0011100'];
      var s = 3, ox = Math.round(cx - 3.5 * s), oy = Math.round(cy - 4.5 * s);
      sevenPx.forEach(function (row, j) { row.split('').forEach(function (v, i) { if (v === '1') { R(g, ox + i * s - 1, oy + j * s - 1, s + 2, s + 2, '#5a2d00'); } }); });
      sevenPx.forEach(function (row, j) { row.split('').forEach(function (v, i) { if (v === '1') { R(g, ox + i * s, oy + j * s, s, s, j < 3 ? '#fff35c' : '#ffc61a'); R(g, ox + i * s, oy + j * s + s - 1, s, 1, '#c77d00'); if (i === 0 || (j < 2 && i < 6)) R(g, ox + i * s, oy + j * s, s, 1, '#fffbd0'); } }); });
      if (t && Math.floor(t * 8) % 3 === 0) sparkle(g, ox + 18, oy + 2, 3, '#fff7b0');
    } else {
      var im = icons[kind]; if (im && im.complete && im.naturalWidth) { g.imageSmoothingEnabled = false; var sz = Math.min(w - 6, h - 4, 30); g.drawImage(im, Math.round(x + (w - sz) / 2), Math.round(y + (h - sz) / 2), sz, sz); }
      else { R(g, x + 8, y + 8, w - 16, h - 16, kind === 'hammer' ? '#d4272a' : kind === 'paper' ? '#2b6bd6' : '#2aa84a'); }
    }
  }

  /* ---- 999: knight slays the fire dragon ---- */
  scenes.kiants = {
    dur: 7.4,
    init: function () {
      var L = layer(), g = L.g;
      dither(g, 0, 0, W, 100, '#0a0820', '#3a1a4a', 0, 1); dither(g, 0, 70, W, 118, '#3a1a4a', '#c2451e', 0, 1);
      for (var i = 0; i < 80; i++) R(g, (i * 61) % W, (i * 23) % 60, 1, 1, i % 5 ? '#5a4a9a' : '#fff');
      // moon
      disc(g, 262, 34, 16, '#f3ecd0'); disc(g, 266, 31, 14, '#fffbe8'); disc(g, 257, 38, 3, '#d8cfa8'); disc(g, 268, 28, 2, '#d8cfa8');
      glow(g, 262, 34, 50, '255,240,200', .2);
      // distant mountains
      for (var x = 0; x < W; x++) R(g, x, 96 + Math.round(Math.sin(x * .03) * 8 + Math.sin(x * .09) * 3), 1, 40, '#2a1432');
      // castle on a hill (left/center)
      var cx = 120;
      for (x = 0; x < 190; x++) R(g, cx - 95 + x, 108 - Math.round(Math.sin(x / 190 * Math.PI) * 14), 1, 30, '#1a0d22');
      var cs = '#241230', cl = '#2f1a3c';
      R(g, cx - 56, 78, 112, 38, cs); R(g, cx - 56, 78, 112, 2, cl);
      [[-56, 54, 24], [-6, 50, 30], [36, 54, 24], [-30, 62, 16], [22, 62, 16]].forEach(function (tw) { R(g, cx + tw[0], tw[1], tw[2], 80 - tw[1] + 0, cs); R(g, cx + tw[0], tw[1], 3, 80 - tw[1], cl); for (var m = 0; m < tw[2]; m += 6) R(g, cx + tw[0] + m, tw[1] - 4, 4, 5, cs); R(g, cx + tw[0] - 2, tw[1] - 1, tw[2] + 4, 2, cl);
        R(g, cx + tw[0] + tw[2] / 2 - 1, tw[1] - 18, 2, 14, '#6a5a80'); R(g, cx + tw[0] + tw[2] / 2 + 1, tw[1] - 18, 8, 5, '#c8141a'); });
      // windows lit by fire
      for (i = 0; i < 12; i++) { var wx = cx - 50 + (i % 6) * 18 + (i > 5 ? 8 : 0), wy = 86 + Math.floor(i / 6) * 12; R(g, wx, wy, 4, 6, '#ffb347'); R(g, wx + 1, wy + 1, 2, 3, '#fff3a8'); }
      R(g, cx - 8, 96, 16, 20, '#0d0614'); disc(g, cx, 96, 8, '#0d0614');
      // courtyard floor
      R(g, 0, 138, W, 42, '#1c1022'); for (i = 0; i < 6; i++) R(g, 0, 138 + i * 8, W, 1, '#120a18'); for (i = 0; i < 24; i++) R(g, i * 14 - 6 + ((i % 2) * 7), 138 + (i % 3) * 8, 1, 8, '#120a18');
      R(g, 0, 138, W, 2, '#3a2244');
      this.bg = L.c; this.embers = []; for (i = 0; i < 60; i++) this.embers.push({ x: rnd(0, W), y: rnd(0, H), s: rnd(.3, 1.2) });
      this.flames = []; this.sp = null; this.dust = null; this.blood = false;
    },
    draw: function (g, t, dt, fx) {
      var S = this;
      g.drawImage(S.bg, 0, 0);
      // burning glow from the dragon's fire
      var fire = t < 3.0 ? clamp((t - .7) / .6, 0, 1) : clamp(1 - (t - 3.0) / .5, 0, 1);
      glow(g, 160, 110, 150, '255,120,40', .15 + fire * .25);
      // timeline
      var kneel = 0, kx = lerp(40, 96, ease(clamp((t - 1.6) / 1.0, 0, 1))), jump = clamp((t - 2.6) / .55, 0, 1), jy = Math.sin(jump * Math.PI) * 26;
      if (t > 2.6 && t < 3.15) kx = lerp(96, 168, jump);
      if (t >= 3.15) kx = 168;
      var slashT = clamp((t - 3.0) / .22, 0, 1);
      var cut = t > 3.12, fall = ease(clamp((t - 3.3) / 1.0, 0, 1));
      var dx = 236 + (cut ? Math.round(fall * 6) : 0), dy = 150;
      var tr = t > 3.3 && t < 4.5 ? Math.round(rnd(-1, 1)) : 0;
      // dragon
      var jaw = t < .6 ? .1 : t < 3.0 ? .5 + Math.sin(t * 6) * .25 : .1;
      var headDrop = cut ? 0 : Math.round(Math.sin(t * 2) * 2);
      var dr = dragon(g, dx + tr, dy, { t: t, sag: cut ? Math.round(fall * 14) : 0, headDrop: headDrop, jaw: jaw, cut: cut });
      // severed head tumbling
      if (cut) {
        var ht = clamp((t - 3.12) / 1.0, 0, 1), hx = dr.hx - ht * 46, hy = dr.hy + ht * 66 - Math.sin(ht * Math.PI) * 24 + (ht > .85 ? 0 : 0);
        g.save(); g.translate(Math.round(hx + 14), Math.round(Math.min(hy + 8, 138))); g.rotate(-ht * 2.2); g.translate(-14, -8); dragonHead(g, 0, 0, .8, t, dr.RD, 1); g.restore();
        if (ht < 1 && !S.blood) S.blood = true;
        for (var i = 0; i < 6; i++) { var bt = (t * 5 + i) % 1; R(g, dr.hx + 10 - ht * 30 + Math.sin(i) * 4, dr.hy + 14 + bt * 36, 2, 3, '#ff4a2a'); }
      }
      // fire breath
      if (t > .7 && t < 3.0) {
        for (i = 0; i < 7; i++) S.flames.push({ x: dr.hx - 14, y: dr.hy + 17, vx: rnd(-5.5, -3), vy: rnd(-.6, 1.2), l: rnd(.5, 1), a: 0, r: rnd(3, 6) });
      }
      S.flames = S.flames.filter(function (f) { f.a += dt; if (f.a > f.l) return false; f.x += f.vx; f.y += f.vy + .08 * f.a * 20; var k = f.a / f.l, c = k < .25 ? '#fff3a8' : k < .5 ? '#ffc247' : k < .8 ? '#ff7a1f' : '#a81818'; disc(g, f.x, f.y, Math.max(1, Math.round(f.r * (1 - k * .5))), c); return true; });
      // knight with shield/sword: advances, jumps, slashes
      var sword = function (x, y, ang, len) { line(g, x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, 3, '#cfd9e6'); line(g, x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, 1, '#fff'); line(g, x - Math.sin(ang) * 5, y + Math.cos(ang) * 5, x + Math.sin(ang) * 5, y - Math.cos(ang) * 5, 3, '#b8891c'); };
      glow(g, kx, 120 - jy, 55, '180,210,255', .14);
      knight(g, kx, 150 - jy, { t: t, punch: 0, back: 0, lean: t > 2.6 ? 3 : 0, still: t > 2.6 && t < 3.3 });
      // sword + slash arc
      var ang = lerp(-2.4, .9, slashT) , hand = [kx + 24, 112 - jy];
      if (t < 2.6) ang = -1.2 + Math.sin(t * 5) * .06;
      sword(hand[0], hand[1], t < 3.0 ? (t < 2.6 ? -1.25 : -2.4 + (t - 2.6) / .4 * .8) : ang, 34);
      if (t > 3.0 && t < 3.5) { var k = clamp((t - 3.0) / .5, 0, 1); g.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')'; g.lineWidth = 5; g.beginPath(); g.arc(hand[0] + 6, hand[1] + 2, 38, -2.4, -2.4 + 3.3 * Math.min(1, slashT * 1.2)); g.stroke(); g.strokeStyle = 'rgba(120,200,255,' + (1 - k) + ')'; g.lineWidth = 2; g.stroke(); }
      // shield flame hit
      if (t > 1.5 && t < 2.8) { R(g, kx + 10, 126 - jy, 12, 18, '#2b4aa8'); R(g, kx + 11, 127 - jy, 10, 16, '#3d63d6'); R(g, kx + 14, 130 - jy, 4, 10, '#ffd34d'); }
      // impact flash + shake dust
      if (t > 3.0 && t < 3.2) R(g, 0, 0, W, H, 'rgba(255,255,255,' + (.7 * (1 - (t - 3.0) / .2)) + ')');
      if (t > 4.2 && !S.dust) { S.dust = []; for (i = 0; i < 70; i++) S.dust.push({ x: dx + rnd(-60, 60), y: 146, vx: rnd(-1.5, 1.5), vy: rnd(-2.2, -.3), l: rnd(.7, 1.6), a: 0, s: rnd(3, 7) }); }
      if (S.dust) S.dust.forEach(function (d) { d.a += dt; if (d.a > d.l) return; d.x += d.vx; d.y += d.vy; d.vy += .03; var k = d.a / d.l; g.globalAlpha = .6 * (1 - k); R(g, d.x, d.y, d.s * (1 + k), d.s * (1 + k) * .7, '#8a6a7a'); g.globalAlpha = 1; });
      // rising embers
      S.embers.forEach(function (e) { e.y -= e.s; e.x += Math.sin(t * 2 + e.y * .1) * .3; if (e.y < -3) { e.y = H + 3; e.x = rnd(0, W); } R(g, e.x, e.y, 1, 1, '#ffb347'); });
      var v = g.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 210); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
      if (t < .5) R(g, 0, 0, W, H, 'rgba(0,0,0,' + (1 - t / .5) + ')');
      return { title: t > 4.4, shake: t > 3.3 && t < 3.6 ? 4 : t > 3.6 && t < 4.5 ? 2 : 0 };
    }
  };

  /* ---------------- runner ---------------- */
  var STYLE = '#bbkfx{position:fixed;inset:0;z-index:1200;background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer}' +
    '#bbkfx canvas{width:100%;height:100%;max-width:calc(100vh*16/9);max-height:calc(100vw*9/16);image-rendering:pixelated;image-rendering:crisp-edges;background:#000}' +
    '#bbkfx .fxt{position:absolute;left:0;right:0;text-align:center;font-family:"Press Start 2P","Pixelify Sans",monospace;pointer-events:none;opacity:0;text-transform:uppercase}' +
    '#bbkfx .fxt b{display:inline-block;font-weight:400;font-size:clamp(18px,5.6vw,54px);letter-spacing:.06em;color:#fff3a8;text-shadow:0 4px 0 #8a4b00,0 0 22px #ffb300,3px 3px 0 #000;animation:fxPop .5s steps(6) both}' +
    '#bbkfx .fxt small{display:block;margin-top:12px;font-size:clamp(8px,1.8vw,16px);color:#fff;text-shadow:2px 2px 0 #000;letter-spacing:.1em}' +
    '#bbkfx .fxt.show{opacity:1}' +
    '@keyframes fxPop{0%{transform:scale(.2);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}' +
    '#bbkfx .skip{position:absolute;right:10px;bottom:8px;font:10px "Press Start 2P",monospace;color:#ffffff88;pointer-events:none}';
  var TITLE = { zero: { c: '#e6f1ff', g: '#3b82f6', top: '9%' }, pack: { c: '#fff35c', g: '#ffb300', top: '5%' }, kiants: { c: '#ffd9a8', g: '#ff5a1f', top: '9%' } };
  var current = null;

  function play(kind, opts) {
    opts = opts || {};
    if (current) current.end();
    var sc = scenes[kind]; if (!sc) return Promise.resolve(true);
    if (!document.getElementById('bbkfx-style')) { var st = document.createElement('style'); st.id = 'bbkfx-style'; st.textContent = STYLE; document.head.appendChild(st); }
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
    var root = document.createElement('div'); root.id = 'bbkfx'; root.setAttribute('role', 'status');
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    var tt = TITLE[kind]; var title = document.createElement('div'); title.className = 'fxt'; title.style.top = tt.top;
    title.innerHTML = '<b style="color:' + tt.c + ';text-shadow:0 4px 0 #000,0 0 24px ' + tt.g + ',3px 3px 0 #000"></b><small></small>';
    title.querySelector('b').textContent = opts.label || ''; title.querySelector('small').textContent = opts.sub || '';
    var skip = document.createElement('div'); skip.className = 'skip'; skip.textContent = 'TAP TO SKIP';
    root.appendChild(cv); root.appendChild(title); root.appendChild(skip); document.body.appendChild(root);
    sc.init();
    return new Promise(function (resolve) {
      var done = false, t0 = performance.now(), last = t0, raf = 0, shown = false;
      function end() { if (done) return; done = true; cancelAnimationFrame(raf); root.remove(); current = null; document.removeEventListener('keydown', key); resolve(true); }
      function key(e) { if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') end(); }
      root.addEventListener('click', end); document.addEventListener('keydown', key);
      current = { end: end };
      if (reduced) { sc.draw(g, sc.dur - .2, .016, null); title.classList.add('show'); setTimeout(end, 900); return; }
      (function frame(now) {
        if (done) return;
        var t = (now - t0) / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
        var r = sc.draw(g, t, dt) || {};
        if (r.title && !shown) { shown = true; title.classList.add('show'); }
        cv.style.transform = r.shake ? 'translate(' + Math.round(rnd(-r.shake, r.shake)) + 'px,' + Math.round(rnd(-r.shake, r.shake)) + 'px)' : '';
        if (t >= sc.dur) return end();
        raf = requestAnimationFrame(frame);
      })(t0);
    });
  }
  window.BBKFX = { play: play, stop: function () { if (current) current.end(); }, duration: function (k) { return scenes[k] ? scenes[k].dur : 0; } };
})();
