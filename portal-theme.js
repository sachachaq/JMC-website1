/**
 * JMC Portal — Centralized Theme Manager
 * Load this as the FIRST script on every portal page (ideally in <head>)
 * to apply the saved theme before first paint and prevent flash.
 */
(function () {
  var THEME_KEY = 'jmc_theme';

  var SUN_SVG =
    '<circle cx="12" cy="12" r="4.5"/>' +
    '<line x1="12" y1="2"    x2="12" y2="4.5"/>' +
    '<line x1="12" y1="19.5" x2="12" y2="22"/>' +
    '<line x1="4.93" y1="4.93" x2="6.7"  y2="6.7"/>' +
    '<line x1="17.3" y1="17.3" x2="19.07" y2="19.07"/>' +
    '<line x1="2"    y1="12"   x2="4.5"  y2="12"/>' +
    '<line x1="19.5" y1="12"   x2="22"   y2="12"/>' +
    '<line x1="4.93" y1="19.07" x2="6.7" y2="17.3"/>' +
    '<line x1="17.3" y1="6.7"  x2="19.07" y2="4.93"/>';

  var MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function syncIcons() {
    var dark = isDark();
    document.querySelectorAll('[data-theme-icon]').forEach(function (el) {
      el.innerHTML = dark ? SUN_SVG : MOON_SVG;
    });
  }

  function apply(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    syncIcons();
  }

  function toggle() {
    var dark = !isDark();
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    apply(dark);
  }

  // Migrate old key if present
  var legacyDark = localStorage.getItem('jmc_dark_mode');
  if (legacyDark && !localStorage.getItem(THEME_KEY)) {
    localStorage.setItem(THEME_KEY, 'dark');
    localStorage.removeItem('jmc_dark_mode');
  }

  // Apply immediately before first paint to avoid flash
  var saved = localStorage.getItem(THEME_KEY);
  apply(saved === 'dark');

  // Re-sync icons once DOM is ready (icons may not exist yet at parse time)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncIcons);
  } else {
    syncIcons();
  }

  window.toggleDarkMode = toggle;
})();
