(function () {
  var NS = "http://www.w3.org/2000/svg";
  // these must match the values at the top of main.js
  var N = 13, TW = 44, TH = 22, OX = 286, OY = 30;

  var world = document.getElementById("world");
  if (!world) return;

  var fx = 6, fy = 6; // start on the middle of the paths

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

  function wander() {
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var ok = dirs.filter(function (d) {
      var nx = fx + d[0], ny = fy + d[1];
      return nx >= 1 && nx <= N - 2 && ny >= 1 && ny <= N - 2;
    });
    var d = ok[Math.floor(Math.random() * ok.length)];
    fx += d[0];
    fy += d[1];
    place();
    sprite.classList.add("hop");
    setTimeout(function () { sprite.classList.remove("hop"); }, 600);
    schedule();
  }

  function schedule() {
    setTimeout(wander, 3000 + Math.random() * 2000);
  }

  place();
  schedule();
})();
