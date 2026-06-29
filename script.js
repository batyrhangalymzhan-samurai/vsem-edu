'use strict';

/* =============================================
   ВСЕМ ЕДУ — Main Script
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {
  initMenuTabs();
  var modalApi = initImageModal();
  initReviewsGrid(modalApi ? modalApi.openModal : null);
  initSmoothScroll();
  initHeaderNav();
});

/* --- Menu Tabs --- */
function initMenuTabs() {
  var tabs = document.querySelectorAll('.menu__tab');
  var panels = document.querySelectorAll('.menu__panel');

  if (!tabs.length || !panels.length) return;

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var category = tab.getAttribute('data-category');
      if (!category) return;

      tabs.forEach(function (t) {
        t.classList.remove('menu__tab--active');
        t.setAttribute('aria-selected', 'false');
      });

      panels.forEach(function (panel) {
        panel.classList.remove('menu__panel--active');
        panel.setAttribute('hidden', '');
      });

      tab.classList.add('menu__tab--active');
      tab.setAttribute('aria-selected', 'true');

      var activePanel = document.querySelector('.menu__panel[data-category="' + category + '"]');
      if (activePanel) {
        activePanel.classList.add('menu__panel--active');
        activePanel.removeAttribute('hidden');
      }

      tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  });
}

/* --- Image Modal (Zoom) --- */
function initImageModal() {
  var modal = document.getElementById('imageModal');
  var modalImage = document.getElementById('modalImage');
  var modalClose = document.getElementById('modalClose');
  var modalOverlay = document.getElementById('modalOverlay');
  var menuItems = document.querySelectorAll('.menu__item');

  if (!modal || !modalImage) return null;

  var lastFocusedElement = null;

  function openModal(src, alt) {
    lastFocusedElement = document.activeElement;
    modalImage.src = src;
    modalImage.alt = alt || 'Изображение меню';
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    modalClose.focus();
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
    modalImage.src = '';
    modalImage.alt = '';
    document.body.style.overflow = '';
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  menuItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var img = item.querySelector('.menu__img');
      if (img) {
        openModal(img.src, img.alt);
      }
    });
  });

  modalClose.addEventListener('click', closeModal);

  modalOverlay.addEventListener('click', closeModal);

  modal.addEventListener('click', function (e) {
    if (e.target === modal || e.target.classList.contains('modal__content')) {
      closeModal();
    }
  });

  modalImage.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
      closeModal();
    }
  });

  var touchStartY = 0;
  modalOverlay.addEventListener('touchstart', function (e) {
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  modalOverlay.addEventListener('touchend', function (e) {
    var touchEndY = e.changedTouches[0].screenY;
    var diff = Math.abs(touchEndY - touchStartY);
    if (diff < 10) {
      closeModal();
    }
  }, { passive: true });

  return { openModal: openModal, closeModal: closeModal };
}

/* --- Reviews Grid --- */
function initReviewsGrid(openModal) {
  var grid = document.getElementById('reviewsGrid');
  if (!grid) return;

  var totalReviews = 22;

  for (var i = 1; i <= totalReviews; i++) {
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'reviews__card';
    card.setAttribute('aria-label', 'Отзыв ' + i + ' — увеличить');

    var img = document.createElement('img');
    img.className = 'reviews__img';
    img.src = 'images/review' + i + '.jpeg';
    img.alt = 'Отзыв клиента ' + i;
    img.loading = 'lazy';

    card.appendChild(img);
    grid.appendChild(card);

    if (openModal) {
      (function (src, alt) {
        card.addEventListener('click', function () {
          openModal(src, alt);
        });
      })(img.src, img.alt);
    }
  }
}

/* --- Header Navigation --- */
function initHeaderNav() {
  var navLinks = document.querySelectorAll('.header__nav-link');
  var sections = document.querySelectorAll('#menu, #reviews');

  if (!navLinks.length || !sections.length) return;

  function setActiveNav(sectionId) {
    navLinks.forEach(function (link) {
      var isActive = link.getAttribute('href') === '#' + sectionId;
      link.classList.toggle('header__nav-link--active', isActive);
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      var sectionId = link.getAttribute('href').replace('#', '');
      setActiveNav(sectionId);
    });
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          setActiveNav(entry.target.id);
        }
      });
    },
    {
      root: null,
      rootMargin: '-' + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) || 72) + 'px 0px -50% 0px',
      threshold: 0
    }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });
}

/* --- Smooth Scroll for anchor links --- */
function initSmoothScroll() {
  var anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      var target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      var headerHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--header-height'),
        10
      ) || 72;

      var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    });
  });
}
