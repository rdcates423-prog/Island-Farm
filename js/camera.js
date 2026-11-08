// camera.js - zoom and pan camera for Island Farm
(function () {
  'use strict';

  var MIN_ZOOM = 1;          // 1 = whole island visible
  var MAX_ZOOM = 4;          // 4 = four times closer
  var DRAG_THRESHOLD = 10;   // pixels a finger must move before it counts as a pan

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  function init() {
    var svg = document.getElementById('world');
    if (!svg) { console.warn('camera.js: #world not found'); return; }

    // Make sure the SVG has a viewBox to work with
    var vb = svg.viewBox.baseVal;
    if (!vb || vb.width === 0 || vb.height === 0) {
      var b = svg.getBBox();
      svg.setAttribute('viewBox', b.x + ' ' + b.y + ' ' + b.width + ' ' + b.height);
      vb = svg.viewBox.baseVal;
    }
    var base = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
    var cam = { x: base.x, y: base.y, w: base.w, h: base.h };

    function apply() {
      cam.w = clamp(cam.w, base.w / MAX_ZOOM, base.w / MIN_ZOOM);
      cam.h = cam.w * base.h / base.w;
      cam.x = clamp(cam.x, base.x, base.x + base.w - cam.w);
      cam.y = clamp(cam.y, base.y, base.y + base.h - cam.h);
      svg.setAttribute('viewBox', cam.x + ' ' + cam.y + ' ' + cam.w + ' ' + cam.h);
    }

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

    function smoothZoom(factor) {
      var r = svg.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var steps = 8, i = 0, f = Math.pow(factor, 1 / steps);
      (function tick() {
        zoomAt(f, cx, cy);
        if (++i < steps) requestAnimationFrame(tick);
      })();
    }

    function resetView() {
      var from = { x: cam.x, y: cam.y, w: cam.w, h: cam.h };
      var t = 0;
      (function tick() {
        t += 1 / 10;
        var k = Math.min(t, 1);
        cam.x = from.x + (base.x - from.x) * k;
        cam.y = from.y + (base.y - from.y) * k;
        cam.w = from.w + (base.w - from.w) * k;
        apply();
        if (k < 1) requestAnimationFrame(tick);
      })();
    }

    // ---------- Mouse wheel ----------
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    }, { passive: false });

    // ---------- Touch / mouse drag and pinch ----------
    var pointers = new Map();
    var lastDist = 0, lastMid = null, startPt = null;
    var panning = false, suppressClick = false;

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

    svg.addEventListener('pointerdown', function (e) {
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
          if (cam.w >= base.w - 0.01) return;   // not zoomed in, nothing to pan
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

    // Stop iOS Safari from zooming the whole page
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

    // Handy for later steps
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
