/* ============================================================
   docProtect — main.js
   Space theme: colored stars (FR flag), shooting stars, parallax
   ============================================================ */

(function () {
  'use strict';

  var starsContainer = document.getElementById('stars-dp');
  if (!starsContainer) return;

  /* ---- Étoiles colorées (blanc / bleu / rouge — drapeau français) ---- */
  var STAR_COUNT  = 150;
  var STAR_COLORS = ['#ffffff', '#ffffff', '#ffffff', '#0055A4', '#EF4135'];
  // blanc plus fréquent → aspect naturel

  function createStars() {
    var frag = document.createDocumentFragment();

    for (var i = 0; i < STAR_COUNT; i++) {
      var star    = document.createElement('div');
      star.className = 'star-dp';

      var size      = (Math.random() * 2 + 0.5).toFixed(2);          // 0.5–2.5 px
      var x         = (Math.random() * 100).toFixed(2);               // % largeur
      var y         = (Math.random() * 100).toFixed(2);               // % hauteur
      var color     = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
      var oMin      = (Math.random() * 0.25 + 0.08).toFixed(2);
      var oMax      = (Math.random() * 0.55 + 0.45).toFixed(2);
      var dur       = (Math.random() * 4 + 2).toFixed(2) + 's';       // 2–6 s
      var del       = (Math.random() * 6).toFixed(2) + 's';           // 0–6 s

      star.style.cssText =
        'width:'  + size + 'px;' +
        'height:' + size + 'px;' +
        'left:'   + x    + '%;' +
        'top:'    + y    + '%;' +
        'background:' + color + ';' +
        '--omin:' + oMin + ';' +
        '--omax:' + oMax + ';' +
        '--dur:'  + dur  + ';' +
        '--del:'  + del  + ';' +
        'opacity:' + oMin + ';';

      frag.appendChild(star);
    }

    starsContainer.appendChild(frag);
  }

  createStars();

  /* ---- Parallaxe au scroll (étoiles à 0.3x la vitesse) ---- */
  var ticking = false;

  function updateParallax() {
    starsContainer.style.transform = 'translateY(' + (window.scrollY * 0.3) + 'px)';
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });

  /* ---- Étoiles filantes ---- */
  function spawnShootingStar() {
    var star = document.createElement('div');
    star.className = 'shooting-star';

    // Départ : bord supérieur (60 %) ou bord droit (40 %)
    if (Math.random() < 0.6) {
      star.style.top  = (Math.random() * 40) + 'vh';
      star.style.left = (Math.random() * 50 + 40) + 'vw';
    } else {
      star.style.top  = (Math.random() * 50) + 'vh';
      star.style.left = 'calc(100vw - 5px)';
    }

    document.body.appendChild(star);
    star.addEventListener('animationend', function () { star.remove(); });
  }

  // Première étoile filante après 2 s, puis toutes les 4 s
  setTimeout(function () {
    spawnShootingStar();
    setInterval(spawnShootingStar, 4000);
  }, 2000);

}());
