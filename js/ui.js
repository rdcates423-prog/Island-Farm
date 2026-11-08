// NEW: the Gold counter (a little pill at the top of the screen)
(function () {
  var gold = 20; // starting gold

  var box = document.createElement("div");
  box.id = "gold";
  box.innerHTML = '🪙 <span id="gold-count"></span>';
  document.body.appendChild(box);

  var countEl = document.getElementById("gold-count");

  function show() {
    countEl.textContent = gold;
  }

  // other files use these: Gold.get() and Gold.add(10)
  window.Gold = {
    get: function () { return gold; },
    add: function (n) {
      gold += n;
      show();
      box.classList.remove("bump");
      void box.offsetWidth; // lets the bump animation restart
      box.classList.add("bump");
    }
  };

  show();
})();

(function () {
  var toolbar = document.getElementById("toolbar");
  if (!toolbar) return;

  var buttons = toolbar.querySelectorAll("button[data-tool]");
  var current = "plant"; // the default tool

  // switches the active tool and updates which button is highlighted
  function setTool(name) {
    current = name;
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute("data-tool") === name;
      buttons[i].classList.toggle("active", on);
      buttons[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
    // lets other files react later if they want to
    document.dispatchEvent(new CustomEvent("toolchange", { detail: { tool: name } }));
  }

  toolbar.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("button[data-tool]") : null;
    if (!b) return;
    setTool(b.getAttribute("data-tool"));
  });

  // other files (like farmer.js) ask this which tool is active: Tool.get()
  window.Tool = {
    get: function () { return current; },
    set: setTool
  };

  setTool("plant");
})();
