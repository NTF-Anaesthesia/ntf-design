/* NTF Anaesthesia app kit: appearance settings (DESIGN-APP.md, "Appearance"). Opt in, in <head> and without defer so
   the saved look is on before the first paint: <script src=".../v1/appearance.js"></script>.
   No dependencies. It keeps the person's choices in localStorage under one key ("ntf-appearance"), so every NTF app on
   the same site follows the same setting, and it puts classes on <html>:
   - app--solid   Solid bars: no see-through glass (glass.css; Safari does not report the phone's Reduce Transparency)
   - app--still   Reduce motion: no springs, slides or fades (also on when the phone's Reduce Motion is on)
   A Settings screen gets the ready section with <div data-appearance></div>; the script fills it with kit rows.
   Rows only appear for what the page can use (Solid bars only with glass.css). Script API: NTFAppearance.get(),
   NTFAppearance.set({ still: true }); an "app-appearance" event on <html> follows every change. */
(function () {
  'use strict';
  var KEY = 'ntf-appearance', html = document.documentElement;
  var prefs = read();

  function read() {
    try { var p = JSON.parse(localStorage.getItem(KEY) || '{}'); return p && typeof p === 'object' ? p : {}; } catch (e) { return {}; }
  }
  function apply() {
    html.classList.toggle('app--solid', !!prefs.solid);
    html.classList.toggle('app--still', !!prefs.still);
    try { html.dispatchEvent(new CustomEvent('app-appearance', { detail: get() })); } catch (e) {}
  }
  function get() { var o = {}; for (var k in prefs) o[k] = prefs[k]; return o; }
  function set(changes) {
    for (var k in changes) prefs[k] = changes[k];
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
    apply(); sync();
  }
  apply();
  // another tab or app on the same site changed it
  addEventListener('storage', function (e) { if (e.key === KEY) { prefs = read(); apply(); sync(); } });

  /* ---------- The Settings section ---------- */
  var hosts = [];
  function row(id, title, sub) {
    return '<li><label class="app-row"><span class="app-row-body"><span class="app-row-title">' + title + '</span>' +
      '<span class="app-row-sub">' + sub + '</span></span>' +
      '<input class="app-switch" type="checkbox" role="switch" data-pref="' + id + '"></label></li>';
  }
  function fill(host) {
    var glass = html.classList.contains('app--glass'), n = hosts.length;
    var rows = (glass ? row('solid', 'Solid bars', 'No see-through glass') : '') +
      row('still', 'Reduce motion', 'No springs or slides');
    host.innerHTML = '<section class="app-section" aria-labelledby="app-appearance-h' + n + '">' +
      '<h2 class="app-section-header" id="app-appearance-h' + n + '">Appearance</h2>' +
      '<ul class="app-list">' + rows + '</ul>' +
      '<p class="app-section-footer">Applies to every NTF app on this device. Reduce motion is also on when the phone’s own is.</p>' +
      '</section>';
    host.addEventListener('change', function (e) {
      var k = e.target.getAttribute && e.target.getAttribute('data-pref');
      if (k) { var c = {}; c[k] = e.target.checked; set(c); }
    });
    hosts.push(host);
  }
  function sync() {
    hosts.forEach(function (host) {
      Array.prototype.forEach.call(host.querySelectorAll('[data-pref]'), function (i) { i.checked = !!prefs[i.getAttribute('data-pref')]; });
    });
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll('[data-appearance]'), fill); sync(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.NTFAppearance = { get: get, set: set };
})();
