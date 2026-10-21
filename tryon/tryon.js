/* Valmont · Josserand — 3D model, wrist try-on (camera + on-device hand tracking) and demo account flow.
   Shared by the brand site and the landing page. Everything runs in the visitor's browser:
   the camera image never leaves the device, and the demo account lives only in this browser. */

const BASE = new URL("./", import.meta.url).href;
let THREE = null, RoomEnvironment = null;
const loadThree = () => (THREE ? Promise.resolve() :
  Promise.all([import("./three.module.min.js"), import("./RoomEnvironment.js")])
    .then(([t, r]) => { THREE = t; RoomEnvironment = r.RoomEnvironment; }));

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ styles */
const css = `
.to-viewer { position: relative; background: var(--tile); aspect-ratio: 1; overflow: hidden; touch-action: pan-y; cursor: grab; }
.to-viewer:active { cursor: grabbing; }
.to-viewer canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.to-viewer .to-hint { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; font: 500 0.66rem/1.4 var(--sans); letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); pointer-events: none; }
.to-viewer .to-fallback { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; text-align: center; color: var(--muted); font-size: 0.9rem; }
dialog.to-cam { position: fixed; inset: 0; width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: #000; color: #fff; text-align: left; }
dialog.to-cam::backdrop { background: #000; }
.to-stage { position: absolute; inset: 0; overflow: hidden; }
.to-stage video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.to-stage video.mirror { transform: scaleX(-1); }
.to-stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.to-guide { position: absolute; left: 50%; top: 46%; width: min(56vw, 300px); aspect-ratio: 1 / 1.5; transform: translate(-50%, -50%); border: 1px dashed rgba(255,255,255,.55); border-radius: 48% 48% 40% 40%; pointer-events: none; transition: opacity .3s; }
.to-guide.off { opacity: 0; }
.to-top, .to-bar { position: absolute; left: 0; right: 0; display: flex; gap: 10px; align-items: center; padding: 14px 16px; }
.to-top { top: 0; padding-top: calc(14px + env(safe-area-inset-top, 0px)); justify-content: space-between; background: linear-gradient(rgba(0,0,0,.55), transparent); }
.to-top .to-brand { font: 500 0.68rem/1 var(--sans); letter-spacing: 0.18em; text-transform: uppercase; }
.to-bar { bottom: 0; padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px)); flex-wrap: wrap; justify-content: center; background: linear-gradient(transparent, rgba(0,0,0,.65)); }
dialog.to-cam p.to-status { color: #fff; margin: 0; }
.to-status { flex: 1 1 100%; text-align: center; font-size: 0.92rem; line-height: 1.45; min-height: 2.9em; text-wrap: balance; margin: 0; }
.to-btn { min-height: 44px; padding: 0 18px; border: 1px solid #fff; background: transparent; color: #fff; font: 500 0.68rem/1 var(--sans); letter-spacing: 0.16em; text-transform: uppercase; cursor: pointer; border-radius: 0; }
.to-btn.solid { background: #fff; color: #111; }
.to-btn:focus-visible { outline: 1px solid #fff; outline-offset: 3px; }
.to-acc { display: grid; gap: 14px; }
.to-acc .to-step { display: grid; gap: 12px; }
.to-acc .to-row { display: flex; flex-wrap: wrap; gap: 6px 20px; align-items: center; }
.to-acc .to-code { font: 400 1.6rem/1 var(--sans); letter-spacing: 0.4em; text-align: center; min-height: 56px; width: 100%; border: 0; border-bottom: 1px solid var(--fg); background: transparent; color: var(--fg); padding: 8px 0 8px 0.4em; }
.to-acc .to-code:focus-visible { outline: 1px solid var(--fg); outline-offset: 4px; }
.to-acc .to-demo { background: var(--bg); border: 1px dashed var(--accent); padding: 10px 12px; font-size: 0.86rem; color: var(--fg); }
.to-acc .to-demo b { letter-spacing: 0.18em; font-weight: 500; }
.to-acc .to-field { display: grid; gap: 4px; }
.to-acc .to-field input { font: 400 1.05rem var(--sans); color: var(--fg); background: transparent; border: 0; border-bottom: 1px solid var(--fg); border-radius: 0; min-height: 48px; padding: 8px 2px; width: 100%; }
.to-acc .to-field input:focus-visible { outline: 1px solid var(--fg); outline-offset: 4px; }
.to-acc .to-lbl { font: 500 0.68rem/1.6 var(--sans); letter-spacing: 0.16em; text-transform: uppercase; }
.to-acc .to-tel { display: flex; align-items: stretch; border-bottom: 1px solid var(--fg); }
.to-acc .to-tel span { display: inline-flex; align-items: center; padding: 0 10px 0 2px; color: var(--muted); }
.to-acc .to-tel input { border: 0; }
.to-acc .to-tel:focus-within { outline: 1px solid var(--fg); outline-offset: 4px; }
.to-acc .to-tel input:focus-visible { outline: none; }
.to-acc .to-ok { display: grid; grid-template-columns: 22px 1fr; gap: 10px; align-items: start; font-size: 0.86rem; line-height: 1.5; }
.to-acc .to-ok input { width: 20px; height: 20px; margin: 1px 0 0; accent-color: var(--fg); }
.to-acc .to-ok label { cursor: pointer; }
.to-acc .to-ok .to-link { min-height: 0; }
.to-acc .to-err { font-size: 0.86rem; color: #A3263A; margin: 0; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .to-acc .to-err { color: #F08A8A; } }
:root[data-theme="dark"] .to-acc .to-err { color: #F08A8A; }
.to-acc .to-btn-main { width: 100%; min-height: 52px; }
.to-acc .to-link { background: none; border: 0; padding: 0; min-height: 44px; font: inherit; font-size: 0.86rem; color: var(--fg); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.to-acc .to-link[disabled] { color: var(--muted); text-decoration: none; cursor: default; }
.to-acc .to-done { font-family: var(--serif); font-size: 1.5rem; line-height: 1.25; font-weight: 400; }
.to-acc .to-small { font-size: 0.82rem; color: var(--muted); }
`;
const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

