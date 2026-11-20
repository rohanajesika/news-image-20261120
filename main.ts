// news-image-20261120 — "The World in One Day: Friday, 20 November 2026"
// A hand-drawn newspaper front page that sums up the world's news of
// Friday 20 November 2026 in a single 1024x1024 image.
//
// Every story, figure and quote in the picture was verified against real
// reporting of the 20 November 2026 news cycle before this program was
// written (Reuters, NASA, BBC, The Hindu / IMD, ICJ, Sotheby's,
// The Art Newspaper):
//   * Voyager 1 crossed one light-day from Earth (25.9bn km) on 18 Nov;
//     NASA confirmed the milestone on 19 Nov.
//   * Trump said he will decide on Iran strikes after 1 January 2027:
//     "We'll see what happens after January 1" / "I'm not rushing".
//   * Cyclone Akvan: landfall due 20 Nov near Gopalpur, Odisha; about
//     300,000 people evacuated, 423 rescue teams deployed, winds 90-100
//     km/h gusting to 110.
//   * Trump, Xi and Putin held the first trilateral summit in Shenzhen
//     on 19 Nov and signed a four-point "Declaration Toward Peace".
//   * The ICJ ruled on 19 Nov that Myanmar committed genocide against
//     the Rohingya in the 2017 crackdown; the judgment is final.
//   * Van Gogh's "Chestnut Trees in Blossom" (1890) sold at Sotheby's
//     on 18 Nov for $190.4m, a record for the artist (old mark $117.2m).
//   * Also: GTA 6 sales passed The Odyssey's $1.8bn box office; Europe
//     said it is ready for talks with Russia on ending the Ukraine war;
//     Japan's Hayabusa2 dropped its asteroid landing after engine trouble.
//
// The program draws the whole image itself with the Node standard
// library only (no network, no fonts, no image files): a tiny raster
// canvas, a hand-made 5x7 bitmap font, and a small PNG encoder built
// on node:zlib. The output is fully deterministic: two runs write the
// same bytes.
//
// Run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------------------
// Colour palette: a newspaper front page — paper, ink, and flat spot colours.
// ---------------------------------------------------------------------------
const PAPER = [247, 243, 232];
const INK = [20, 33, 61];
const INK_SOFT = [58, 68, 92];
const NAVY = [11, 31, 58];
const NAVY_LIGHT = [23, 52, 92];
const GOLD = [217, 164, 65];
const RED = [193, 39, 45];
const TEAL = [27, 122, 107];
const BLUE = [43, 94, 167];
const SKY = [135, 178, 224];
const CREAM = [255, 250, 235];
const WHITE = [255, 255, 255];
const GREY_LINE = [190, 184, 168];
const GREEN = [46, 125, 71];
const BROWN = [122, 72, 32];
const YELLOW = [240, 196, 70];

type RGB = [number, number, number];

// ---------------------------------------------------------------------------
// Canvas: a plain RGB raster with the few primitives the drawing needs.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;

class Canvas {
  data = new Uint8Array(W * H * 3);

  constructor() {
    this.fill(PAPER);
  }

  fill(c: RGB): void {
    for (let i = 0; i < W * H; i++) {
      this.data[i * 3] = c[0];
      this.data[i * 3 + 1] = c[1];
      this.data[i * 3 + 2] = c[2];
    }
  }

  px(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(W, Math.ceil(x + w));
    const y1 = Math.min(H, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.px(xx, yy, c);
    }
  }

  frame(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
    this.rect(x, y, w, t, c);
    this.rect(x, y + h - t, w, t, c);
    this.rect(x, y, t, h, c);
    this.rect(x + w - t, y, t, h, c);
  }

