/* NTF Anaesthesia app kit: gestures (DESIGN-APP.md, "Gestures"). Opt in: <script src=".../v1/gestures.js" defer></script>.
   No dependencies. Each part starts only where its markup is on the page, so a page without that markup is not changed:
   - large title       .app-bar + .app-large-title: the bar collapses when the title scrolls under it
   - tab bar           nav.app-tabbar[data-minimise]: shrinks to the current tab while scrolling down
   - touch and hold    [data-hold-menu="#template-id"]: a menu with a preview (also right-click, Android long press,
                       the context-menu key and Shift+F10); the element gets an "app-menu" event with detail.action
   - sheets            dialog.app-sheet[data-detents="medium large"]: drag between heights, or down to close
   - edge swipe back   html[data-edge-back]: from the left edge, the page follows the finger (iPhone home-screen app only,
                       where the phone has no Back gesture of its own; "always" turns it on everywhere for testing)
   - edit mode         .app-list[data-select] + [data-edit-for="#list"]: tick rows, or drag a finger down the ticks
   Rules from apps in use: no gesture starts from a field, a dialog, a drag handle, anything that scrolls sideways or the
   screen's edges (Android's Back); a hold is half a second without moving more than 10 px, and the click that comes
   with lifting the finger is swallowed; a page that moves with a finger is the content only (the tab bar never moves). */