/* -------------------------------------------------------------- the watch */
function dialTexture() {
  const S = 1024, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d"), mm = S / 36.4, C = S / 2;
  g.fillStyle = "#F2ECE2"; g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S), d = img.data;                 // fine grain
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const rg = g.createLinearGradient(0, 0, S, S); rg.addColorStop(0, "#E2B394"); rg.addColorStop(.5, "#A5664A"); rg.addColorStop(1, "#D9A585");
  g.translate(C, C);
  g.strokeStyle = "rgba(90,60,40,.35)"; g.lineWidth = 1.2;                // minute track
  for (let i = 0; i < 60; i++) { if (i % 5 === 0) continue; const a = i * Math.PI / 30; g.beginPath(); g.moveTo(Math.sin(a) * 17.2 * mm, -Math.cos(a) * 17.2 * mm); g.lineTo(Math.sin(a) * 16.4 * mm, -Math.cos(a) * 16.4 * mm); g.stroke(); }
  g.fillStyle = rg;                                                        // applied batons
  for (let h = 0; h < 12; h++) {
    if (h === 9) continue;                                                 // open-heart window sits near 9
    g.save(); g.rotate(h * Math.PI / 6);
    if (h === 0) { g.fillRect(-1.25 * mm, -16.6 * mm, 0.9 * mm, 4.6 * mm); g.fillRect(0.35 * mm, -16.6 * mm, 0.9 * mm, 4.6 * mm); }
    else g.fillRect(-0.45 * mm, -16.6 * mm, 0.9 * mm, 3.6 * mm);
    g.restore();
  }
  g.fillStyle = "#9A5236"; g.textAlign = "center";
  g.font = `italic 400 ${2.9 * mm}px "Cormorant Garamond", Garamond, serif`; g.fillText("Valmont", 0, -7.6 * mm);
  g.font = `500 ${0.95 * mm}px Jost, "Avenir Next", sans-serif`; g.fillStyle = "#6B6661";
  g.fillText("A U T O M A T I Q U E", 0, 9.2 * mm);
  const wx = -8.6 * mm, wy = 0.6 * mm, wr = 4.6 * mm;                     // open-heart window
  g.fillStyle = rg; g.beginPath(); g.arc(wx, wy, wr + 0.5 * mm, 0, 7); g.fill();
  const hole = g.createRadialGradient(wx, wy, 0, wx, wy, wr); hole.addColorStop(0, "#3a2c22"); hole.addColorStop(1, "#120d0a");
  g.fillStyle = hole; g.beginPath(); g.arc(wx, wy, wr, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { tex: t, window: { x: wx / mm, y: wy / mm, r: wr / mm } };
}

