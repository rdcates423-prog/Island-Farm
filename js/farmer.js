(function () {
  var NS = "http://www.w3.org/2000/svg";
  // these must match the values at the top of main.js
  var N = 13, TW = 44, TH = 22, OX = 286, OY = 30;

  var STEP_MS = 350;  // time to walk one tile
  var PLANT_MS = 450; // short pause after planting
  var WATER_MS = 500; // pause while watering

  var world = document.getElementById("world");
  if (!world) return;

  var fx = 6, fy = 6; // start on the middle of the paths

  var queue = [];     // jobs waiting: { x, y, action, el }
  var queued = {};    // "x,y" -> the tile polygon (so we can un-highlight it)
  var busy = false;   // true while walking to / working on a tapped tile
  var wanderTimer = null;

  function make(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  var farmer = make("g", { id: "farmer", "pointer-events": "none" }, world);
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

  // ---------- watering (Step 05) ----------

  // three little 💧 drops fall next to the farmer's feet
  function splash(x, y) {
    var cx = OX + (x - y) * TW / 2 + 12;
    var cy = OY + (x + y) * TH / 2 + TH / 2;
    var offsets = [-6, 0, 6];
    var drops = [];
    for (var i = 0; i < offsets.length; i++) {
      var d = make("text", {
        "class": "water-drop", x: cx + offsets[i], y: cy - 4,
        "text-anchor": "middle", "font-size": 10
      }, world);
      d.style.animationDelay = (i * 100) + "ms";
      d.textContent = "💧";
      drops.push(d);
    }
    setTimeout(function () {
      for (var j = 0; j < drops.length; j++) {
        if (drops[j].parentNode) drops[j].parentNode.removeChild(drops[j]);
      }
    }, WATER_MS + 100);
  }

  // does the job for one tile once the farmer has arrived
  function doJob(t, finish) {
    var k = t.x + "," + t.y;

    function unmark() {
      if (queued[k]) {
        queued[k].classList.remove("queued");
        delete queued[k];
      }
    }

    if (t.action === "water") {
      sprite.classList.remove("hop");
      sprite.classList.add("water");
      splash(t.x, t.y);
      setTimeout(function () {
        sprite.classList.remove("water");
        if (window.Crops) window.Crops.water(t.x, t.y);
        t.el.classList.add("moist"); // dark brown tile (see style.css)
        unmark();
        finish();
      }, WATER_MS);
    } else {
      if (window.Crops) window.Crops.plant(t.x, t.y);
      unmark();
      hop();
      setTimeout(finish, PLANT_MS);
    }
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
      doJob(t, next);
    });
  }

  world.addEventListener("click", function (e) {
    var tool = window.Tool ? window.Tool.get() : "plant";
    // Plant and Water have jobs now. Harvest will get its own step.
    if (tool !== "plant" && tool !== "water") return;

    var el = e.target;
    if (!el || !el.getAttribute || el.getAttribute("data-plot") === null) return; // not a dirt tile

    var t = tileOf(el);
    var k = t.x + "," + t.y;
    if (queued[k]) return; // already waiting

    if (tool === "plant") {
      if (window.Crops && window.Crops.has(t.x, t.y)) return; // already planted
    } else {
      if (!window.Crops || !window.Crops.has(t.x, t.y)) return; // nothing to water
      if (window.Crops.isWet(t.x, t.y)) return;                 // already moist
    }

    queued[k] = el;
    el.classList.add("queued");
    queue.push({ x: t.x, y: t.y, action: tool, el: el });

    if (!busy) {
      clearTimeout(wanderTimer);
      next();
    }
  });

  place();
  schedule();
})();
