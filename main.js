(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const prefersLight = matchMedia('(prefers-color-scheme: light)');
  const TZ = 'Europe/Rome';

  // Small seeded PRNG so the sky looks the same on every visit.
  function mulberry32(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  };

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, 2200);
  }

  /* ---------------- theme ---------------- */

  const isDark = () => {
    const t = root.dataset.theme;
    return t ? t === 'dark' : !prefersLight.matches;
  };
  const token = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  const themeListeners = [];
  function onTheme(fn) { themeListeners.push(fn); }
  function themeChanged() {
    const dark = isDark();
    $('#theme-toggle svg').innerHTML = dark
      ? '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'
      : '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
    $('#theme-toggle').setAttribute('aria-label', dark ? 'Switch to star atlas (light) theme' : 'Switch to night sky (dark) theme');
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = token('--sky');
    themeListeners.forEach((fn) => fn(dark));
  }
  function setTheme(mode) {
    root.dataset.theme = mode;
    store.set('theme', mode);
    themeChanged();
  }
  const saved = store.get('theme');
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  $('#theme-toggle').addEventListener('click', () => setTheme(isDark() ? 'light' : 'dark'));
  prefersLight.addEventListener('change', () => { if (!root.dataset.theme) themeChanged(); });

  /* ---------------- clock ---------------- */

  const fmtTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  const fmtDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
  const tzName = () => {
    try {
      return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, timeZoneName: 'short' })
        .formatToParts(new Date()).find((p) => p.type === 'timeZoneName').value;
    } catch { return 'CET'; }
  };
  function tick() {
    const now = new Date();
    const t = fmtTime.format(now);
    $('#localtime').textContent = t;
    $('#localtime').nextElementSibling.textContent = tzName();
    $('#phone-time').textContent = t;
    $('#widget-time').textContent = t;
    $('#widget-date').textContent = fmtDate.format(now);
  }
  tick();
  setInterval(tick, 15000);

  /* ---------------- moon ---------------- */

  const SYNODIC = 29.530588853;
  const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14);
  function moonInfo(date = new Date()) {
    const days = (date - NEW_MOON_REF) / 864e5;
    const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
    const frac = age / SYNODIC;
    const illum = (1 - Math.cos(2 * Math.PI * frac)) / 2;
    const names = [
      [1.84, 'New Moon'], [5.53, 'Waxing crescent'], [9.22, 'First quarter'], [12.91, 'Waxing gibbous'],
      [16.61, 'Full Moon'], [20.3, 'Waning gibbous'], [23.99, 'Last quarter'], [27.68, 'Waning crescent'], [99, 'New Moon'],
    ];
    const name = names.find(([max]) => age < max)[1];
    const toFull = (((0.5 - frac) % 1) + 1) % 1 * SYNODIC;
    const toNew = (1 - frac) * SYNODIC;
    return { age, frac, illum, name, toFull, toNew };
  }
  function drawMoon(canvas, frac, lit, dark, rim) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const css = canvas.getBoundingClientRect().width || canvas.width;
    canvas.width = canvas.height = Math.round(css * dpr);
    const ctx = canvas.getContext('2d');
    const s = canvas.width, r = s / 2 - 2 * dpr, c = s / 2;
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
    const waxing = frac < 0.5;
    ctx.fillStyle = lit;
    ctx.beginPath(); ctx.arc(c, c, r, -Math.PI / 2, Math.PI / 2, !waxing); ctx.fill();
    const k = Math.cos(2 * Math.PI * frac);
    ctx.fillStyle = k > 0 ? dark : lit;
    ctx.beginPath(); ctx.ellipse(c, c, Math.abs(k) * r, r, 0, 0, Math.PI * 2); ctx.fill();
    if (rim) {
      ctx.strokeStyle = rim; ctx.lineWidth = dpr;
      ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke();
    }
  }
  const moon = moonInfo();
  function renderMoon(dark) {
    const pct = Math.round(moon.illum * 100);
    drawMoon($('#widget-moon-canvas'), moon.frac, '#e8eef8', '#2a3146');
    $('#widget-moon').textContent = `${moon.name} · ${pct}%`;
    drawMoon($('#tonight-moon'), moon.frac,
      dark ? token('--ink') : '#f1e7cb',
      dark ? token('--sky') : token('--ink'),
      token('--rule'));
    $('#tonight-phase').textContent = moon.name;
    const next = moon.toFull < moon.toNew
      ? `full in ${Math.max(1, Math.round(moon.toFull))} d`
      : `new in ${Math.max(1, Math.round(moon.toNew))} d`;
    $('#tonight-meta').textContent = `${pct}% lit · age ${moon.age.toFixed(1)} d · ${next}`;
    $('#tonight-advice').textContent = moon.illum < 0.3
      ? 'A dark night. Good for galaxies and nebulae, if the clouds allow.'
      : moon.illum < 0.7
        ? 'Some moonlight. Fine for clusters, and the terminator shows sharp lunar relief.'
        : 'A bright Moon washes out faint targets. A night for the Moon itself and the planets.';
  }
  onTheme(renderMoon);

  /* ---------------- starfield ---------------- */

  const Sky = (() => {
    const canvas = $('#sky');
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, stars = [], pivot = { x: 0, y: 0 }, rMin = 0, rMax = 0, a0 = 0, a1 = 0;
    let pal = {}, dark = true, raf = 0, last = 0;
    let mx = 0, my = 0, px = 0, py = 0;
    let meteor = null, nextMeteor = performance.now() + 5000;
    const ROT_RANGE = 0.5;
    const TINTS = ['#ffffff', '#ffffff', '#dbe6ff', '#fff2dc', '#ffd8b0', '#c5d6ff'];

    const glow = document.createElement('canvas');
    glow.width = glow.height = 64;
    {
      const g = glow.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,0.9)');
      grd.addColorStop(0.2, 'rgba(255,255,255,0.25)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    }

    function seed() {
      const rnd = mulberry32(1987);
      pivot = { x: w * 0.82, y: -h * 0.35 };
      const corners = [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => ({
        a: Math.atan2(y - pivot.y, x - pivot.x), r: Math.hypot(x - pivot.x, y - pivot.y),
      }));
      rMin = Math.max(10, -pivot.y - 4);
      rMax = Math.max(...corners.map((c) => c.r)) + 20;
      a0 = Math.min(...corners.map((c) => c.a)) - ROT_RANGE - 0.05;
      a1 = Math.max(...corners.map((c) => c.a)) + 0.05;
      const area = 0.5 * (a1 - a0) * (rMax * rMax - rMin * rMin);
      const n = Math.min(2600, Math.round(area / 2100));
      stars = [];
      for (let i = 0; i < n; i++) {
        const r = Math.sqrt(rnd() * (rMax * rMax - rMin * rMin) + rMin * rMin);
        const a = a0 + rnd() * (a1 - a0);
        const m = Math.pow(rnd(), 3.2);           // most stars faint, a few bright
        stars.push({
          r, a,
          size: 0.35 + m * 1.9,
          alpha: 0.25 + m * 0.75,
          depth: 0.2 + rnd() * 0.8,
          tint: TINTS[Math.floor(rnd() * TINTS.length)],
          tw: rnd() < 0.35 ? 0.6 + rnd() * 2.2 : 0,
          ph: rnd() * Math.PI * 2,
        });
      }
    }

    function readPalette() {
      dark = isDark();
      pal = { ink: token('--ink'), rule: token('--rule'), sky: token('--sky') };
    }

    function rotation() {
      if (reducedMotion.matches) return 0;
      const max = Math.max(1, document.documentElement.scrollHeight - h);
      return Math.min(1, window.scrollY / max) * ROT_RANGE;
    }

    function draw(now = performance.now()) {
      ctx.clearRect(0, 0, w, h);
      const rot = rotation();
      const t = now / 1000;
      px += (mx - px) * 0.06; py += (my - py) * 0.06;

      // celestial grid: declination circles and hour lines around an off-screen pole
      ctx.strokeStyle = pal.rule;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const step = 170;
      for (let r = Math.ceil(rMin / step) * step; r < rMax; r += step) {
        ctx.moveTo(pivot.x + r * Math.cos(a0 + rot), pivot.y + r * Math.sin(a0 + rot));
        ctx.arc(pivot.x, pivot.y, r, a0 + rot, a1 + rot);
      }
      for (let a = Math.ceil(a0 / (Math.PI / 12)) * (Math.PI / 12); a < a1; a += Math.PI / 12) {
        ctx.moveTo(pivot.x + rMin * Math.cos(a + rot), pivot.y + rMin * Math.sin(a + rot));
        ctx.lineTo(pivot.x + rMax * Math.cos(a + rot), pivot.y + rMax * Math.sin(a + rot));
      }
      ctx.stroke();

      const animate = !reducedMotion.matches;
      for (const s of stars) {
        const ang = s.a + rot;
        const x = pivot.x + s.r * Math.cos(ang) + px * s.depth * 14;
        const y = pivot.y + s.r * Math.sin(ang) + py * s.depth * 14;
        if (x < -8 || x > w + 8 || y < -8 || y > h + 8) continue;
        if (dark) {
          let a = s.alpha;
          if (animate && s.tw) a *= 0.72 + 0.28 * Math.sin(t * s.tw + s.ph);
          if (s.size > 1.5) {
            ctx.globalAlpha = a * 0.55;
            const g = s.size * 7;
            ctx.drawImage(glow, x - g / 2, y - g / 2, g, g);
          }
          ctx.globalAlpha = a;
          ctx.fillStyle = s.tint;
          if (s.size < 0.9) ctx.fillRect(x - s.size / 2, y - s.size / 2, s.size, s.size);
          else { ctx.beginPath(); ctx.arc(x, y, s.size / 2 + 0.2, 0, Math.PI * 2); ctx.fill(); }
        } else {
          // printed atlas: only the brighter stars, as ink dots with a paper halo
          if (s.size < 0.75) continue;
          const r = s.size * 0.9;
          ctx.globalAlpha = 1;
          ctx.fillStyle = pal.sky;
          ctx.beginPath(); ctx.arc(x, y, r + 1.4, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.25 + s.alpha * 0.45;
          ctx.fillStyle = pal.ink;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      if (dark && animate) drawMeteor(now);
    }

    function drawMeteor(now) {
      if (!meteor && now > nextMeteor) {
        const rnd = Math.random;
        meteor = {
          x: w * (0.2 + rnd() * 0.8), y: h * rnd() * 0.45,
          ang: Math.PI * (0.72 + rnd() * 0.12), len: 140 + rnd() * 140,
          start: now, dur: 750 + rnd() * 450,
        };
      }
      if (!meteor) return;
      const p = (now - meteor.start) / meteor.dur;
      if (p >= 1) { meteor = null; nextMeteor = now + 7000 + Math.random() * 11000; return; }
      const travel = meteor.len * 2.2 * p;
      const hx = meteor.x + Math.cos(meteor.ang) * travel;
      const hy = meteor.y + Math.sin(meteor.ang) * travel;
      const tx = hx - Math.cos(meteor.ang) * meteor.len;
      const ty = hy - Math.sin(meteor.ang) * meteor.len;
      const fade = Math.sin(Math.PI * p);
      const grd = ctx.createLinearGradient(tx, ty, hx, hy);
      grd.addColorStop(0, 'rgba(255,255,255,0)');
      grd.addColorStop(1, `rgba(235,245,255,${0.85 * fade})`);
      ctx.strokeStyle = grd;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;   // ~30 fps is plenty for a sky
      last = now;
      draw(now);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (reducedMotion.matches) { draw(); return; }
      raf = requestAnimationFrame(loop);
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      draw();
    }

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', () => { if (reducedMotion.matches) draw(); }, { passive: true });
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX / w - 0.5; my = e.clientY / h - 0.5;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf); else start();
    });
    reducedMotion.addEventListener('change', start);

    return {
      init() { readPalette(); resize(); start(); },
      retheme() { readPalette(); draw(); },
    };
  })();
  onTheme(() => Sky.retheme());

  /* ---------------- phone boot ---------------- */

  const BOOT_LOG = [
    ['0.000000', 'Booting Linux on physical CPU 0x0'],
    ['0.000000', 'Machine model: Volla Phone Plinius'],
    ['0.318442', 'gki: vendor modules loaded'],
    ['0.861305', 'init: OpenHarmony init, pid 1'],
    ['1.120448', 'lxc: halium vendor container up'],
    ['1.398210', 'libhybris: HALs linked in-process'],
    ['1.702913', 'hwc2: panel 1080x2400 online'],
    ['1.881554', 'mali: G615 GPU ready'],
    ['2.045190', 'input: touchscreen registered'],
    ['2.311876', 'audio: speaker and mic ready'],
    ['2.507342', 'camera: provider up over binder'],
    ['2.688017', 'wifi: wlan0 up'],
    ['2.901233', 'ril: modem attached, LTE'],
    ['3.144619', 'samgr: system abilities started'],
    ['3.390071', 'OpenHarmony 7.0 (Oniro)', true],
    ['3.512930', 'launcher: hello, world', true],
  ];
  const screen = $('#screen');
  const logEl = $('#boot-log');
  let bootTimers = [];

  function boot() {
    bootTimers.forEach(clearTimeout);
    bootTimers = [];
    if (reducedMotion.matches) { screen.dataset.stage = 'home'; return; }
    screen.dataset.stage = 'log';
    logEl.textContent = '';
    BOOT_LOG.forEach(([ts, msg, hi], i) => {
      bootTimers.push(setTimeout(() => {
        const line = document.createElement('span');
        const stamp = document.createElement('span');
        stamp.className = 'ts';
        stamp.textContent = `[${ts.padStart(10)}] `;
        line.append(stamp, msg, '\n');
        if (hi) line.className = 'hi';
        logEl.append(line);
      }, 140 + i * 150 + (i > 13 ? 220 : 0)));
    });
    const done = 140 + BOOT_LOG.length * 150 + 600;
    bootTimers.push(setTimeout(() => { screen.dataset.stage = 'splash'; }, done));
    bootTimers.push(setTimeout(() => { screen.dataset.stage = 'home'; }, done + 1300));
  }
  $('#reboot').addEventListener('click', boot);
  $$('.home .app').forEach((app) => app.addEventListener('click', () => {
    app.classList.add('launching');
    setTimeout(() => app.classList.remove('launching'), 260);
  }));

  /* ---------------- bring-up board ---------------- */

  const boardItems = $$('#subsystems li');
  const boardSummary = $('#board-summary');
  let boardTimers = [];
  function summarizeBoard() {
    const settled = boardItems.filter((li) => !li.hasAttribute('data-probing'));
    const ok = settled.filter((li) => li.dataset.state === 'ok').length;
    boardSummary.textContent = `${ok} working · ${settled.length - ok} in progress`;
  }
  $('#board-run').addEventListener('click', () => {
    boardTimers.forEach(clearTimeout);
    boardTimers = [];
    boardItems.forEach((li) => {
      li.setAttribute('data-probing', '');
      $('.ss-state', li).textContent = '…';
    });
    summarizeBoard();
    const stepMs = reducedMotion.matches ? 0 : 200;
    boardItems.forEach((li, i) => {
      boardTimers.push(setTimeout(() => {
        li.removeAttribute('data-probing');
        $('.ss-state', li).textContent = li.dataset.state;
        summarizeBoard();
      }, 300 + i * stepMs));
    });
  });

  /* ---------------- star chart ---------------- */

  const GH = 'https://github.com/frankplus/';
  const CONSTELLATIONS = [
    {
      id: 'machina', name: 'Machina', gen: 'Machinae', sub: 'devices & ports', color: 'var(--halpha)',
      label: { x: 40, y: 52, anchor: 'start' },
      lines: [['plinius', 'x23'], ['x23', 'tablet'], ['x23', 'rpi4'], ['rpi4', 'qemu'], ['qemu', 'plinius']],
      stars: [
        { id: 'plinius', name: 'Volla Phone Plinius', x: 150, y: 150, mag: 6.5, years: 'current port',
          desc: 'A European phone sold as an open device, on a MediaTek Dimensity 7300, now running OpenHarmony 7.0. It is daily-drivable for a developer: screen, Wi-Fi, audio, both cameras, calls, SMS and 4G data, GPS, sensors and the App Store all work, and Android apps can run in an optional Waydroid container. Bluetooth, NFC, fingerprint and video recording are in progress.',
          tags: ['Dimensity 7300', 'Android 14 GKI', 'Halium', 'libhybris', 'Waydroid'],
          links: [['Prague 2026 slides', 'https://github.com/frankplus/presentations/blob/master/OpenHarmony_Technical_Conference_Prague_2026_Bringing_Oniro_to_a_European_Developer_Phone.pdf'], ['Volla Community Days 2026', 'https://www.youtube.com/live/bQt_rtN_ZK0?t=15505']] },
        { id: 'x23', name: 'Volla Phone X23', x: 255, y: 190, mag: 5,
          desc: 'My first phone port, where the hard architectural decisions were made and paid for: the boot approach, the Halium container, the vendor layer, and the graphics and audio plug-ins. The Plinius inherited all of it.',
          tags: ['Halium', 'libhybris', 'LXC'],
          links: [['FOSDEM 2026 talk', 'https://fosdem.org/2026/schedule/event/SYBWKY-bringing_openharmony_to_phones_lessons_from_the_oniro_porting_effort/'], ['board support', GH + 'device_board_oniro']] },
        { id: 'tablet', name: 'Volla Tablet', x: 350, y: 130, mag: 4.4,
          desc: 'The same Halium-based bring-up, carried from phones to a tablet form factor.',
          tags: ['Halium', 'display', 'input'], links: [] },
        { id: 'rpi4', name: 'Raspberry Pi 4', x: 310, y: 285, mag: 4.4,
          desc: 'Yocto BSP layers that build Oniro with OpenHarmony for the Raspberry Pi 4, with CI that builds images and flashes real boards.',
          tags: ['Yocto', 'BitBake', 'BSP'],
          links: [['meta-openharmony', GH + 'meta-openharmony']] },
        { id: 'qemu', name: 'QEMU emulator', x: 170, y: 290, mag: 3.8,
          desc: 'Support packages that run the full platform in an emulator, so app developers can start without any hardware.',
          tags: ['QEMU', 'vendor packages'],
          links: [['vendor_oniro', GH + 'vendor_oniro']] },
      ],
    },
    {
      id: 'pons', name: 'Pons', gen: 'Pontis', sub: 'bridges for apps', color: 'var(--oiii)',
      label: { x: 960, y: 52, anchor: 'end' },
      lines: [['tauri', 'capacitor'], ['capacitor', 'vlc'], ['vlc', 'floris'], ['vlc', 'lichess'], ['tauri', 'browser'], ['browser', 'lichess']],
      stars: [
        { id: 'tauri', name: 'Tauri for OpenHarmony', x: 610, y: 160, mag: 6,
          desc: 'Tauri apps running on OpenHarmony, with the Rust core bridged to ArkTS and patches across tauri, tao and wry.',
          tags: ['Rust', 'ArkTS', 'NAPI', 'ArkWeb'],
          links: [['tauri-ohos', GH + 'tauri-ohos']] },
        { id: 'vlc', name: 'VLC', x: 815, y: 170, mag: 5,
          desc: 'libvlc adapted to OpenHarmony, so the player that plays everything plays there too.',
          tags: ['C', 'libvlc', 'NAPI'],
          links: [['vlc', GH + 'vlc']] },
        { id: 'capacitor', name: 'Capacitor & Ionic', x: 715, y: 115, mag: 4.6,
          desc: 'A platform adapter that lets hybrid web apps built with Capacitor and Ionic run on Oniro through the system WebView.',
          tags: ['TypeScript', 'ArkWeb', 'plugins'], links: [] },
        { id: 'browser', name: 'Oniro Browser', x: 650, y: 275, mag: 4.2,
          desc: 'A web browser for OpenHarmony built on ArkWeb.',
          tags: ['ArkTS', 'ArkWeb'],
          links: [['OniroBrowser', GH + 'OniroBrowser']] },
        { id: 'floris', name: 'FlorisBoard', x: 905, y: 255, mag: 3.8,
          desc: 'The open-source FlorisBoard keyboard, ported as an OpenHarmony input method.',
          tags: ['input method', 'ArkTS'],
          links: [['Floris-OH', GH + 'Floris-OH']] },
        { id: 'lichess', name: 'Lichess', x: 780, y: 292, mag: 3.8,
          desc: 'The Lichess mobile app, brought to OpenHarmony.',
          tags: ['app port'],
          links: [['lichess-ohos', GH + 'lichess-ohos']] },
      ],
    },
    {
      id: 'instrumentum', name: 'Instrumentum', gen: 'Instrumenti', sub: 'tools for developers', color: 'var(--sii)',
      label: { x: 40, y: 598, anchor: 'start' },
      lines: [['ide', 'ci'], ['ci', 'screencast'], ['screencast', 'hwtester'], ['ci', 'agent'], ['agent', 'template'], ['ide', 'agent']],
      stars: [
        { id: 'ide', name: 'Oniro IDE', x: 125, y: 400, mag: 5.6,
          desc: 'A VS Code extension for Oniro app development: build, deploy and debug ArkTS apps without leaving the editor.',
          tags: ['TypeScript', 'VS Code', 'hvigor'],
          links: [['oniro-vscode-ext', GH + 'oniro-vscode-ext']] },
        { id: 'ci', name: 'Mirrors & CI', x: 240, y: 370, mag: 5,
          desc: 'GitHub mirrors of OpenHarmony, with Actions pipelines that keep them in sync, build images, run tests and flash boards.',
          tags: ['GitHub Actions', 'CI/CD'],
          links: [['eclipse-oniro4openharmony', 'https://github.com/eclipse-oniro4openharmony']] },
        { id: 'agent', name: 'Agent-driven development', x: 260, y: 480, mag: 4.8,
          desc: 'Claude Code wired to HDC, hvigor and a custom device MCP server, so an agent can build, install and inspect apps on a real phone.',
          tags: ['MCP', 'HDC', 'hvigor', 'LLM tooling'], links: [] },
        { id: 'screencast', name: 'oniro-screencast', x: 360, y: 425, mag: 4.2,
          desc: "Mirrors an OpenHarmony phone's screen into a browser, using a uitest extension and MJPEG over HTTP.",
          tags: ['C++', 'MJPEG', 'uitest'],
          links: [['oniro-screencast', GH + 'oniro-screencast']] },
        { id: 'hwtester', name: 'oniro-hw-tester', x: 420, y: 520, mag: 3.6,
          desc: 'A test app that exercises hardware features one by one during device bring-up.',
          tags: ['ArkTS', 'testing'],
          links: [['oniro-hw-tester', GH + 'oniro-hw-tester']] },
        { id: 'template', name: 'App template', x: 130, y: 525, mag: 3.4,
          desc: 'A starting point for new Oniro and OpenHarmony apps.',
          tags: ['ArkTS', 'ArkUI'],
          links: [['app-oniro-template', GH + 'app-oniro-template']] },
      ],
    },
    {
      id: 'archivum', name: 'Archivum', gen: 'Archivi', sub: 'research & earlier work', color: 'var(--ink)',
      label: { x: 960, y: 598, anchor: 'end' },
      lines: [['meena', 'tof'], ['tof', 'lod'], ['lod', 'csweb'], ['lod', 'iot'], ['iot', 'antonbot']],
      stars: [
        { id: 'meena', name: 'Meena chatbot', x: 600, y: 405, mag: 5.8,
          desc: "An open-source implementation of Google's Meena open-domain transformer chatbot, built on Tensor2Tensor. My most-starred repository.",
          tags: ['Python', 'Transformers', '105 ★'],
          links: [['meena-chatbot', GH + 'meena-chatbot']] },
        { id: 'lod', name: 'Deep LOD selection', x: 800, y: 425, mag: 4.8, years: '2021 → 2022',
          desc: 'M.S. thesis. A PyTorch network predicts rendering quality to choose the level of detail in 3D applications, with a Unity pipeline for dataset generation and deployment. Published at EUVIP 2022.',
          tags: ['PyTorch', 'Unity', 'QoE'],
          links: [['paper', 'https://ieeexplore.ieee.org/document/9922742'], ['code', GH + 'Deep-3D-optimization']] },
        { id: 'tof', name: 'ToF + stereo fusion', x: 705, y: 368, mag: 4.6, years: '2019',
          desc: 'B.S. thesis. A residual network in TensorFlow fuses stereo and time-of-flight depth, 7× more accurate than either alone.',
          tags: ['TensorFlow', 'depth sensing'],
          links: [['tof-stereo-fusion', GH + 'tof-stereo-fusion']] },
        { id: 'csweb', name: 'CSPSP on the web', x: 905, y: 380, mag: 4.2, years: '2020',
          desc: 'A C++ 2D game engine compiled to WebAssembly and WebGL, used to bring a PSP homebrew shooter to the browser.',
          tags: ['C++', 'WebAssembly', 'WebGL'],
          links: [['play it', 'cspsp/'], ['engine', GH + 'JGE'], ['game', GH + 'csweb']] },
        { id: 'iot', name: 'IoT proofs of concept', x: 765, y: 520, mag: 3.8,
          desc: 'Partner demos with Bosch and Hoperun on Eclipse Kanto and Mosquitto, and a C++ CoAP framework for Linux and Zephyr.',
          tags: ['C++', 'MQTT', 'CoAP', 'Zephyr'], links: [] },
        { id: 'antonbot', name: 'AntonBot', x: 630, y: 530, mag: 3.4,
          desc: 'A chatbot for IRC and Telegram with commands for search, utilities and games.',
          tags: ['Python', 'IRC', 'Telegram'],
          links: [['AntonBot', GH + 'AntonBot']] },
      ],
    },
  ];
  const GREEK = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ'];
  const starIndex = new Map();
  CONSTELLATIONS.forEach((c) => c.stars.forEach((s, i) => {
    s.greek = GREEK[i];
    s.con = c;
    starIndex.set(s.id, s);
  }));

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.append(el);
    return el;
  };

  const chart = $('#chart');
  const card = $('#star-card');
  const legend = $('#legend');
  let selected = 'plinius';

  function buildChart() {
    const rnd = mulberry32(42);
    const grid = svgEl('g', { 'aria-hidden': 'true' }, chart);
    for (let r = 1050; r <= 1750; r += 175) svgEl('circle', { class: 'grid-line', cx: 500, cy: -820, r }, grid);
    for (let a = -60; a <= 60; a += 15) {
      const rad = (90 + a) * Math.PI / 180;
      svgEl('line', { class: 'grid-line', x1: 500 + 900 * Math.cos(rad), y1: -820 + 900 * Math.sin(rad), x2: 500 + 1900 * Math.cos(rad), y2: -820 + 1900 * Math.sin(rad) }, grid);
    }
    for (let i = 0; i < 170; i++) {
      svgEl('circle', { class: 'bg-star', cx: (rnd() * 1000).toFixed(1), cy: (rnd() * 640).toFixed(1), r: (0.5 + rnd() * 1.1).toFixed(2), opacity: (0.15 + rnd() * 0.45).toFixed(2) }, grid);
    }

    CONSTELLATIONS.forEach((c) => {
      const g = svgEl('g', { style: `--c: ${c.color}` }, chart);
      const byId = Object.fromEntries(c.stars.map((s) => [s.id, s]));
      c.lines.forEach(([a, b]) => svgEl('line', { class: 'c-line', x1: byId[a].x, y1: byId[a].y, x2: byId[b].x, y2: byId[b].y, 'aria-hidden': 'true' }, g));
      const name = svgEl('text', { class: 'c-name', x: c.label.x, y: c.label.y, 'text-anchor': c.label.anchor, 'aria-hidden': 'true' }, g);
      name.textContent = c.name;
      const sub = svgEl('text', { class: 'c-sub', x: c.label.x, y: c.label.y + 22, 'text-anchor': c.label.anchor, 'aria-hidden': 'true' }, g);
      sub.textContent = c.sub;

      c.stars.forEach((s) => {
        const sg = svgEl('g', {
          class: 'star', transform: `translate(${s.x} ${s.y})`, tabindex: '0', role: 'button',
          'aria-label': `${s.greek} ${c.gen}: ${s.name}`, 'data-star': s.id,
        }, g);
        svgEl('circle', { class: 'star-halo', r: s.mag * 2.6 }, sg);
        svgEl('circle', { class: 'star-core', r: s.mag * 0.85 }, sg);
        const ring = svgEl('g', { class: 'star-ring' }, sg);
        const rr = s.mag + 9;
        svgEl('circle', { r: rr, fill: 'none' }, ring);
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => svgEl('line', {
          class: 'reticle-mark', x1: dx * (rr + 3), y1: dy * (rr + 3), x2: dx * (rr + 9), y2: dy * (rr + 9),
        }, ring));
        svgEl('circle', { r: rr + 12, fill: 'transparent' }, sg);   // generous hit area
        const right = s.x > 800;
        const label = svgEl('text', { class: 'star-label', x: right ? -(rr + 14) : rr + 14, y: 4.5, 'text-anchor': right ? 'end' : 'start' }, sg);
        label.textContent = `${s.greek} ${s.name}`;
        sg.addEventListener('click', () => select(s.id));
        sg.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(s.id); }
        });
        sg.addEventListener('pointerenter', () => hot(s.id, true));
        sg.addEventListener('pointerleave', () => hot(s.id, false));
      });
    });
  }

  function buildLegend() {
    CONSTELLATIONS.forEach((c) => {
      const sec = document.createElement('section');
      sec.style.setProperty('--c', c.color);
      sec.innerHTML = `<h3>${c.name}</h3><p class="legend-sub mono">${c.sub}</p><ul></ul>`;
      const ul = $('ul', sec);
      c.stars.forEach((s) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.star = s.id;
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = `<span class="greek">${s.greek}</span><span></span>`;
        btn.lastChild.textContent = s.name;
        btn.addEventListener('click', () => {
          select(s.id);
          if (window.matchMedia('(max-width: 1000px)').matches) card.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        });
        btn.addEventListener('pointerenter', () => hot(s.id, true));
        btn.addEventListener('pointerleave', () => hot(s.id, false));
        li.append(btn);
        ul.append(li);
      });
      legend.append(sec);
    });
  }

  function hot(id, on) {
    $$(`[data-star="${id}"]`).forEach((el) => el.classList.toggle('is-hot', on));
  }

  function select(id) {
    selected = id;
    const s = starIndex.get(id);
    $$('#chart .star').forEach((el) => el.classList.toggle('is-selected', el.dataset.star === id));
    $$('#legend button').forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.star === id)));
    // bring the selected star to the front so its label isn't hidden
    const node = $(`#chart .star[data-star="${id}"]`);
    const hadFocus = document.activeElement === node;
    node.parentNode.append(node);
    if (hadFocus) node.focus();

    card.style.setProperty('--c', s.con.color);
    card.innerHTML = '';
    const des = document.createElement('p');
    des.className = 'designation mono';
    des.textContent = `${s.greek} ${s.con.gen}`;
    const h = document.createElement('h3');
    h.textContent = s.name;
    const meta = document.createElement('p');
    meta.className = 'meta mono';
    meta.textContent = [s.years, `${s.con.name}, ${s.con.sub}`].filter(Boolean).join(' · ');
    const desc = document.createElement('p');
    desc.className = 'desc';
    desc.textContent = s.desc;
    const tags = document.createElement('ul');
    tags.className = 'tags';
    s.tags.forEach((t) => { const li = document.createElement('li'); li.textContent = t; tags.append(li); });
    card.append(des, h, meta, desc, tags);
    if (s.links.length) {
      const links = document.createElement('div');
      links.className = 'card-links';
      s.links.forEach(([label, url]) => {
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = `${label} ↗`;
        links.append(a);
      });
      card.append(links);
    }
  }

  buildChart();
  buildLegend();
  select(selected);

  /* ---------------- observation log ---------------- */

  const ECLIPSE_GEAR = '12 August 2026 · Nikon D5300 · Tamron 70–300 mm';
  const PHOTOS = [
    { id: 'eclipse-totality', title: 'Totality', meta: ECLIPSE_GEAR,
      desc: "The corona, the Sun's outer atmosphere, shows only while the Moon covers the whole disc.",
      alt: "The Moon's black disc surrounded by the glowing white-gold corona during totality" },
    { id: 'eclipse-hdr', title: 'HDR corona', meta: `${ECLIPSE_GEAR} · HDR merge`,
      desc: 'Several exposures merged so the bright inner corona and the faint outer streamers fit in one frame.',
      alt: 'HDR image of the solar corona, with long streamers radiating around the dark Moon' },
    { id: 'eclipse-diamond-ring', title: 'Diamond ring', meta: ECLIPSE_GEAR,
      desc: "A single point of sunlight at the Moon's edge, seconds from totality.",
      alt: "Diamond ring effect: one brilliant point of sunlight on the edge of the Moon's disc, in a red-orange glow" },
    { id: 'eclipse-bailys-beads', title: "Baily's beads", meta: ECLIPSE_GEAR,
      desc: "Sunlight slipping through valleys on the Moon's edge, next to a pink prominence.",
      alt: "Baily's beads: bright points of sunlight along the edge of the Moon, with a pink prominence" },
    { id: 'eclipse-sequence', title: 'The whole eclipse', meta: `${ECLIPSE_GEAR} · composite`, big: 1093,
      desc: 'The partial phases and totality composited into one frame, arcing down over the rooftops.',
      alt: 'Composite of the eclipse phases arcing down over rooftops and trees, from partial crescents to totality' },
    { id: 'eclipse-sunset', title: 'Eclipsed sunset', meta: ECLIPSE_GEAR,
      desc: 'The Sun went down still partly eclipsed, a crescent sinking behind the trees.',
      alt: 'The partly eclipsed Sun as an orange crescent setting behind a line of trees' },
    { id: 'm31', title: 'Andromeda Galaxy (M31)', meta: 'September 2026 · Nikon D5300 · Tamron 70–300 mm · Star Adventurer · Siril, GraXpert, GHS, StarNet',
      alt: 'The Andromeda Galaxy as a tilted spiral among dense stars, with a small companion galaxy below it' },
    { id: 'moon', title: 'Waxing gibbous Moon', meta: '19 October 2026 · Sky-Watcher 72ED + reducer · Nikon D3500 · stacked in Siril', big: 1016,
      alt: 'Waxing gibbous Moon in sharp detail, with craters standing out along the terminator' },
    { id: 'moon-portrait', title: 'Reaching for the Moon', meta: '24 October 2026 · Sky-Watcher 72ED · Nikon D5300 · focus blend of 2 frames',
      alt: 'Silhouette of a person with long hair, seen from behind, pointing up at a nearly full Moon in a blue-grey evening sky' },
  ];
  const photoIndex = new Map(PHOTOS.map((p, i) => [p.id, i]));
  const photoSrc = (id, size) => `assets/photos/${id}-${size}.jpg`;

  const eclipseMain = $('#eclipse-main');
  const eclipseOpen = eclipseMain.closest('.obs-open');
  function showFrame(id) {
    const p = PHOTOS[photoIndex.get(id)];
    eclipseMain.srcset = `${photoSrc(id, 800)} 800w, ${photoSrc(id, 1600)} ${p.big || 1600}w`;
    eclipseMain.src = photoSrc(id, 800);
    eclipseMain.alt = p.alt;
    eclipseOpen.dataset.photo = id;
    eclipseOpen.setAttribute('aria-label', `View ${p.title} full size`);
    $('#eclipse-frame-title').textContent = p.title;
    $('#eclipse-frame-desc').textContent = p.desc;
    $$('#eclipse-strip .frame').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.photo === id)));
  }
  $$('#eclipse-strip .frame').forEach((b) => b.addEventListener('click', () => showFrame(b.dataset.photo)));

  const lightbox = $('#lightbox');
  const lbImg = $('#lb-img');
  let lbPos = 0;
  function showPhoto(i) {
    lbPos = (i + PHOTOS.length) % PHOTOS.length;
    const p = PHOTOS[lbPos];
    lbImg.src = photoSrc(p.id, 1600);
    lbImg.alt = p.alt;
    $('#lb-title').textContent = p.title;
    $('#lb-meta').textContent = p.meta;
    $('#lb-count').textContent = `${lbPos + 1} / ${PHOTOS.length}`;
  }
  $$('.obs-open').forEach((b) => b.addEventListener('click', () => {
    showPhoto(photoIndex.get(b.dataset.photo));
    if (!lightbox.open) lightbox.showModal();
  }));
  $('#lb-prev').addEventListener('click', () => showPhoto(lbPos - 1));
  $('#lb-next').addEventListener('click', () => showPhoto(lbPos + 1));
  $('#lb-close').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') showPhoto(lbPos - 1);
    else if (e.key === 'ArrowRight') showPhoto(lbPos + 1);
  });
  let swipeX = null;
  lightbox.addEventListener('pointerdown', (e) => { swipeX = e.clientX; });
  lightbox.addEventListener('pointerup', (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 50) showPhoto(lbPos + (dx < 0 ? 1 : -1));
  });

  /* ---------------- copy email ---------------- */

  $('#copy-email').addEventListener('click', () => {
    const address = $('#email').textContent.trim();
    const fallback = () => {
      const range = document.createRange();
      range.selectNodeContents($('#email'));
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      toast('Address selected. Press Ctrl+C to copy.');
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(address).then(() => toast(`Copied ${address}`), fallback);
    } else fallback();
  });

  /* ---------------- shell ---------------- */

  const shell = $('#shell');
  const out = $('#shell-out');
  const input = $('#shell-input');
  const history = [];
  let histPos = 0;

  function print(text, cls = 'res') {
    const line = document.createElement('div');
    line.className = cls;
    line.textContent = text;
    out.append(line);
    out.scrollTop = out.scrollHeight;
  }
  const SECTIONS = ['about', 'bring-up', 'projects', 'talks', 'after-dark', 'contact'];
  function go(id) {
    shell.close();
    $(`#${id}`).scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }

  const COMMANDS = {
    help: () => [
      'available commands:',
      '  whoami            who runs this place',
      '  ls                list sections',
      '  cd <section>      jump to a section',
      '  projects          list projects by constellation',
      '  talks             list talks',
      '  moon              tonight\'s moon over Veneto',
      '  neofetch          system information',
      '  theme [dark|light]  switch the sky',
      '  reboot            boot the phone again',
      '  contact           how to reach me',
      '  clear, exit',
    ].join('\n'),
    whoami: () => 'francesco — open-source engineer, Eclipse Oniro PMC Lead.\nI bring OpenHarmony to hardware that wasn\'t built for it.',
    ls: () => SECTIONS.map((s) => `${s}/`).join('  ') + '  README.md',
    pwd: () => '/home/visitor',
    cd: (arg) => {
      const id = (arg || '').replace(/\/$/, '').replace(/^~?\/?/, '');
      if (!id || id === '~') return 'already home.';
      if (!SECTIONS.includes(id)) return [`cd: no such section: ${id}`, 'err'];
      go(id);
      return null;
    },
    cat: (arg) => {
      if (arg === 'README.md') return COMMANDS.whoami();
      return [`cat: ${arg || ''}: try 'ls', or 'cd' into a section`, 'err'];
    },
    projects: () => CONSTELLATIONS.map((c) => `${c.name} (${c.sub})\n` + c.stars.map((s) => `  ${s.greek}  ${s.name}`).join('\n')).join('\n'),
    talks: () => $$('.talk').map((t) => {
      const year = $('.talk-year', t).textContent;
      const event = $('.talk-event', t).firstChild.textContent.trim();
      return `${year}  ${event.padEnd(34)} ${$('.talk-title', t).textContent}`;
    }).join('\n'),
    moon: () => `${moon.name}, ${Math.round(moon.illum * 100)}% illuminated, ${moon.age.toFixed(1)} days old.`,
    neofetch: () => [
      '      .        visitor@frankplus',
      '   *     .     -----------------',
      '      ✦        OS: OpenHarmony 7.0 (Oniro)',
      '  .       *    Host: Volla Phone Plinius',
      '     .         Kernel: Android 14 GKI, via Halium',
      '  *    .   .   Shell: zsh, modal editor',
      '               Role: PMC Lead, Eclipse Oniro',
      '               Location: 45.69°N 11.71°E',
      '               Telescope: Sky-Watcher 72ED',
      '               Cameras: Nikon D5300, D3500',
    ].join('\n'),
    uname: () => 'OpenHarmony frankplus 7.0 aarch64 Oniro',
    date: () => new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: TZ }).format(new Date()),
    theme: (arg) => {
      const mode = arg === 'light' || arg === 'dark' ? arg : (isDark() ? 'light' : 'dark');
      setTheme(mode);
      return [`theme: ${mode === 'dark' ? 'night sky' : 'star atlas'}`, 'ok'];
    },
    reboot: () => {
      shell.close();
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      boot();
      return null;
    },
    contact: () => 'email   pham.francesco@gmail.com\ngithub  github.com/frankplus\nlinkedin  in/francesco-pham-54128486',
    email: () => COMMANDS.contact(),
    hdc: () => ['[Fail]No any target. Try \'reboot\' instead.', 'err'],
    sudo: () => ['visitor is not in the sudoers file. This incident will be reported.', 'err'],
    echo: (arg) => arg || '',
    clear: () => { out.textContent = ''; return null; },
    exit: () => { shell.close(); return null; },
  };

  function run(line) {
    const trimmed = line.trim();
    print(`visitor@frankplus:~$ ${trimmed}`, 'cmd');
    if (!trimmed) return;
    history.push(trimmed);
    histPos = history.length;
    const [cmd, ...rest] = trimmed.split(/\s+/);
    const fn = COMMANDS[cmd.toLowerCase()];
    if (!fn) { print(`${cmd}: command not found. Type 'help'.`, 'err'); return; }
    const res = fn(rest.join(' '));
    if (res == null) return;
    if (Array.isArray(res)) print(res[0], res[1]); else print(res);
  }

  function openShell() {
    if (shell.open) return;
    if (!out.childElementCount) print("Connected to frankplus. Type 'help' to see what you can do.", 'ok');
    shell.showModal();
    input.focus();
  }
  $('#shell-open').addEventListener('click', openShell);
  $$('[data-open-shell]').forEach((b) => b.addEventListener('click', openShell));
  $('#shell-close').addEventListener('click', () => shell.close());
  shell.addEventListener('click', (e) => { if (e.target === shell) shell.close(); });
  $('#shell-form').addEventListener('submit', (e) => {
    e.preventDefault();
    run(input.value);
    input.value = '';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && histPos > 0) { histPos--; input.value = history[histPos]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { histPos = Math.min(history.length, histPos + 1); input.value = history[histPos] || ''; e.preventDefault(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const [cmd, arg] = input.value.split(/\s+/);
      if (arg !== undefined && cmd === 'cd') {
        const hit = SECTIONS.find((s) => s.startsWith(arg));
        if (hit) input.value = `cd ${hit}`;
      } else {
        const hit = Object.keys(COMMANDS).find((k) => k.startsWith(cmd));
        if (hit) input.value = `${hit} `;
      }
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
    e.preventDefault();
    openShell();
  });

  /* ---------------- start ---------------- */

  themeChanged();
  Sky.init();
  boot();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderMoon(isDark()), 150);
  });
  // web fonts can change layout; redraw once they settle
  document.fonts?.ready.then(() => renderMoon(isDark()));
})();
