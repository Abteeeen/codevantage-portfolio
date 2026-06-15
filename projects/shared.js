/* Shared JS for all project detail pages */
(function () {
  'use strict';

  // ── Kinetic Typography (Scroll-driven variable font weight) ──
  const kineticHeadings = document.querySelectorAll('.sh__title, .project-hero__title');
  let tickingType = false;

  window.addEventListener('scroll', function() {
    if (!tickingType) {
      window.requestAnimationFrame(function() {
        const viewportHeight = window.innerHeight;
        
        kineticHeadings.forEach(h => {
          const rect = h.getBoundingClientRect();
          const scrollPercent = 1 - (rect.top / viewportHeight);
          let weight = 300 + (scrollPercent * 600);
          weight = Math.max(300, Math.min(900, weight));
          
          h.style.fontVariationSettings = `"wght" ${weight}`;
          h.style.fontWeight = weight; // fallback
        });
        
        tickingType = false;
      });
      tickingType = true;
    }
  });

  // Scroll reveal
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { obs.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('visible'); });
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (id === '#') return;
      var t = document.querySelector(id);
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
})();
