// Marketing site JS — nav, hero, scroll reveals

document.addEventListener('DOMContentLoaded', function () {

  // Nav: add "scrolled" class when user scrolls down
  var nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // Hero: fade in "·" and "31 Stores" after 1s
  var heroStores = document.getElementById('heroStores');
  var heroSep    = document.getElementById('heroSep');
  if (heroStores) {
    setTimeout(function () {
      heroStores.classList.add('visible');
      if (heroSep) heroSep.classList.add('visible');
    }, 2800);
  }

  // Stat items: fade up + count-up on scroll
  var statItems = document.querySelectorAll('.stat-item');
  if (statItems.length) {
    function animateCount(el) {
      var h3 = el.querySelector('h3');
      if (!h3) return;
      var raw    = h3.textContent.trim();
      var suffix = raw.replace(/[0-9,]/g, '');
      var target = parseInt(raw.replace(/[^0-9]/g, ''), 10);
      if (isNaN(target)) return;
      var duration = 1400;
      var start    = performance.now();
      function step(now) {
        var progress = Math.min((now - start) / duration, 1);
        var ease     = 1 - Math.pow(1 - progress, 3);
        h3.textContent = Math.round(ease * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    var statObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          animateCount(entry.target);
          statObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    statItems.forEach(function (el) { statObserver.observe(el); });
  }

  // Section reveal: fade up on scroll
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  }

  // Mobile nav toggle
  var toggle   = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Active nav link
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

});
