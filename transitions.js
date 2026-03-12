(function () {
  // Entrance: fade + slide up on every page load
  document.body.classList.add('page-enter');

  // Fix back/forward navigation restoring page in exit state
  window.addEventListener('pageshow', function (e) {
    document.body.classList.remove('page-exit');
    document.body.classList.add('page-enter');
  });

  // Exit: intercept internal link clicks
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;

    var href = link.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#')) return;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (link.getAttribute('target') === '_blank') return;
    if (href.startsWith('http') && !href.includes(window.location.hostname)) return;

    e.preventDefault();
    document.body.classList.remove('page-enter');
    document.body.classList.add('page-exit');

    setTimeout(function () {
      window.location.href = href;
    }, 210);
  });
})();
