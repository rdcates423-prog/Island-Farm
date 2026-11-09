(function () {
  var NS = "http://www.w3.org/2000/svg";
  // these must match the values at the top of main.js
  var N = 13, TW = 44, TH = 22, OX = 286, OY = 30;

  var STEP_MS = 350;    // time to walk one tile
  var PLANT_MS = 450;   // short pause after planting
  var WATER_MS = 500;   // pause while watering
  var HARVEST_MS = 500; // short pause while harvesting
  var HARVEST_GOLD = 10; // gold earned per turnip
  var PLANT_COST = 6;    // gold it costs to plant one turnip

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

  // ---------- pixel art farmer ----------
  // each letter is one pixel. "." = empty
  var PIXELS = [
    "....YYYY....",
    "...YYYYYY...",
    "...RRRRRR...",
    ".YYYYYYYYYY.",
    "..BSSSSSSB..",
    "..SSESSESS..",
    "...SSSSSS...",
    "..TTTTTTTT..",
    ".TTOOOOOOTT.",
    ".TTOGOOGOTT.",
    ".SSOOOOOOSS.",
    "...OOOOOO...",
    "...OO..OO...",
    "...OO..OO...",
    "..KKK..KKK..",
    "..KKK..KKK.."
  ];
  var COLORS = {
    Y: "#e9c45a", // straw hat
    R: "#b5472f", // hat band
    B: "#5a3a1e", // hair
    S: "#f4c7a0", // skin
    E: "#1b1b1b", // eyes
    T: "#c8443a", // red shirt
    O: "#3a64c9", // blue overalls
    G: "#ffe08a", // overall buttons
    K: "#4a2d18"  // boots
  };
  var PX = 1.5; // size of one pixel (make it bigger for a bigger farmer)

  var sprite = make("g", {
    "class": "farmer-sprite", "shape-rendering": "crispEdges"
  }, farmer);

  (function drawFarmer() {
    var left = -(PIXELS[0].length * PX) / 2;   // centers the farmer
    var top = 1 - PIXELS.length * PX;          // feet land on the shadow
    for (var r = 0; r < PIXELS.length; r++) {
      var row = PIXELS[r];
      var c = 0;
      while (c < row.length) {
        var ch = row.charAt(c);
        if (ch === ".") { c++; continue; }
        var start = c;                         // join same-colour pixels into one bar
        while (c < row.length && row.charAt(c) === ch) c++;
        make("rect", {
          x: left + start * PX, y: top + r * PX,
          width: (c - start) * PX + 0.05, height: PX + 0.05,
          fill: COLORS[ch]
        }, sprite);
      }
    }
  })();

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

  // ---------- floating text ----------

  // shows "+10 🪙", "-6 🪙" or "Need 6 🪙" (it uses the gold-pop style)
  function goldPop(x, y, message) {
    var cx = OX + (x - y) * TW / 2;
    var cy = OY + (x + y) * TH / 2 + TH / 2;
    var t = make("text", {
      "class": "gold-pop", x: cx, y: cy - 10,
      "text-anchor": "middle", "font-size": 13
    }, world);
    t.textContent = message;
    setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    }, 1100);
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
        // crops.js adds the "moist" class itself and removes it
        // when the crop finishes growing or dries out, so we pass it the tile
        if (window.Crops) window.Crops.water(t.x, t.y, t.el);
        unmark();
        finish();
      }, WATER_MS);
    } else if (t.action === "harvest") {
      // pick the turnip, then pay the farmer
      var got = window.Crops && window.Crops.harvest(t.x, t.y);
      if (got) {
        if (window.Gold) window.Gold.add(HARVEST_GOLD);
        goldPop(t.x, t.y, "+" + HARVEST_GOLD + " 🪙");
      }
      unmark();
      hop();
      setTimeout(finish, HARVEST_MS);
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
    if (tool !== "plant" && tool !== "water" && tool !== "harvest") return;

    var el = e.target;
    if (!el || !el.getAttribute || el.getAttribute("data-plot") === null) return; // not a dirt tile

    var t = tileOf(el);
    var k = t.x + "," + t.y;
    if (queued[k]) return; // already waiting

    if (tool === "plant") {
      if (window.Crops && window.Crops.has(t.x, t.y)) return; // already planted

      // planting costs gold
      if (window.Gold && window.Gold.get() < PLANT_COST) {
        goldPop(t.x, t.y, "Need " + PLANT_COST + " 🪙"); // not enough gold, block it
        return;
      }
      if (window.Gold) {
        window.Gold.add(-PLANT_COST); // pay now, so you can't queue more than you can afford
        goldPop(t.x, t.y, "-" + PLANT_COST + " 🪙");
      }
    } else if (tool === "water") {
      if (!window.Crops || !window.Crops.has(t.x, t.y)) return; // nothing to water
      if (window.Crops.isWet(t.x, t.y)) return;                 // already moist
      if (window.Crops.isRipe(t.x, t.y)) return;                // ripe turnips need no water
    } else {
      // harvest only works on a ripe turnip
      if (!window.Crops || !window.Crops.isRipe(t.x, t.y)) return;
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
