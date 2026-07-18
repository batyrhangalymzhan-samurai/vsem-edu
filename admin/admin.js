'use strict';

/* =============================================
   ВСЕМ ЕДУ — Admin Panel Script
   Хранит весь контент сайта в state.content (структура
   как в content.json) и сохраняет его через /api/content.
   Фото загружаются через /api/upload и сразу попадают в GitHub.
   ============================================= */

var state = {
  token: localStorage.getItem('vsemEduAdminToken') || null,
  content: null
};

document.addEventListener('DOMContentLoaded', function () {
  initTabs();
  initLoginForm();

  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('addCategoryBtn').addEventListener('click', onAddCategory);
  document.getElementById('addReviewBtn').addEventListener('click', onAddReview);

  document.querySelectorAll('.btn-save').forEach(function (btn) {
    btn.addEventListener('click', function () { saveContent(btn); });
  });

  if (state.token) {
    showApp();
  }
});

/* --- API helpers --- */

function apiRequest(url, method, body, auth) {
  var headers = { 'Content-Type': 'application/json' };
  if (auth && state.token) headers['Authorization'] = 'Bearer ' + state.token;

  return fetch(url, {
    method: method,
    headers: headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  }).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (data) {
      if (!res.ok) {
        var err = new Error((data && data.error) || ('Ошибка запроса: ' + res.status));
        err.status = res.status;
        throw err;
      }
      return data;
    });
  });
}

function apiGet(url) { return apiRequest(url, 'GET'); }
function apiPost(url, body, auth) { return apiRequest(url, 'POST', body, auth); }

/* --- Auth / screens --- */

function initLoginForm() {
  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var password = document.getElementById('passwordInput').value;
    var errorEl = document.getElementById('loginError');
    errorEl.hidden = true;

    apiPost('/api/login', { password: password }, false).then(function (data) {
      state.token = data.token;
      localStorage.setItem('vsemEduAdminToken', state.token);
      showApp();
    }).catch(function (err) {
      errorEl.textContent = err.message || 'Ошибка входа';
      errorEl.hidden = false;
    });
  });
}

function showApp() {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('appScreen').hidden = false;
  if (!state.content) loadAndRenderContent();
}

function logout() {
  state.token = null;
  state.content = null;
  localStorage.removeItem('vsemEduAdminToken');
  document.getElementById('appScreen').hidden = true;
  document.getElementById('loginScreen').hidden = false;
}

function loadAndRenderContent() {
  apiGet('/api/content').then(function (data) {
    state.content = data;
    renderAll();
  }).catch(function (err) {
    showToast(err.message || 'Не удалось загрузить контент сайта', 'error');
  });
}

/* --- Tabs --- */

function initTabs() {
  document.querySelectorAll('.app-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.app-tab').forEach(function (t) { t.classList.remove('app-tab--active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('tab-panel--active'); });
      tab.classList.add('app-tab--active');
      var target = document.querySelector('.tab-panel[data-tab="' + tab.getAttribute('data-tab') + '"]');
      if (target) target.classList.add('tab-panel--active');
    });
  });
}

/* --- Path helpers --- */

function getPath(obj, path) {
  return path.split('.').reduce(function (o, k) { return o ? o[k] : undefined; }, obj);
}

function setPath(obj, path, value) {
  var keys = path.split('.');
  var last = keys.pop();
  var target = keys.reduce(function (o, k) {
    if (!o[k]) o[k] = {};
    return o[k];
  }, obj);
  target[last] = value;
}

function toAbsolute(path) {
  if (!path) return '';
  return path.charAt(0) === '/' ? path : '/' + path;
}

/* --- Render everything --- */

