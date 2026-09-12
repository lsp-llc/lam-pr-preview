/* CREATURES-V1 — tiny AI mascots wandering every page.
 *
 * Single self-contained script. Inject once per page via <script src="/creatures.js" defer></script>.
 * Self-skips on prefers-reduced-motion and on viewports < 600px.
 * All animation is transform-driven (compositor thread); single rAF loop.
 *
 * Cast:
 *   Aibo  — wandering mascot bot at the bottom of the viewport.
 *           Walks, blinks, pauses, hops on click, waves when you go idle 30s.
 *   Gloops — 3 translucent floaters that drift in soft sine waves and gently
 *            avoid the cursor. Pop on click, respawn elsewhere.
 */
(function () {
  'use strict';
  if (window.__creaturesLoaded) return;
  window.__creaturesLoaded = true;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.innerWidth < 600) return; // skip on mobile — too cramped

  // ---- Inject styles once ----
  var css = `
  .creatures-layer { position: fixed; inset: 0; pointer-events: none; z-index: 9000; }
  /* Explicit opacity:1 base — guards against the spawn-fade animation getting
     stuck mid-flight if the tab was hidden at insertion time. */
  .creature { position: absolute; pointer-events: auto; cursor: pointer; will-change: transform; transform-origin: 50% 50%; transition: filter 200ms; opacity: 1; }
  .creature:hover { filter: brightness(1.25); }
  .creature.aibo { width: 28px; height: 32px; bottom: 8px; left: 0; }
  .creature.aibo svg { width: 100%; height: 100%; overflow: visible; }
  .creature.gloop { width: 18px; height: 18px; }
  .aibo-eye { transition: transform 80ms; transform-origin: center; }
  .aibo.blink .aibo-eye { transform: scaleY(0.05); }
  .aibo.hop { animation: aibo-hop 480ms cubic-bezier(0.34,1.56,0.64,1); }
  @keyframes aibo-hop { 0%,100% { transform: translateY(0) scale(1,1); } 30% { transform: translateY(-18px) scale(1.05,0.95); } 60% { transform: translateY(0) scale(0.95,1.08); } }
  .aibo-leg { transition: transform 120ms ease; transform-origin: 50% 0%; }
  .aibo.walk-a .aibo-leg.l { transform: translateY(-1px) rotate(-12deg); }
  .aibo.walk-a .aibo-leg.r { transform: translateY(1px)  rotate(8deg); }
  .aibo.walk-b .aibo-leg.l { transform: translateY(1px)  rotate(8deg); }
  .aibo.walk-b .aibo-leg.r { transform: translateY(-1px) rotate(-12deg); }
  .aibo-bubble {
    position: absolute; bottom: 38px; left: 50%; transform: translateX(-50%) translateY(4px);
    background: rgba(11,15,28,0.95); border: 1px solid rgba(0,212,255,0.45); color: #fff;
    font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.66rem;
    padding: 5px 9px; border-radius: 8px; white-space: nowrap; pointer-events: none;
    opacity: 0; transition: opacity 220ms, transform 220ms; box-shadow: 0 6px 24px -8px rgba(0,212,255,0.35);
  }
  .aibo-bubble.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  .aibo-bubble::after {
    content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
    border: 5px solid transparent; border-top-color: rgba(0,212,255,0.45);
  }
  .aibo.wave .aibo-arm { animation: aibo-wave 1.4s ease-in-out 2; transform-origin: 50% 100%; }
  @keyframes aibo-wave { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-25deg); } 50% { transform: rotate(15deg); } 75% { transform: rotate(-15deg); } }
  .creature.gloop {
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55) 0%, rgba(0,212,255,0.55) 35%, rgba(0,212,255,0.10) 75%, transparent 100%);
    box-shadow: 0 0 12px rgba(0,212,255,0.35), inset 0 0 6px rgba(255,255,255,0.20);
    transition: opacity 600ms;
  }
  .creature.gloop.purple {
    background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55) 0%, rgba(167,139,250,0.55) 35%, rgba(167,139,250,0.10) 75%, transparent 100%);
    box-shadow: 0 0 12px rgba(167,139,250,0.35), inset 0 0 6px rgba(255,255,255,0.20);
  }
  .creature.gloop.pink {
    background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55) 0%, rgba(236,72,153,0.55) 35%, rgba(236,72,153,0.10) 75%, transparent 100%);
    box-shadow: 0 0 12px rgba(236,72,153,0.30), inset 0 0 6px rgba(255,255,255,0.20);
  }
  .creature.gloop.popping { animation: gloop-pop 360ms ease-out forwards; }
  @keyframes gloop-pop { to { transform: scale(2.2); opacity: 0; } }
  /* No keyframe spawn animation — we rely on opacity:1 base + a tiny scale-in
     via transition. Keyframe animations get paused in hidden tabs and can leave
     elements stuck invisible (opacity 0). Transition starting from inline-set
     state is robust. */
  .creature.spawn-fade { animation: scale-pop 360ms ease-out; }
  @keyframes scale-pop { from { transform: scale(0.4); } to { transform: scale(1); } }
  @media (prefers-reduced-motion: reduce) {
    .creature.aibo.hop, .aibo.wave .aibo-arm, .creature.gloop.popping, .creature.spawn-fade { animation: none !important; }
  }
  `;
  var style = document.createElement('style');
  style.id = 'creatures-styles';
  style.textContent = css;
  document.head.appendChild(style);

  // ---- Layer container ----
  var layer = document.createElement('div');
  layer.className = 'creatures-layer';
  layer.setAttribute('aria-hidden', 'true');

  // ---- Aibo ----
  function makeAibo() {
    var el = document.createElement('div');
    el.className = 'creature aibo spawn-fade';
    el.innerHTML = `
      <div class="aibo-bubble" id="aibo-bubble"></div>
      <svg viewBox="0 0 28 32">
        <line x1="14" y1="3" x2="14" y2="9" stroke="#00d4ff" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="14" cy="3" r="1.8" fill="#00d4ff"/>
        <rect x="6" y="9" width="16" height="14" rx="4" fill="#00d4ff" opacity="0.92"/>
        <rect x="6" y="9" width="16" height="14" rx="4" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="0.6"/>
        <circle class="aibo-eye" cx="11" cy="14.5" r="1.6" fill="#fff"/>
        <circle class="aibo-eye" cx="17" cy="14.5" r="1.6" fill="#fff"/>
        <rect class="aibo-arm" x="2" y="14" width="3" height="6" rx="1" fill="#00d4ff" opacity="0.85"/>
        <rect class="aibo-leg l" x="9"  y="22" width="3" height="6" fill="#00d4ff"/>
        <rect class="aibo-leg r" x="16" y="22" width="3" height="6" fill="#00d4ff"/>
      </svg>
    `;
    layer.appendChild(el);
    return el;
  }

  var aibo = makeAibo();
  var aiboState = {
    x: Math.random() * (window.innerWidth - 60) + 30,
    vx: (Math.random() < 0.5 ? -1 : 1) * 0.04, // px/ms
    walkPhase: 0,
    nextBlinkAt: performance.now() + 3000 + Math.random() * 4000,
    nextPauseAt: performance.now() + 7000 + Math.random() * 8000,
    pauseUntil: 0,
    nextThoughtAt: performance.now() + 25000 + Math.random() * 25000,
    bubble: aibo.querySelector('#aibo-bubble')
  };
  var THOUGHTS = [
    'thinking…', 'parsing tokens 🧠', 'cool stack', 'glhf', 'beep', 'nice rig',
    'love this model', 'ooh, new card', 'compiling…', 'attention is all you need',
    '...did anyone else hear that', 'one cycle to go'
  ];

  function showBubble(text, ms) {
    aiboState.bubble.textContent = text;
    aiboState.bubble.classList.add('show');
    setTimeout(function () { aiboState.bubble.classList.remove('show'); }, ms || 2400);
  }

  aibo.addEventListener('click', function (e) {
    e.stopPropagation();
    aibo.classList.add('hop');
    setTimeout(function () { aibo.classList.remove('hop'); }, 520);
    sparkleBurst(aiboState.x + 14, window.innerHeight - 16);
    showBubble('!', 900);
  });

  // ---- Gloops ----
  var GLOOP_COLORS = ['', 'purple', 'pink'];
  function makeGloop(color) {
    var el = document.createElement('div');
    el.className = 'creature gloop spawn-fade ' + (color || '');
    var size = 14 + Math.random() * 12;
    el.style.width = el.style.height = size + 'px';
    var x = Math.random() * (window.innerWidth - size);
    var y = 60 + Math.random() * (window.innerHeight - 220);
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    el._state = {
      x: x, y: y, baseY: y,
      vx: (Math.random() - 0.5) * 0.02,
      vy: 0,
      bobAmp: 8 + Math.random() * 14,
      bobFreq: 0.0008 + Math.random() * 0.0008,
      phase: Math.random() * Math.PI * 2,
      bornAt: performance.now(),
      lifetime: 24000 + Math.random() * 22000,
      size: size,
      dead: false
    };
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      if (el._state.dead) return;
      el._state.dead = true;
      el.classList.add('popping');
      sparkleBurst(el._state.x + size / 2, el._state.y + size / 2, color || 'cyan');
      setTimeout(function () {
        el.remove();
        gloops.splice(gloops.indexOf(el), 1);
        spawnGloop();
      }, 380);
    });
    layer.appendChild(el);
    gloops.push(el);
    return el;
  }
  var gloops = [];
  function spawnGloop() {
    if (gloops.length >= 4) return;
    makeGloop(GLOOP_COLORS[Math.floor(Math.random() * GLOOP_COLORS.length)]);
  }

  // ---- Sparkle burst ----
  function sparkleBurst(cx, cy, color) {
    color = color || 'cyan';
    var hex = color === 'purple' ? '167,139,250'
            : color === 'pink'   ? '236,72,153'
            : '0,212,255';
    for (var i = 0; i < 8; i++) {
      var s = document.createElement('div');
      var ang = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      var dist = 22 + Math.random() * 18;
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      s.style.cssText = `
        position: absolute; left: ${cx}px; top: ${cy}px; width: 4px; height: 4px;
        border-radius: 50%; background: rgb(${hex}); box-shadow: 0 0 6px rgb(${hex});
        pointer-events: none;
        transform: translate(-50%,-50%); opacity: 1;
        transition: transform 540ms cubic-bezier(0.16,1,0.3,1), opacity 540ms ease-out;
      `;
      layer.appendChild(s);
      // force layout, then animate
      void s.offsetWidth;
      s.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.3)`;
      s.style.opacity = '0';
      setTimeout(function (n) { return function () { n.remove(); }; }(s), 600);
    }
  }

  // ---- Cursor + idle tracking ----
  var cursor = { x: -9999, y: -9999, lastMoveAt: performance.now() };
  window.addEventListener('mousemove', function (e) {
    cursor.x = e.clientX; cursor.y = e.clientY;
    cursor.lastMoveAt = performance.now();
    // cancel any idle wave indicator
    aibo.classList.remove('wave');
  }, { passive: true });

  var idleWavedAt = 0;
  function maybeIdleWave(now) {
    if (now - cursor.lastMoveAt < 30000) return;
    if (now - idleWavedAt < 60000) return;
    idleWavedAt = now;
    aibo.classList.add('wave');
    showBubble('hi 👋', 2200);
    setTimeout(function () { aibo.classList.remove('wave'); }, 3200);
  }

  // ---- Boot the loop ----
  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();

  function boot() {
    if (document.querySelector('.creatures-layer')) return; // already booted (defensive)
    document.body.appendChild(layer);
    spawnGloop(); spawnGloop(); spawnGloop();

    var lastT = performance.now();
    var paused = document.hidden;
    document.addEventListener('visibilitychange', function () {
      paused = document.hidden;
      if (!paused) { lastT = performance.now(); requestAnimationFrame(tick); }
    });

    function tick(now) {
      if (paused) return;
      var dt = Math.min(48, now - lastT);
      lastT = now;

      // ---- Aibo ----
      if (!reduced) {
        if (now < aiboState.pauseUntil) {
          // paused — no x update, occasional blink
        } else {
          aiboState.x += aiboState.vx * dt;
          if (aiboState.x < 0)                   { aiboState.x = 0;                                   aiboState.vx = Math.abs(aiboState.vx); }
          if (aiboState.x > window.innerWidth - 28) { aiboState.x = window.innerWidth - 28;            aiboState.vx = -Math.abs(aiboState.vx); }
          // walk leg cycle
          aiboState.walkPhase += dt;
          if (aiboState.walkPhase > 220) {
            aiboState.walkPhase = 0;
            aibo.classList.toggle('walk-a');
            aibo.classList.toggle('walk-b');
          }
        }
        // facing
        var face = aiboState.vx < 0 ? -1 : 1;
        aibo.style.transform = 'translate3d(' + aiboState.x + 'px,0,0) scaleX(' + face + ')';
        // blink
        if (now > aiboState.nextBlinkAt) {
          aibo.classList.add('blink');
          setTimeout(function () { aibo.classList.remove('blink'); }, 110);
          aiboState.nextBlinkAt = now + 3500 + Math.random() * 4500;
        }
        // pause / direction shuffle
        if (now > aiboState.nextPauseAt) {
          aiboState.pauseUntil = now + 800 + Math.random() * 2200;
          aiboState.nextPauseAt = now + 8000 + Math.random() * 12000;
          if (Math.random() < 0.4) aiboState.vx = -aiboState.vx;
        }
        // thought bubble
        if (now > aiboState.nextThoughtAt) {
          showBubble(THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)], 2400);
          aiboState.nextThoughtAt = now + 35000 + Math.random() * 40000;
        }
        // idle wave
        maybeIdleWave(now);
      }

      // ---- Gloops ----
      for (var i = 0; i < gloops.length; i++) {
        var g = gloops[i]; var s = g._state;
        if (s.dead) continue;
        if (!reduced) {
          s.x += s.vx * dt;
          // gentle bobbing
          var t = (now - s.bornAt) * s.bobFreq + s.phase;
          s.y = s.baseY + Math.sin(t) * s.bobAmp;
          // cursor avoidance
          if (cursor.x > -1000) {
            var dx = s.x + s.size / 2 - cursor.x;
            var dy = s.y + s.size / 2 - cursor.y;
            var d2 = dx * dx + dy * dy;
            if (d2 < 14000 && d2 > 4) {
              var inv = 1 / Math.sqrt(d2);
              var f = (14000 - d2) / 14000;
              s.vx += dx * inv * f * 0.0006 * dt;
              s.baseY += dy * inv * f * 0.04 * dt;
            }
          }
          // soft drift toward original baseY
          s.baseY += ((s.y - s.baseY) > 30 ? -0.02 : (s.y - s.baseY) < -30 ? 0.02 : 0) * dt;
          // wrap horizontally
          if (s.x < -40) s.x = window.innerWidth + 20;
          if (s.x > window.innerWidth + 40) s.x = -20;
          // clamp bobbing into vertical range
          if (s.baseY < 60) s.baseY = 60;
          if (s.baseY > window.innerHeight - 80) s.baseY = window.innerHeight - 80;
          // damp velocity
          s.vx *= 0.985;
        }
        g.style.transform = 'translate3d(' + s.x + 'px,' + s.y + 'px,0)';
        // lifetime — fade + respawn
        if (now - s.bornAt > s.lifetime && !s.dead) {
          s.dead = true;
          g.style.transition = 'opacity 700ms';
          g.style.opacity = '0';
          setTimeout(function (el) { return function () {
            el.remove();
            var idx = gloops.indexOf(el);
            if (idx >= 0) gloops.splice(idx, 1);
            spawnGloop();
          }; }(g), 720);
        }
      }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    if (window.console) console.log('%c✦ creatures v1 — aibo + gloops live', 'color:#00d4ff;font-family:monospace;font-size:11px');
  }
})();
