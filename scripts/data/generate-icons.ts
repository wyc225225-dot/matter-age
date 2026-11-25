import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

// Minimal deterministic RGBA -> PNG encoder using built-in node:zlib (zero external deps).
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length, false);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  view.setUint32(8 + data.length, crc, false);
  return out;
}

function encodePng(
  width: number,
  height: number,
  rgba: Uint8Array,
): Uint8Array {
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter None
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * stride + 1);
  }
  const compressed = deflateSync(raw, { level: 9 });
  const parts = [
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function distSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const len2 = vx * vx + vy * vy || 1;
  const t = clamp((wx * vx + wy * vy) / len2, 0, 1);
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

function blend(
  rgba: Uint8Array,
  idx: number,
  r: number,
  g: number,
  b: number,
  a: number,
) {
  const alpha = clamp(a, 0, 1);
  if (alpha <= 0) return;
  const inv = 1 - alpha;
  rgba[idx] = Math.round(rgba[idx] * inv + r * alpha);
  rgba[idx + 1] = Math.round(rgba[idx + 1] * inv + g * alpha);
  rgba[idx + 2] = Math.round(rgba[idx + 2] * inv + b * alpha);
  rgba[idx + 3] = 255;
}

/**
 * Renders the Matter Age flask + glowing liquid + molecular bubble emblem into a crisp PNG.
 * Coordinates are normalized to a 192x192 design canvas.
 */
function renderIcon(size: number, maskable: boolean): Uint8Array {
  const rgba = new Uint8Array(size * size * 4);
  const padScale = maskable ? 0.78 : 1.0;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;
      // Normalized [0, 192]
      const gx = ((px + 0.5) / size) * 192;
      const gy = ((py + 0.5) / size) * 192;

      // Background dark lab gradient (#0e1622 -> #192b3b)
      const bgRadial = Math.hypot(gx - 96, gy - 82) / 140;
      const bgMix = clamp(1 - bgRadial, 0, 1);
      rgba[idx] = Math.round(14 + 18 * bgMix);
      rgba[idx + 1] = Math.round(22 + 27 * bgMix);
      rgba[idx + 2] = Math.round(34 + 34 * bgMix);
      rgba[idx + 3] = 255;

      // Map into inner design space for maskable safe zone
      const x = 96 + (gx - 96) / padScale;
      const y = 96 + (gy - 96) / padScale;

      // Subtle outer orbital ring
      const orbDist = Math.abs(Math.hypot(x - 96, y - 98) - 68);
      if (orbDist < 2.2) {
        blend(rgba, idx, 131, 205, 233, (1 - orbDist / 2.2) * 0.22);
      }

      // Soft ambient glow behind flask
      const glow = clamp(1 - Math.hypot(x - 96, y - 118) / 68, 0, 1);
      blend(rgba, idx, 102, 185, 219, glow * glow * 0.26);

      // Flask interior liquid region (trapezoid y in [116, 158])
      if (y >= 116 && y <= 158) {
        const t = (y - 84) / (158 - 84);
        const halfW = 16 + t * 44;
        const dx = Math.abs(x - 96);
        if (dx <= halfW - 3) {
          const edge = clamp((halfW - 3 - dx) / 2, 0, 1);
          const wave = 116 + Math.sin((x - 60) * 0.12) * 2.2;
          if (y >= wave) {
            const depth = clamp((y - wave) / 42, 0, 1);
            const r = Math.round(131 * (1 - depth) + 40 * depth);
            const g = Math.round(205 * (1 - depth) + 98 * depth);
            const b = Math.round(233 * (1 - depth) + 131 * depth);
            blend(rgba, idx, r, g, b, 0.82 * edge);
          }
        }
      }

      // Flask stroke outline segments
      const stroke = 4.2;
      const d = Math.min(
        distSegment(x, y, 68, 38, 124, 38), // top lip
        distSegment(x, y, 78, 38, 78, 84), // left neck
        distSegment(x, y, 114, 38, 114, 84), // right neck
        distSegment(x, y, 78, 84, 42, 148), // left slope
        distSegment(x, y, 114, 84, 150, 148), // right slope
        distSegment(x, y, 42, 148, 52, 160), // left corner
        distSegment(x, y, 150, 148, 140, 160), // right corner
        distSegment(x, y, 52, 160, 140, 160), // base
      );
      if (d < stroke + 1.5) {
        const a = clamp(1 - (d - stroke + 1.5) / 2.2, 0, 1);
        blend(rgba, idx, 147, 214, 238, a);
      }

      // Highlight bubbles & golden discovery spark
      const b1 = Math.hypot(x - 86, y - 134);
      if (b1 < 8)
        blend(rgba, idx, 210, 245, 255, clamp((8 - b1) / 2, 0, 1) * 0.72);
      const b2 = Math.hypot(x - 108, y - 142);
      if (b2 < 5.5)
        blend(rgba, idx, 210, 245, 255, clamp((5.5 - b2) / 2, 0, 1) * 0.75);
      const b3 = Math.hypot(x - 98, y - 101);
      if (b3 < 6)
        blend(rgba, idx, 234, 196, 119, clamp((6 - b3) / 2, 0, 1) * 0.95);
      const b4 = Math.hypot(x - 140, y - 58);
      if (b4 < 4.5)
        blend(rgba, idx, 234, 196, 119, clamp((4.5 - b4) / 2, 0, 1) * 0.85);
    }
  }
  return encodePng(size, size, rgba);
}

export function generatePwaIcons() {
  mkdirSync("public/icons", { recursive: true });
  writeFileSync("public/icons/icon-192.png", renderIcon(192, false));
  writeFileSync("public/icons/icon-512.png", renderIcon(512, false));
  writeFileSync("public/icons/icon-512-maskable.png", renderIcon(512, true));
  writeFileSync("public/icons/apple-touch-icon.png", renderIcon(180, false));
}