function buildWatch(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const gold = new THREE.MeshStandardMaterial({ color: 0xD49A78, metalness: 1, roughness: 0.26, envMap: env, envMapIntensity: 1.1 });
  const goldBrushed = new THREE.MeshStandardMaterial({ color: 0xC98E6D, metalness: 1, roughness: 0.42, envMap: env });
  const leather = new THREE.MeshStandardMaterial({ color: 0x5B3A27, metalness: 0, roughness: 0.78, envMap: env, envMapIntensity: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1410, metalness: 0.4, roughness: 0.5 });

  const inner = new THREE.Group();                 // built y-up: dial faces +y, 12 o'clock at -z, 3 o'clock at +x
  const outer = new THREE.Group(); outer.add(inner); inner.rotation.x = Math.PI / 2;   // dial faces +z, 12 → +y

  const prof = [[0, -3.85], [17.6, -3.85], [19.3, -3.3], [20, -1.6], [20, 2.0], [19.6, 2.9], [18.9, 3.6], [18.4, 3.85], [18.0, 3.4], [18.0, 2.1]].map(p => new THREE.Vector2(p[0], p[1]));
  const caseM = new THREE.Mesh(new THREE.LatheGeometry(prof, 128), Object.assign(gold.clone(), { side: THREE.DoubleSide })); inner.add(caseM);
  const back = new THREE.Mesh(new THREE.CircleGeometry(15, 64), dark); back.rotation.x = Math.PI / 2; back.position.y = -3.86; inner.add(back);

  const { tex, window: win } = dialTexture();
  const dial = new THREE.Mesh(new THREE.CircleGeometry(18.2, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.32 }));
  dial.rotation.x = -Math.PI / 2; dial.position.y = 2.2; inner.add(dial);

  const wheel = new THREE.Group(); wheel.position.set(win.x, 2.26, win.y); inner.add(wheel);   // balance wheel in the window
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.32, 10, 48), gold); rim.rotation.x = Math.PI / 2; wheel.add(rim);
  for (let i = 0; i < 3; i++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 3.2), goldBrushed); arm.position.z = -1.6; const p = new THREE.Group(); p.rotation.y = i * 2 * Math.PI / 3; p.add(arm); wheel.add(p); }
  const jewel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 20), new THREE.MeshStandardMaterial({ color: 0xA3263A, roughness: 0.2 })); jewel.position.y = 0.1; wheel.add(jewel);

  const hand = (len, w, tail, y) => {
    const geo = new THREE.BoxGeometry(w, 0.16, len + tail); geo.translate(0, 0, -(len - tail) / 2);
    const p = new THREE.Group(); p.position.y = y; p.add(new THREE.Mesh(geo, gold)); inner.add(p); return p;
  };
  const hH = hand(10.5, 1.0, 1.6, 2.5), hM = hand(15.6, 0.75, 1.8, 2.7), hS = hand(16.2, 0.22, 4, 2.9);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 24), gold); cap.position.y = 3.0; inner.add(cap);

  const crystal = new THREE.Mesh(new THREE.CircleGeometry(18.6, 96), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, roughness: 0, metalness: 0, envMap: env, envMapIntensity: 2.2, depthWrite: false }));
  crystal.rotation.x = -Math.PI / 2; crystal.position.y = 3.8; inner.add(crystal);

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 2.4, 24), goldBrushed); crown.rotation.z = Math.PI / 2; crown.position.set(21.1, 0.2, 0); inner.add(crown);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const lug = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.6, 7.5), gold); lug.position.set(sx * 9.4, -0.6, sz * 21.2); lug.rotation.x = sz * 0.12; inner.add(lug);
  }

  // Straps for the 3D viewer: two leather tongues that curve down and away
  const showStraps = new THREE.Group(); inner.add(showStraps);
  for (const sz of [-1, 1]) {
    const geo = new THREE.BoxGeometry(18, 3.4, 44, 1, 1, 24), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i) + 22; pos.setY(i, pos.getY(i) - 0.012 * z * z); pos.setZ(i, sz * (z + 22)); }
    geo.computeVertexNormals(); showStraps.add(new THREE.Mesh(geo, leather));
  }

  // Wrist strap + depth-only wrist for the camera view (resized per wrist)
  const wristRig = new THREE.Group(); wristRig.visible = false; outer.add(wristRig);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 19, 72, 1, true), new THREE.MeshStandardMaterial({ color: 0x5B3A27, roughness: 0.8, side: THREE.DoubleSide, envMap: env, envMapIntensity: 0.4 }));
  ring.rotation.z = Math.PI / 2; wristRig.add(ring);
  const occ = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 400, 48), new THREE.MeshBasicMaterial({ colorWrite: false }));
  occ.rotation.z = Math.PI / 2; occ.renderOrder = -1; wristRig.add(occ);
  const fitWrist = widthMm => {
    const a = widthMm / 2, b = a * 0.66, zc = -4.2 - b;
    ring.scale.set(a + 1.4, 1, b + 1.4); ring.position.z = zc; ring.rotation.set(0, 0, Math.PI / 2);
    // cylinder axis is y; rotated to x — scale its local x (radius) and z (radius)
    occ.scale.set(a, 1, b); occ.position.z = zc;
  };

  const tick = (now) => {
    const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    hS.rotation.y = -s / 60 * 2 * Math.PI; hM.rotation.y = -m / 60 * 2 * Math.PI; hH.rotation.y = -h / 12 * 2 * Math.PI;
    wheel.rotation.y = reduceMotion() ? 0 : Math.sin(now / 1000 * Math.PI * 6) * 2.4;     // 3 Hz, ~270° swing
  };
  return { group: outer, tick, showStraps, wristRig, fitWrist };
}