  disc(cx: number, cy: number, r: number, c: RGB): void {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) this.px(x, y, c);
      }
    }
  }

  ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
    const r2 = r * r;
    const ri = Math.max(0, r - t);
    const ri2 = ri * ri;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 <= r2 && d2 >= ri2) this.px(x, y, c);
      }
    }
  }

  // Thick line: walk the segment and stamp discs.
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    const r = Math.max(1, Math.floor(t / 2));
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + (dx * i) / steps);
      const y = Math.round(y0 + (dy * i) / steps);
      if (t <= 1) this.px(x, y, c);
      else this.disc(x, y, r, c);
    }
  }

  // Filled triangle.
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minX = Math.floor(Math.min(x0, x1, x2));
    const maxX = Math.ceil(Math.max(x0, x1, x2));
    const minY = Math.floor(Math.min(y0, y1, y2));
    const maxY = Math.ceil(Math.max(y0, y1, y2));
    const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (d === 0) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
        const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
        const cc = 1 - a - b;
        if (a >= 0 && b >= 0 && cc >= 0) this.px(x, y, c);
      }
    }
  }

  // Filled ellipse.
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 bits ("#" on, "." off).
// Only the characters the picture uses are defined; text is uppercased
// before drawing, so the font is uppercase plus digits and punctuation.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "•": ["00000", "00000", "01100", "01100", "01100", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
};

// Width of one character cell at a scale, including the 1-cell gap.
function charAdvance(scale: number): number {
  return 6 * scale;
}

function textWidth(text: string, scale: number): number {
  return text.length * charAdvance(scale) - scale;
}

