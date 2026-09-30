/* CREATURES-V2 — five new mascots, drops in alongside v1.
 *
 * Inject AFTER creatures.js so they share the same .creatures-layer container
 * if v1 is loaded, otherwise create their own.
 *
 * Cast (per user request):
 *   - Hover Hound  — fox/dog that follows the cursor at a 60-80px lag with wagging tail
 *   - Idle Yawner  — appears after 60s of cursor inactivity, stretches, yawns,
 *                    falls asleep with floating Z's, runs off when you move
 *   - Konami Cat   — appears ONLY after Konami code (↑↑↓↓←→←→ba), walks across, sits, leaves
 *   - Update Stork — flies in once per session carrying a real "what's new" banner
 *                    (reads /data/info-update/digest-latest.md if present, else uses
 *                    a small built-in rotation)
 *   - Code Caterpillar — crawls along visible <pre><code> blocks, highlighting tokens
 */
(function () {
  'use strict';
  if (window.__creaturesV2Loaded) return;
  window.__creaturesV2Loaded = true;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.innerWidth < 600) return;

  // ---- Styles (scoped, prefix v2) ----
  var css = `
  .v2-layer { position: fixed; inset: 0; pointer-events: none; z-index: 9001; }
  .v2-creature { position: absolute; pointer-events: auto; cursor: pointer; will-change: transform; }
  .v2-creature.no-cursor { pointer-events: none; cursor: default; }
  .v2-creature svg { display: block; overflow: visible; }

  /* (Hover Hound removed — was distracting per user feedback.) */

  /* ---- Idle Yawner ---- */
  .v2-yawner { width: 36px; height: 32px; opacity: 0; transition: opacity 600ms; pointer-events: none; }
  .v2-yawner.show { opacity: 1; }
  .v2-yawner.dash { animation: yawner-dash 0.7s ease-in forwards; }
  @keyframes yawner-dash { 0% { opacity: 1; } 100% { transform: translate3d(120px,-30px,0) rotate(35deg) scale(0.6); opacity: 0; } }
  .v2-yawner-z {
    position: absolute; right: -2px; top: -8px;
    font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 700; color: #00d4ff;
    opacity: 0; pointer-events: none;
  }
  .v2-yawner.sleep .v2-yawner-z { animation: zfloat 2s ease-out infinite; }
  .v2-yawner.sleep .v2-yawner-z.b { animation-delay: 0.66s; }
  .v2-yawner.sleep .v2-yawner-z.c { animation-delay: 1.33s; }
  @keyframes zfloat { 0% { opacity: 0; transform: translate(0,0) scale(0.5); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(14px,-22px) scale(1.4); } }
  .v2-yawner-mouth { transition: transform 240ms ease, height 240ms ease; transform-origin: 50% 50%; }
  .v2-yawner.yawn .v2-yawner-mouth { transform: scale(1.6, 2); }
  .v2-yawner-arm { transform-origin: 50% 100%; transition: transform 380ms ease; }
  .v2-yawner.stretch .v2-yawner-arm.l { transform: rotate(-40deg); }
  .v2-yawner.stretch .v2-yawner-arm.r { transform: rotate(40deg); }
  .v2-yawner-eye { transition: transform 120ms; transform-origin: center; }
  .v2-yawner.sleep .v2-yawner-eye { transform: scaleY(0.06); }

  /* ---- Konami Cat ---- */
  .v2-kcat { width: 30px; height: 22px; bottom: 38px; left: -40px; transform: translate3d(0,0,0); }
  .v2-kcat-head { transform-origin: 50% 100%; transition: transform 240ms; }
  .v2-kcat.sit .v2-kcat-head { transform: rotate(-6deg); }
  .v2-kcat-tail { transform-origin: 0% 50%; animation: kcat-tail 0.7s ease-in-out infinite alternate; }
  @keyframes kcat-tail { from { transform: rotate(-15deg); } to { transform: rotate(15deg); } }
  .v2-kcat-body { fill: #1c1d20; }
  .v2-kcat-eye { fill: #ff9f1c; }

  /* ---- Update Stork ---- */
  .v2-stork-banner {
    position: fixed; top: 80px; left: -480px;
    background: linear-gradient(135deg, rgba(0,212,255,0.18), rgba(167,139,250,0.18));
    backdrop-filter: blur(14px);
    border: 1px solid rgba(0,212,255,0.4);
    border-radius: 12px;
    padding: 10px 16px 10px 14px;
    color: #fff;
    font-family: 'Inter', sans-serif; font-size: 0.86rem; line-height: 1.35;
    box-shadow: 0 12px 36px -12px rgba(0,212,255,0.35);
    display: flex; align-items: center; gap: 12px;
    max-width: 460px;
    opacity: 0;
    transition: opacity 380ms;
    z-index: 9050;
    cursor: pointer; pointer-events: auto;
  }
  .v2-stork-banner.fly { animation: stork-fly 12s cubic-bezier(0.45,0,0.55,1) forwards; opacity: 1; }
  .v2-stork-banner:hover { border-color: var(--cyan, #00d4ff); }
  .v2-stork-banner .stork-icon { font-size: 1.4rem; }
  .v2-stork-banner .stork-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; letter-spacing: 1.6px; text-transform: uppercase; color: rgba(0,212,255,0.95); margin-bottom: 2px; }
  .v2-stork-banner .stork-text { color: rgba(255,255,255,0.95); }
  @keyframes stork-fly {
    0%   { left: -480px; transform: translateY(0); }
    8%   { left: 24px; transform: translateY(0); }
    78%  { left: 24px; transform: translateY(0); }
    100% { left: calc(100vw + 20px); transform: translateY(-12px); }
  }
  .v2-stork-banner.dismissed { animation: stork-dismiss 350ms ease-in forwards; }
  @keyframes stork-dismiss { to { opacity: 0; transform: translateX(-30px); } }

  /* ---- Token Nibbler ---- */
  .v2-nibbler { position: fixed; bottom: 4px; left: 0; width: 18px; height: 12px; pointer-events: none; will-change: transform; z-index: 9001; }
  .v2-nibbler svg { width: 100%; height: 100%; overflow: visible; }
  .v2-nibbler .nib-body { fill: #818cf8; }
  .v2-nibbler .nib-eye { fill: #fff; }
  .v2-nibbler .nib-leg { stroke: #818cf8; stroke-width: 1; transform-origin: 50% 0%; transition: transform 110ms ease; }
  .v2-nibbler.step-a .nib-leg.l { transform: rotate(15deg); }
  .v2-nibbler.step-a .nib-leg.r { transform: rotate(-15deg); }
  .v2-nibbler.step-b .nib-leg.l { transform: rotate(-15deg); }
  .v2-nibbler.step-b .nib-leg.r { transform: rotate(15deg); }
  .v2-token { position: fixed; pointer-events: none; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; font-weight: 600; color: var(--accent, #00d4ff); opacity: 0; transition: opacity 1.6s ease-out, transform 1.6s ease-out; z-index: 9000; text-shadow: 0 0 6px rgba(0,212,255,0.55); }
  .v2-token.show { opacity: 0.85; }

  /* ---- Lurker's Eyes ---- */
  .v2-lurker { position: absolute; pointer-events: none; opacity: 0; transition: opacity 200ms; z-index: 9002; }
  .v2-lurker.show { opacity: 1; }
  .v2-lurker .lurker-eye {
    display: inline-block; width: 6px; height: 6px; border-radius: 50%;
    background: #fff; box-shadow: 0 0 8px rgba(0,212,255,0.95), 0 0 2px rgba(255,255,255,0.85);
    margin-right: 4px;
  }
  .v2-lurker .lurker-eye:last-child { margin-right: 0; }
  .v2-lurker.blink .lurker-eye { transform: scaleY(0.05); transition: transform 80ms; }

  /* ---- Code Caterpillar ---- */
  .v2-cat-pillar { width: 26px; height: 8px; pointer-events: none; }
  .v2-cat-pillar svg { width: 100%; height: 100%; }
  .v2-cat-pillar circle { fill: #00d4ff; }
  .v2-cat-pillar circle.b { fill: #818cf8; }
  .v2-cat-pillar circle.c { fill: #a78bfa; }
  .v2-cat-glow {
    position: absolute; pointer-events: none; height: 1.4em;
    background: linear-gradient(90deg, transparent, rgba(0,212,255,0.20), transparent);
    border-radius: 4px;
    box-shadow: 0 0 8px rgba(0,212,255,0.45);
    transition: opacity 300ms;
  }

  @media (prefers-reduced-motion: reduce) {
    /* Freeze, do not delete: the static living layer still carries the design
       (DESIGN-BRIEF quality floor; L1 BQR finding). */
    .v2-creature, .v2-stork-banner, .v2-cat-pillar { animation: none !important; transition: none !important; }
  }
  `;
  var style = document.createElement('style');
  style.id = 'creatures-v2-styles';
  style.textContent = css;
  document.head.appendChild(style);

  // ---- Reuse v1 layer if present, else create a new one ----
  var layer = document.querySelector('.creatures-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'v2-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }

  // ---- Cursor tracking (shared) ----
  var cursor = { x: -9999, y: -9999, lastMoveAt: performance.now(), tx: -9999, ty: -9999 };
  window.addEventListener('mousemove', function (e) {
    cursor.tx = e.clientX; cursor.ty = e.clientY;
    cursor.lastMoveAt = performance.now();
  }, { passive: true });

  // ============================================================
  // (1. HOVER HOUND removed)
  // 2. IDLE YAWNER
  // ============================================================
  var yawner = document.createElement('div');
  yawner.className = 'v2-creature v2-yawner no-cursor';
  yawner.innerHTML = `
    <svg viewBox="0 0 36 32">
      <rect class="v2-yawner-arm l" x="2"  y="14" width="3" height="9" rx="1.5" fill="#a78bfa"/>
      <rect class="v2-yawner-arm r" x="31" y="14" width="3" height="9" rx="1.5" fill="#a78bfa"/>
      <ellipse cx="18" cy="18" rx="11" ry="9" fill="#a78bfa"/>
      <ellipse cx="18" cy="18" rx="9" ry="7" fill="#a78bfa" opacity="0.6"/>
      <circle class="v2-yawner-eye" cx="14" cy="16" r="1.2" fill="#1c1d20"/>
      <circle class="v2-yawner-eye" cx="22" cy="16" r="1.2" fill="#1c1d20"/>
      <ellipse class="v2-yawner-mouth" cx="18" cy="21" rx="2.2" ry="1.4" fill="#1c1d20"/>
      <rect x="6"  y="26" width="3" height="6" rx="1.5" fill="#a78bfa"/>
      <rect x="27" y="26" width="3" height="6" rx="1.5" fill="#a78bfa"/>
    </svg>
    <span class="v2-yawner-z a">Z</span>
    <span class="v2-yawner-z b">Z</span>
    <span class="v2-yawner-z c">Z</span>
  `;
  layer.appendChild(yawner);
  var yawnerState = { phase: 'hidden', shownAt: 0, x: 0, y: 0 };

  function yawnerWake() {
    if (yawnerState.phase === 'hidden') return;
    yawner.classList.add('dash');
    yawnerState.phase = 'hidden';
    setTimeout(function () {
      yawner.classList.remove('show', 'sleep', 'yawn', 'stretch', 'dash');
      yawner.style.transform = '';
    }, 750);
  }
  function yawnerAppear() {
    if (yawnerState.phase !== 'hidden') return;
    /* spawn near a corner of the viewport so it doesn't compete with content */
    yawnerState.x = window.innerWidth - 80 - Math.random() * 200;
    yawnerState.y = window.innerHeight - 100 - Math.random() * 80;
    yawner.style.transform = 'translate3d(' + yawnerState.x + 'px,' + yawnerState.y + 'px,0)';
    yawner.classList.add('show', 'stretch');
    yawnerState.phase = 'stretch';
    yawnerState.shownAt = performance.now();
    setTimeout(function () {
      if (yawnerState.phase === 'hidden') return;
      yawner.classList.remove('stretch'); yawner.classList.add('yawn');
      yawnerState.phase = 'yawn';
    }, 1400);
    setTimeout(function () {
      if (yawnerState.phase === 'hidden') return;
      yawner.classList.remove('yawn'); yawner.classList.add('sleep');
      yawnerState.phase = 'sleep';
    }, 2800);
  }

  // ============================================================
  // 3. KONAMI CAT
  // ============================================================
  var KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  var konamiPos = 0;
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === KONAMI[konamiPos] || k.toLowerCase() === KONAMI[konamiPos]) {
      konamiPos++;
      if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        spawnKonamiCat();
      }
    } else {
      konamiPos = (k === KONAMI[0] ? 1 : 0);
    }
  });

  var kcatActive = false;
  function spawnKonamiCat() {
    if (kcatActive) return;
    kcatActive = true;
    var cat = document.createElement('div');
    cat.className = 'v2-creature v2-kcat no-cursor';
    cat.innerHTML = `
      <svg viewBox="0 0 30 22">
        <ellipse class="v2-kcat-body" cx="14" cy="14" rx="10" ry="5"/>
        <circle class="v2-kcat-body v2-kcat-head" cx="22" cy="11" r="5"/>
        <polygon class="v2-kcat-body" points="18,7 19.5,4 21,7.5"/>
        <polygon class="v2-kcat-body" points="22,6 23.5,3 25,6.5"/>
        <circle class="v2-kcat-eye" cx="23" cy="11" r="0.8"/>
        <circle class="v2-kcat-eye" cx="20.5" cy="11" r="0.8"/>
        <path class="v2-kcat-tail" d="M5 14 Q-2 9 -3 14" stroke="#1c1d20" stroke-width="2" fill="none" stroke-linecap="round"/>
        <rect class="v2-kcat-body" x="9"  y="18" width="2" height="3"/>
        <rect class="v2-kcat-body" x="13" y="18" width="2" height="3"/>
        <rect class="v2-kcat-body" x="17" y="18" width="2" height="3"/>
      </svg>
    `;
    layer.appendChild(cat);
    var x = -40; var W = window.innerWidth;
    var startX = -40, sitX = W * 0.4 + Math.random() * 100, exitX = W + 40;
    var phase = 'walk-in';
    var sittingSince = 0;
    function step() {
      if (phase === 'walk-in') {
        x += 1.4;
        cat.style.transform = 'translate3d(' + x + 'px,0,0) scaleX(-1)';
        if (x >= sitX) { phase = 'sit'; sittingSince = performance.now(); cat.classList.add('sit'); }
        requestAnimationFrame(step);
      } else if (phase === 'sit') {
        if (performance.now() - sittingSince > 4000) { phase = 'walk-out'; cat.classList.remove('sit'); }
        cat.style.transform = 'translate3d(' + x + 'px,0,0) scaleX(-1)';
        requestAnimationFrame(step);
      } else if (phase === 'walk-out') {
        x += 1.6;
        cat.style.transform = 'translate3d(' + x + 'px,0,0) scaleX(-1)';
        if (x > exitX) { cat.remove(); kcatActive = false; return; }
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
    if (window.console) console.log('%c✦ ★ KONAMI CAT ★', 'color:#ff9f1c;font-family:monospace;font-size:13px;font-weight:700');
  }

  // ============================================================
  // 4. UPDATE STORK
  // ============================================================
  var STORK_FALLBACK = [
    { eyebrow: 'NEW', text: 'Stack Builder now models multi-GPU VRAM combos with mixed bandwidth' },
    { eyebrow: 'TIP',  text: 'A 70B model at Q4 (~40 GB) does NOT fit on a single 24 GB GPU — most of it offloads to RAM' },
    { eyebrow: 'NEW',  text: 'Cmd-K opens a fast jump bar — search models, pages, or topics anywhere on the site' },
    { eyebrow: 'NOTE', text: 'Quantization guide explains the actual quality drop per Q-level — Q4_K_M ≈ 1% loss for 4× size' }
  ];

  function pickStorkContent() {
    /* Prefer info-update digest if present; else fall back to rotation */
    return new Promise(function (resolve) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/data/info-update/digest-latest.md', true);
        xhr.timeout = 1500;
        xhr.onreadystatechange = function () {
          if (xhr.readyState !== 4) return;
          if (xhr.status === 200 && xhr.responseText) {
            /* extract the first HIGH-severity finding */
            var m = xhr.responseText.match(/🔴 \*\*HIGH\*\*[^—\n]*— ([^\n]+)/);
            if (m) return resolve({ eyebrow: 'CHANGED', text: m[1].trim().slice(0, 160) });
          }
          var pick = STORK_FALLBACK[Math.floor(Math.random() * STORK_FALLBACK.length)];
          resolve(pick);
        };
        xhr.ontimeout = function () {
          var pick = STORK_FALLBACK[Math.floor(Math.random() * STORK_FALLBACK.length)];
          resolve(pick);
        };
        xhr.send();
      } catch (e) {
        var pick = STORK_FALLBACK[Math.floor(Math.random() * STORK_FALLBACK.length)];
        resolve(pick);
      }
    });
  }

  function spawnStork() {
    if (sessionStorage.getItem('storkSeen')) return;
    sessionStorage.setItem('storkSeen', '1');
    pickStorkContent().then(function (content) {
      var b = document.createElement('div');
      b.className = 'v2-stork-banner';
      b.innerHTML = `
        <span class="stork-icon">🦢</span>
        <div>
          <div class="stork-eyebrow">${escapeHtml(content.eyebrow || 'UPDATE')}</div>
          <div class="stork-text">${escapeHtml(content.text)}</div>
        </div>
      `;
      document.body.appendChild(b);
      requestAnimationFrame(function () { b.classList.add('fly'); });
      b.addEventListener('click', function () { b.classList.add('dismissed'); setTimeout(function () { b.remove(); }, 360); });
      setTimeout(function () { if (b.parentNode) b.remove(); }, 12500);
    });
  }
  function escapeHtml(s) { return (s + '').replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  /* spawn once page is settled */
  setTimeout(spawnStork, 4500);

  // ============================================================
  // 5. CODE CATERPILLAR
  // ============================================================
  function spawnCaterpillarOn(codeEl) {
    if (codeEl.__caterpillared) return;
    codeEl.__caterpillared = true;
    var pillar = document.createElement('div');
    pillar.className = 'v2-cat-pillar';
    pillar.innerHTML = `
      <svg viewBox="0 0 26 8">
        <circle class="a" cx="3"  cy="4" r="3"/>
        <circle class="b" cx="9"  cy="4" r="3"/>
        <circle class="c" cx="15" cy="4" r="3"/>
        <circle class="a" cx="21" cy="4" r="3"/>
        <circle cx="3.5" cy="3" r="0.5" fill="#fff"/>
        <circle cx="2.5" cy="3" r="0.5" fill="#fff"/>
      </svg>
    `;
    var glow = document.createElement('div');
    glow.className = 'v2-cat-glow';
    glow.style.width = '60px';
    document.body.appendChild(pillar);
    document.body.appendChild(glow);
    pillar.style.position = 'absolute';
    glow.style.position = 'absolute';

    function rect() { return codeEl.getBoundingClientRect(); }
    var p = 0, lastT = performance.now();
    function step(now) {
      var dt = Math.min(48, now - lastT); lastT = now;
      var r = rect();
      /* if the code block scrolled out of view, despawn */
      if (r.bottom < 0 || r.top > window.innerHeight + 100) {
        pillar.remove(); glow.remove();
        codeEl.__caterpillared = false;
        return;
      }
      p += dt * 0.04; /* px/ms */
      var w = r.width;
      var lineHeight = parseFloat(getComputedStyle(codeEl).lineHeight) || 20;
      var lines = Math.max(1, Math.floor(r.height / lineHeight));
      var totalDist = w * lines;
      var pos = p % totalDist;
      var line = Math.floor(pos / w);
      var x = r.left + window.scrollX + (pos % w);
      var y = r.top  + window.scrollY + line * lineHeight + lineHeight - 6;
      pillar.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      glow.style.transform = 'translate3d(' + (x - 50) + 'px,' + (y - lineHeight + 2) + 'px,0)';
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function scanForCodeBlocks() {
    var blocks = document.querySelectorAll('pre code, pre, code[class*="language"]');
    var picked = [];
    blocks.forEach(function (b) {
      var r = b.getBoundingClientRect();
      if (r.height < 20 || r.width < 80) return;
      if (r.top > window.innerHeight || r.bottom < 0) return;
      picked.push({ el: b, r: r });
    });
    if (!picked.length) return;
    /* pick the largest visible block */
    picked.sort(function (a, b) { return (b.r.width * b.r.height) - (a.r.width * a.r.height); });
    spawnCaterpillarOn(picked[0].el);
  }
  /* try once on load and on scroll (debounced) */
  setTimeout(scanForCodeBlocks, 2500);
  var scrollScan; window.addEventListener('scroll', function () {
    clearTimeout(scrollScan);
    scrollScan = setTimeout(scanForCodeBlocks, 600);
  }, { passive: true });

  // ============================================================
  // 6. TOKEN NIBBLER — bracket-trail bug walking the bottom edge
  // ============================================================
  var nibbler = document.createElement('div');
  nibbler.className = 'v2-nibbler';
  nibbler.innerHTML = `
    <svg viewBox="0 0 18 12">
      <ellipse class="nib-body" cx="9" cy="6" rx="6" ry="3.6"/>
      <circle class="nib-body" cx="14" cy="5" r="2.6"/>
      <circle class="nib-eye" cx="14.6" cy="4.5" r="0.8"/>
      <line class="nib-leg l" x1="6" y1="9" x2="5" y2="12"/>
      <line class="nib-leg r" x1="12" y1="9" x2="13" y2="12"/>
      <line class="nib-leg l" x1="3" y1="9" x2="2" y2="11.5"/>
      <line class="nib-leg r" x1="15" y1="9" x2="16" y2="11.5"/>
    </svg>
  `;
  document.body.appendChild(nibbler);
  var nibbState = {
    x: -30, vx: 0.045, /* px/ms */
    legPhase: 0,
    nextDropAt: performance.now() + 700
  };
  var TOKENS = ['{', '}', '[', ']', '(', ')', ':', ';', '<', '>', '/'];

  function dropToken(x) {
    var t = document.createElement('div');
    t.className = 'v2-token';
    t.textContent = TOKENS[Math.floor(Math.random() * TOKENS.length)];
    t.style.left = (x - 4) + 'px';
    t.style.bottom = '8px';
    t.style.transform = 'translateY(0)';
    document.body.appendChild(t);
    requestAnimationFrame(function () {
      t.classList.add('show');
      requestAnimationFrame(function () {
        t.style.transform = 'translateY(-22px)';
      });
    });
    setTimeout(function () { t.style.opacity = '0'; }, 1100);
    setTimeout(function () { t.remove(); }, 2700);
  }

  // ============================================================
  // 7. LURKER'S EYES — peek out from cards on cursor approach
  // ============================================================
  var lurkerCooldowns = new WeakMap(); /* card → last show timestamp */
  function makeLurker(side) {
    var el = document.createElement('div');
    el.className = 'v2-lurker';
    el.innerHTML = '<span class="lurker-eye"></span><span class="lurker-eye"></span>';
    return el;
  }
  function maybeLurk(cardEl) {
    var last = lurkerCooldowns.get(cardEl) || 0;
    if (performance.now() - last < 6000) return; /* per-card cooldown 6s */
    if (Math.random() > 0.35) return;            /* 35% trigger chance */
    lurkerCooldowns.set(cardEl, performance.now());
    var rect = cardEl.getBoundingClientRect();
    /* pick a random edge of the card to peek from */
    var sides = ['top','right','bottom','left'];
    var side = sides[Math.floor(Math.random() * sides.length)];
    var lurker = makeLurker(side);
    var x = 0, y = 0;
    if (side === 'top')    { x = rect.left + rect.width * (0.2 + Math.random() * 0.6); y = rect.top - 4; }
    if (side === 'bottom') { x = rect.left + rect.width * (0.2 + Math.random() * 0.6); y = rect.bottom + 0; }
    if (side === 'left')   { x = rect.left - 4; y = rect.top + rect.height * (0.2 + Math.random() * 0.6); }
    if (side === 'right')  { x = rect.right + 0; y = rect.top + rect.height * (0.2 + Math.random() * 0.6); }
    /* layer is fixed-positioned — convert to viewport coords */
    lurker.style.left = x + 'px';
    lurker.style.top  = y + 'px';
    lurker.style.position = 'fixed';
    document.body.appendChild(lurker);
    requestAnimationFrame(function () { lurker.classList.add('show'); });
    /* blink once mid-show */
    setTimeout(function () { lurker.classList.add('blink'); setTimeout(function () { lurker.classList.remove('blink'); }, 100); }, 700);
    /* hide */
    setTimeout(function () { lurker.classList.remove('show'); }, 1500);
    setTimeout(function () { lurker.remove(); }, 1900);
  }
  function attachLurkerListeners() {
    var sel = '.dest-card, .catalog-card, .model-card, .primer-card, .matrix-card, .stack-card, .fit-card, .edu-card';
    document.querySelectorAll(sel).forEach(function (card) {
      if (card.__lurkerWired) return;
      card.__lurkerWired = true;
      card.addEventListener('mouseenter', function () { maybeLurk(card); });
    });
  }
  setTimeout(attachLurkerListeners, 1500);
  /* re-scan on DOM mutations / scroll (cards may be lazy-rendered) */
  var lurkRescan; window.addEventListener('scroll', function () {
    clearTimeout(lurkRescan);
    lurkRescan = setTimeout(attachLurkerListeners, 800);
  }, { passive: true });

  // ============================================================
  // SHARED rAF LOOP — drives Hound + Yawner check + Nibbler
  // ============================================================
  var paused = document.hidden;
  document.addEventListener('visibilitychange', function () {
    paused = document.hidden;
    if (!paused) requestAnimationFrame(tick);
  });

  function tick(now) {
    if (paused) return;

    /* Idle yawner */
    var idle = now - cursor.lastMoveAt;
    if (idle > 60000 && yawnerState.phase === 'hidden') {
      yawnerAppear();
    } else if (idle < 1500 && yawnerState.phase !== 'hidden') {
      yawnerWake();
    }

    /* Token Nibbler — walk the bottom edge, occasionally drop a token */
    var dt = 16; // approx — small enough that nibbler walks at consistent feel
    nibbState.x += nibbState.vx * dt;
    if (nibbState.x > window.innerWidth + 30) nibbState.x = -30;
    nibbState.legPhase += dt;
    if (nibbState.legPhase > 240) {
      nibbState.legPhase = 0;
      nibbler.classList.toggle('step-a');
      nibbler.classList.toggle('step-b');
    }
    nibbler.style.transform = 'translate3d(' + nibbState.x + 'px,0,0)';
    if (now > nibbState.nextDropAt && nibbState.x > 0 && nibbState.x < window.innerWidth) {
      dropToken(nibbState.x + 9);
      nibbState.nextDropAt = now + 600 + Math.random() * 1200;
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  if (window.console) console.log('%c✦ creatures v2 — hound · yawner · konami cat · stork · caterpillar', 'color:#a78bfa;font-family:monospace;font-size:11px');
})();
