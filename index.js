/* CodeVantage — showcase player + panel router. Data comes from agents.js (AGENTS, FEATURED_COUNT). */
(() => {
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const media = (ag, ext) => `media/${ag.id}.${ext}`;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const appMode = matchMedia('(min-width:900px) and (min-height:560px)'); // keep in sync with index.css
  const SKIP_BROKEN_MS = 4000;

  const root = document.documentElement, work = $('work');
  const vid = $('vid'), dVid = $('dVid'), demoDlg = $('demoDlg'), allDlg = $('allDlg');
  let current = 0;
  let skipTimer = null; // pending "skip the broken video" timeout — must die the moment another agent is chosen

  /* ── showcase: the video is the clock. Steps tick with playback; when it ends the next agent runs. ── */

  /** Which step a playhead position maps to. Returns steps (= "all done") for the last slice of the video. */
  const stepAt = (time, duration, steps) =>
    duration > 0 ? Math.min(steps, Math.floor((time / duration) * (steps + 1))) : 0;

  function renderStep() {
    const { steps } = AGENTS[current], n = steps.length;
    const s = stepAt(vid.currentTime, vid.duration, n);
    [...$('bar').children].forEach((el, k) => el.classList.toggle('done', k <= s));
    $('step').textContent = s >= n ? `✓ ${pad(n)}/${pad(n)} — done. No human touched it.` : `${pad(s + 1)}/${pad(n)} — ${steps[s]}`;
  }

  function play() {
    if (still) { vid.controls = true; return; }            // reduced motion: the visitor presses play
    vid.play().catch(err => {                              // AbortError = src changed mid-load, expected
      if (err.name === 'NotAllowedError') vid.controls = true; // autoplay blocked: hand over the controls
    });
  }

  function go(i) {
    clearTimeout(skipTimer);
    current = i;
    const ag = AGENTS[i], chip = i < FEATURED_COUNT ? String(i) : 'more';
    $('num').textContent = i + 1;
    $('tag').textContent = ag.tag;
    $('name').textContent = ag.name;
    $('bar').innerHTML = ag.steps.map(() => '<span></span>').join('');
    vid.poster = media(ag, 'jpg');
    vid.src = media(ag, 'mp4');
    vid.setAttribute('aria-label', `${ag.name} demo video`);
    document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.i === chip));
    // centre the active chip by scrolling the RAIL only — scrollIntoView would also scroll the page (and any parent frame)
    const rail = $('rail'), active = rail.querySelector(`[data-i="${chip}"]`);
    rail.scrollTo({ left: active.offsetLeft - rail.offsetLeft - (rail.clientWidth - active.offsetWidth) / 2, behavior: still ? 'auto' : 'smooth' });
    renderStep();
    syncPlayback();
  }
  const next = () => go((current + 1) % AGENTS.length);

  vid.addEventListener('timeupdate', renderStep);
  vid.addEventListener('ended', next);
  vid.addEventListener('error', () => {                    // a missing file must not stall the whole reel
    $('step').textContent = 'Demo video unavailable — skipping…';
    clearTimeout(skipTimer);                             // two errors in a row must not stack two skips
    skipTimer = setTimeout(next, SKIP_BROKEN_MS);
  });

  /* ── scroll = fast-forward. Once the showcase is docked there is nothing left to scroll, so the wheel speeds the reel up
        instead and the next agent arrives sooner. Rate snaps back shortly after the wheel stops. ── */
  const FAST_RATE = 2, FAST_RELEASE_MS = 220, DOCK_SETTLE_MS = 700;
  let fastTimer = null, dockedSince = null; // dockedSince: when the showcase became the end of the scroll
  function setFast(on) {
    vid.playbackRate = on ? FAST_RATE : 1;
    $('live').textContent = on ? `▶▶ ${FAST_RATE}× FAST-FORWARD` : 'NOW RUNNING';
    $('live').classList.toggle('fast', on);
  }
  work.addEventListener('wheel', e => {
    syncPlayback();                                  // stamps dockedSince even if no scroll event has reached us yet
    const settled = dockedSince !== null && performance.now() - dockedSince > DOCK_SETTLE_MS; // not the momentum that carried them here
    if (e.deltaY <= 0 || !settled || !appMode.matches || vid.paused) return;
    setFast(true);                                   // re-applied every event: a new src resets playbackRate to 1
    clearTimeout(fastTimer);
    fastTimer = setTimeout(() => setFast(false), FAST_RELEASE_MS);
  }, { passive: true });

  /* ── rail + dialogs ── */

  $('rail').innerHTML = AGENTS.slice(0, FEATURED_COUNT)
    .map((ag, i) => `<button class="chip" type="button" data-i="${i}">${pad(i + 1)} ${ag.short}</button>`).join('')
    + `<button class="chip more" type="button" data-i="more">+${AGENTS.length - FEATURED_COUNT} more agents →</button>`;
  $('rail').addEventListener('click', e => {
    const i = e.target.dataset.i;
    if (i === 'more') openDialog(allDlg); else if (i) go(+i);
  });

  $('allTitle').textContent = `All ${AGENTS.length} agents`;
  $('allGrid').innerHTML = AGENTS.map((ag, i) =>
    `<button class="acard" type="button" data-i="${i}"><img src="${media(ag, 'jpg')}" alt="" loading="lazy" width="960" height="540"><b>${ag.name}</b><small>${ag.blurb}</small></button>`).join('');
  $('allGrid').addEventListener('click', e => {
    const card = e.target.closest('[data-i]');
    if (card) { allDlg.close(); go(+card.dataset.i); }
  });

  $('demoBtn').addEventListener('click', () => {
    const ag = AGENTS[current];
    $('dTag').textContent = ag.tag;
    $('dName').textContent = ag.name;
    $('dBlurb').textContent = ag.blurb;
    $('dSteps').innerHTML = ag.steps.map(s => `<li>${s}</li>`).join('');
    dVid.poster = media(ag, 'jpg');
    dVid.src = media(ag, 'mp4');
    openDialog(demoDlg);
    if (!still) dVid.play().catch(() => { /* controls are visible; the visitor can press play */ });
  });

  function openDialog(dlg) { vid.pause(); dlg.showModal(); }
  [demoDlg, allDlg].forEach(dlg => {
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }); // click on the backdrop
    dlg.addEventListener('close', () => { dVid.pause(); syncPlayback(); });
  });

  /* ── panels: on desktop the hash picks the one visible panel; on small screens they simply stack ── */

  const panels = [...document.querySelectorAll('.panel')];
  const links = [...document.querySelectorAll('.nav a[href^="#"]')];
  const activeId = () => (panels.some(p => p.id === location.hash.slice(1)) ? location.hash.slice(1) : 'work');

  /* The scroll intro (intro.js) turns the Work panel into a scroller with the showcase docked at the very end.
     It is wanted on desktop with motion allowed; html.has-intro switches the layout, and is dropped again if the module fails. */
  const INTRO_WAIT_MS = 2500;                              // slower than this: skip the intro rather than flip the page under the visitor
  let introState = 'idle', introSeen = false;              // idle → pending → ready | failed
  const introWanted = () => appMode.matches && !still && CSS.supports('container-type', 'size'); // the scroll layout is sized in cqh
  const introOn = () => root.classList.contains('has-intro');
  const introPending = () => root.classList.contains('intro-pending');
  const docked = () => work.scrollTop + work.clientHeight >= work.scrollHeight - 2;   // trivially true when there is no intro
  const showcaseLive = () => !appMode.matches || (activeId() === 'work' && !introPending() && (!introOn() || docked()));

  /** The one place that decides whether the reel runs. */
  function syncPlayback() {
    if (docked()) { dockedSince ??= performance.now(); introSeen ||= introOn(); } else dockedSince = null;
    if (showcaseLive() && !demoDlg.open && !allDlg.open) { if (vid.paused) play(); } else vid.pause();
  }

  function syncIntro() {
    const wanted = introWanted();
    root.classList.toggle('intro-pending', wanted && introState === 'pending'); // headline on paper, nothing else, while three.js loads
    root.classList.toggle('has-intro', wanted && introState === 'ready');       // the scroll layout: only once the scene can actually draw
    if (!wanted || introState !== 'idle' || activeId() !== 'work') return;      // ~350 KB of three.js: fetched only if it will show

    introState = 'pending';
    root.classList.add('intro-pending');
    const settle = state => {
      if (introState !== 'pending') return;                // first outcome wins (a late load after the timeout is ignored)
      introState = state;
      syncIntro(); syncPlayback();
      if (state === 'ready' && activeId() === 'work') work.focus({ preventScroll: true }); // arrows / space / PageDown now scroll the intro
    };
    setTimeout(() => settle('failed'), INTRO_WAIT_MS);
    import('./intro.js').then(() => settle('ready'), () => settle('failed'));   // rejects on no WebGL / blocked CDN → plain showcase
  }

  function showPanel(moveFocus) {
    const id = activeId();
    panels.forEach(p => { p.hidden = appMode.matches && p.id !== id; });
    links.forEach(a => a.toggleAttribute('aria-current', a.hash === `#${id}`));
    syncIntro();
    if (id === 'work' && introOn() && introSeen) work.scrollTop = work.scrollHeight; // coming back: straight to the showcase, no replay
    syncPlayback();
    if (moveFocus && appMode.matches) $(id).focus({ preventScroll: true });
  }
  addEventListener('hashchange', () => showPanel(true));
  appMode.addEventListener('change', () => showPanel(false));
  work.addEventListener('scroll', syncPlayback, { passive: true });
  // browsers refuse autoplay in a background tab — pick the reel back up when the visitor arrives
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncPlayback(); });

  go(0);
  showPanel(false);

  /* self-check: run with ?selftest — fails loudly if the step maths or the data drift */
  if (new URLSearchParams(location.search).has('selftest')) {
    console.assert(stepAt(0, 12, 6) === 0 && stepAt(11.99, 12, 6) === 6 && stepAt(5, 0, 6) === 0 && stepAt(5, NaN, 6) === 0, 'stepAt maths');
    console.assert(AGENTS.every(a => a.id && a.name && a.tag && a.blurb && a.steps.length >= 3), 'agent entry missing a field');
    console.assert(new Set(AGENTS.map(a => a.id)).size === AGENTS.length, 'duplicate agent id');
    console.info('selftest finished — any failures are listed above');
  }
})();