function renderAll() {
  bindInput('f-phone', 'settings.phone');
  bindInput('f-hours', 'settings.hours');
  bindInput('f-delivery', 'settings.deliveryFrom');
  bindInput('f-instagram', 'settings.instagramUrl');
  bindInput('f-wa-number', 'settings.whatsappNumber');
  bindInput('f-wa-btn', 'settings.whatsappButtonText');
  bindInput('f-wa-message', 'settings.whatsappMessage');
  bindInput('f-hero-title', 'hero.title');
  bindInput('f-hero-subtitle', 'hero.subtitle');
  bindInput('f-hero-btn', 'hero.buttonText');
  bindInput('f-footer-copyright', 'footer.copyright');
  bindInput('f-menu-title', 'menu.title');
  bindInput('f-menu-subtitle', 'menu.subtitle');
  bindInput('f-reviews-title', 'reviews.title');
  bindInput('f-reviews-subtitle', 'reviews.subtitle');
  bindInput('f-reviews-btn', 'reviews.buttonText');

  var heroRow = document.getElementById('hero-image-row');
  heroRow.innerHTML = '';
  createImageField(heroRow, { path: 'hero.image', label: 'Фото главного экрана' });

  var logosRow = document.getElementById('logos-row');
  logosRow.innerHTML = '';
  createImageField(logosRow, { path: 'header.logo', label: 'Логотип в шапке' });
  createImageField(logosRow, { path: 'footer.logo', label: 'Логотип в футере' });

  renderCategoriesList();
  renderReviewsList();
}

function bindInput(id, path) {
  var el = document.getElementById(id);
  if (!el) return;
  var value = getPath(state.content, path);
  el.value = typeof value === 'string' ? value : '';
  el.addEventListener('input', function () {
    setPath(state.content, path, el.value);
  });
}

/* --- Image upload (compression + API) --- */

function compressImage(file) {
  return new Promise(function (resolve, reject) {
    if (!file.type || file.type.indexOf('image/') !== 0) {
      reject(new Error('Выберите файл изображения'));
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var maxDim = 1600;
        var w = img.width;
        var h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }

        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        function tryQuality(q) {
          canvas.toBlob(function (blob) {
            if (!blob) { reject(new Error('Не удалось обработать изображение')); return; }
            if (blob.size > 1.5 * 1024 * 1024 && q > 0.4) {
              tryQuality(q - 0.15);
              return;
            }
            var blobReader = new FileReader();
            blobReader.onload = function () {
              var base64 = String(blobReader.result).split(',')[1];
              resolve({ dataBase64: base64, ext: 'jpg' });
            };
            blobReader.onerror = function () { reject(new Error('Не удалось обработать изображение')); };
            blobReader.readAsDataURL(blob);
          }, 'image/jpeg', q);
        }

        tryQuality(0.85);
      };
      img.onerror = function () { reject(new Error('Не удалось прочитать изображение')); };
      img.src = String(reader.result);
    };
    reader.onerror = function () { reject(new Error('Не удалось прочитать файл')); };
    reader.readAsDataURL(file);
  });
}

function uploadImageFile(file, filenameBase) {
  return compressImage(file).then(function (result) {
    var filename = (filenameBase || 'photo').replace(/[^a-zA-Z0-9-_]+/g, '-') + '.' + result.ext;
    return apiPost('/api/upload', { filename: filename, dataBase64: result.dataBase64 }, true);
  }).then(function (data) { return data.path; });
}

/* --- Generic single-image field (hero, logos) --- */

function createImageField(container, opts) {
  var wrap = document.createElement('div');
  wrap.className = 'image-field';

  var labelEl = document.createElement('span');
  labelEl.className = 'image-field__label';
  labelEl.textContent = opts.label;

  var previewWrap = document.createElement('div');
  previewWrap.className = 'image-field__preview-wrap';

  var currentVal = getPath(state.content, opts.path);
  var img = null;
  if (currentVal) {
    img = document.createElement('img');
    img.src = toAbsolute(currentVal);
    previewWrap.appendChild(img);
  } else {
    previewWrap.classList.add('is-empty');
  }

  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';

  var actions = document.createElement('div');
  actions.className = 'image-field__actions';

  var uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.className = 'btn btn-outline btn-sm';
  uploadBtn.textContent = currentVal ? 'Заменить' : 'Загрузить';
  uploadBtn.addEventListener('click', function () { fileInput.click(); });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0];
    if (!file) return;
    previewWrap.classList.add('is-uploading');

    uploadImageFile(file, opts.path.replace(/\./g, '-')).then(function (path) {
      setPath(state.content, opts.path, path);
      previewWrap.classList.remove('is-uploading', 'is-empty');
      if (!img) {
        img = document.createElement('img');
        previewWrap.appendChild(img);
      }
      img.src = toAbsolute(path);
      uploadBtn.textContent = 'Заменить';
      showToast('Фото загружено. Не забудьте сохранить изменения.', 'success');
    }).catch(function (err) {
      previewWrap.classList.remove('is-uploading');
      showToast(err.message || 'Ошибка загрузки фото', 'error');
    }).finally(function () {
      fileInput.value = '';
    });
  });

  actions.appendChild(uploadBtn);
  wrap.appendChild(labelEl);
  wrap.appendChild(previewWrap);
  wrap.appendChild(actions);
  wrap.appendChild(fileInput);
  container.appendChild(wrap);
}

