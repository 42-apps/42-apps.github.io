import * as THREE from 'three';

// Selenographic lat/lon (east-positive) -> position on a sphere of radius r.
// Calibrated so the 8K equirectangular texture's features line up with the markers.
// Three.js SphereGeometry maps texture-centre (lon 0, the sub-Earth point) to the
// +X axis, so a +180° offset aligns selenographic longitude with the imagery.
export const LON_OFFSET = 180; // degrees

export function latLonToVec3(lat, lon, r, out = new THREE.Vector3()){
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + LON_OFFSET) * Math.PI / 180;
  out.set(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
  return out;
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);

export function fmtDuration(sec){
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400); sec -= d * 86400;
  const h = Math.floor(sec / 3600);  sec -= h * 3600;
  const m = Math.floor(sec / 60);    const s = sec - m * 60;
  const p = n => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${p(h)}:${p(m)}:${p(s)}`;
  return `${p(h)}:${p(m)}:${p(s)}`;
}

export function fmtKm(km){
  if (km >= 1e6) return (km / 1e6).toFixed(2) + 'M km';
  if (km >= 1000) return (km / 1000).toFixed(0) + 'k km';
  return km.toFixed(0) + ' km';
}
