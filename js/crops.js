(function () {
  var NS = "http://www.w3.org/2000/svg";
  // these must match the values at the top of main.js
  var TW = 44, TH = 22, OX = 286, OY = 30;

  var world = document.getElementById("world");
  if (!world) return;

  // one layer that holds everything planted
  var layer = document.createElementNS(NS, "g");
  layer.setAttribute("id", "crops");
  world.appendChild(layer);

  var planted = {}; // "x,y" -> { x, y, type }

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

    planted[key(x, y)] = { x: x, y: y, type: "seed" };
    return true;
  }

  // other files (farmer.js) use these
  window.Crops = { plant: plant, has: has };
})();
