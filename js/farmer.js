(function () {
  var NS = "http://www.w3.org/2000/svg";
  // these must match the values at the top of main.js
  var N = 13, TW = 44, TH = 22, OX = 286, OY = 30;

  var STEP_MS = 350;  // time to walk one tile
  var PLANT_MS = 450; // short pause after planting

  var world = document.getElementById("world");
  if (!world) return;

  var fx = 6, fy = 6; // start on the middle of the paths

  var queue = [];     // tiles waiting to be planted: { x, y }
  var queued = {};    // "x,y" -> the tile polygon (so we can un-highlight it)
  var busy = false;   // true while walking to / planting on a tapped tile
  var wanderTimer = null;

  function make(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  var farmer = make("g", { id: "farmer" }, world);
  make("ellipse", { "class": "farmer-shadow", cx: 0, cy: 0, rx: 9, ry: 4 }, farmer);
  var sprite = make("text", {
    "class": "farmer-sprite", x: 0, y: -1,
    "text-anchor": "middle", "font-size": 24
  }, farmer);
  sprite.textContent = "🧑‍🌾";

  function place() {
    var cx = OX + (fx - fy) * TW / 2;
    var cy = OY + (fx + fy) * TH / 2 + TH / 2;
    farmer.style.transform = "translate(" + cx + "px," + cy + "px)";
  }

  function hop() {
    sprite.classList.remove("hop");
    void sprite.getBoundingClientRect(); // lets the animation restart
    sprite.classList.add("hop");
    setTimeout(function () { sprite.classList.remove("hop"); }, 600);
  }

  // ---------- random wandering (Step 02) ----------

  function wander() {
    if (busy) return;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var ok = dirs.filter(function (d) {
      var nx = fx + d[0], ny = fy + d[1];
      return nx >= 1 && nx <= N - 2 && ny >= 1 && ny <= N - 2;
    });
    var d = ok[Math.floor(Math.random() * ok.length)];
    fx += d[0];
    fy += d[1];
    place();
    hop();
    schedule();
  }

  function schedule() {
    clearTimeout(wanderTimer);
    wanderTimer = setTimeout(wander, 3000 + Math.random() * 2000);
  }

  // ---------- walking to a tapped tile (Step 03) ----------

  // turns a dirt tile polygon into grid coordinates (the reverse of main.js)
  function tileOf(el) {
    var pid = +el.getAttribute("data-plot");
    var row = +el.getAttribute("data-row");
    var col = +el.getAttribute("data-col");
    return {
      x: (pid & 1) ? col + 7 : col + 1,
      y: (pid & 2) ? row + 7 : row + 1
    };
  }

  // walks one tile at a time (left/right first, then up/down), then calls done
  function walkTo(tx, ty, done) {
    farmer.style.transition = "transform " + STEP_MS + "ms linear";
    sprite.classList.add("walk");

    function step() {
      if (fx === tx && fy === ty) {
        sprite.classList.remove("walk");
        farmer.style.transition = "";
        done();
        return;
      }
      if (fx !== tx) fx += (fx < tx) ? 1 : -1;
      else fy += (fy < ty) ? 1 : -1;
      place();
      setTimeout(step, STEP_MS);
    }
    step();
  }

  function next() {
    var t = queue.shift();
    if (!t) {
      busy = false;
      schedule(); // nothing left to do, go back to wandering
      return;
    }
    busy = true;
    walkTo(t.x, t.y, function () {
      var k = t.x + "," + t.y;
      if (window.Crops) window.Crops.plant(t.x, t.y);
      if (queued[k]) {
        queued[k].classList.remove("queued");
        delete queued[k];
      }
      hop();
      setTimeout(next, PLANT_MS);
    });
  }

  world.addEventListener("click", function (e) {
    // Step 04: only the Plant tool plants. Water and Harvest will get their own steps.
    if (window.Tool && window.Tool.get() !== "plant") return;

    var el = e.target;
    if (!el || !el.getAttribute || el.getAttribute("data-plot") === null) return; // not a dirt tile

    var t = tileOf(el);
    var k = t.x + "," + t.y;
    if (queued[k]) return;                                  // already waiting
    if (window.Crops && window.Crops.has(t.x, t.y)) return; // already planted

    queued[k] = el;
    el.classList.add("queued");
    queue.push(t);

    if (!busy) {
      clearTimeout(wanderTimer);
      next();
    }
  });

  place();
  schedule();
})();