// Draw one line of text, uppercased. Returns the x after the last glyph.
function drawText(cv: Canvas, text: string, x: number, y: number, scale: number, c: RGB): number {
  const upper = text.toUpperCase();
  let cx = x;
  for (const ch of upper) {
    const glyph = FONT[ch] ?? FONT["?"];
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if (bits[col] === "1") {
          cv.rect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += charAdvance(scale);
  }
  return cx;
}

// Greedy word wrap: split the text into lines that fit maxWidth pixels.
function wrapText(text: string, scale: number, maxWidth: number): string[] {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (textWidth(trial, scale) <= maxWidth || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Draw a wrapped block of text; returns the y just below the last line.
function drawBlock(cv: Canvas, text: string, x: number, y: number, scale: number, maxWidth: number, c: RGB, lineGap = 4): number {
  const lines = wrapText(text, scale, maxWidth);
  let cy = y;
  for (const ln of lines) {
    drawText(cv, ln, x, cy, scale, c);
    cy += 7 * scale + lineGap;
  }
  return cy;
}

function drawCentered(cv: Canvas, text: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(cv, text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c);
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder (colour type 2, 8 bit, filter 0 per row), stdlib only.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(cv: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(cv.data.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Page layout: masthead, six story panels in a 2x3 grid, a ticker strip,
// and a sources footer. All measurements are fixed, so the output is
// byte-identical on every run.
// ---------------------------------------------------------------------------
const MARGIN = 16;
const PANEL_W = 488;
const PANEL_H = 244;
const GRID_X0 = MARGIN;
const GRID_Y0 = 132;
const GAP = 16;

interface Panel {
  kicker: string;
  kickerColor: RGB;
  headline: string;
  caption: string;
  draw: (cv: Canvas, x: number, y: number, w: number, h: number) => void;
}

// --- Pictograms: small flat drawings, one per story ------------------------

// 1. Voyager 1: a dish antenna on a starfield, beaming a signal home.
function drawVoyager(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, NAVY);
  const star = (sx: number, sy: number, s: number) => cv.rect(x + sx, y + sy, s, s, WHITE);
  star(12, 14, 2); star(40, 8, 2); star(66, 22, 2); star(96, 10, 3);
  star(120, 30, 2); star(24, 44, 2); star(52, 58, 2); star(88, 52, 2);
  star(130, 62, 2); star(10, 78, 2); star(118, 92, 2); star(70, 84, 2);
  // signal beam: dotted line from the dish toward the top-right corner
  for (let i = 0; i < 7; i++) {
    cv.disc(x + 62 + i * 9, y + 78 - i * 8, 2, GOLD);
  }
  // spacecraft body + dish
  cv.rect(x + 34, y + 84, 52, 26, [196, 200, 210]);
  cv.rect(x + 34, y + 84, 52, 6, WHITE);
  cv.line(x + 60, y + 84, x + 76, y + 52, [196, 200, 210], 4);
  cv.ellipse(x + 82, y + 46, 26, 12, WHITE);
  cv.ellipse(x + 82, y + 48, 20, 8, SKY);
  cv.line(x + 34, y + 110, x + 22, y + 128, [196, 200, 210], 4);
  cv.line(x + 86, y + 110, x + 98, y + 128, [196, 200, 210], 4);
  drawText(cv, "25.9 BN KM", x + 18, y + h - 26, 2, GOLD);
}

// 2. Iran decision: a calendar page marked 1 JANUARY, pushed to 2027.
function drawCalendar(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, CREAM);
  cv.frame(x, y, w, h, INK, 3);
  cv.rect(x + 10, y + 10, w - 20, 34, RED);
  drawText(cv, "2027", x + 44, y + 18, 3, WHITE);
  drawText(cv, "JAN 1", x + 22, y + 58, 3, INK);
  // a red ring around the date, and a "not yet" pause mark below it
  cv.ring(x + 72, y + 80, 34, 4, RED);
  cv.rect(x + 58, y + 118, 10, 22, INK);
  cv.rect(x + 78, y + 118, 10, 22, INK);
  drawText(cv, "ON HOLD", x + 32, y + 150, 2, RED);
}

// 3. Cyclone Akvan: a spiral storm over a coastline.
function drawCyclone(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, SKY);
  // spiral: concentric rings, each shifted a little, like a storm
  cv.ring(x + 74, y + 66, 58, 7, WHITE);
  cv.ring(x + 78, y + 70, 44, 7, [220, 232, 245]);
  cv.ring(x + 74, y + 66, 30, 7, WHITE);
  cv.ring(x + 76, y + 68, 17, 6, [220, 232, 245]);
  cv.disc(x + 74, y + 66, 8, NAVY);
  // rain slashes
  for (let i = 0; i < 5; i++) {
    cv.line(x + 8 + i * 12, y + 118, x + 2 + i * 12, y + 134, WHITE, 3);
  }
  for (let i = 0; i < 4; i++) {
    cv.line(x + 96 + i * 12, y + 118, x + 90 + i * 12, y + 134, WHITE, 3);
  }
  // coastline + land
  cv.rect(x, y + h - 26, w, 26, GREEN);
  cv.rect(x, y + h - 26, w, 4, [30, 90, 55]);
  drawText(cv, "ODISHA", x + 42, y + h - 22, 2, WHITE);
}

// 4. Trilateral summit: three flags and a peace ribbon.
function drawSummit(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, CREAM);
  // US flag chip
  cv.rect(x + 8, y + 12, 40, 26, RED);
  cv.rect(x + 8, y + 18, 40, 4, WHITE);
  cv.rect(x + 8, y + 30, 40, 4, WHITE);
  cv.rect(x + 8, y + 12, 16, 14, BLUE);
  cv.disc(x + 16, y + 19, 2, WHITE);
  // China flag chip
  cv.rect(x + 56, y + 12, 40, 26, RED);
  cv.disc(x + 66, y + 25, 3, YELLOW);
  cv.disc(x + 80, y + 19, 2, YELLOW);
  cv.disc(x + 84, y + 27, 2, YELLOW);
  // Russia flag chip
  cv.rect(x + 104, y + 12, 40, 26, WHITE);
  cv.rect(x + 104, y + 21, 40, 9, BLUE);
  cv.rect(x + 104, y + 30, 40, 8, RED);
  cv.frame(x + 104, y + 12, 40, 26, INK, 1);
  // three heads at one table
  cv.disc(x + 28, y + 66, 12, [232, 190, 150]);
  cv.disc(x + 76, y + 66, 12, [232, 190, 150]);
  cv.disc(x + 124, y + 66, 12, [232, 190, 150]);
  cv.rect(x + 12, y + 80, 32, 22, NAVY);
  cv.rect(x + 60, y + 80, 32, 22, RED);
  cv.rect(x + 108, y + 80, 32, 22, INK_SOFT);
  // table + declaration ribbon
  cv.rect(x + 4, y + 102, w - 8, 8, BROWN);
  cv.rect(x + 18, y + 118, w - 36, 26, GOLD);
  drawText(cv, "PEACE", x + 44, y + 124, 2, NAVY);
}

// 5. ICJ: scales of justice.
function drawScales(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, CREAM);
  // post and beam
  cv.rect(x + 70, y + 16, 8, 96, INK);
  cv.rect(x + 18, y + 30, 112, 7, INK);
  cv.disc(x + 74, y + 16, 6, GOLD);
  // left pan
  cv.line(x + 24, y + 37, x + 8, y + 66, INK, 2);
  cv.line(x + 24, y + 37, x + 40, y + 66, INK, 2);
  cv.tri(x + 4, y + 66, x + 44, y + 66, x + 24, y + 88, GOLD);
  // right pan
  cv.line(x + 124, y + 37, x + 108, y + 66, INK, 2);
  cv.line(x + 124, y + 37, x + 140, y + 66, INK, 2);
  cv.tri(x + 104, y + 66, x + 144, y + 66, x + 124, y + 88, GOLD);
  // base + gavel
  cv.rect(x + 52, y + 112, 44, 8, INK);
  cv.rect(x + 20, y + 124, 108, 6, INK);
  drawText(cv, "THE HAGUE", x + 34, y + h - 24, 2, INK_SOFT);
}

// 6. Van Gogh: a gold-framed canvas with a swirling sky and a tree.
function drawVanGogh(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, CREAM);
  // gold frame
  cv.frame(x + 8, y + 8, w - 16, 108, GOLD, 6);
  // sky with swirls
  cv.rect(x + 14, y + 14, w - 28, 96, [58, 110, 190]);
  cv.ring(x + 44, y + 44, 18, 4, YELLOW);
  cv.ring(x + 104, y + 36, 12, 4, [200, 220, 245]);
  cv.ring(x + 74, y + 60, 22, 4, [140, 180, 230]);
  cv.disc(x + 118, y + 30, 8, YELLOW);
  // chestnut tree: trunk + green crown
  cv.rect(x + 66, y + 62, 10, 48, BROWN);
  cv.disc(x + 56, y + 58, 16, GREEN);
  cv.disc(x + 82, y + 52, 16, [58, 145, 84]);
  cv.disc(x + 70, y + 44, 14, GREEN);
  // ground
  cv.rect(x + 14, y + 96, w - 28, 14, [120, 160, 90]);
  drawText(cv, "$190.4M", x + 34, y + h - 26, 2, RED);
}

