/* ============================================================
   Shared cooling tower artwork + particle effects
   ------------------------------------------------------------
   One tower definition drives three places: the hero schematic,
   the damage rig beside the quiz, and the collapse scene. Parts
   carry prefixed ids so a rig can lose pieces independently.
   ============================================================ */

/* Five equally spaced, swept, tapered fan blades, drawn as a true
   circular fan in a space the parent group foreshortens. */
var FAN_BLADES = [
  "M5.19 -1.49L6.86 -1.78L8.55 -1.94L10.27 -1.96L12 -1.84L13.74 -1.57L15.47 -1.14L17.19 -0.55L18.88 0.21L20.54 1.13L22.15 2.22L23.69 3.47L25.16 4.9L26.43 6.9L26.07 12.71L26.07 12.71L22.97 14.79L21.76 13.53L20.71 12.02L19.57 10.6L18.36 9.27L17.09 8.04L15.75 6.91L14.36 5.87L12.92 4.92L11.44 4.07L9.92 3.3L8.37 2.62L6.79 2.01L5.19 1.49Z",
  "M3.02 4.48L3.82 5.97L4.49 7.54L5.04 9.16L5.46 10.85L5.73 12.58L5.86 14.36L5.83 16.18L5.64 18.02L5.27 19.88L4.74 21.75L4.02 23.6L3.12 25.44L1.61 27.27L-4.04 28.72L-4.04 28.72L-6.97 26.41L-6.14 24.88L-5.03 23.41L-4.03 21.89L-3.14 20.33L-2.37 18.74L-1.7 17.12L-1.14 15.47L-0.69 13.81L-0.33 12.14L-0.07 10.46L0.1 8.77L0.19 7.08L0.19 5.4Z",
  "M-3.32 4.26L-4.5 5.47L-5.78 6.6L-7.16 7.62L-8.63 8.54L-10.2 9.34L-11.85 10.01L-13.59 10.55L-15.4 10.93L-17.28 11.16L-19.22 11.22L-21.21 11.11L-23.23 10.83L-25.44 9.96L-28.56 5.04L-28.56 5.04L-27.27 1.54L-25.56 1.84L-23.82 2.45L-22.06 2.93L-20.31 3.29L-18.55 3.54L-16.8 3.67L-15.07 3.69L-13.35 3.61L-11.65 3.43L-9.97 3.16L-8.31 2.8L-6.68 2.37L-5.07 1.85Z",
  "M-5.07 -1.85L-6.6 -2.59L-8.06 -3.46L-9.46 -4.45L-10.79 -5.57L-12.04 -6.81L-13.19 -8.18L-14.23 -9.66L-15.16 -11.27L-15.95 -12.99L-16.61 -14.81L-17.12 -16.73L-17.47 -18.75L-17.33 -21.11L-13.61 -25.61L-13.61 -25.61L-9.89 -25.46L-9.65 -23.74L-9.69 -21.89L-9.61 -20.08L-9.41 -18.29L-9.1 -16.55L-8.68 -14.85L-8.17 -13.19L-7.56 -11.58L-6.86 -10.02L-6.09 -8.5L-5.24 -7.04L-4.31 -5.62L-3.32 -4.26Z",
  "M0.19 -5.4L0.42 -7.07L0.8 -8.74L1.31 -10.38L1.96 -11.98L2.76 -13.55L3.7 -15.07L4.79 -16.52L6.03 -17.9L7.42 -19.19L8.95 -20.38L10.62 -21.46L12.43 -22.41L14.73 -23L20.15 -20.86L20.15 -20.86L21.16 -17.27L19.6 -16.52L17.83 -15.98L16.13 -15.34L14.49 -14.6L12.93 -13.77L11.44 -12.85L10.02 -11.84L8.68 -10.77L7.4 -9.62L6.21 -8.42L5.08 -7.15L4.01 -5.84L3.02 -4.48Z"
];

/* Where each breakable part sits, as a fraction of the 400x340 viewBox,
   so the particle layer can throw dust at the right spot. */
var TOWER_PARTS = [
  { id: "fan",    at: [0.50, 0.29], label: "Fan and stack" },
  { id: "drift",  at: [0.50, 0.39], label: "Drift eliminators" },
  { id: "header", at: [0.50, 0.42], label: "Distribution header" },
  { id: "fill",   at: [0.50, 0.53], label: "Fill pack" },
  { id: "louver", at: [0.34, 0.66], label: "Air louvers" }
];

