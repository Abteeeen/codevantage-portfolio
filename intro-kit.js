// Small three.js toolkit for the scroll intro: a two-colour "architect's model" stage, primitives, a keyframed camera and the frame loop.
// `three` resolves through the import map in index.html (pinned CDN build).
import * as THREE from 'three';
export { THREE };

export const PAL = { card: '#EFF4ED', ink: '#12211A', accent: '#0E6B4A', pop: '#F26B3A' }; // mirrors :root in index.css

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = t => t * t * (3 - 2 * t);                          // smoothstep
export const span = (p, a, b) => ease(clamp((p - a) / (b - a)));        // 0→1, eased, while p crosses [a,b]
export const lin = (p, a, b) => clamp((p - a) / (b - a));               // 0→1, linear
export const backOut = t => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2; // overshoot "pop"

/* Duotone without a custom shader: every solid is a WHITE toon material with a hard two-step ramp.
   Ambient light = accent green; key light = (cream − green). Lit faces therefore add up to cream and anything
   unlit or in cast shadow stays green. The canvas is transparent and the "floor" only renders shadows, so the
   model appears to stand on the page's own graph paper. Throws if WebGL is unavailable — callers must catch. */
export function createStage(canvas, { fov = 35, shadowSize = 9 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, 200);

  const shade = new THREE.Color(PAL.accent), lit = new THREE.Color(PAL.card);
  scene.add(new THREE.AmbientLight(shade, Math.PI));
  const key = new THREE.DirectionalLight(new THREE.Color(lit.r - shade.r, lit.g - shade.g, lit.b - shade.b), Math.PI);
  key.position.set(-6, 10, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);                                   // plenty for an 18-unit town; kind to integrated GPUs
  Object.assign(key.shadow.camera, { left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, near: 0.5, far: 40 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: PAL.accent, opacity: 0.92 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;                                                // hidden (display:none): keep the last good size
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize); resize();
  return { renderer, scene, camera, resize };
}

const ramp = new THREE.DataTexture(new Uint8Array([0, 255]), 2, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
const paperMat = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: ramp });
export const popMat = new THREE.MeshBasicMaterial({ color: PAL.pop });
const inkMat = new THREE.MeshBasicMaterial({ color: PAL.ink });
const lineMat = new THREE.LineBasicMaterial({ color: PAL.ink });

/** Mesh that casts/receives shadow and carries ink edge lines (the drafting-pen outline). */
export function solid(geo, mat = paperMat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lineMat));
  return m;
}
/** Box positioned by its BASE centre (x, y = bottom, z). */
export function box(w, h, d, x = 0, y = 0, z = 0, mat) { const m = solid(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); return m; }
/** Cylinder / cone positioned by its base centre. */
export function cyl(rTop, rBot, h, x = 0, y = 0, z = 0, mat, seg = 24) { const m = solid(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat); m.position.set(x, y + h / 2, z); return m; }
/** Triangular prism (gable roof): base centred on the origin, ridge along z. */
export function prism(w, h, d) {
  const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
}
/** A framed 16:9 screen showing `${base}.jpg`. With `video`, the returned group gets `userData.setPlaying(on)`: the caller decides
 *  when `${base}.mp4` runs (it takes over from the poster on first successful play) — nothing decodes until asked. */
export function screen(w, base, { video = false } = {}) {
  const h = w * 9 / 16, tex = new THREE.TextureLoader().load(`${base}.jpg`); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const g = new THREE.Group();
  if (video) {
    const v = Object.assign(document.createElement('video'), { src: `${base}.mp4`, muted: true, loop: true, playsInline: true, preload: 'none' });
    let live = null;
    g.userData.setPlaying = on => {
      if (!on) return v.pause();
      v.play().then(() => { if (live) return; live = new THREE.VideoTexture(v); live.colorSpace = THREE.SRGBColorSpace; mat.map = live; mat.needsUpdate = true; })
        .catch(() => { /* autoplay refused (e.g. background tab): the poster simply stays */ });
    };
  }
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.022, h + 0.022), inkMat); bezel.position.z = -0.004; // thin, so it reads as the frame border when docking
  g.add(bezel, new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat));
  return g;
}
/** Quadratic-bezier flight with a tumble; t in 0..1. */
export function fly(m, from, ctrl, to, t) {
  m.position.set(...[0, 1, 2].map(j => (1 - t) ** 2 * from[j] + 2 * (1 - t) * t * ctrl[j] + t * t * to[j]));
  m.rotation.set(t * 5, t * 3, 0);
}

function flyCamera(camera, keys, p) {
  let i = keys.findIndex(k => k.at > p); if (i === -1) i = keys.length - 1; if (i === 0) i = 1;
  const a = keys[i - 1], b = keys[i], t = ease(clamp((p - a.at) / (b.at - a.at)));
  camera.position.set(...a.pos.map((v, j) => v + (b.pos[j] - v) * t));
  camera.lookAt(...a.look.map((v, j) => v + (b.look[j] - v) * t));
}

/** Frame loop. `progress()` → raw 0..1; it is smoothed, then drives the camera (`keys()`), `update(p, seconds)` and the captions.
 *  `active()` false → nothing is drawn. `idle(p)` true → the frame is skipped (scene fully hidden). `?p=0.5` pins progress for stills. */
export function run({ stage, keys, update, progress, active, idle }) {
  const pinned = new URLSearchParams(location.search).get('p');
  const caps = [...document.querySelectorAll('[data-from]')], bar = document.getElementById('prog');
  let p = 0, wasActive = false;
  (function frame(ms = 0) {
    requestAnimationFrame(frame);
    if (!active()) { wasActive = false; return; }
    const target = pinned === null ? clamp(progress()) : +pinned;
    if (!wasActive) p = target;                      // (re)activation: start AT the scroll position. Easing is for scrolling only —
    wasActive = true;                                // otherwise a stale p makes the whole intro visibly rewind/fast-forward on entry
    p += (target - p) * 0.1; if (Math.abs(target - p) < 0.0004) p = target;
    update(p, ms / 1000);
    caps.forEach(c => c.classList.toggle('on', p >= +c.dataset.from && p <= +c.dataset.to));
    if (bar) bar.style.scale = `${p} 1`;
    if (idle(p)) return;
    flyCamera(stage.camera, keys(), p);
    stage.renderer.render(stage.scene, stage.camera);
  })();
}

/** "Play it for me": the scroller scrolls itself to the end. Any manual input hands control straight back. */
export function autoplay({ playBtn, skipBtn, scroller, pxPerFrame = 4 }) {
  const label = playBtn.textContent;
  let on = false;
  const atEnd = () => scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
  const stop = () => { on = false; playBtn.textContent = label; playBtn.setAttribute('aria-pressed', 'false'); };
  const step = () => {
    if (!on) return;
    scroller.scrollBy({ top: pxPerFrame, behavior: 'instant' });
    if (atEnd()) return stop();
    requestAnimationFrame(step);
  };
  playBtn.addEventListener('click', () => { if (on) return stop(); on = true; playBtn.textContent = '❚❚ Pause'; playBtn.setAttribute('aria-pressed', 'true'); step(); });
  skipBtn.addEventListener('click', () => { stop(); scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' }); });
  ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, e => { if (on && e.target !== playBtn) stop(); }, { passive: true }));
}