/* ------------------------------------------------------------ 3D viewer */
export function mountViewer(el, { hint = "Arrastra para girarla" } = {}) {
  el.classList.add("to-viewer");
  let started = false;
  const start = async () => {
    if (started) return; started = true;
    try { await loadThree(); } catch { el.insertAdjacentHTML("beforeend", `<p class="to-fallback">No se pudo cargar la vista 3D.</p>`); return; }
    if (document.fonts) { try { await document.fonts.ready; } catch {} }
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    el.prepend(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(28, 1, 1, 1000); cam.position.set(0, 0, 235);
    const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(40, 60, 80); scene.add(key);
    const w = buildWatch(renderer); scene.add(w.group);
    const spin = new THREE.Group(); scene.add(spin); spin.add(w.group);
    spin.rotation.set(-0.25, 0.3, 0);
    if (hint) el.insertAdjacentHTML("beforeend", `<p class="to-hint" aria-hidden="true">${hint}</p>`);
    const size = () => { const r = el.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); };
    new ResizeObserver(size).observe(el); size();
    let drag = null, vx = 0, vy = 0, visible = true, last = performance.now();
    el.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); });
    el.addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
      spin.rotation.y += dx * 0.01; spin.rotation.x = Math.max(-1.3, Math.min(1.3, spin.rotation.x + dy * 0.01)); vx = dx * 0.01; vy = 0; });
    el.addEventListener("pointerup", () => { drag = null; });
    el.addEventListener("pointercancel", () => { drag = null; });
    el.tabIndex = 0; el.setAttribute("role", "img"); el.setAttribute("aria-label", "Modelo 3D de la Josserand: caja de oro rosa, carátula blanco roto con ventana al volante y correa de piel café. Usa las flechas para girarla.");
    el.addEventListener("keydown", e => {
      const k = { ArrowLeft: [0, -0.2], ArrowRight: [0, 0.2], ArrowUp: [-0.2, 0], ArrowDown: [0.2, 0] }[e.key];
      if (k) { e.preventDefault(); spin.rotation.x = Math.max(-1.3, Math.min(1.3, spin.rotation.x + k[0])); spin.rotation.y += k[1]; }
    });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(performance.now()); }).observe(el);
    function loop(now) {
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!drag) { if (Math.abs(vx) > 0.0005) { spin.rotation.y += vx; vx *= 0.94; } else if (!reduceMotion()) spin.rotation.y += dt * 0.18; }
      w.tick(now); renderer.render(scene, cam); requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  };
  new IntersectionObserver(([en], o) => { if (en.isIntersecting) { o.disconnect(); start(); } }, { rootMargin: "300px" }).observe(el);
}

