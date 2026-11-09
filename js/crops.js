(function () {
  var NS = "http://www.w3.org/2000/svg";
  // these must match the values at the top of main.js
  var TW = 44, TH = 22, OX = 286, OY = 30;

  // seconds each growth stage takes once the crop is watered
  var GROW_TIME = 4;
  // how many seconds one watering lasts before the soil dries out
  var WET_TIME = 6;

  // ---------- pixel art crops ----------
  // each letter is one pixel. "." = empty
  var PX = 2; // size of one pixel (make it bigger for bigger crops)

  var COLORS = {
    g: "#62c250", // light green
    G: "#3f8f3a", // mid green
    D: "#2c722e", // dark green (stems)
    s: "#d9b26b", // seed
    S: "#a9803f", // seed shade
    p: "#8e4a9e", // turnip purple (dark)
    P: "#b06ac0", // turnip purple (light)
    w: "#e8e2d0", // turnip white (shade)
    W: "#fbf8ee"  // turnip white (light)
  };

  // what each stage looks like
  var STAGES = {
    seed: [
      ".....gg.....",
      "....ggGg....",
      "...ssSSss..."
    ],
    sprout: [
      "..gg....gg..",
      ".gGGg..gGGg.",
      ".gGGGggGGGg.",
      "..gGGDDGGg..",
      "...ggDDgg...",
      ".....DD.....",
      ".....DD....."
    ],
    turnip: [
      "..g..gg..g..",
      "..gG.gg.Gg..",
      "...gGGGGg...",
      "....gGGg....",
      "...pPPPPp...",
      "..pPPPPPPp..",
      "..wwWWWWww..",
      "..wWWWWWWw..",
      "...wWWWWw...",
      "....wWWw....",
      ".....ww....."
    ]
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

  // "x,y" -> { x, y, type, wet, wetLeft, timer, tile, group, sprite, cx, bottom }
  var planted = {};

  function key(x, y) { return x + "," + y; }

  function make(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  // draws a letter grid into "parent", centered on cx, with its bottom edge at "bottom"
  function drawPixels(parent, rows, cx, bottom) {
    var left = cx - (rows[0].length * PX) / 2;
    var top = bottom - rows.length * PX;
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var c = 0;
      while (c < row.length) {
        var ch = row.charAt(c);
        if (ch === ".") { c++; continue; }
        var start = c;                       // join same-colour pixels into one bar
        while (c < row.length && row.charAt(c) === ch) c++;
        make("rect", {
          x: left + start * PX, y: top + r * PX,
          width: (c - start) * PX + 0.05, height: PX + 0.05,
          fill: COLORS[ch]
        }, parent);
      }
    }
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
    var bottom = cy + 4; // where the crop's "feet" sit on the soil mound

    var g = make("g", { "class": "crop", "data-x": x, "data-y": y }, layer);
    make("ellipse", { "class": "seed-mound", cx: cx, cy: cy + 2, rx: 7, ry: 3.5 }, g);
    var sprite = make("g", {
      "class": "seed-sprite", "shape-rendering": "crispEdges"
    }, g);
    drawPixels(sprite, STAGES.seed, cx, bottom);

    planted[key(x, y)] = {
      x: x, y: y, type: "seed", wet: false, wetLeft: 0, timer: 0,
      tile: null, group: g, sprite: sprite, cx: cx, bottom: bottom
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
    p.wetLeft = WET_TIME;  // a fresh drink of water that lasts WET_TIME seconds
    // p.timer is NOT reset, so a thirsty sprout keeps its progress
    p.sprite.classList.remove("crop-thirsty"); // not thirsty any more
    if (tile) {
      p.tile = tile;
      tile.classList.add("moist"); // dark brown tile (already in your style.css)
    }
    return true;
  }

  // picks a ripe turnip. Removes it from the screen and leaves empty dirt.
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
    while (p.sprite.firstChild) p.sprite.removeChild(p.sprite.firstChild); // erase the old pixels
    drawPixels(p.sprite, STAGES[type], p.cx, p.bottom);                    // draw the new ones
    p.sprite.classList.remove("crop-pop");
    p.sprite.getBoundingClientRect(); // forces the browser to restart the animation
    p.sprite.classList.add("crop-pop");
  }

  // called by the game loop in main.js; dt = seconds since the last frame
  function update(dt) {
    for (var k in planted) {
      var p = planted[k];
      if (!p.wet) continue; // dry crops are frozen, their timer does not move

      p.timer += dt;
      p.wetLeft -= dt; // the water slowly runs out

      if (p.timer >= GROW_TIME) {
        p.timer = 0;
        if (p.type === "seed") {
          setStage(p, "sprout");
        } else if (p.type === "sprout") {
          setStage(p, "turnip");
          p.wet = false; // finished growing, soil dries out
          p.wetLeft = 0;
          if (p.tile) p.tile.classList.remove("moist");
          continue; // a finished turnip never gets thirsty
        }
      }

      // out of water before finishing -> freeze and show it is thirsty
      if (p.wetLeft <= 0) {
        p.wet = false;
        p.wetLeft = 0;
        if (p.tile) p.tile.classList.remove("moist");
        p.sprite.classList.add("crop-thirsty");
      }
    }
  }

  // other files (farmer.js, main.js) use these
  window.Crops = { plant: plant, has: has, water: water, harvest: harvest, isWet: isWet, isRipe: isRipe, update: update };
})();