(function () {
  'use strict';
  var html = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HOLD_MS = 500, SLOP = 10;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  // a light tap: navigator.vibrate on Android; on iPhone (iOS 18 and later) toggling a hidden <input switch> through its
  // label gives the system's own haptic, the only haptic a web page can reach there
  var tick = null;
  function buzz() {
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} return; }
    if (!tick) {
      tick = document.createElement('label');
      tick.setAttribute('aria-hidden', 'true');
      tick.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden';
      tick.innerHTML = '<input type="checkbox" switch tabindex="-1">';
      document.body.appendChild(tick);
    }
    tick.click();
  }
  function noGesture(t) {
    return !!(t.closest && t.closest('input,textarea,select,[contenteditable],dialog,[data-no-gesture],.app-chips,.app-compare'));
  }

  // iOS shows :active press states only when the page listens for touches
  document.addEventListener('touchstart', function () {}, { passive: true });

  /* ---------- Large title ---------- */
  // The bar collapses once the screen's large title has scrolled under it. A page that swaps screens calls
  // NTFApp.watchTitle(newTitle) to aim it at the new one.
  var titleIO = null;
  function watchTitle(t) {
    var bar = $('.app-bar');
    if (!bar || !t) return;
    if (titleIO) titleIO.disconnect();
    bar.classList.add('app-bar--instant'); bar.classList.remove('is-collapsed');
    requestAnimationFrame(function () { requestAnimationFrame(function () { bar.classList.remove('app-bar--instant'); }); });
    if (!('IntersectionObserver' in window)) { bar.classList.add('is-collapsed'); return; }
    titleIO = new IntersectionObserver(function (e) { bar.classList.toggle('is-collapsed', !e[0].isIntersecting); },
      { rootMargin: '-' + bar.offsetHeight + 'px 0px 0px 0px', threshold: 0 });
    titleIO.observe(t);
  }
  function initLargeTitle() {
    var t = $$('.app-large-title').filter(function (x) { return x.offsetParent !== null; })[0];
    watchTitle(t);
  }

  /* ---------- Tab bar minimise ---------- */
  function initTabbar() {
    var bar = $('.app-tabbar[data-minimise]');
    if (!bar) return;
    var last = scrollY, acc = 0;
    addEventListener('scroll', function () {
      var y = scrollY, d = y - last; last = y;
      acc = (d > 0) === (acc > 0) ? acc + d : d;
      if (y < 40 || acc < -24) bar.classList.remove('is-minimised');
      else if (acc > 40) bar.classList.add('is-minimised');
    }, { passive: true });
    bar.addEventListener('click', function (e) {
      if (bar.classList.contains('is-minimised') && e.target.closest('.app-tab[aria-current="page"]')) { e.preventDefault(); bar.classList.remove('is-minimised'); }
    });
  }

  /* ---------- Touch and hold: menu with a preview ---------- */
  var layer = null, menuFor = null, swallowClick = false;
  function buildLayer() {
    layer = document.createElement('div');
    layer.className = 'app-menu-layer';
    layer.innerHTML = '<div class="app-menu-veil"></div>';
    document.body.appendChild(layer);
    layer.addEventListener('click', function (e) { if (!e.target.closest('.app-menu')) closeMenu(); });
    layer.addEventListener('keydown', function (e) {
      var items = $$('.app-menu-item', layer), i = items.indexOf(document.activeElement);
      if (i < 0 && e.key === 'ArrowUp') i = 0;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
      } else if (e.key === 'Tab') e.preventDefault();
    });
  }
  function openMenu(el, at, byKey) {
    var tpl = $(el.getAttribute('data-hold-menu'));
    if (!tpl) return;
    if (!layer) buildLayer();
    closeMenu(true);
    menuFor = el;
    var r = el.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    var prev = el.cloneNode(true);
    prev.removeAttribute('id'); prev.setAttribute('aria-hidden', 'true'); prev.classList.remove('app-is-holding');
    var wrap = document.createElement('div');
    wrap.className = 'app-menu-preview';
    wrap.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px';
    wrap.appendChild(prev);
    var menu = document.createElement('div');
    menu.className = 'app-menu'; menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', el.getAttribute('aria-label') || (el.textContent || '').trim().slice(0, 60));
    menu.appendChild(tpl.content.cloneNode(true));
    $$('.app-menu-item', menu).forEach(function (b) { b.setAttribute('role', 'menuitem'); b.type = 'button'; });
    layer.appendChild(wrap); layer.appendChild(menu);
    // place: the preview stays put (lifted a little) and the menu goes under it, or above if there is no room;
    // if neither fits, the preview moves up so the menu fits under it
    var mh = menu.offsetHeight, mw = menu.offsetWidth, gap = 10, top = r.bottom + gap, pTop = r.top;
    if (top + mh > vh - 16) {
      if (r.top - gap - mh > 16) top = r.top - gap - mh;
      else { pTop = Math.max(16, vh - 16 - mh - gap - r.height); top = pTop + r.height + gap; }
    }
    var left = Math.min(Math.max(16, (at && at.x ? at.x - mw / 2 : r.left)), vw - 16 - mw);
    menu.style.left = left + 'px'; menu.style.top = top + 'px';
    menu.style.setProperty('--app-menu-origin', (top > pTop ? '50% 0' : '50% 100%'));
    layer.classList.add('is-open');
    html.classList.add('app-menu-open');
    requestAnimationFrame(function () { wrap.style.top = pTop + 'px'; wrap.style.transform = reduce ? '' : 'scale(1.03)'; });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('.app-menu-item'); if (!b) return;
      var a = b.getAttribute('data-action'), target = menuFor;
      closeMenu();
      target.dispatchEvent(new CustomEvent('app-menu', { bubbles: true, detail: { action: a } }));
    });
    // from the keyboard focus goes to the first item; from a finger or a mouse to the menu (no ring until a key is used)
    var first = $('.app-menu-item', menu);
    menu.tabIndex = -1;
    if (byKey && first) first.focus({ preventScroll: true }); else menu.focus({ preventScroll: true });
  }
  function closeMenu(quiet) {
    if (!layer || !layer.classList.contains('is-open')) return;
    layer.classList.remove('is-open'); html.classList.remove('app-menu-open');
    $$('.app-menu-preview,.app-menu', layer).forEach(function (n) { n.remove(); });
    if (menuFor && !quiet) menuFor.focus({ preventScroll: true });
    menuFor = null;
  }
  function initHold() {
    var timer = 0, start = null, el = null;
    function cancel() { clearTimeout(timer); timer = 0; if (el) el.classList.remove('app-is-holding'); el = null; start = null; }
    document.addEventListener('pointerdown', function (e) {
      swallowClick = false;   // a new press: forget the last hold (iOS often sends no click after a long hold)
      if (e.pointerType === 'mouse' || e.button > 0 || !e.isPrimary) { cancel(); return; }
      var t = e.target.closest('[data-hold-menu]');
      if (!t || noGesture(e.target) || t.closest('.is-editing')) return;
      el = t; start = { x: e.clientX, y: e.clientY };
      el.classList.add('app-is-holding');
      timer = setTimeout(function () {
        var target = el; cancel(); swallowClick = true; buzz(); openMenu(target, start || null);
      }, HOLD_MS);
    }, { passive: true });
    document.addEventListener('pointermove', function (e) {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > SLOP) cancel();
    }, { passive: true });
    document.addEventListener('pointerup', function () { if (timer) cancel(); }, { passive: true });
    document.addEventListener('pointercancel', cancel, { passive: true });
    addEventListener('scroll', function () { if (timer) cancel(); }, { passive: true });
    // the click that comes with lifting the finger after a hold: neither opens the row nor presses a menu item
    document.addEventListener('click', function (e) {
      if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopPropagation(); }
    }, true);
    // right-click, Android's own long press, the context-menu key: the same menu instead of the browser's
    document.addEventListener('contextmenu', function (e) {
      var t = e.target.closest('[data-hold-menu]');
      if (!t || noGesture(e.target) || t.closest('.is-editing')) return;
      e.preventDefault();
      if (menuFor !== t) { cancel(); openMenu(t, e.clientX ? { x: e.clientX, y: e.clientY } : null); }
    });
    document.addEventListener('keydown', function (e) {
      if (!(e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) return;
      var t = document.activeElement && document.activeElement.closest('[data-hold-menu]');
      if (t) { e.preventDefault(); openMenu(t, null, true); }
    });
    addEventListener('resize', function () { closeMenu(true); });
  }

  /* ---------- Sheets with detents ---------- */
  // Dragged by the grabber and the head only (touch-action: none there before the finger lands), so the body always
  // scrolls natively. Released, the sheet settles on the nearest height, judged by where it is and how fast it moved.
  // Each open sheet is a history entry, so Android's Back and the edge swipe close it. Buttons do the same: Done closes,
  // and a sheet with two heights can be expanded and collapsed from the keyboard (Enter on the grabber).
  function pageParts() { return $$('[data-swipe-page]').length ? $$('[data-swipe-page]') : $$('.app-bar,.app-main'); }
  function setDetent(sheet, d) {
    sheet.setAttribute('data-detent', d);
    var large = d === 'large' && sheet.open;
    html.classList.toggle('app-sheet-large-open', large);
    pageParts().forEach(function (p) { p.classList.toggle('app-behind-sheet', large); });
    var g = $('.app-sheet-grabber', sheet);
    if (g) g.setAttribute('aria-expanded', d === 'large' ? 'true' : 'false');
  }
  function openSheet(sheet) {
    if (sheet.open) return;
    var ds = (sheet.getAttribute('data-detents') || 'medium').split(/\s+/);
    sheet.showModal();
    setDetent(sheet, ds[0]);
    try { history.pushState({ appSheet: sheet.id || true }, ''); sheet._pushed = true; } catch (e) {}
  }
  function initSheets() {
    $$('dialog.app-sheet[data-detents]').forEach(function (sheet) {
      var ds = sheet.getAttribute('data-detents').split(/\s+/), opener = null;
      $$('[data-open-sheet="#' + sheet.id + '"]').forEach(function (b) { b.addEventListener('click', function () { opener = b; openSheet(sheet); }); });
      $$('[data-close]', sheet).forEach(function (b) { b.addEventListener('click', function () { sheet.close(); }); });
      sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.close(); });
      sheet.addEventListener('close', function () {
        sheet.style.transform = ''; sheet.style.height = ''; setDetent(sheet, ds[0]);
        html.classList.remove('app-sheet-large-open');
        pageParts().forEach(function (p) { p.classList.remove('app-behind-sheet'); });
        if (sheet._pushed) { sheet._pushed = false; try { history.back(); } catch (e) {} }
        if (opener) opener.focus();
      });
      addEventListener('popstate', function () { if (sheet.open) { sheet._pushed = false; sheet.close(); } });
      var handles = $$('.app-sheet-grabber,.app-sheet-head', sheet);
      var grab = $('.app-sheet-grabber', sheet);
      if (grab && ds.length > 1) {
        grab.setAttribute('role', 'button'); grab.tabIndex = 0; grab.setAttribute('aria-label', 'Expand or collapse');
        grab.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault(); var i = ds.indexOf(sheet.getAttribute('data-detent')); setDetent(sheet, ds[(i + 1) % ds.length]);
        });
      }
      var y0 = null, h0 = 0, dy = 0, last = [], id = null;
      handles.forEach(function (h) {
        h.style.touchAction = 'none';
        h.addEventListener('pointerdown', function (e) {
          if (e.target.closest('button:not(.app-sheet-grabber),a,input,select,textarea')) return;
          y0 = e.clientY; dy = 0; last = [[e.timeStamp, e.clientY]]; id = e.pointerId;
          h0 = sheet.getBoundingClientRect().height;
          try { h.setPointerCapture(id); } catch (err) {}
          sheet.classList.add('is-dragging');
        });
        h.addEventListener('pointermove', function (e) {
          if (y0 === null || e.pointerId !== id) return;
          dy = e.clientY - y0; last.push([e.timeStamp, e.clientY]); if (last.length > 5) last.shift();
          var maxH = innerHeight - 12;
          if (dy < 0) {   // pulling up: grow, with resistance past the tallest height
            var want = h0 - dy, h = want > maxH ? maxH + (want - maxH) * 0.15 : want;
            sheet.style.height = h + 'px'; sheet.style.transform = '';
          } else { sheet.style.height = ''; sheet.style.transform = 'translateY(' + dy + 'px)'; }
        });
        function up(e) {
          if (y0 === null || e.pointerId !== id) return;
          var a = last[0], b = last[last.length - 1], v = (b[1] - a[1]) / Math.max(1, b[0] - a[0]);   // px per ms
          y0 = null; sheet.classList.remove('is-dragging'); sheet.style.transform = ''; sheet.style.height = '';
          var i = ds.indexOf(sheet.getAttribute('data-detent')), projected = dy + v * 200;   // where a flick would carry it
          if (projected < -80) setDetent(sheet, ds[Math.min(ds.length - 1, i + 1)]);
          else if (projected > 140) { if (i > 0) setDetent(sheet, ds[i - 1]); else sheet.close(); }
        }
        h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
      });
      addEventListener('resize', function () { if (sheet.open) setDetent(sheet, sheet.getAttribute('data-detent')); });
    });
  }

  /* ---------- Edge swipe back ---------- */
  // Only in the iPhone home-screen app (Safari and Android have their own Back gestures; two would both fire), and only
  // on a screen with a Back button (.app-back): letting go past a third of the width, or after a flick, presses it, so
  // the app's own back logic runs. Starts within 24 px of the left edge and only when the finger moves mostly sideways.
  // The content moves; the bars and tab bar stay. Check on a real phone: if the home-screen app already has its own
  // edge swipe on a later iOS, leave data-edge-back off.
  function edgeBackOn() {
    var a = html.getAttribute('data-edge-back');
    if (a === null) return false;
    if (a === 'always') return true;
    var ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    return ios && standalone;
  }
  function initEdgeBack() {
    if (!edgeBackOn()) return;
    var parts = null, x0 = null, y0 = 0, dx = 0, hist = [], shade = null, going = false, back = null;
    document.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      back = $('.app-back');
      if (!back || going || e.touches.length > 1 || t.clientX > 24 || noGesture(e.target) || html.classList.contains('app-menu-open')) { x0 = null; return; }
      x0 = t.clientX; y0 = t.clientY; dx = 0; hist = [[e.timeStamp, t.clientX]]; parts = null;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (x0 === null) return;
      var t = e.touches[0], mx = t.clientX - x0, my = t.clientY - y0;
      if (!parts) {
        if (Math.abs(my) > Math.abs(mx) && Math.abs(my) > 8) { x0 = null; return; }   // vertical: let it scroll
        if (mx < 8) return;
        parts = $$('[data-swipe-page]').length ? $$('[data-swipe-page]') : $$('.app-main');
        if (!shade) { shade = document.createElement('div'); shade.className = 'app-swipe-shade'; document.body.appendChild(shade); }
        parts.forEach(function (p) { p.style.transition = 'none'; });
      }
      if (e.cancelable) e.preventDefault();
      dx = Math.max(0, mx); hist.push([e.timeStamp, t.clientX]); if (hist.length > 5) hist.shift();
      parts.forEach(function (p) { p.style.transform = 'translateX(' + dx + 'px)'; });
      shade.style.transition = 'none'; shade.style.opacity = String(1 - dx / innerWidth);
    }, { passive: false });
    function end() {
      if (x0 === null) return;
      x0 = null;
      if (!parts) return;
      var a = hist[0], b = hist[hist.length - 1], v = (b[1] - a[1]) / Math.max(1, b[0] - a[0]);
      var done = dx > innerWidth / 3 || (v > 0.5 && dx > 40), ps = parts; parts = null;
      ps.forEach(function (p) {
        p.style.transition = reduce ? 'none' : 'transform 340ms var(--app-ease-sheet)';
        p.style.transform = done ? 'translateX(' + innerWidth + 'px)' : '';
      });
      shade.style.transition = 'opacity 340ms linear'; shade.style.opacity = '0';
      setTimeout(function () {
        if (done) { going = true; html.setAttribute('data-nav', 'none'); back.click(); }
        setTimeout(function () { ps.forEach(function (p) { p.style.transition = 'none'; p.style.transform = ''; }); going = false; }, done ? 80 : 0);
      }, reduce ? 0 : 340);
    }
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', end, { passive: true });
  }

  /* ---------- Edit mode: multiple select, drag down the ticks ---------- */
  // [data-edit-for="#list"] buttons switch it on and off (Select / Done); "app-edit" on the list switches it on from code
  // (a hold menu's Select). While editing, a tap ticks a row (no navigation), Space ticks the focused row, and a finger
  // that starts on the ticks and moves up or down sets the whole range from where it started to where it is now, against
  // the ticks as they were when it started (no flicker going back over rows); the list scrolls near the screen's edges.
  // [data-select-toolbar="#list"] replaces the tab bar while editing; its [data-needs="2-4"] buttons follow the count;
  // [data-select-count="#list"] says how many (a live region). The list gets "app-select" events with the count.
  function initSelect() {
    $$('.app-list[data-select]').forEach(function (list) {
      var sel = '#' + list.id, buttons = $$('[data-edit-for="' + sel + '"]'), bar = $('[data-select-toolbar="' + sel + '"]');
      var tabbar = $('.app-tabbar'), status = $('[data-select-count="' + sel + '"]');
      if (status) { status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); }
      function rows() { return $$('.app-row', list); }
      function chosen() { return rows().filter(function (r) { return r.getAttribute('aria-checked') === 'true'; }); }
      function paint() {
        var n = chosen().length;
        if (status) status.textContent = n ? n + ' selected' : 'Select items';
        if (bar) $$('[data-needs]', bar).forEach(function (b) {
          var m = b.getAttribute('data-needs').split('-'), lo = +m[0], hi = +(m[1] || 99);
          b.disabled = n < lo || n > hi;
        });
        $$('[data-select-all="' + sel + '"]').forEach(function (b) { b.textContent = n === rows().length ? 'Deselect all' : 'Select all'; });
        list.dispatchEvent(new CustomEvent('app-select', { bubbles: true, detail: { count: n, rows: chosen() } }));
      }
      function setEditing(on) {
        list.classList.toggle('is-editing', on);
        rows().forEach(function (r) {
          if (on) { r.setAttribute('role', 'checkbox'); r.setAttribute('aria-checked', 'false'); }
          else { r.removeAttribute('role'); r.removeAttribute('aria-checked'); }
        });
        buttons.forEach(function (b) { b.textContent = on ? 'Done' : b.getAttribute('data-label'); });
        $$('[data-select-all="' + sel + '"]').forEach(function (b) { b.hidden = !on; });
        if (bar) bar.hidden = !on;
        if (tabbar) tabbar.hidden = on;
        paint();
      }
      buttons.forEach(function (b) {
        if (!b.getAttribute('data-label')) b.setAttribute('data-label', b.textContent.trim());
        b.addEventListener('click', function () { setEditing(!list.classList.contains('is-editing')); });
      });
      $$('[data-select-all="' + sel + '"]').forEach(function (b) {
        b.hidden = true;
        b.addEventListener('click', function () { var all = chosen().length < rows().length; rows().forEach(function (r) { r.setAttribute('aria-checked', all ? 'true' : 'false'); }); paint(); });
      });
      list.addEventListener('app-edit', function (e) {
        if (!list.classList.contains('is-editing')) setEditing(true);
        if (e.detail && e.detail.row) { e.detail.row.setAttribute('aria-checked', 'true'); paint(); }
      });
      list.addEventListener('click', function (e) {
        if (!list.classList.contains('is-editing')) return;
        var r = e.target.closest('.app-row'); if (!r) return;
        e.preventDefault();
        if (dragged) { dragged = false; return; }
        r.setAttribute('aria-checked', r.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); buzz(); paint();
      });
      list.addEventListener('keydown', function (e) {
        if (!list.classList.contains('is-editing') || e.key !== ' ') return;
        var r = e.target.closest('.app-row'); if (r) { e.preventDefault(); r.click(); }
      });
      var from = -1, setTo = 'true', snap = null, dragged = false, lastY = 0, scroller = 0;
      list.addEventListener('touchstart', function (e) {
        if (!list.classList.contains('is-editing') || e.touches.length > 1) return;
        var t = e.touches[0], r = e.target.closest('.app-row');
        if (!r || t.clientX - list.getBoundingClientRect().left > 56) return;   // only from the ticks
        var all = rows(); from = all.indexOf(r); dragged = false; lastY = t.clientY;
        snap = all.map(function (x) { return x.getAttribute('aria-checked'); });
        setTo = snap[from] === 'true' ? 'false' : 'true';
      }, { passive: true });
      function applyAt(y) {
        var el = document.elementFromPoint(list.getBoundingClientRect().left + 30, y), r = el && el.closest('.app-row');
        if (!r || !list.contains(r)) return;
        var all = rows(), to = all.indexOf(r), lo = Math.min(from, to), hi = Math.max(from, to), changed = false;
        all.forEach(function (x, i) {
          var want = i >= lo && i <= hi ? setTo : snap[i];
          if (x.getAttribute('aria-checked') !== want) { x.setAttribute('aria-checked', want); changed = true; }
        });
        if (changed) { buzz(); paint(); }
      }
      list.addEventListener('touchmove', function (e) {
        if (from < 0) return;
        var t = e.touches[0];
        if (!dragged && Math.abs(t.clientY - lastY) < 6) return;
        dragged = true; lastY = t.clientY;
        if (e.cancelable) e.preventDefault();
        applyAt(t.clientY);
        cancelAnimationFrame(scroller);
        var edge = 80, sp = t.clientY < edge ? -8 : t.clientY > innerHeight - edge - 70 ? 8 : 0;   // 70: the toolbar
        if (sp) (function step() { scrollBy(0, sp); applyAt(lastY); scroller = requestAnimationFrame(step); })();
      }, { passive: false });
      function stop() { from = -1; cancelAnimationFrame(scroller); }
      list.addEventListener('touchend', stop); list.addEventListener('touchcancel', stop);
    });
  }

  function init() { initLargeTitle(); initTabbar(); initHold(); initSheets(); initEdgeBack(); initSelect(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.NTFApp = { watchTitle: watchTitle, openSheet: openSheet, openMenu: openMenu, closeMenu: closeMenu, haptic: buzz };
})();
