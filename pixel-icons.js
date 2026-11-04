/* Shared 8x8 pixel icons for BBK. Injects an SVG sprite; use as <svg class="px"><use href="#px-hammer"/></svg>. */
(function () {
  var sprite =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' +
    '<symbol id="px-hammer" viewBox="0 0 8 8"><path fill="#8a94a8" d="M0 0h8v3H0z"/><path fill="#d3dbe8" d="M0 0h8v1H0z"/><path fill="#5d667a" d="M0 2h8v1H0z"/><path fill="#a8703a" d="M3 3h2v5H3z"/><path fill="#7a4a22" d="M4 3h1v5H4z"/></symbol>' +
    '<symbol id="px-paper" viewBox="0 0 8 8"><path fill="#9cc7ee" d="M1 0h4v2h2v6H1z"/><path fill="#cfe3f6" d="M5 0h1v1h1v1H5z"/><path fill="#2f6fa8" d="M2 4h4v1H2zM2 6h3v1H2z"/></symbol>' +
    '<symbol id="px-scissors" viewBox="0 0 8 8"><path fill="#6d768a" d="M1 0h1v1H1zM2 1h1v1H2zM3 2h1v1H3zM4 3h1v1H4zM5 4h1v1H5zM6 0h1v1H6zM5 1h1v1H5zM4 2h1v1H4zM3 3h1v1H3zM2 4h1v1H2z"/><path fill="#3a9a6e" fill-rule="evenodd" d="M0 5h3v3H0zM1 6h1v1H1zM5 5h3v3H5zM6 6h1v1H6z"/></symbol>' +
    '<symbol id="px-hand" viewBox="0 0 8 8"><path fill="#fff7e8" d="M2 0h2v4h1V3h1v1h1v1h1v3H3V7H2V5H1V3h1z"/><path fill="#0c0614" d="M1 3h1v2h1v2h1v1H2V7H1z"/></symbol>' +
    '<symbol id="px-check" viewBox="0 0 8 8"><path fill="#0c0614" d="M0 4h1v1H0zM1 5h1v1H1zM2 6h1v1H2zM3 5h1v1H3zM4 4h1v1H4zM5 3h1v1H5zM6 2h1v1H6zM7 1h1v1H7z"/></symbol>' +
    '<symbol id="px-lock" viewBox="0 0 8 8"><path fill="#7a6e96" d="M2 0h4v1H2zM2 1h1v2H2zM5 1h1v2H5zM1 3h6v5H1z"/><path fill="#1a1332" d="M3 5h2v2H3z"/></symbol>' +
    '<symbol id="px-play" viewBox="0 0 8 8"><path fill="#ffd34d" d="M1 0h2v8H1zM3 1h2v6H3zM5 2h2v4H5zM7 3h1v2H7z"/><path fill="#d6a31a" d="M1 6h2v2H1z"/></symbol>' +
    '<symbol id="px-globe" viewBox="0 0 8 8"><path fill="#5ad1c4" d="M2 0h4v1H2zM1 1h6v1H1zM0 2h8v4H0zM1 6h6v1H1zM2 7h4v1H2z"/><path fill="#2f9a8e" d="M3 1h1v6H3zM0 4h8v1H0z"/></symbol>' +
    '<symbol id="px-book" viewBox="0 0 8 8"><path fill="#ff7a59" d="M0 1h4v6H0zM4 1h4v6H4z"/><path fill="#d4492b" d="M3 1h2v6H3z"/><path fill="#fff7e8" d="M1 3h2v1H1zM5 3h2v1H5z"/></symbol>' +
    '<symbol id="px-trophy" viewBox="0 0 8 8"><path fill="#ffd34d" d="M1 0h6v3H1zM2 3h4v1H2zM3 4h2v2H3zM2 6h4v2H2zM0 1h1v2H0zM7 1h1v2H7z"/><path fill="#fff7e8" d="M2 1h1v1H2z"/><path fill="#d6a31a" d="M2 6h4v1H2z"/></symbol>' +
    '<symbol id="px-dice" viewBox="0 0 8 8"><path fill="#fff7e8" d="M0 0h8v8H0z"/><path fill="#1b0d22" d="M1 1h2v2H1zM5 1h2v2H5zM3 3h2v2H3zM1 5h2v2H1zM5 5h2v2H5z"/></symbol>' +
    '<symbol id="px-plus" viewBox="0 0 8 8"><path fill="#6fd3a0" d="M3 0h2v8H3zM0 3h8v2H0z"/></symbol>' +
    '</svg>';
  function inject() { if (!document.getElementById('px-hammer')) document.body.insertAdjacentHTML('afterbegin', sprite); }
  if (document.body) inject(); else document.addEventListener('DOMContentLoaded', inject);
  window.PX = function (suit, size) {
    return '<svg class="px" width="' + (size || 24) + '" height="' + (size || 24) + '" viewBox="0 0 8 8" aria-hidden="true"><use href="#px-' + suit + '"/></svg>';
  };
})();