/* --- Menu categories management --- */

function renderCategoriesList() {
  var listEl = document.getElementById('categoriesList');
  listEl.innerHTML = '';
  var categories = state.content.menu.categories;

  categories.forEach(function (cat, catIdx) {
    var card = document.createElement('div');
    card.className = 'category-card';

    var head = document.createElement('div');
    head.className = 'category-card__head';

    var titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = cat.title;
    titleInput.placeholder = 'Название категории';
    titleInput.addEventListener('input', function () { cat.title = titleInput.value; });

    var orderWrap = document.createElement('div');
    orderWrap.className = 'category-card__order';

    var upBtn = createIconBtn('↑', 'Переместить выше', function () {
      if (catIdx === 0) return;
      categories.splice(catIdx, 1);
      categories.splice(catIdx - 1, 0, cat);
      renderCategoriesList();
    });
    upBtn.disabled = catIdx === 0;

    var downBtn = createIconBtn('↓', 'Переместить ниже', function () {
      if (catIdx === categories.length - 1) return;
      categories.splice(catIdx, 1);
      categories.splice(catIdx + 1, 0, cat);
      renderCategoriesList();
    });
    downBtn.disabled = catIdx === categories.length - 1;

    var delBtn = createIconBtn('✕', 'Удалить категорию', function () {
      if (!confirm('Удалить категорию «' + cat.title + '» вместе со всеми фото?')) return;
      categories.splice(catIdx, 1);
      renderCategoriesList();
    }, true);

    orderWrap.appendChild(upBtn);
    orderWrap.appendChild(downBtn);
    orderWrap.appendChild(delBtn);

    head.appendChild(titleInput);
    head.appendChild(orderWrap);

    var grid = document.createElement('div');
    grid.className = 'items-grid';

    (cat.items || []).forEach(function (item) {
      grid.appendChild(createMenuItemCard(cat, item));
    });

    var addCard = document.createElement('button');
    addCard.type = 'button';
    addCard.className = 'item-card item-card--add';
    addCard.textContent = '+ Добавить блюдо';
    addCard.addEventListener('click', function () {
      cat.items = cat.items || [];
      cat.items.push({ image: '', alt: cat.title });
      renderCategoriesList();
    });
    grid.appendChild(addCard);

    card.appendChild(head);
    card.appendChild(grid);
    listEl.appendChild(card);
  });

  if (!categories.length) {
    var empty = document.createElement('p');
    empty.className = 'hint-text';
    empty.textContent = 'Категорий пока нет. Добавьте первую с помощью кнопки выше.';
    listEl.appendChild(empty);
  }
}

function createMenuItemCard(cat, item) {
  var card = document.createElement('div');
  card.className = 'item-card';

  var preview = document.createElement('div');
  preview.className = 'item-card__preview' + (item.image ? '' : ' is-empty');

  var img = null;
  if (item.image) {
    img = document.createElement('img');
    img.src = toAbsolute(item.image);
    preview.appendChild(img);
  }

  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';

  preview.addEventListener('click', function () { fileInput.click(); });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0];
    if (!file) return;
    preview.classList.add('is-uploading');

    uploadImageFile(file, (cat.id || 'item') + '-' + Date.now()).then(function (path) {
      item.image = path;
      preview.classList.remove('is-uploading', 'is-empty');
      if (!img) {
        img = document.createElement('img');
        preview.insertBefore(img, preview.firstChild);
      }
      img.src = toAbsolute(path);
      showToast('Фото загружено. Не забудьте сохранить изменения.', 'success');
    }).catch(function (err) {
      preview.classList.remove('is-uploading');
      showToast(err.message || 'Ошибка загрузки фото', 'error');
    }).finally(function () {
      fileInput.value = '';
    });
  });

  var altInput = document.createElement('input');
  altInput.type = 'text';
  altInput.value = item.alt || '';
  altInput.placeholder = 'Название блюда';
  altInput.addEventListener('input', function () { item.alt = altInput.value; });

  var removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'item-card__remove';
  removeBtn.textContent = 'Удалить';
  removeBtn.addEventListener('click', function () {
    var idx = cat.items.indexOf(item);
    if (idx > -1) cat.items.splice(idx, 1);
    renderCategoriesList();
  });

  card.appendChild(preview);
  card.appendChild(altInput);
  card.appendChild(removeBtn);
  card.appendChild(fileInput);
  return card;
}

