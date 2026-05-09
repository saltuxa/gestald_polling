(function () {
  var root = document.getElementById("root");
  if (!root) return;
  root.setAttribute("data-boot-js", "loaded");

  function line(html) {
    var marker = document.createElement("p");
    marker.innerHTML = html;
    root.appendChild(marker);
  }

  window.onerror = function (message, source, lineNumber, columnNumber) {
    line(
      '<font color="#ffb4b4">Runtime error: ' +
        String(message) +
        " at " +
        String(source || "unknown") +
        ":" +
        String(lineNumber || 0) +
        ":" +
        String(columnNumber || 0) +
        "</font>"
    );
  };

  line('<font color="#75d3b8">Classic boot script loaded.</font>');
  line('<font color="#aaa0c2">Loading app.js...</font>');

  var script = document.createElement("script");
  script.src = "./app.js";
  script.defer = true;
  script.onload = function () {
    line('<font color="#75d3b8">app.js loaded.</font>');
  };
  script.onerror = function () {
    line('<font color="#ffb4b4">app.js failed to load.</font>');
  };
  document.head.appendChild(script);
})();