function towerMarkup(pre, opts) {
  opts = opts || {};
  var blades = FAN_BLADES.map(function (d) { return '<path d="' + d + '"/>'; }).join("");

  var labels = opts.labels ? (
    '<g font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing=".02em" fill="var(--ink-3)">' +
      '<text x="66" y="133">Hot return</text>' +
      '<text x="66" y="286">Cold supply</text>' +
      '<text x="334" y="203">Makeup</text>' +
      '<text x="336" y="259">Blowdown</text>' +
      '<text x="292" y="128">Drift elim.</text>' +
      '<text x="292" y="182">Fill</text>' +
      '<text x="240" y="96" fill="var(--teal)">Fan</text>' +
    '</g>') : "";

  return '' +
  '<g id="' + pre + '-root">' +
    // fan stack
    '<g id="' + pre + '-fan" class="part">' +
      '<path d="M168 92h64v30h-64z" fill="var(--surface-3)" stroke="var(--line-2)" stroke-width="1.5"/>' +
      '<ellipse cx="200" cy="92" rx="32" ry="13" fill="var(--surface-2)" stroke="var(--line-2)" stroke-width="1.5"/>' +
      '<g transform="translate(200 92) scale(1 0.40625)">' +
        '<g class="fan" fill="var(--teal)">' + blades + '</g>' +
      '</g>' +
      '<circle cx="200" cy="92" r="4.6" fill="var(--surface-2)" stroke="var(--teal)" stroke-width="1.6"/>' +
    '</g>' +
    // shell
    '<path d="M124 122h152v112H124z" fill="var(--surface-2)" stroke="var(--line-2)" stroke-width="1.6"/>' +
    // fill pack
    '<g id="' + pre + '-fill" class="part">' +
      '<path d="M136 150h128v58H136z" fill="var(--teal-soft)" stroke="var(--line)" stroke-width="1.2"/>' +
      '<path d="M136 158h128M136 168h128M136 178h128M136 188h128M136 198h128" stroke="var(--plume)" stroke-width="1" opacity=".55"/>' +
    '</g>' +
    // distribution header + nozzles
    '<g id="' + pre + '-header" class="part">' +
      '<path d="M136 140h128" stroke="var(--amber)" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M152 141v6M176 141v6M200 141v6M224 141v6M248 141v6" stroke="var(--amber)" stroke-width="1.6" stroke-linecap="round"/>' +
    '</g>' +
    // drift eliminators
    '<g id="' + pre + '-drift" class="part">' +
      '<path d="M136 130l10 8M156 130l10 8M176 130l10 8M196 130l10 8M216 130l10 8M236 130l10 8M252 130l10 8" stroke="var(--ink-3)" stroke-width="1.2" opacity=".7"/>' +
    '</g>' +
    // air louvers
    '<g id="' + pre + '-louver" class="part">' +
      '<path d="M124 216l14 8M124 226l14 8M262 216l14 8M262 226l14 8" stroke="var(--ink-3)" stroke-width="1.3"/>' +
    '</g>' +
    // basin
    '<path d="M112 234h176v22H112z" fill="var(--teal-soft)" stroke="var(--line-2)" stroke-width="1.6"/>' +
    '<path d="M112 242h176" stroke="var(--teal)" stroke-width="1.1" opacity=".65"/>' +
    labels +
  '</g>' +
    // pipework stays in the ground when the tower goes over
    '<path d="M62 140h62" stroke="var(--bad)" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M62 140v34" stroke="var(--bad)" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M112 250H62v-34" stroke="var(--teal)" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="62" cy="195" r="13" fill="var(--surface)" stroke="var(--ink-3)" stroke-width="1.6"/>' +
    '<path d="M55 195h14M62 188v14" stroke="var(--ink-3)" stroke-width="1.4"/>' +
    '<path d="M330 200h-42v46" stroke="var(--teal)" stroke-width="2" stroke-linecap="round" stroke-dasharray="5 4"/>' +
    '<path d="M288 256h44" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-dasharray="5 4"/>' +
  // grade stays put while the tower falls
  '<path d="M40 268h320" stroke="var(--line-2)" stroke-width="1.4"/>';
}

/* ------------------------------------------------------------
   Particle layer: vapor plume, dust, smoke and fire on one canvas.
   ------------------------------------------------------------ */

function Fx(canvas) {
  this.cv = canvas;
  this.ctx = canvas.getContext("2d");
  this.parts = [];
  this.W = 0; this.H = 0;
  this.vapor = true;          // steady plume from the fan stack
  this.vaporAt = [0.5, 0.271];
  this.fires = [];            // [{x, y, power}]
  this.raf = null;
  this.last = 0;
  this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var self = this;
  this._onResize = function () { self.size(); };
  window.addEventListener("resize", this._onResize);
  this.size();
}

Fx.PALETTE = {
  vapor: { css: "--plume", a: 0.13, grow: 1.012, fade: 0.011 },
  dust:  { hex: "#A2988C", a: 0.15, grow: 1.013, fade: 0.017 },
  smoke: { hex: "#5C574F", a: 0.15, grow: 1.018, fade: 0.008 },
  fire:  { hex: "#F5A623", a: 0.46, grow: 0.990, fade: 0.028 },
  ember: { hex: "#DC4A18", a: 0.48, grow: 0.984, fade: 0.023 }
};