// --- The six stories, in the order they lead the day's front pages ---------
const PANELS: Panel[] = [
  {
    kicker: "SPACE",
    kickerColor: BLUE,
    headline: "VOYAGER 1: ONE LIGHT-DAY AWAY",
    caption:
      "NASA confirms the probe has crossed 25.9 billion km from Earth — the first human-made object so far away. A radio signal now takes 24 hours each way.",
    draw: drawVoyager,
  },
  {
    kicker: "WASHINGTON",
    kickerColor: RED,
    headline: "TRUMP PUTS IRAN DECISION OFF TO 2027",
    caption:
      "\"We'll see what happens after January 1,\" the president says. \"I'm not rushing to make any decisions on Iran.\"",
    draw: drawCalendar,
  },
  {
    kicker: "INDIA",
    kickerColor: TEAL,
    headline: "CYCLONE AKVAN BEARS DOWN ON ODISHA",
    caption:
      "Landfall due today near Gopalpur. About 300,000 people evacuated to shelters; 423 rescue teams deployed; winds of 90-100 km/h.",
    draw: drawCyclone,
  },
  {
    kicker: "SHENZHEN",
    kickerColor: NAVY_LIGHT,
    headline: "TRUMP, XI AND PUTIN MEET — A FIRST",
    caption:
      "The three leaders sign a four-point \"Declaration Toward Peace\" at APEC: a nuclear war \"cannot be won and must never be fought\".",
    draw: drawSummit,
  },
  {
    kicker: "THE HAGUE",
    kickerColor: INK_SOFT,
    headline: "ICJ: MYANMAR COMMITTED GENOCIDE",
    caption:
      "The world court rules on the 2017 crackdown on the Rohingya. The judgment is final, with no appeal.",
    draw: drawScales,
  },
  {
    kicker: "NEW YORK",
    kickerColor: GOLD,
    headline: "VAN GOGH SELLS FOR A RECORD $190.4M",
    caption:
      "\"Chestnut Trees in Blossom\" (1890) beats the artist's old $117.2m record at Sotheby's, after a Nazi-era ownership dispute was settled.",
    draw: drawVanGogh,
  },
];