function createIconBtn(symbol, title, onClick, danger) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'icon-btn' + (danger ? ' icon-btn--danger' : '');
  btn.textContent = symbol;
  btn.title = title;
  btn.addEventListener('click', onClick);
  return btn;
}

function onAddCategory() {
  var title = prompt('Название новой категории меню:');
  if (!title) return;
  var id = slugify(title) + '-' + Date.now().toString(36);
  state.content.menu.categories.push({ id: id, title: title, items: [] });
  renderCategoriesList();
}

function slugify(text) {
  var map = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  return text
    .toLowerCase()
    .split('')
    .map(function (ch) { return map[ch] !== undefined ? map[ch] : ch; })
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category';
}

/* --- Reviews management --- */

function renderReviewsList() {
  var listEl = document.getElementById('reviewsList');
  listEl.innerHTML = '';
  var images = state.content.reviews.images;

  images.forEach(function (src, idx) {
    var thumb = document.createElement('div');
    thumb.className = 'review-thumb' + (src ? '' : ' is-empty');

    var img = null;
    if (src) {
      img = document.createElement('img');
      img.src = toAbsolute(src);
      thumb.appendChild(img);
    }

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    thumb.addEventListener('click', function (e) {
      if (e.target.classList.contains('review-thumb__remove')) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files[0];
      if (!file) return;
      thumb.classList.add('is-uploading');

      uploadImageFile(file, 'review-' + (idx + 1) + '-' + Date.now()).then(function (path) {
        images[idx] = path;
        thumb.classList.remove('is-uploading', 'is-empty');
        if (!img) {
          img = document.createElement('img');
          thumb.insertBefore(img, thumb.firstChild);
        }
        img.src = toAbsolute(path);
        showToast('Фото загружено. Не забудьте сохранить изменения.', 'success');
      }).catch(function (err) {
        thumb.classList.remove('is-uploading');
        showToast(err.message || 'Ошибка загрузки фото', 'error');
      }).finally(function () {
        fileInput.value = '';
      });
    });

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'review-thumb__remove';
    removeBtn.textContent = '✕';
    removeBtn.title = 'Удалить';
    removeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      images.splice(idx, 1);
      renderReviewsList();
    });

    thumb.appendChild(fileInput);
    thumb.appendChild(removeBtn);
    listEl.appendChild(thumb);
  });

  if (!images.length) {
    var empty = document.createElement('p');
    empty.className = 'hint-text';
    empty.textContent = 'Отзывов пока нет. Добавьте первый с помощью кнопки выше.';
    listEl.appendChild(empty);
  }
}

function onAddReview() {
  state.content.reviews.images = state.content.reviews.images || [];
  state.content.reviews.images.push('');
  renderReviewsList();
}

/* --- Save --- */

function saveContent(btn) {
  setSaveStatus('Сохранение…');
  btn.disabled = true;

  apiPost('/api/content', state.content, true).then(function () {
    setSaveStatus('Сохранено ✓ (сайт обновится за ~30–60 сек)', 'success');
    showToast('Изменения сохранены. Сайт обновится автоматически в течение минуты.', 'success');
  }).catch(function (err) {
    setSaveStatus('Ошибка сохранения', 'error');
    showToast(err.message || 'Не удалось сохранить изменения', 'error');
    if (err.status === 401) logout();
  }).finally(function () {
    btn.disabled = false;
  });
}

/* --- UI feedback --- */

var toastTimer = null;
function showToast(message, type) {
  var el = document.getElementById('toast');
  el.textContent = message;
  el.className = 'toast' + (type ? ' toast--' + type : '');
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.hidden = true; }, 4500);
}

function setSaveStatus(text, type) {
  var el = document.getElementById('saveStatus');
  el.textContent = text;
  el.className = 'save-status' + (type ? ' save-status--' + type : '');
  setTimeout(function () {
    if (el.textContent === text) el.textContent = '';
  }, 6000);
}
