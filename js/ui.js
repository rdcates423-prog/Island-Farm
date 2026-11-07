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
