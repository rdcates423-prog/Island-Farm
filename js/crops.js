(function () {
  var NS = "http://www.w3.org/2000/svg";
  // these must match the values at the top of main.js
  var TW = 44, TH = 22, OX = 286, OY = 30;

  var world = document.getElementById("world");
  if (!world) return;

  // one layer that holds everything planted
  var layer = document.createElementNS(NS, "g");
  layer.setAttribute("id", "crops");
  layer.setAttribute("pointer-events", "none"); // taps go through to the dirt tile underneath
    // slide the crops in underneath the farmer so the farmer is drawn on top
  var farmerEl = document.getElementById("farmer");
  if (farmerEl) world.insertBefore(layer, farmerEl); else world.appendChild(layer);

  var planted = {}; // "x,y" -> { x, y, type, wet }

  function key(x, y) { return x + "," + y; }

  function make(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  function has(x, y) {
    return !!planted[key(x, y)];
  }

  // true if the crop on tile (x, y) has been watered
  function isWet(x, y) {
    var p = planted[key(x, y)];
    return !!(p && p.wet);
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
      "text-anchor": "middle", "font-size": 14
    }, g);
    sprite.textContent = "🌱";

    planted[key(x, y)] = { x: x, y: y, type: "seed", wet: false };
    return true;
  }

  // waters the crop on tile (x, y); returns false if there is nothing to water
  function water(x, y) {
    var p = planted[key(x, y)];
    if (!p) return false;
    p.wet = true;
    return true;
  }

  // other files (farmer.js) use these
  window.Crops = { plant: plant, has: has, water: water, isWet: isWet };
})();