const TICKER =
  "ALSO TODAY: GTA 6 SALES PASS THE ODYSSEY'S $1.8BN BOX OFFICE • EUROPE READY FOR UKRAINE TALKS WITH RUSSIA, LEADERS SAY • JAPAN'S HAYABUSA2 DROPS ITS ASTEROID LANDING AFTER ENGINE TROUBLE";

const FOOTER = "REPORTS: REUTERS • NASA • BBC • THE HINDU / IMD • ICJ • SOTHEBY'S • THE ART NEWSPAPER";

// --- Page assembly ----------------------------------------------------------

function drawMasthead(cv: Canvas): void {
  cv.rect(0, 0, W, 116, NAVY);
  // small globe mark at the left
  cv.ring(52, 58, 34, 4, GOLD);
  cv.line(52, 24, 52, 92, GOLD, 3);
  cv.line(22, 58, 82, 58, GOLD, 3);
  cv.ellipse(52, 58, 34, 13, GOLD);
  drawText(cv, "THE WORLD IN ONE DAY", 108, 26, 4, WHITE);
  drawText(cv, "FRIDAY, 20 NOVEMBER 2026", 108, 66, 3, GOLD);
  cv.rect(0, 116, W, 4, GOLD);
}

function drawPanel(cv: Canvas, p: Panel, px: number, py: number): void {
  cv.rect(px, py, PANEL_W, PANEL_H, WHITE);
  cv.frame(px, py, PANEL_W, PANEL_H, INK, 2);
  // kicker strip
  cv.rect(px + 2, py + 2, PANEL_W - 4, 30, p.kickerColor);
  drawText(cv, p.kicker, px + 14, py + 10, 2, WHITE);
  // pictogram on the left, headline + caption on the right
  const picX = px + 12;
  const picY = py + 44;
  const picW = 152;
  const picH = 188;
  cv.frame(picX, picY, picW, picH, GREY_LINE, 2);
  p.draw(cv, picX + 2, picY + 2, picW - 4, picH - 4);
  const tx = px + 180;
  const tw = PANEL_W - 180 - 14;
  drawBlock(cv, p.headline, tx, py + 46, 2, tw, INK, 3);
  const headLines = wrapText(p.headline, 2, tw).length;
  const capY = py + 46 + headLines * (7 * 2 + 3) + 8;
  drawBlock(cv, p.caption, tx, capY, 2, tw, INK_SOFT, 4);
}

function drawTicker(cv: Canvas): void {
  const y = GRID_Y0 + 3 * PANEL_H + 2 * GAP + 12; // 912
  cv.rect(MARGIN, y, W - 2 * MARGIN, 40, RED);
  drawBlock(cv, TICKER, MARGIN + 12, y + 6, 1, W - 2 * MARGIN - 24, WHITE, 2);
}

function drawFooter(cv: Canvas): void {
  const y = 968;
  cv.rect(MARGIN, y, W - 2 * MARGIN, 2, INK);
  drawCentered(cv, FOOTER, W / 2, y + 12, 1, INK_SOFT);
  drawCentered(cv, "ONE DAY. SIX STORIES. THE WORLD, 20 NOVEMBER 2026.", W / 2, y + 26, 1, INK);
}

function buildImage(): Canvas {
  const cv = new Canvas();
  drawMasthead(cv);
  for (let i = 0; i < PANELS.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawPanel(cv, PANELS[i], GRID_X0 + col * (PANEL_W + GAP), GRID_Y0 + row * (PANEL_H + GAP));
  }
  drawTicker(cv);
  drawFooter(cv);
  return cv;
}

// --- Entry point ------------------------------------------------------------

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  const png = encodePNG(buildImage());
  if (png.length > 1048576) {
    console.error(`entry.png is ${png.length} bytes, over the 1 MiB cap`);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.png");
  writeFileSync(outPath, png);
  // self-check: the file starts with the PNG signature
  const sig = png.subarray(0, 8);
  const ok = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47;
  console.log(`wrote ${outPath}: ${W}x${H}, ${png.length} bytes, PNG signature ${ok ? "ok" : "BAD"}`);
  if (!ok) process.exit(1);
}

main();
