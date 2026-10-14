import * as THREE from "three";

/*
 * Tiny procedural textures (offscreen canvas) — no image downloads.
 * Used for glows, ZZZ sprites and the floor shadow.
 */

function makeCanvas(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

let _glow = null;
export function glowTexture() {
  if (_glow) return _glow;
  const c = makeCanvas(128);
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(210,245,255,0.55)");
  grd.addColorStop(0.6, "rgba(120,200,255,0.16)");
  grd.addColorStop(1, "rgba(120,200,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  _glow = new THREE.CanvasTexture(c);
  return _glow;
}

/* Hologram scan-grid for the projector platform + panel under-glow. */
let _grid = null;
export function gridTexture() {
  if (_grid) return _grid;
  const c = makeCanvas(256);
  const g = c.getContext("2d");
  g.clearRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(140,240,255,0.55)";
  g.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    const p = (i / 8) * 256;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 256); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(256, p); g.stroke();
  }
  _grid = new THREE.CanvasTexture(c);
  _grid.wrapS = _grid.wrapT = THREE.RepeatWrapping;
  _grid.center = new THREE.Vector2(0.5, 0.5);
  return _grid;
}

let _zzz = null;
export function zzzTexture() {
  if (_zzz) return _zzz;
  const c = makeCanvas(128);
  const g = c.getContext("2d");
  g.clearRect(0, 0, 128, 128);
  g.font = "bold 88px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  // dark outline + light core so the Z reads on light AND dark backgrounds
  g.lineWidth = 11;
  g.strokeStyle = "rgba(40, 54, 116, 0.92)";
  g.lineJoin = "round";
  g.strokeText("Z", 64, 68);
  g.fillStyle = "rgba(238, 250, 255, 0.96)";
  g.fillText("Z", 64, 68);
  _zzz = new THREE.CanvasTexture(c);
  return _zzz;
}

/* Soft dark blob — fakes contact shadow without shadow maps. */
let _shadow = null;
export function shadowTexture() {
  if (_shadow) return _shadow;
  const c = makeCanvas(128);
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(6,10,24,0.5)");
  grd.addColorStop(0.7, "rgba(6,10,24,0.18)");
  grd.addColorStop(1, "rgba(6,10,24,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  _shadow = new THREE.CanvasTexture(c);
  return _shadow;
}
