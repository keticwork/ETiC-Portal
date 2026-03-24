/* ===================================
   ETiC Portal — main.js
   =================================== */

(function () {
  'use strict';

  /* ---- Génération des étoiles ---- */
  const starsContainer = document.getElementById('stars-container');
  const STAR_COUNT = 150;

  function createStars() {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = document.createElement('div');
      star.classList.add('star');

      const size = (Math.random() * 2 + 0.5).toFixed(2); // 0.5px–2.5px
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const opacityMin = (Math.random() * 0.3 + 0.1).toFixed(2);
      const opacityMax = (Math.random() * 0.5 + 0.5).toFixed(2);
      const duration = (Math.random() * 4 + 2).toFixed(2); // 2s–6s
      const delay = (Math.random() * 5).toFixed(2);        // 0s–5s

      star.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x}%;
        top: ${y}%;
        --opacity-min: ${opacityMin};
        --opacity-max: ${opacityMax};
        --duration: ${duration}s;
        --delay: ${delay}s;
        opacity: ${opacityMin};
      `;

      fragment.appendChild(star);
    }

    starsContainer.appendChild(fragment);
  }

  createStars();

  /* ---- Parallaxe étoiles au scroll ---- */
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  function updateParallax() {
    const scrollY = window.scrollY;
    starsContainer.style.transform = `translateY(${scrollY * 0.3}px)`;
    ticking = false;
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- Particules au hover ---- */
  const PARTICLE_COUNT = 8;

  const portalColors = {
    'portal-flyerwallet': '#7F77DD',
    'portal-docprotect': '#1D9E75',
  };

  function spawnParticles(portal) {
    const portalId = portal.id;
    const color = portalColors[portalId];
    if (!color) return;

    const rect = portal.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2 + window.scrollY;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');

      const size = Math.random() * 5 + 2; // 2px–7px
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const distance = Math.random() * 60 + 40; // 40px–100px
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const duration = (Math.random() * 0.4 + 0.6).toFixed(2); // 0.6s–1s

      particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${cx - size / 2}px;
        top: ${cy - size / 2}px;
        background: ${color};
        position: fixed;
        z-index: 200;
        --tx: ${tx}px;
        --ty: ${ty}px;
        --fly-duration: ${duration}s;
        box-shadow: 0 0 6px ${color};
      `;

      document.body.appendChild(particle);

      particle.addEventListener('animationend', () => particle.remove());
    }
  }

  // Attacher les événements hover sur les portails actifs
  const activePortals = document.querySelectorAll('.portal--violet, .portal--teal');
  activePortals.forEach((portal) => {
    portal.addEventListener('mouseenter', () => spawnParticles(portal));
  });

  /* ---- Bouton son (toggle prêt, sans audio pour l'instant) ---- */
  const soundBtn = document.getElementById('soundToggle');
  let soundOn = false;

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      soundBtn.textContent = soundOn ? '🔇' : '🔊';
      soundBtn.setAttribute('aria-label', soundOn ? 'Désactiver le son' : 'Activer le son');
      // TODO: connecter un AudioContext ici lorsque les assets sonores seront disponibles
    });
  }

})();