/* ------------------------------------------------------- camera try-on */
let handsReady = null;
const loadHands = () => handsReady || (handsReady = new Promise((ok, bad) => {
  if (window.Hands) return ok();
  const s = document.createElement("script"); s.src = BASE + "hands.js"; s.onload = () => ok(); s.onerror = bad; document.head.appendChild(s);
}).then(() => {
  // model data is published with a .wasm name (artifacts serve standard web types only); it is fetched as raw bytes
  const RENAMED = { "hands.binarypb": "hands-graph.wasm", "hands_solution_packed_assets.data": "hands-assets.wasm", "hand_landmark_lite.tflite": "hand-landmark-lite.wasm" };
  const h = new window.Hands({ locateFile: f => BASE + (RENAMED[f] || f) });
  h.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5, selfieMode: false });
  return h.initialize().then(() => h);
}));

let camDlg = null;
export async function openTryOn({ onFallback } = {}) {
  if (!camDlg) {
    camDlg = document.createElement("dialog"); camDlg.className = "to-cam"; camDlg.setAttribute("aria-label", "Prueba virtual de la Josserand");
    camDlg.innerHTML = `<div class="to-stage"><video playsinline muted></video><canvas aria-hidden="true"></canvas><div class="to-guide"></div></div>
      <div class="to-top"><span class="to-brand">Valmont · Josserand</span><button class="to-btn" type="button" data-x>Cerrar</button></div>
      <div class="to-bar"><p class="to-status" role="status" aria-live="polite"></p><button class="to-btn" type="button" data-flip>Cambiar cámara</button></div>`;
    document.body.appendChild(camDlg);
  }
  const dlg = camDlg, video = $(dlg, "video"), canvas = $(dlg, "canvas"), status = $(dlg, ".to-status"), guide = $(dlg, ".to-guide");
  const say = t => { status.textContent = t; };
  let stream = null, running = true, facing = matchMedia("(pointer: coarse)").matches ? "environment" : "user";
  dlg.showModal(); say("Abriendo la cámara…");

  const stop = () => { running = false; stream && stream.getTracks().forEach(t => t.stop()); stream = null; };
  const close = () => { stop(); if (dlg.open) dlg.close(); };
  $(dlg, "[data-x]").onclick = close;
  dlg.onclose = stop; dlg.oncancel = () => stop();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { fail("Tu navegador no permite abrir la cámara desde esta página."); return; }
  function fail(msg) {
    stop(); say(msg + " Mientras tanto, puedes girar la Josserand en 3D.");
    $(dlg, "[data-flip]").textContent = "Ver en 3D"; $(dlg, "[data-flip]").onclick = () => { close(); onFallback && onFallback(); };
  }
  async function startCam() {
    stream && stream.getTracks().forEach(t => t.stop());
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = stream; video.classList.toggle("mirror", facing === "user");
    await video.play();
  }
  try { await startCam(); }
  catch (e) { fail(e && e.name === "NotAllowedError" ? "No diste permiso para usar la cámara." : "No pudimos abrir la cámara."); return; }
  $(dlg, "[data-flip]").textContent = "Cambiar cámara";
  $(dlg, "[data-flip]").onclick = async () => { facing = facing === "user" ? "environment" : "user"; try { await startCam(); } catch { say("No encontramos otra cámara en este dispositivo."); } };
  say("Cargando la Josserand…");

  let hands;
  try { await loadThree(); hands = await loadHands(); }
  catch { fail("No se pudo cargar el seguimiento de la mano."); return; }
  if (!running) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000); cam.position.z = 1000;
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(0.3, 0.6, 1); scene.add(key);
  const w = buildWatch(renderer); scene.add(w.group);
  w.showStraps.visible = false; w.wristRig.visible = true; w.group.visible = false;

  let W = 0, H = 0;
  const size = () => { W = dlg.clientWidth; H = dlg.clientHeight; renderer.setSize(W, H, false); cam.left = -W / 2; cam.right = W / 2; cam.top = H / 2; cam.bottom = -H / 2; cam.updateProjectionMatrix(); };
  size(); addEventListener("resize", size);

  const V = THREE.Vector3, sm = { pos: new V(), q: new THREE.Quaternion(), scale: 1, wrist: 58, has: false };
  let lostAt = 0, lastMsg = 0;
  hands.onResults(r => {
    const lm = r.multiHandLandmarks && r.multiHandLandmarks[0], wl = r.multiHandWorldLandmarks && r.multiHandWorldLandmarks[0];
    if (!lm || !wl) { lostAt = lostAt || performance.now(); if (sm.has && performance.now() - lostAt > 400) { sm.has = false; w.group.visible = false; guide.classList.remove("off"); say("Coloca tu muñeca dentro del marco, con el dorso hacia la cámara."); } return; }
    lostAt = 0;
    const vw = video.videoWidth, vh = video.videoHeight, k = Math.max(W / vw, H / vh), ox = (W - vw * k) / 2, oy = (H - vh * k) / 2;
    const mirror = facing === "user";
    const P = i => { let x = lm[i].x * vw * k + ox; if (mirror) x = W - x; return new V(x - W / 2, H / 2 - (lm[i].y * vh * k + oy), 0); };
    const Wd = i => new V(wl[i].x * (mirror ? -1 : 1), -wl[i].y, -wl[i].z);   // three.js axes
    const p0 = P(0), p5 = P(5), p9 = P(9), p17 = P(17);
    const across = Wd(5).distanceTo(Wd(17)) * 1000 || 70, along = Wd(0).distanceTo(Wd(9)) * 1000 || 90;
    const pxPerMm = Math.max(p5.distanceTo(p17) / across, p0.distanceTo(p9) / along);
    const toFingers = p9.clone().sub(p0).normalize();
    const center = p0.clone().addScaledVector(toFingers, -26 * pxPerMm);
    // orientation: 3 o'clock toward the fingers, dial facing the camera, tilted gently with the back of the hand
    let n = Wd(5).sub(Wd(0)).cross(Wd(17).sub(Wd(0))).normalize(); if (n.z < 0) n.negate();
    const z = n.lerp(new V(0, 0, 1), 0.55).normalize();
    const x = toFingers.clone().addScaledVector(z, -toFingers.dot(z)).normalize(), y = z.clone().cross(x);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    const wristMm = Math.max(46, Math.min(72, across * 0.84));
    const a = sm.has ? 0.35 : 1;
    sm.pos.lerp(center, a); sm.q.slerp(q, a); sm.scale += (pxPerMm - sm.scale) * a; sm.wrist += (wristMm - sm.wrist) * a;
    if (!sm.has) { sm.has = true; w.group.visible = true; guide.classList.add("off"); }
    const now = performance.now();
    if (now - lastMsg > 700) { lastMsg = now; say(`Así se ve la Josserand en tu muñeca. Ancho estimado de tu muñeca: ${Math.round(sm.wrist)} mm; la caja de 40 mm ocupa el ${Math.round(40 / sm.wrist * 100)} %.`); }
  });

  let busy = false;
  const loop = async now => {
    if (!running) { renderer.dispose(); removeEventListener("resize", size); return; }
    if (!busy && video.readyState >= 2) { busy = true; try { await hands.send({ image: video }); } catch {} busy = false; }
    if (sm.has) { w.group.position.copy(sm.pos); w.group.quaternion.copy(sm.q); w.group.scale.setScalar(sm.scale); w.fitWrist(sm.wrist); }
    w.tick(now); renderer.render(scene, cam); requestAnimationFrame(loop);
  };
  say("Coloca tu muñeca dentro del marco, con el dorso hacia la cámara.");
  requestAnimationFrame(loop);
}

