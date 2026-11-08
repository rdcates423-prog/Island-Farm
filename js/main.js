var N = 13, TW = 44, TH = 22, D = 26, OX = 286, OY = 30;

function rnd(x, y) {
  var v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function isPath(x, y) { return x === 6 || y === 6; }
function land(x, y) {
  if (x < 0 || y < 0 || x >= N || y >= N) return false;
  var cx = Math.min(x, N - 1 - x), cy = Math.min(y, N - 1 - y);
  if (cx === 0 && cy === 0) return false;
  var border = (cx === 0 || cy === 0);
  if (border && !isPath(x, y) && rnd(x, y) > 0.88) return false;
  return true;
}
function kind(x, y) {
  if (isPath(x, y)) return "path";
  if (x === 0 || y === 0 || x === N - 1 || y === N - 1) return "grass";
  return "plot";
}
function P(pts) {
  return pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
}
function poly(pts, cls, extra) {
  return '<polygon class="' + cls + '" points="' + P(pts) + '"' + (extra || "") + "/>";
}
function dia(cx, cy, hw, hh) {
  return [[cx, cy - hh], [cx + hw, cy], [cx, cy + hh], [cx - hw, cy]];
}
function cube(cx, cy, w, h, ct, cl, cr) {
  return poly([[cx - w, cy], [cx, cy + w / 2], [cx, cy + w / 2 - h], [cx - w, cy - h]], cl) +
         poly([[cx, cy + w / 2], [cx + w, cy], [cx + w, cy - h], [cx, cy + w / 2 - h]], cr) +
         poly([[cx, cy - h - w / 2], [cx + w, cy - h], [cx, cy - h + w / 2], [cx - w, cy - h]], ct);
}

var o = [], x, y, s;

// shallow water around the island
for (s = 0; s <= 2 * (N - 1); s++) for (x = 0; x < N; x++) {
  y = s - x;
  if (y < 0 || y >= N || !land(x, y)) continue;
  o.push(poly(dia(OX + (x - y) * TW / 2, OY + (x + y) * TH / 2 + TH / 2 + D * 0.7, TW * 1.15, TH * 1.15), "sh2"));
}
for (s = 0; s <= 2 * (N - 1); s++) for (x = 0; x < N; x++) {
  y = s - x;
  if (y < 0 || y >= N || !land(x, y)) continue;
  o.push(poly(dia(OX + (x - y) * TW / 2, OY + (x + y) * TH / 2 + TH / 2 + D * 0.7, TW * 0.72, TH * 0.72), "sh1"));
}

// island tiles, back to front
for (s = 0; s <= 2 * (N - 1); s++) for (x = 0; x < N; x++) {
  y = s - x;
  if (y < 0 || y >= N || !land(x, y)) continue;
  var sx = OX + (x - y) * TW / 2, sy = OY + (x + y) * TH / 2;
  var k = kind(x, y), r = rnd(x, y), c1 = D * 0.55;
  var T = [sx, sy], R = [sx + TW / 2, sy + TH / 2], B = [sx, sy + TH], L = [sx - TW / 2, sy + TH / 2];

  if (!land(x, y + 1)) {
    o.push(poly([L, B, [B[0], B[1] + c1], [L[0], L[1] + c1]], "cl1"));
    o.push(poly([[L[0], L[1] + c1], [B[0], B[1] + c1], [B[0], B[1] + D], [L[0], L[1] + D]], "cl2"));
  }
  if (!land(x + 1, y)) {
    o.push(poly([B, R, [R[0], R[1] + c1], [B[0], B[1] + c1]], "cr1"));
    o.push(poly([[B[0], B[1] + c1], [R[0], R[1] + c1], [R[0], R[1] + D], [B[0], B[1] + D]], "cr2"));
  }

  var cls, extra = "";
  if (k === "grass") cls = "g" + ((r * 3) | 0);
  else if (k === "path") cls = "p" + ((r * 3) | 0);
  else {
    cls = "d" + ((x + y) % 2);
    var pid = (x > 6 ? 1 : 0) + (y > 6 ? 2 : 0);
    extra = ' data-plot="' + pid + '" data-row="' + (y > 6 ? y - 7 : y - 1) + '" data-col="' + (x > 6 ? x - 7 : x - 1) + '"';
  }
  o.push(poly([T, R, B, L], cls, extra));

  var cx = sx, cy = sy + TH / 2;
  if (k === "grass") {
    if ((x === 0 || y === 0) && r > 0.5) {
      o.push(cube(cx, cy, 3, 8, "tt", "tl", "tr"));
      o.push(cube(cx, cy - 8, 9, 10, "lt", "ll", "lr"));
    } else if ((x === N - 1 || y === N - 1) && r < 0.3) {
      o.push(cube(cx, cy, 7, 6, "lt", "ll", "lr"));
    }
  }
}

document.getElementById("world").innerHTML = o.join("");

// ---------- background game loop ----------
// Runs about 60 times a second and tells the crops how many seconds passed.
var lastTime = null;

function gameLoop(now) {
  if (lastTime === null) lastTime = now;
  var dt = (now - lastTime) / 1000; // seconds since the last frame
  lastTime = now;
  if (dt > 0.25) dt = 0.25; // if the tab was in the background, don't jump ahead

  if (window.Crops && Crops.update) Crops.update(dt);

  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
