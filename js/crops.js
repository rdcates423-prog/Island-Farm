(function () {
  var NS = "http://www.w3.org/2000/svg";
  // these must match the values at the top of main.js
  var TW = 44, TH = 22, OX = 286, OY = 30;

  // seconds each growth stage takes once the crop is watered
  var GROW_TIME = 4;

  // what each stage looks like
  var STAGES = {
    seed:   { emoji: "🌱", size: 14 },
    sprout: { emoji: "🌿", size: 16 },
    turnip: { emoji: "🥕", size: 18 }
  };

  var world = document.getElementById("world");
  if (!world) return;

  // one layer that holds everything planted
  var layer = document.createElementNS(NS, "g");
  layer.setAttribute("id", "crops");
  layer.setAttribute("pointer-events", "none"); // taps go through to the dirt tile underneath
  // slide the crops in underneath the farmer so the farmer is drawn on top
  var farmerEl = document.getElementById("farmer");
  if (farmerEl) world.insertBefore(layer, farmerEl); else world.appendChild(layer);

  // "x,y" -> { x, y, type, wet, timer, tile, group, sprite }
  var planted = {};

  function key(x, y) { return x + "," + y; }

  function make(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  // moves the farmer to the end of the world so it is drawn on top of everything
  function bringFarmerToFront() {
    var f = document.getElementById("farmer");
    if (f && world.lastChild !== f) world.appendChild(f);
  }

  function has(x, y) {
    return !!planted[key(x, y)];
  }

  // true if the crop on tile (x, y) has been watered
  function isWet(x, y) {
    var p = planted[key(x, y)];
    return !!(p && p.wet);
  }

  // true if the crop on tile (x, y) is a finished turnip
  function isRipe(x, y) {
    var p = planted[key(x, y)];
    return !!(p && p.type === "turnip");
  }

  // puts a seed on tile (x, y); returns false if the tile is already taken
  function plant(x, y) {
    if (has(x, y)) return false;

    var cx = OX + (x - y) * TW / 2;
    var cy = OY + (x + y) * TH / 2 + TH / 2;

    var g = make("g", { "class": "crop", "data-x": x, "data-y": y }, layer);
    make("ellipse", { "class": "seed-mound", cx: cx, cy: cy + 2, rx: 7, ry: 3.5 }, g);
    var sprite = make("text", {
      "class": "seed-sprite", x: cx, y: cy + 6,
      "text-anchor": "middle", "font-size": STAGES.seed.size
    }, g);
    sprite.textContent = STAGES.seed.emoji;

    planted[key(x, y)] = {
      x: x, y: y, type: "seed", wet: false, timer: 0,
      tile: null, group: g, sprite: sprite
    };
    bringFarmerToFront();
    return true;
  }

  // waters the crop on tile (x, y) and darkens the dirt tile (tile = the polygon);
  // returns false if there is nothing to water
  function water(x, y, tile) {
    var p = planted[key(x, y)];
    if (!p) return false;
    if (p.type === "turnip") return false; // already fully grown
    p.wet = true;
    p.timer = 0;
    if (tile) {
      p.tile = tile;
      tile.classList.add("moist"); // dark brown tile (already in your style.css)
    }
    return true;
  }

  // NEW: picks a ripe turnip. Removes it from the screen and leaves empty dirt.
  // returns true if something was harvested, false if the tile was not ripe
  function harvest(x, y) {
    var p = planted[key(x, y)];
    if (!p || p.type !== "turnip") return false;
    if (p.tile) p.tile.classList.remove("moist"); // safety: make sure the dirt is dry
    if (p.group && p.group.parentNode) p.group.parentNode.removeChild(p.group);
    delete planted[key(x, y)]; // the tile is empty again, so it can be planted again
    return true;
  }

  // switches a crop to its next look and plays the little pop animation
  function setStage(p, type) {
    p.type = type;
    p.sprite.textContent = STAGES[type].emoji;
    p.sprite.setAttribute("font-size", STAGES[type].size);
    p.sprite.classList.remove("crop-pop");
    p.sprite.getBoundingClientRect(); // forces the browser to restart the animation
    p.sprite.classList.add("crop-pop");
  }

  // called by the game loop in main.js; dt = seconds since the last frame
  function update(dt) {
    for (var k in planted) {
      var p = planted[k];
      if (!p.wet) continue;

      p.timer += dt;
      if (p.timer < GROW_TIME) continue;

      p.timer = 0;
      if (p.type === "seed") {
        setStage(p, "sprout");
      } else if (p.type === "sprout") {
        setStage(p, "turnip");
        p.wet = false; // finished growing, soil dries out
        if (p.tile) p.tile.classList.remove("moist");
      }
    }
  }

  // other files (farmer.js, main.js) use these (CHANGED: added harvest)
  window.Crops = { plant: plant, has: has, water: water, harvest: harvest, isWet: isWet, isRipe: isRipe, update: update };
})();
