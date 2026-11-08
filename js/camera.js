// camera.js - zoom and pan camera for Island Farm
(function () {
  'use strict';

  var MIN_ZOOM = 1;
  var MAX_ZOOM = 4;
  var DRAG_THRESHOLD = 10;

  // Screen space kept free around the island at 1x (in pixels)
  var TOP_SPACE = 110, BOTTOM_SPACE = 90, SIDE_SPACE = 10;
  var MAX_FIT = 1.3;                                   // biggest the island gets on large screens
  var ISLAND = { cx: 286, cy: 186, w: 612, h: 372 };   // island box in SVG units

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  function init() {
    var svg = document.getElementById('world');
    if (!svg) { console.warn('camera.js: #world not found'); return; }

    var base = { x: 0, y: 0, w: 1, h: 1 };   // the 1x view
    var cam = { x: 0, y: 0, w: 1, h: 1 };    // the current view

    // Work out the 1x view so the whole island fits the screen
    function fitBase() {
      var r = svg.getBoundingClientRect();
      var W = r.width, H = r.height;
      if (!W || !H) return;
      var scale = Math.min((W - SIDE_SPACE * 2) / ISLAND.w,
                           (H - TOP_SPACE - BOTTOM_SPACE) / ISLAND.h,
                           MAX_FIT);
      scale = Math.max(scale, 0.2);
      base.w = W / scale;
      base.h = H / scale;
      base.x = ISLAND.cx - base.w / 2;
      base.y = ISLAND.cy - base.h / 2 - ((TOP_SPACE - BOTTOM_SPACE) / 2) / scale;
    }

    // Only redraw once per frame, and simplify edges while moving
    var pending = false, movingTimer = null;
    function flush() {
      pending = false;
      svg.setAttribute('viewBox', cam.x + ' ' + cam.y + ' ' + cam.w + ' ' + cam.h);
    }
    function apply() {
      cam.w = clamp(cam.w, base.w / MAX_ZOOM, base.w / MIN_ZOOM);
      cam.h = cam.w * base.h / base.w;
      cam.x = clamp(cam.x, base.x, base.x + base.w - cam.w);
      cam.y = clamp(cam.y, base.y, base.y + base.h - cam.h);
      svg.classList.add('moving');
      clearTimeout(movingTimer);
      movingTimer = setTimeout(function () { svg.classList.remove('moving'); }, 150);
      if (!pending) { pending = true; requestAnimationFrame(flush); }
    }

    fitBase();
    cam.x = base.x; cam.y = base.y; cam.w = base.w; cam.h = base.h;
    apply();

    // Zoom while keeping the point under (clientX, clientY) still on screen
    function zoomAt(factor, clientX, clientY) {
      var r = svg.getBoundingClientRect();
      var px = (clientX - r.left) / r.width;
      var py = (clientY - r.top) / r.height;
      var fx = cam.x + px * cam.w;
      var fy = cam.y + py * cam.h;
      var newW = clamp(cam.w / factor, base.w / MAX_ZOOM, base.w / MIN_ZOOM);
      var newH = newW * base.h / base.w;
      cam.w = newW;
      cam.h = newH;
      cam.x = fx - px * newW;
      cam.y = fy - py * newH;
      apply();
    }

    // Time-based animation, so speed doesn't depend on frame rate
    var animId = 0;
    function animate(duration, step) {
      var id = ++animId, start = performance.now();
      (function tick(now) {
        if (id !== animId) return;
        var k = Math.min((now - start) / duration, 1);
        step(k * (2 - k));
        if (k < 1) requestAnimationFrame(tick);
      })(start);
    }

    function smoothZoom(factor) {
      var r = svg.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var startW = cam.w;
      var targetW = clamp(cam.w / factor, base.w / MAX_ZOOM, base.w / MIN_ZOOM);
      animate(220, function (k) {
        var w = startW + (targetW - startW) * k;
        zoomAt(cam.w / w, cx, cy);
      });
    }

    function resetView() {
      var from = { x: cam.x, y: cam.y, w: cam.w };
      animate(250, function (k) {
        cam.x = from.x + (base.x - from.x) * k;
        cam.y = from.y + (base.y - from.y) * k;
        cam.w = from.w + (base.w - from.w) * k;
        apply();
      });
    }

    // ---------- Mouse wheel ----------
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      animId++;
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    }, { passive: false });

    // ---------- Touch / mouse drag and pinch ----------
    var pointers = new Map();
    var lastDist = 0, lastMid = null, startPt = null;
    var panning = false, suppressClick = false;

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

    svg.addEventListener('pointerdown', function (e) {
      animId++;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        startPt = { x: e.clientX, y: e.clientY };
        panning = false;
      } else if (pointers.size === 2) {
        var p = Array.from(pointers.values());
        lastDist = dist(p[0], p[1]);
        lastMid = mid(p[0], p[1]);
        panning = true;
        suppressClick = true;
      }
    });

    window.addEventListener('pointermove', function (e) {
      if (!pointers.has(e.pointerId)) return;
      var prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      var r = svg.getBoundingClientRect();

      if (pointers.size === 2) {
        var p = Array.from(pointers.values());
        var d = dist(p[0], p[1]);
        var m = mid(p[0], p[1]);
        if (lastDist > 0) zoomAt(d / lastDist, m.x, m.y);
        cam.x -= (m.x - lastMid.x) / r.width * cam.w;
        cam.y -= (m.y - lastMid.y) / r.height * cam.h;
        apply();
        lastDist = d;
        lastMid = m;
        return;
      }

      if (pointers.size === 1) {
        if (!panning) {
          if (Math.hypot(e.clientX - startPt.x, e.clientY - startPt.y) < DRAG_THRESHOLD) return;
          if (cam.w >= base.w - 0.01) return;
          panning = true;
          suppressClick = true;
        }
        cam.x -= (e.clientX - prev.x) / r.width * cam.w;
        cam.y -= (e.clientY - prev.y) / r.height * cam.h;
        apply();
      }
    });

    function endPointer(e) {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        setTimeout(function () { suppressClick = false; panning = false; }, 50);
      }
    }
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);

    // A drag or pinch should not count as a tile tap
    svg.addEventListener('click', function (e) {
      if (suppressClick) { e.stopPropagation(); e.preventDefault(); }
    }, true);

    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

    // ---------- Zoom buttons (locked on screen) ----------
    var box = document.createElement('div');
    box.id = 'zoom-controls';
    function makeBtn(label, title, fn) {
      var btn = document.createElement('button');
      btn.className = 'zoom-btn';
      btn.type = 'button';
      btn.textContent = label;
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.addEventListener('click', fn);
      box.appendChild(btn);
    }
    makeBtn('+', 'Zoom in', function () { smoothZoom(1.5); });
    makeBtn('\u2212', 'Zoom out', function () { smoothZoom(1 / 1.5); });
    makeBtn('1x', 'Reset zoom', resetView);
    document.body.appendChild(box);

    // Keep the view sensible when the window size or phone rotation changes
    function onResize() {
      var z = base.w / cam.w;
      var mx = cam.x + cam.w / 2, my = cam.y + cam.h / 2;
      fitBase();
      cam.w = base.w / z;
      cam.h = cam.w * base.h / base.w;
      cam.x = mx - cam.w / 2;
      cam.y = my - cam.h / 2;
      apply();
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('load', onResize);

    window.gameCamera = {
      zoomIn: function () { smoothZoom(1.5); },
      zoomOut: function () { smoothZoom(1 / 1.5); },
      reset: resetView,
      get zoom() { return base.w / cam.w; }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