Fx.prototype.size = function () {
  var r = this.cv.getBoundingClientRect();
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  this.W = r.width; this.H = r.height;
  this.cv.width = Math.max(1, Math.round(r.width * dpr));
  this.cv.height = Math.max(1, Math.round(r.height * dpr));
  this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

Fx.prototype.add = function (nx, ny, kind, o) {
  o = o || {};
  if (!this.W) this.size();
  this.parts.push({
    kind: kind,
    x: this.W * nx + (Math.random() - 0.5) * (o.spread || 0.06) * this.W,
    y: this.H * ny + (Math.random() - 0.5) * (o.spread || 0.06) * this.H * 0.5,
    r: this.W * (o.r || 0.03) * (0.6 + Math.random() * 0.8),
    vx: (o.vx === undefined ? 0.04 : o.vx) + (Math.random() - 0.5) * (o.jx || 0.5),
    vy: (o.vy === undefined ? -0.25 : o.vy) + (Math.random() - 0.5) * (o.jy || 0.3),
    g: o.g || 0,
    life: 1
  });
};

/* A puff of debris at a point, for a part shearing off. */
Fx.prototype.burst = function (nx, ny, n, kind) {
  for (var i = 0; i < n; i++) {
    this.add(nx, ny, kind || "dust", {
      r: 0.016, spread: 0.05,
      vx: (Math.random() - 0.5) * 1.6,
      vy: -0.1 - Math.random() * 0.7,
      jx: 0.8, jy: 0.5, g: 0.012
    });
  }
};

/* A wide ground-hugging dust cloud, for the impact. */
Fx.prototype.ground = function (nx, ny, n) {
  for (var i = 0; i < n; i++) {
    var dir = Math.random() < 0.5 ? -1 : 1;
    this.add(nx, ny, "dust", {
      r: 0.032, spread: 0.34,
      vx: dir * (0.4 + Math.random() * 1.9),
      vy: -0.05 - Math.random() * 0.45,
      jx: 0.3, jy: 0.2, g: 0.004
    });
  }
};

Fx.prototype.ignite = function (nx, ny, power) {
  this.fires.push({ x: nx, y: ny, power: power || 0.2 });
};

Fx.prototype.stoke = function (delta) {
  this.fires.forEach(function (f) { f.power = Math.min(1, f.power + delta); });
};

Fx.prototype.clear = function () {
  this.parts.length = 0;
  this.fires.length = 0;
};

Fx.prototype.rgba = function (kind, a) {
  var p = Fx.PALETTE[kind];
  var hex = p.hex;
  if (p.css) {
    hex = getComputedStyle(document.documentElement).getPropertyValue(p.css).trim() || "#9AB";
  }
  var h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var n = parseInt(h, 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a.toFixed(3) + ")";
};

Fx.prototype.step = function () {
  var ctx = this.ctx, i, p, spec;

  if (this.vapor && this.parts.length < 40 && Math.random() < 0.6) {
    this.add(this.vaporAt[0], this.vaporAt[1], "vapor",
      { r: 0.035, spread: 0.10, vx: 0.03 + Math.random() * 0.09, vy: -(0.22 + Math.random() * 0.24) });
  }

  for (i = 0; i < this.fires.length; i++) {
    var f = this.fires[i];
    var n = 1 + Math.round(f.power * 4);   // always at least one flame
    for (var k = 0; k < n; k++) {
      this.add(f.x, f.y, Math.random() < 0.55 ? "fire" : "ember", {
        r: 0.014 + f.power * 0.016, spread: 0.035 * (0.5 + f.power),
        vx: (Math.random() - 0.5) * 0.34,
        vy: -(0.9 + Math.random() * 1.5) * (0.6 + f.power),
        jx: 0.18, jy: 0.4
      });
    }
    if (Math.random() < f.power * 0.5) {
      this.add(f.x, f.y - 0.08, "smoke", {
        r: 0.05 + f.power * 0.04, spread: 0.10,
        vx: (Math.random() - 0.3) * 0.5, vy: -(0.3 + Math.random() * 0.6), jx: 0.3, jy: 0.3
      });
    }
  }

  ctx.clearRect(0, 0, this.W, this.H);

  for (i = this.parts.length - 1; i >= 0; i--) {
    p = this.parts[i];
    spec = Fx.PALETTE[p.kind];
    p.vy += p.g;
    p.x += p.vx; p.y += p.vy;
    p.r *= spec.grow;
    p.life -= spec.fade;
    if (p.life <= 0 || p.r < 0.4 || p.y - p.r > this.H + 40) { this.parts.splice(i, 1); continue; }
    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, this.rgba(p.kind, spec.a * p.life));
    g.addColorStop(1, this.rgba(p.kind, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
};

Fx.prototype.start = function () {
  if (this.raf) return;
  var self = this;
  this.raf = requestAnimationFrame(function loop(now) {
    self.raf = requestAnimationFrame(loop);
    if (now - self.last < 32) return;     // ~30fps is plenty for vapor and dust
    self.last = now;
    self.step();
  });
};

Fx.prototype.stop = function () {
  if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
};

Fx.prototype.destroy = function () {
  this.stop();
  window.removeEventListener("resize", this._onResize);
};
