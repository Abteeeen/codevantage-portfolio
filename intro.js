/* The scroll intro — "The Territory". A town drawn as a plan on the graph paper stands up into a model, gets scanned,
   qualified, pitched and mailed; then the camera flies into one pitch, which lands exactly on the showcase's video frame
   and the page fades in around it. Loaded on demand by index.js, desktop + motion-OK only; if this module throws,
   index.js drops the intro and the plain showcase shows instead. */
import { THREE, createStage, box, cyl, solid, prism, screen, fly, span, lin, backOut, popMat, run, autoplay } from './intro-kit.js';

const $ = id => document.getElementById(id);
const root = document.documentElement, work = $('work'), dock = $('dock'), ui = $('introUi'), stageEl = $('introStage');
const frameEl = dock.querySelector('.frame');
const PITCH_W = 1.7;                                                    // width of a pitch screen, world units

const stage = createStage($('introCanvas'));
const { scene, camera } = stage;

/* ── building kit: each returns [Group standing on y=0, roof height] ── */
const kinds = {
  house() { const g = new THREE.Group(), roof = solid(prism(1.25, .5, 1.45)); roof.position.y = .7; g.add(box(1.1, .7, 1.3), roof, box(.16, .42, .16, .3, .78, -.3)); return [g, 1.2]; },
  shop()  { const g = new THREE.Group(), awn = box(1.5, .05, .45, 0, .52, .72, popMat); awn.rotation.x = .35; g.add(box(1.5, .9, 1.1), awn, box(.9, .22, .06, 0, .9, .5)); return [g, 1.12]; },
  big()   { const g = new THREE.Group(); g.add(box(2.2, 1.0, 1.7), box(.5, .22, .4, -.5, 1.0, .3), box(.35, .16, .35, .55, 1.0, -.35)); return [g, 1.22]; },
  resto() { const g = new THREE.Group(), sign = cyl(.2, .2, .05, .85, 1.35, .5, popMat); sign.rotation.x = Math.PI / 2; g.add(box(1.3, .8, 1.2), box(1.5, .06, 1.4, 0, .8, 0), box(.05, 1.4, .05, .85, 0, .5), sign); return [g, 1.0]; },
  lot()   { const g = new THREE.Group(); g.add(box(1.9, .04, 1.6), box(.46, .44, .95, -.5, .04, .1), box(.46, .3, .3, -.5, .04, .72), box(.42, .26, .8, .2, .04, -.2), box(.42, .26, .8, .72, .04, .25)); return [g, .6]; },
};
//   kind      x     z    agent id whose demo is the pitch (null = found, but not worth pitching)
const town = [
  ['big',   -3.3, -2.5, 'roof'],       ['house', -0.7, -2.7, null],         ['house', 1.2, -2.6, 'poolscout'], ['shop', 3.5, -2.4, null],
  ['house', -3.7,  0.2, null],         ['resto', -1.5,  0.1, 'restaurant'], ['lot',   1.0,  0.2, 'vanwrap'],   ['shop', 3.5,  0.3, 'storefront'],
  ['house', -2.9,  2.9, null],         ['shop',  -0.5,  3.0, null],         ['house', 1.8,  3.0, null],        ['big',  4.0,  2.9, null],
].map(([kind, x, z, agent], i) => {
  const [group, top] = kinds[kind](); group.position.set(x, 0, z); group.rotation.y = (i % 3 - 1) * .12; scene.add(group);
  const pin = new THREE.Group();
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.15, .36, 14), popMat); tip.rotation.x = Math.PI; tip.position.y = .18;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.15, 16, 12), popMat); head.position.y = .44;
  pin.add(tip, head); pin.position.set(x, top, z); scene.add(pin);
  let pitch = null;
  if (agent) { pitch = screen(PITCH_W, `media/${agent}`, { video: agent === 'roof' }); pitch.position.set(x, top + 1.25, z); scene.add(pitch); }
  return { group, pin, pitch, x, z, top, delay: Math.hypot(x, z) * .012 };
});
const pitched = town.filter(t => t.pitch), HERO = pitched[0].pitch.position; // roof = agent #1, the one the showcase opens on
let heroPlaying = false;
function playHero(on) { if (on === heroPlaying) return; heroPlaying = on; pitched[0].pitch.userData.setPlaying(on); } // only while its screen is on show

const trees = [[-5, -1], [-1.9, -1.2], [2.4, -1.1], [5.2, 1.4], [-4.6, 1.8], [0.4, 1.7], [2.9, 4.2], [-1.7, 4.3]].map(([x, z]) => {
  const g = new THREE.Group(); g.add(cyl(.05, .07, .3), cyl(0, .34, .8, 0, .3, 0, undefined, 9)); g.position.set(x, 0, z); scene.add(g); return g;
});

// the scanner: a drone, the curtain of light under it, and the line it draws on the ground
const drone = new THREE.Group();
drone.add(box(.5, .12, .5), box(.6, .02, .26, -.58, .05, 0, popMat), box(.6, .02, .26, .58, .05, 0, popMat)); scene.add(drone);
const curtain = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 4.2), new THREE.MeshBasicMaterial({ color: '#F26B3A', transparent: true, opacity: .13, side: THREE.DoubleSide, depthWrite: false }));
curtain.rotation.y = Math.PI / 2; curtain.position.y = 2.1; scene.add(curtain);
const scanLine = box(.07, .02, 9.5, 0, 0, 0, popMat); scanLine.castShadow = false; scene.add(scanLine);

