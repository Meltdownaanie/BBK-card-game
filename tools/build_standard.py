#!/usr/bin/env python3
"""Builds standard.html (Standard mode TEST page) from index.html + tools/standard-patch.js.
The Classic page (index.html) is not modified. Run from the repo root: python3 tools/build_standard.py"""
import re, sys, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
patch = open(os.path.join(root, 'tools', 'standard-patch.js'), encoding='utf-8').read()
sec = {m.group(1): m.group(2).strip('\n') + '\n' for m in re.finditer(r'//@@(\w+)\n(.*?)(?=\n//@@|\Z)', patch, re.S)}

def cut(start, end, new):
    global s
    a = s.index(start); b = s.index(end, a)
    assert s.count(start) == 1, start
    s = s[:a] + new + s[b:]

def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:70], s.count(old))
    s = s.replace(old, new)

cut('async function newGame(){', '// The AI uses only its cards', sec['HELPERS'] + sec['NEWGAME'])
cut('function aiPlay(){', 'async function startRound(', sec['AIPLAY'])
cut('async function startRound(first=false){', 'function tick(){', sec['STARTROUND'])
cut('async function reveal(timeout=false){', 'function markDiscards(){', sec['REVEAL'])
cut('async function finishRound(){', 'function canForfeit(){', sec['FINISHROUND'])

# cards: star + tooltip on effect cards
rep('class="card ${c.suit} ${extra}" data-id="${c.id}" aria-label="${cardName(c)}"><span class="number">',
    'class="card ${c.suit} ${extra} ${stdCls(c)}" data-id="${c.id}" aria-label="${cardName(c)}" title="${stdTitle(c)}">${stdStar(c)}<span class="number">')
# bans: banned suits cannot be placed and do not count as playable
rep('function requiredCards(p){return Math.min(openSlots(p).length,S.hand[p].length+playedCards(p))}',
    'function requiredCards(p){return Math.min(openSlots(p).length,S.hand[p].filter(c=>!stdBanned(p,c)).length+playedCards(p))}')
rep("function placeCard(id,i){", "function placeCard(id,i){{const c0=S.hand[0].find(x=>x.id===id);if(c0&&stdBanned(0,c0)){stdPanel('BANNED',[{cls:'ai',html:esc(stdBanText())}],{step:100,hold:1100});return false}}")
rep(";updateHandSwipe();fitManyHand()}", ";updateHandSwipe();fitManyHand();stdAfterHand()}")
rep("function renderHud(){", "function renderHud(){try{stdHud()}catch(e){}")
rep("function showMenu(){", "function showMenu(){stdOpenBuilder();return;")
rep("'Round won · tap one of your played cards to discard it'", "'Round won · double-tap a played card to discard it'")
rep("  if(n===0&&locked.length)return", "  if(n===0&&stdBanText())return stdBanText();\n  if(n===0&&locked.length)return")
# start-up
a = s.rindex("})();\n</script>", 0, s.index("document.getElementById('menuBoard')"))
s = s[:a] + "stdInit();\n" + s[a:]
# page chrome
rep('<title>184 — Tactical Card Duel</title>', '<title>184 Standard Test</title>')
rep('<script src="./bot-brain.js', '<script src="./std-core.js?v=20261115a"></script>\n<script src="./bot-brain.js')
html = '''<div class="overlay std-builder" id="stdBuilder" hidden><section class="std-panel" role="dialog" aria-modal="true" aria-labelledby="stdTitle">
 <h2 id="stdTitle"><span class="h">1</span><span class="p">8</span><span class="s">4</span> STANDARD <small>TEST</small></h2>
 <p class="std-intro">Your deck always has all 30 cards. Choose which cards have their effect on: up to 9 Tier 1, 6 Tier 2 and 3 Tier 3 (4 with Hammer 2 on). Cards left off are plain.</p>
 <div class="std-controls"><select id="stdPreset" aria-label="Preset deck"></select><select id="stdAi" aria-label="AI deck"></select><select id="stdLevel" aria-label="Level"><option value="expert">Level: EXPERT</option><option value="normal">Level: NORMAL</option><option value="easy">Level: EASY</option></select></div>
 <div id="stdRows"></div>
 <div class="std-bar"><span id="stdCount"></span><button type="button" id="stdStart" class="primary">▶ START</button></div>
</section></div>
<div class="overlay std-modal" id="stdModal" hidden><section class="std-modal-box" role="dialog" aria-modal="true"></section></div>
<div class="overlay std-modal std-logov" id="stdLog" hidden><section class="std-modal-box" role="dialog" aria-modal="true" aria-labelledby="stdLogTitle"><div class="std-log-h"><h3 id="stdLogTitle">EFFECT LOG</h3><button type="button" id="stdLogClose" aria-label="Close">✕</button></div><div id="stdLogBody"></div></section></div>
'''
rep('<div id="forfeitOverlay"', html + '<div id="forfeitOverlay"')
css = open(os.path.join(root, 'tools', 'standard.css'), encoding='utf-8').read()
assert css.count('{') == css.count('}'), 'standard.css: unbalanced braces'
rep('</head><body>', '<style id="std-style">\n' + css + '</style>\n</head><body>')
open(os.path.join(root, 'standard.html'), 'w', encoding='utf-8').write(s)
print('standard.html written', len(s))
