'use strict';

/* =============================================
   ВСЕМ ЕДУ — Main Script
   Весь контент (тексты, фото, меню, отзывы) грузится
   из content.json и может редактироваться через /admin.
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {
  loadContent();
});

function loadContent() {
  fetch('content.json', { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('Не удалось загрузить content.json');
      return res.json();
    })
    .then(function (data) {
      renderSite(data);
    })
    .catch(function (err) {
      console.error('Ошибка загрузки контента сайта:', err);
    });
}

function renderSite(data) {
  var modalApi = initImageModal();
  var openModal = modalApi ? modalApi.openModal : null;

  renderHeader(data);
  renderHero(data);
  renderMenu(data, openModal);
  renderReviews(data, openModal);
  renderFooter(data);
  renderWhatsapp(data);

  initMenuTabs();
  initSmoothScroll();
  initHeaderNav();
}

/* --- Header --- */
function renderHeader(data) {
  var header = data.header || {};
  var settings = data.settings || {};

  setImgSrc('headerLogo', header.logo);
  setText('hoursText', settings.hours);
  setText('deliveryText', settings.deliveryFrom);
  setText('headerPhoneText', settings.phone);

  var phoneLink = document.getElementById('headerPhoneLink');
  if (phoneLink && settings.phone) {
    phoneLink.setAttribute('href', 'tel:' + settings.phone.replace(/[^\d+]/g, ''));
    phoneLink.setAttribute('aria-label', 'Телефон: ' + settings.phone);
  }
}

/* --- Hero --- */
function renderHero(data) {
  var hero = data.hero || {};
  setText('heroTitle', hero.title);
  setText('heroSubtitle', hero.subtitle);
  setText('heroBtn', hero.buttonText);
  setImgSrc('heroImage', hero.image);
}

/* --- Menu --- */
function renderMenu(data, openModal) {
  var menu = data.menu || {};
  var categories = menu.categories || [];

  setText('menuTitle', menu.title);
  setText('menuSubtitle', menu.subtitle);

  var tabsWrap = document.getElementById('menuTabs');
  var panelsWrap = document.getElementById('menuPanels');
  if (!tabsWrap || !panelsWrap) return;

  tabsWrap.innerHTML = '';
  panelsWrap.innerHTML = '';

  categories.forEach(function (category, index) {
    var isActive = index === 0;

    var tab = document.createElement('button');
    tab.className = 'menu__tab' + (isActive ? ' menu__tab--active' : '');
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.setAttribute('aria-controls', 'panel-' + category.id);
    tab.id = 'tab-' + category.id;
    tab.setAttribute('data-category', category.id);
    tab.textContent = category.title;
    tabsWrap.appendChild(tab);

    var panel = document.createElement('div');
    panel.className = 'menu__panel' + (isActive ? ' menu__panel--active' : '');
    panel.setAttribute('role', 'tabpanel');
    panel.id = 'panel-' + category.id;
    panel.setAttribute('aria-labelledby', 'tab-' + category.id);
    panel.setAttribute('data-category', category.id);
    if (!isActive) panel.setAttribute('hidden', '');

    var grid = document.createElement('div');
    grid.className = 'menu__grid';

    (category.items || []).forEach(function (item) {
      var itemBtn = document.createElement('button');
      itemBtn.className = 'menu__item';
      itemBtn.type = 'button';
      itemBtn.setAttribute('aria-label', (item.alt || category.title) + ' — увеличить');

      var img = document.createElement('img');
      img.className = 'menu__img';
      img.src = item.image;
      img.alt = item.alt || category.title;
      img.loading = 'lazy';

      itemBtn.appendChild(img);
      grid.appendChild(itemBtn);

      if (openModal) {
        itemBtn.addEventListener('click', function () {
          openModal(img.src, img.alt);
        });
      }
    });

    panel.appendChild(grid);
    panelsWrap.appendChild(panel);
  });
}

/* --- Reviews --- */
function renderReviews(data, openModal) {
  var reviews = data.reviews || {};
  var images = reviews.images || [];

  setText('reviewsTitle', reviews.title);
  setText('reviewsSubtitle', reviews.subtitle);
  setText('reviewsInstagramBtnText', reviews.buttonText);

  var settings = data.settings || {};
  var igLink = document.getElementById('reviewsInstagramBtn');
  if (igLink && settings.instagramUrl) igLink.setAttribute('href', settings.instagramUrl);

  var grid = document.getElementById('reviewsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  images.forEach(function (src, i) {
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'reviews__card';
    card.setAttribute('aria-label', 'Отзыв ' + (i + 1) + ' — увеличить');

    var img = document.createElement('img');
    img.className = 'reviews__img';
    img.src = src;
    img.alt = 'Отзыв клиента ' + (i + 1);
    img.loading = 'lazy';

    card.appendChild(img);
    grid.appendChild(card);

    if (openModal) {
      card.addEventListener('click', function () {
        openModal(img.src, img.alt);
      });
    }
  });
}

/* --- Footer --- */
function renderFooter(data) {
  var footer = data.footer || {};
  var settings = data.settings || {};

  setImgSrc('footerLogo', footer.logo);
  setText('footerCopyright', footer.copyright);
  setText('footerPhoneLink', settings.phone);

  var phoneLink = document.getElementById('footerPhoneLink');
  if (phoneLink && settings.phone) {
    phoneLink.setAttribute('href', 'tel:' + settings.phone.replace(/[^\d+]/g, ''));
  }

  var igLink = document.getElementById('footerInstagramLink');
  if (igLink && settings.instagramUrl) igLink.setAttribute('href', settings.instagramUrl);
}

/* --- WhatsApp Fixed Button --- */
function renderWhatsapp(data) {
  var settings = data.settings || {};
  var btn = document.getElementById('whatsappBtn');
  if (!btn) return;

  var number = (settings.whatsappNumber || '').replace(/[^\d]/g, '');
  var message = encodeURIComponent(settings.whatsappMessage || '');
  btn.setAttribute('href', 'https://api.whatsapp.com/send?phone=' + number + '&text=' + message);

  setText('whatsappBtnText', settings.whatsappButtonText);
}

/* --- Helpers --- */
function setText(id, value) {
  var el = document.getElementById(id);
  if (el && typeof value === 'string') el.textContent = value;
}

function setImgSrc(id, value) {
  var el = document.getElementById(id);
  if (el && typeof value === 'string' && value) el.src = value;
}

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