// HQ: where the postcards come from
const HQ = [-5.6, 1.75, 3.9];
const beacon = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 10), popMat); beacon.position.set(HQ[0], 2.1, HQ[2]);
scene.add(box(.9, 1.6, .9, HQ[0], 0, HQ[2]), box(.04, .45, .04, HQ[0], 1.6, HQ[2]), beacon);
const cards = pitched.map(() => { const c = box(.3, .012, .2, 0, 0, 0, popMat); scene.add(c); return c; });

/* ── camera path ── */
const APPROACH = new THREE.Vector3(-1, 3.2, 5.2);
const fwd = HERO.clone().sub(APPROACH).normalize(), right = fwd.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(), up = right.clone().cross(fwd);

/** Final stop: place the camera so the hero pitch projects EXACTLY onto the showcase's video frame (same size, same spot). */
function dockKey() {
  const fr = frameEl.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  if (!fr.width) return { at: .95, pos: APPROACH.toArray(), look: HERO.toArray() }; // panel hidden: nothing to aim at yet
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const d = PITCH_W / (fr.width / W) / (2 * tanH * camera.aspect);      // distance at which the pitch is fr.width pixels wide
  const nx = (fr.left + fr.width / 2) / W * 2 - 1, ny = 1 - (fr.top + fr.height / 2) / H * 2; // frame centre in NDC
  const pos = HERO.clone().addScaledVector(fwd, -d).addScaledVector(right, -nx * d * tanH * camera.aspect).addScaledVector(up, -ny * d * tanH);
  return { at: .95, pos: pos.toArray(), look: pos.clone().addScaledVector(fwd, 10).toArray() };
}
const buildKeys = () => [
  { at: 0,   pos: [-2.8, 18, .02],  look: [-2.8, 0, 0] },               // plan view: the town is a drawing on the grid
  { at: .2,  pos: [10.5, 9.5, 12],  look: [0, .2, 0] },                 // tilt down — the drawing stands up
  { at: .44, pos: [-10, 8, 11.5],   look: [0, .2, 0] },                 // orbit while the scanner crosses
  { at: .6,  pos: [-7.5, 6, 10],    look: [-.3, .6, 0] },
  { at: .78, pos: [4.6, 5, 10.5],   look: [0, 1.4, -.3] },              // pitches pop up over the qualified lots
  { at: .88, pos: APPROACH.toArray(), look: HERO.toArray() },
  dockKey(),
  { ...dockKey(), at: 1 },                                              // hold while the page fades in
];
let keys = buildKeys();
const rebuild = () => { stage.resize(); keys = buildKeys(); };
addEventListener('resize', rebuild);
document.fonts.ready.then(rebuild);                                     // the frame moves once the web fonts land

/* ── wiring ── */
const progress = () => { const max = work.scrollHeight - work.clientHeight; return max > 0 ? work.scrollTop / max : 1; };
const introOn = () => root.classList.contains('has-intro');
let wasOn = false;

function release() {                                                    // intro switched off (resize / other panel): hand the dock back untouched
  dock.style.opacity = dock.style.visibility = ui.style.opacity = ui.style.visibility = ''; stageEl.style.opacity = 0;
  playHero(false);
}

run({
  stage, keys: () => keys, progress,
  active() {
    const on = introOn() && !work.hidden;
    if (!on && wasOn) release();
    if (on && !wasOn) rebuild();                                        // canvas may have been display:none while off
    wasOn = on; return on;
  },
  idle: p => p >= 1,                                                    // fully docked: canvas is transparent, skip the draw
  update(p, time) {
    // hand-over: captions out → pitch lands on the frame → page in, model out
    ui.style.opacity = 1 - span(p, .88, .94);  ui.style.visibility = p > .94 ? 'hidden' : 'visible';   // hidden = also out of tab order
    dock.style.opacity = span(p, .95, 1);      dock.style.visibility = p < .95 ? 'hidden' : 'visible';
    stageEl.style.opacity = 1 - span(p, .965, 1);
    playHero(p > .6 && p < 1);                                          // pitches appear at .63; once docked the real <video> takes over

    const scanX = -6.5 + 13 * lin(p, .24, .44), scanning = p > .22 && p < .46, qualify = span(p, .47, .58);
    drone.position.set(scanX, 4.2 + Math.sin(time * 2) * .06, 0);
    drone.visible = curtain.visible = scanLine.visible = scanning;
    curtain.position.x = scanLine.position.x = scanX;

    town.forEach((t, i) => {
      t.group.scale.y = Math.max(.02, span(p, .05 + t.delay, .17 + t.delay));                 // the plan stands up, centre first
      const found = lin(scanX, t.x, t.x + 1.1);                                               // pin drops as the scan passes
      t.pin.visible = found > 0 && p < .9;
      t.pin.position.y = t.top + (1 - backOut(found)) * 2.5 + Math.sin(time * 2.2 + i) * .04;
      t.pin.scale.setScalar(t.pitch ? 1 + qualify * .25 : Math.max(.001, 1 - qualify));       // unqualified pins shrink away
    });
    pitched.forEach((t, k) => {
      const pop = lin(p, .63 + k * .022, .69 + k * .022);
      t.pitch.visible = pop > 0;
      t.pitch.scale.setScalar(Math.max(.001, backOut(pop)));
      t.pitch.quaternion.copy(camera.quaternion);                                             // always square to the viewer
      cards[k].visible = p > .78 && p < .9;
      fly(cards[k], HQ, [(HQ[0] + t.x) / 2, 4.2, (HQ[2] + t.z) / 2], [t.x, t.top, t.z], (time * .35 + k * .2) % 1);
    });
    trees.forEach(g => { g.scale.y = Math.max(.02, span(p, .08, .2)); });
    beacon.scale.setScalar(1 + Math.sin(time * 4) * .25);
  },
});
autoplay({ playBtn: $('auto'), skipBtn: $('skip'), scroller: work });
