/* NTF Anaesthesia app kit: appearance settings (DESIGN-APP.md, "Appearance"). Opt in, in <head> and without defer so
   the saved look is on before the first paint: <script src=".../v1/appearance.js"></script>.
   No dependencies. It keeps the person's choices in localStorage under one key ("ntf-appearance"), so every NTF app on
   the same site follows the same setting, and it puts classes on <html>:
   - app--solid      Solid bars: no see-through glass (glass.css; Safari does not report the phone's Reduce Transparency)
   - app--still      Reduce motion: no springs, slides or fades (also on when the phone's Reduce Motion is on)
   - app--dark       theme Dark, or Auto (the default) while the phone is dark (themes.css)
   - app--black      Pure black, in dark only; app--contrast  High contrast; data-accent="teal|navy|forest" (themes.css)
   A Settings screen gets the ready section with <div data-appearance></div>; the script fills it with kit rows.
   Rows only appear for what the page can use (Solid bars only with glass.css, themes only with themes.css). Script
   API: NTFAppearance.get(), NTFAppearance.set({ theme: 'dark' }); an "app-appearance" event on <html> follows every
   change. A <meta name="theme-color"> follows the theme's ground colour. */
(function () {
  'use strict';
  var KEY = 'ntf-appearance', html = document.documentElement;
  var ACCENTS = [['wine', 'Wine', '#633d3c'], ['teal', 'Teal', '#1f5b60'], ['navy', 'Navy', '#2c406c'], ['forest', 'Forest', '#2f5838']];
  var darkMq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var prefs = read();

  function read() {
    try { var p = JSON.parse(localStorage.getItem(KEY) || '{}'); return p && typeof p === 'object' ? p : {}; } catch (e) { return {}; }
  }
  function apply() {
    html.classList.toggle('app--solid', !!prefs.solid);
    html.classList.toggle('app--still', !!prefs.still);
    var theme = prefs.theme || 'auto', dark = theme === 'dark' || (theme === 'auto' && !!(darkMq && darkMq.matches));
    html.classList.toggle('app--dark', dark);
    html.classList.toggle('app--black', !!prefs.black);
    html.classList.toggle('app--contrast', !!prefs.contrast);
    if (prefs.accent && prefs.accent !== 'wine') html.setAttribute('data-accent', prefs.accent); else html.removeAttribute('data-accent');
    themeColour();
    try { html.dispatchEvent(new CustomEvent('app-appearance', { detail: get() })); } catch (e) {}
  }
  function get() { var o = {}; for (var k in prefs) o[k] = prefs[k]; return o; }
  function set(changes) {
    for (var k in changes) prefs[k] = changes[k];
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
    apply(); sync();
  }
  // the status bar of a home-screen app takes the screen's ground colour
  function themeColour() {
    var m = document.querySelector('meta[name="theme-color"]'), c = getComputedStyle(html).getPropertyValue('--app-ground').trim();
    if (m && c) m.setAttribute('content', c);
  }
  apply();
  addEventListener('load', themeColour);
  if (darkMq) {
    var onScheme = function () { if ((prefs.theme || 'auto') === 'auto') apply(); };
    if (darkMq.addEventListener) darkMq.addEventListener('change', onScheme); else darkMq.addListener(onScheme);
  }
  // another tab or app on the same site changed it
  addEventListener('storage', function (e) { if (e.key === KEY) { prefs = read(); apply(); sync(); } });

  /* ---------- The Settings section ---------- */
  var hosts = [];
  function row(id, title, sub) {
    return '<li><label class="app-row"><span class="app-row-body"><span class="app-row-title">' + title + '</span>' +
      '<span class="app-row-sub">' + sub + '</span></span>' +
      '<input class="app-switch" type="checkbox" role="switch" data-pref="' + id + '"></label></li>';
  }
  function themeRows(n) {
    var segs = [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(function (t) {
      return '<label class="app-seg"><input type="radio" name="app-theme-' + n + '" value="' + t[0] + '" data-pref="theme"><span>' + t[1] + '</span></label>';
    }).join('');
    var sw = ACCENTS.map(function (a) {
      return '<label class="app-swatch" style="--app-sw:' + a[2] + '"><input type="radio" name="app-accent-' + n + '" value="' + a[0] + '" data-pref="accent" aria-label="' + a[1] + '"><span></span></label>';
    }).join('');
    return '<li><div class="app-row app-row--theme"><fieldset class="app-segmented"><legend>Theme</legend>' + segs + '</fieldset></div></li>' +
      '<li><fieldset class="app-swatches"><legend>Accent colour</legend>' + sw + '</fieldset></li>' +
      row('black', 'Pure black', 'In dark mode, for OLED screens') +
      row('contrast', 'High contrast', 'Darker text and lines, no glass');
  }
  function fill(host) {
    var glass = html.classList.contains('app--glass'), n = hosts.length;
    var themed = !!document.querySelector('link[rel="stylesheet"][href*="themes.css"]');
    var rows = (themed ? themeRows(n) : '') + (glass ? row('solid', 'Solid bars', 'No see-through glass') : '') +
      row('still', 'Reduce motion', 'No springs or slides');
    host.innerHTML = '<section class="app-section" aria-labelledby="app-appearance-h' + n + '">' +
      '<h2 class="app-section-header" id="app-appearance-h' + n + '">Appearance</h2>' +
      '<ul class="app-list">' + rows + '</ul>' +
      '<p class="app-section-footer">Applies to every NTF app on this device. Reduce motion is also on when the phone’s own is.</p>' +
      '</section>';
    host.addEventListener('change', function (e) {
      var k = e.target.getAttribute && e.target.getAttribute('data-pref');
      if (k) { var c = {}; c[k] = e.target.type === 'radio' ? e.target.value : e.target.checked; set(c); }
    });
    hosts.push(host);
  }
  function sync() {
    hosts.forEach(function (host) {
      Array.prototype.forEach.call(host.querySelectorAll('[data-pref]'), function (i) {
        var k = i.getAttribute('data-pref'), v = prefs[k];
        if (i.type === 'radio') i.checked = i.value === (v || (k === 'theme' ? 'auto' : 'wine')); else i.checked = !!v;
      });
    });
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll('[data-appearance]'), fill); sync(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.NTFAppearance = { get: get, set: set };
})();