/* ------------------------------------------------- demo account flow */
const KEY = "valmont-cuenta";
const store = { get() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } },
  set(v) { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch {} } };
const $ = (r, s) => r.querySelector(s);
const fmtTel = d => d.replace(/^(\d{2})(\d{0,4})(\d{0,4}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join(" "));

export function mountAccount(el, { id = "acc", onPrivacy, onFallback, track = () => {} } = {}) {
  el.classList.add("to-acc");
  let acc = store.get(), code = "", tries = 0, timer = 0;
  const newCode = () => String(Math.floor(100000 + Math.random() * 900000));

  function render(step) {
    clearInterval(timer);
    if (step === "signup") {
      el.innerHTML = `<form class="to-step" novalidate>
        <div class="to-field"><label class="to-lbl" for="${id}-name">Tu nombre</label><input id="${id}-name" autocomplete="given-name" required></div>
        <div class="to-field"><label class="to-lbl" for="${id}-tel">Tu número de WhatsApp</label><div class="to-tel"><span aria-hidden="true">+52</span><input id="${id}-tel" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="55 1234 5678" required aria-describedby="${id}-err"></div></div>
        <div class="to-ok"><input type="checkbox" id="${id}-ok"><p><label for="${id}-ok">Acepto crear mi cuenta Valmont, recibir el código por WhatsApp y, como máximo, dos mensajes más sobre la Josserand. Puedo darme de baja cuando quiera.</label> <button type="button" class="to-link" data-priv>Aviso de privacidad</button></p></div>
        <p class="to-err" id="${id}-err" aria-live="polite"></p>
        <button class="btn to-btn-main" type="submit">Crear mi cuenta</button>
        <p class="to-small">Gratis, sin pago ni tarjeta. Tu número nunca se vende ni se comparte.</p></form>`;
      const f = $(el, "form"), name = $(el, `#${id}-name`), tel = $(el, `#${id}-tel`), ok = $(el, `#${id}-ok`), err = $(el, ".to-err");
      if (acc && acc.tel) { name.value = acc.name || ""; tel.value = fmtTel(acc.tel); }
      $(el, "[data-priv]").onclick = () => onPrivacy && onPrivacy();
      tel.addEventListener("input", () => { let d = tel.value.replace(/\D/g, ""); if (d.length > 10 && d.startsWith("52")) d = d.slice(2); tel.value = fmtTel(d.slice(0, 10)); err.textContent = ""; });
      f.addEventListener("submit", e => {
        e.preventDefault();
        const d = tel.value.replace(/\D/g, "");
        if (!name.value.trim()) { err.textContent = "Escribe tu nombre."; name.focus(); return; }
        if (d.length !== 10) { err.textContent = "Escribe tu número de 10 dígitos, por ejemplo 55 1234 5678."; tel.focus(); return; }
        if (!ok.checked) { err.textContent = "Marca la casilla para crear tu cuenta y recibir el código por WhatsApp."; ok.focus(); return; }
        acc = { name: name.value.trim().slice(0, 60), tel: d, verified: false }; store.set(acc);
        track("sign_up"); code = newCode(); tries = 0; render("code");
      });
    }
    if (step === "code") {
      el.innerHTML = `<form class="to-step" novalidate>
        <p>Te enviamos un código de 6 dígitos por WhatsApp al <strong class="num">+52 ${fmtTel(acc.tel)}</strong>.</p>
        <p class="to-demo">Demo de proyecto universitario: no se envía ningún mensaje. Tu código es <b class="num">${code.slice(0, 3)} ${code.slice(3)}</b>.</p>
        <div class="to-field"><label class="to-lbl" for="${id}-code">Código de verificación</label><input class="to-code num" id="${id}-code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" aria-describedby="${id}-err"></div>
        <p class="to-err" id="${id}-err" aria-live="polite"></p>
        <button class="btn to-btn-main" type="submit">Confirmar mi cuenta</button>
        <div class="to-row"><button type="button" class="to-link" data-resend disabled>Reenviar código</button><button type="button" class="to-link" data-back>Cambiar número</button></div></form>`;
      const f = $(el, "form"), inp = $(el, `#${id}-code`), err = $(el, ".to-err"), resend = $(el, "[data-resend]");
      inp.focus();
      let left = 30; const tickR = () => { resend.disabled = left > 0; resend.textContent = left > 0 ? `Reenviar código en ${left} s` : "Reenviar código"; left--; };
      tickR(); timer = setInterval(() => { tickR(); if (left < 0) clearInterval(timer); }, 1000);
      resend.onclick = () => { code = newCode(); tries = 0; render("code"); };
      $(el, "[data-back]").onclick = () => render("signup");
      inp.addEventListener("input", () => { inp.value = inp.value.replace(/\D/g, "").slice(0, 6); err.textContent = ""; if (inp.value.length === 6) f.requestSubmit(); });
      f.addEventListener("submit", e => {
        e.preventDefault();
        if (tries >= 5) { err.textContent = "Demasiados intentos. Pide un código nuevo."; return; }
        if (inp.value !== code) { tries++; err.textContent = inp.value.length < 6 ? "Escribe los 6 dígitos del código." : "Ese código no coincide. Revisa el mensaje e inténtalo de nuevo."; inp.select(); return; }
        acc.verified = true; store.set(acc); track("account_verified"); render("ready"); $(el, "[data-cam]").focus();
      });
    }
    if (step === "ready") {
      el.innerHTML = `<div class="to-step">
        <p class="to-done"></p>
        <p>Abre la cámara, apunta a tu muñeca con el dorso hacia ella y verás la Josserand en 3D, a escala real. La imagen se procesa en tu dispositivo: no se graba ni se envía.</p>
        <button class="btn to-btn-main" type="button" data-cam>Probármela con la cámara</button>
        <div class="to-row"><button type="button" class="to-link" data-3d>Prefiero verla en 3D sin cámara</button><button type="button" class="to-link" data-out>Cerrar sesión</button></div></div>`;
      $(el, ".to-done").textContent = `Tu cuenta está confirmada, ${acc.name}.`;
      $(el, "[data-cam]").onclick = () => { track("tryon_open"); openTryOn({ onFallback }); };
      $(el, "[data-3d]").onclick = () => onFallback && onFallback();
      $(el, "[data-out]").onclick = () => { acc = null; store.set(null); render("signup"); };
    }
  }
  render(acc && acc.verified ? "ready" : "signup");
  return { focus() { const i = el.querySelector("input, button"); i && i.focus(); } };
}
