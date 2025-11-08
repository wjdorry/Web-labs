import { openModal } from './modal.js';

const API_BASE = 'http://localhost:3001';
const ENDPOINTS = {
  services: `${API_BASE}/services`,
  favorites: `${API_BASE}/favorites`,
  cart: `${API_BASE}/cart`
};

const SORT_MAP = {
  none: null,
  priceAsc: { field: 'price', order: 'asc' },
  priceDesc: { field: 'price', order: 'desc' },
  titleAsc: { field: 'title', order: 'asc' },
  titleDesc: { field: 'title', order: 'desc' },
  ratingAsc: { field: 'rating', order: 'asc' },
  ratingDesc: { field: 'rating', order: 'desc' },
  durationAsc: { field: 'durationMinutes', order: 'asc' },
  durationDesc: { field: 'durationMinutes', order: 'desc' }
};

const state = {
  search: '',
  sortKey: 'none',
  categories: new Set(),
  priceMin: null,
  priceMax: null,
  ratingMin: null,
  ratingMax: null,
  durationMin: null,
  durationMax: null,
  format: '',
  audience: '',
  inStockOnly: false,
  page: 1,
  limit: 8
};

let totalCount = 0;
let totalPages = 1;
let currentItems = [];
let activeDetailItem = null;
let toastTimer = null;

const elements = {
  status: document.getElementById('c-status'),
  search: document.getElementById('c-search'),
  sort: document.getElementById('c-sort'),
  advancedForm: document.getElementById('c-advanced'),
  priceMin: document.getElementById('price-min'),
  priceMax: document.getElementById('price-max'),
  ratingMin: document.getElementById('rating-min'),
  ratingMax: document.getElementById('rating-max'),
  durationMin: document.getElementById('duration-min'),
  durationMax: document.getElementById('duration-max'),
  format: document.getElementById('format-select'),
  audience: document.getElementById('audience-input'),
  categories: document.getElementById('c-cats'),
  controls: document.querySelector('.c-controls'),
  empty: document.getElementById('c-empty'),
  root: document.getElementById('catalog-root'),
  pagination: document.getElementById('c-pagination'),
  error: document.getElementById('c-error'),
  toast: document.getElementById('c-toast'),
  detailModal: document.getElementById('catalog-detail-modal'),
  detailImage: document.querySelector('[data-detail-image]'),
  detailTitle: document.querySelector('[data-detail-title]'),
  detailShort: document.querySelector('[data-detail-short]'),
  detailDetails: document.querySelector('[data-detail-details]'),
  detailDetailsSection: document.querySelector('[data-detail-details-section]'),
  detailChips: document.querySelector('[data-detail-chips]'),
  detailPrice: document.querySelector('[data-detail-price]'),
  detailStock: document.querySelector('[data-detail-stock]'),
  detailFavorite: document.querySelector('[data-detail-favorite]'),
  detailCart: document.querySelector('[data-detail-cart]')
};

const categoryInputs = new Map();

function debounce(fn, delay = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  const num = Number(normalized.replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function formatPrice(value, currency = 'USD') {
  const num = Number(value);
  if (!Number.isFinite(num)) return 'N/A';
  const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${formatted} ${currency}`.trim();
}

function formatDuration(minutes, fallback) {
  if (minutes && Number.isFinite(Number(minutes))) {
    return `${minutes} min`;
  }
  return fallback ? String(fallback) : '';
}

function translateFormat(value) {
  switch (value) {
    case 'online':
      return 'Online';
    case 'in_person':
      return 'In person';
    case 'hybrid':
      return 'Hybrid';
    default:
      return '';
  }
}

function setStatus(message) {
  if (!elements.status) return;
  elements.status.textContent = message;
}

function setLoading(isLoading) {
  if (elements.root) {
    elements.root.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  }
  if (isLoading) {
    setStatus('Loading catalog...');
  }
}
function clearError() {
  if (!elements.error) return;
  elements.error.textContent = '';
  elements.error.style.display = 'none';
}

function showError(message) {
  if (!elements.error) return;
  elements.error.textContent = message;
  elements.error.style.display = message ? 'block' : 'none';
}

function toggleEmpty(isEmpty) {
  if (!elements.empty) return;
  elements.empty.style.display = isEmpty ? 'block' : 'none';
}

function showToast(message) {
  if (!elements.toast || !message) return;
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove('is-visible');
  }, 2600);
}

function buildQueryParams({ includePaging = true } = {}) {
  const params = new URLSearchParams();
  if (includePaging) {
    params.set('_page', String(state.page));
    params.set('_limit', String(state.limit));
  }

  const search = state.search.trim();
  if (search) params.set('q', search);

  if (state.sortKey && SORT_MAP[state.sortKey]) {
    const sort = SORT_MAP[state.sortKey];
    params.set('_sort', sort.field);
    params.set('_order', sort.order);
  }

  state.categories.forEach((cat) => {
    params.append('category', cat);
  });

  if (state.inStockOnly) params.set('inStock', 'true');
  if (state.priceMin !== null) params.set('price_gte', String(state.priceMin));
  if (state.priceMax !== null) params.set('price_lte', String(state.priceMax));
  if (state.ratingMin !== null) params.set('rating_gte', String(state.ratingMin));
  if (state.ratingMax !== null) params.set('rating_lte', String(state.ratingMax));
  if (state.durationMin !== null) params.set('durationMinutes_gte', String(state.durationMin));
  if (state.durationMax !== null) params.set('durationMinutes_lte', String(state.durationMax));
  if (state.format) params.set('format', state.format);
  if (state.audience) params.set('audience_like', state.audience);

  return params;
}

function countActiveFilters() {
  let count = 0;
  if (state.search.trim()) count += 1;
  if (state.categories.size) count += 1;
  if (state.inStockOnly) count += 1;
  if (state.priceMin !== null) count += 1;
  if (state.priceMax !== null) count += 1;
  if (state.ratingMin !== null) count += 1;
  if (state.ratingMax !== null) count += 1;
  if (state.durationMin !== null) count += 1;
  if (state.durationMax !== null) count += 1;
  if (state.format) count += 1;
  if (state.audience) count += 1;
  return count;
}

function updateStatus(visibleCount) {
  if (!elements.status) return;
  if (totalCount === 0) {
    setStatus('No services found. Try adjusting your filters.');
    return;
  }
  const filters = countActiveFilters();
  const filtersText = filters ? ` | active filters: ${filters}` : '';
  setStatus(`Showing ${visibleCount} of ${totalCount} services (page ${state.page} of ${totalPages})${filtersText}`);
}
function updateControlStates() {
  if (!elements.controls) return;
  const buttons = elements.controls.querySelectorAll('[data-action]');
  buttons.forEach((btn) => btn.classList.remove('is-active'));

  const shouldHighlight = new Map([
    ['inStock', state.inStockOnly],
    ['topRated', state.ratingMin !== null && state.ratingMin >= 4.8],
    ['shortSessions', state.durationMax !== null && state.durationMax <= 60]
  ]);

  buttons.forEach((btn) => {
    const action = btn.dataset.action;
    if (shouldHighlight.get(action)) {
      btn.classList.add('is-active');
    }
  });
}

async function fetchAndRender() {
  if (!elements.root) return;
  setLoading(true);
  clearError();
  try {
    const params = buildQueryParams();
    const response = await fetch(`${ENDPOINTS.services}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to load catalog: ${response.status}`);
    }
    const headerCount = response.headers.get('X-Total-Count');
    const items = await response.json();
    currentItems = Array.isArray(items) ? items : [];
    activeDetailItem = null;

    if (headerCount !== null) {
      const parsedCount = Number(headerCount);
      totalCount = Number.isFinite(parsedCount) ? parsedCount : currentItems.length;
    } else {
      totalCount = currentItems.length;
    }

    totalPages = Math.max(1, Math.ceil(totalCount / state.limit));

    if (!currentItems.length && state.page > 1 && state.page > totalPages) {
      state.page = totalPages;
      await fetchAndRender();
      return;
    }

    renderCatalog(currentItems);
    renderPagination(totalCount);
    toggleEmpty(currentItems.length === 0);
    updateStatus(currentItems.length);
  } catch (error) {
    console.error(error);
    currentItems = [];
    activeDetailItem = null;
    renderCatalog(currentItems);
    renderPagination(0);
    toggleEmpty(true);
    setStatus('Unable to load catalog data.');
    showError('Unable to load catalog data. Please confirm that JSON Server is running and try again.');
  } finally {
    setLoading(false);
  }
}

function createChip(text, extraClass) {
  if (!text) return null;
  const chip = document.createElement('span');
  chip.className = `c-chip${extraClass ? ` ${extraClass}` : ''}`;
  chip.textContent = text;
  return chip;
}

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'c-card';
  card.dataset.id = String(item.id);

  const banner = document.createElement('div');
  banner.className = 'c-card__banner';
  const image = document.createElement('img');
  image.src = item.image || '';
  image.alt = item.title || 'Service image';
  banner.appendChild(image);

  const body = document.createElement('div');
  body.className = 'c-card__body';

  const title = document.createElement('div');
  title.className = 'c-card__title';
  title.textContent = item.title || 'Untitled service';

  const desc = document.createElement('div');
  desc.className = 'c-card__desc';
  desc.textContent = item.shortDescription || item.details || '';

  const meta = document.createElement('div');
  meta.className = 'c-card__meta';

  const categoryChip = createChip(item.category, '');
  const formatChip = createChip(translateFormat(item.format), '');
  const durationChip = createChip(formatDuration(item.durationMinutes, item.duration), '');
  const ratingText = item.rating !== undefined && item.rating !== null ? `Rating ${Number(item.rating).toFixed(1)}` : '';
  const ratingChip = createChip(ratingText, '');
  const stockText = item.inStock ? 'Available' : 'Out of stock';
  const stockChip = createChip(stockText, item.inStock ? '' : 'c-chip--muted');
  const audienceChip = item.audience ? createChip(`Audience: ${item.audience}`, '') : null;

  [categoryChip, formatChip, durationChip, ratingChip, stockChip, audienceChip].forEach((chip) => {
    if (chip) meta.appendChild(chip);
  });

  body.appendChild(title);
  body.appendChild(desc);
  body.appendChild(meta);

  const footer = document.createElement('div');
  footer.className = 'c-card__footer';

  const price = document.createElement('div');
  price.className = 'c-card__price';
  const priceValue = document.createElement('span');
  priceValue.textContent = formatPrice(item.price, item.currency);
  price.appendChild(priceValue);

  const actions = document.createElement('div');
  actions.className = 'c-card__actions';

  const favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.className = 'c-card__button';
  favBtn.dataset.action = 'favorite';
  favBtn.dataset.id = String(item.id);
  favBtn.textContent = 'Add to favorites';

  const cartBtn = document.createElement('button');
  cartBtn.type = 'button';
  cartBtn.className = 'c-card__button';
  cartBtn.dataset.action = 'cart';
  cartBtn.dataset.id = String(item.id);
  cartBtn.textContent = 'Add to cart';

  actions.appendChild(favBtn);
  actions.appendChild(cartBtn);

  footer.appendChild(price);
  footer.appendChild(actions);

  card.appendChild(banner);
  card.appendChild(body);
  card.appendChild(footer);

  return card;
}

function renderCatalog(items) {
  if (!elements.root) return;
  elements.root.innerHTML = '';
  if (!items || !items.length) {
    toggleEmpty(true);
    return;
  }
  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    fragment.appendChild(createCard(item));
  });
  elements.root.appendChild(fragment);
  toggleEmpty(false);
}

function renderPagination(total) {
  if (!elements.pagination) return;
  elements.pagination.innerHTML = '';
  if (total <= state.limit) {
    elements.pagination.style.display = 'none';
    return;
  }
  elements.pagination.style.display = 'flex';

  const totalPageCount = Math.max(1, Math.ceil(total / state.limit));
  const maxVisible = 5;
  let start = Math.max(1, state.page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPageCount, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  const createButton = (label, page, { disabled = false, active = false } = {}) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.dataset.page = String(page);
    if (disabled) btn.disabled = true;
    if (active) btn.classList.add('is-active');
    return btn;
  };

  elements.pagination.appendChild(createButton('<', state.page - 1, { disabled: state.page === 1 }));

  for (let page = start; page <= end; page += 1) {
    elements.pagination.appendChild(createButton(String(page), page, { active: page === state.page }));
  }

  elements.pagination.appendChild(createButton('>', state.page + 1, { disabled: state.page === totalPageCount }));
}

function handlePaginationClick(event) {
  const button = event.target.closest('button[data-page]');
  if (!button) return;
  const page = Number(button.dataset.page);
  if (!Number.isFinite(page) || page === state.page || page < 1) return;
  const totalPageCount = Math.max(1, Math.ceil(totalCount / state.limit));
  if (page > totalPageCount) return;
  state.page = page;
  fetchAndRender();
}

async function populateCategories() {
  if (!elements.categories) return;
  try {
    const response = await fetch(ENDPOINTS.services);
    if (!response.ok) throw new Error(`Failed to load categories: ${response.status}`);
    const items = await response.json();
    const categorySet = new Set();
    items.forEach((item) => {
      if (item && item.category) {
        categorySet.add(item.category);
      }
    });
    renderCategoryFilters([...categorySet].sort((a, b) => a.localeCompare(b, 'ru') || a.localeCompare(b, 'en')));
  } catch (error) {
    console.warn(error);
    renderCategoryFilters([]);
    showToast('Unable to load categories. Please confirm JSON Server is running.');
  }
}

function renderCategoryFilters(categories) {
  if (!elements.categories) return;
  elements.categories.innerHTML = '';
  categoryInputs.clear();
  categories.forEach((category) => {
    const label = document.createElement('label');
    label.className = 'c-cat';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.cat = category;
    checkbox.value = category;

    const text = document.createElement('span');
    text.textContent = category;

    label.appendChild(checkbox);
    label.appendChild(text);

    elements.categories.appendChild(label);
    categoryInputs.set(category, checkbox);
  });
}

function resetCategories() {
  state.categories.clear();
  categoryInputs.forEach((input) => {
    input.checked = false;
  });
}

function handleCategoryChange(event) {
  const checkbox = event.target.closest('input[type="checkbox"][data-cat]');
  if (!checkbox) return;
  const { cat } = checkbox.dataset;
  if (!cat) return;
  if (checkbox.checked) state.categories.add(cat); else state.categories.delete(cat);
  state.page = 1;
  fetchAndRender();
}

function handleControlsClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;

  switch (action) {
    case 'reset':
      resetAll();
      return;
    case 'inStock':
      state.inStockOnly = !state.inStockOnly;
      break;
    case 'topRated':
      if (state.ratingMin !== null && state.ratingMin >= 4.8) {
        state.ratingMin = null;
        if (elements.ratingMin) elements.ratingMin.value = '';
      } else {
        state.ratingMin = 4.8;
        if (elements.ratingMin) elements.ratingMin.value = '4.8';
      }
      break;
    case 'shortSessions':
      if (state.durationMax !== null && state.durationMax <= 60) {
        state.durationMax = null;
        if (elements.durationMax) elements.durationMax.value = '';
      } else {
        state.durationMax = 60;
        if (elements.durationMax) elements.durationMax.value = '60';
      }
      break;
    default:
      return;
  }

  state.page = 1;
  updateControlStates();
  fetchAndRender();
}

function handleAdvancedSubmit(event) {
  event.preventDefault();
  if (!elements.advancedForm) return;

  state.priceMin = parseNumber(elements.priceMin?.value);
  state.priceMax = parseNumber(elements.priceMax?.value);
  state.ratingMin = parseNumber(elements.ratingMin?.value);
  state.ratingMax = parseNumber(elements.ratingMax?.value);
  state.durationMin = parseNumber(elements.durationMin?.value);
  state.durationMax = parseNumber(elements.durationMax?.value);
  state.format = (elements.format?.value || '').trim();
  state.audience = (elements.audience?.value || '').trim();

  state.page = 1;
  updateControlStates();
  fetchAndRender();
}

function handleAdvancedReset() {
  if (elements.advancedForm) elements.advancedForm.reset();
  state.priceMin = null;
  state.priceMax = null;
  state.ratingMin = null;
  state.ratingMax = null;
  state.durationMin = null;
  state.durationMax = null;
  state.format = '';
  state.audience = '';
  updateControlStates();
  state.page = 1;
  fetchAndRender();
}

function resetAll() {
  state.search = '';
  state.sortKey = 'none';
  state.inStockOnly = false;
  state.priceMin = null;
  state.priceMax = null;
  state.ratingMin = null;
  state.ratingMax = null;
  state.durationMin = null;
  state.durationMax = null;
  state.format = '';
  state.audience = '';
  state.page = 1;
  resetCategories();

  if (elements.search) elements.search.value = '';
  if (elements.sort) elements.sort.value = 'none';
  if (elements.advancedForm) elements.advancedForm.reset();

  updateControlStates();
  fetchAndRender();
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Request failed ${response.status}: ${response.statusText}`);
  return response.json();
}

async function addToFavorites(item, button) {
  try {
    const existing = await requestJson(`${ENDPOINTS.favorites}?serviceId=${item.id}`);
    if (Array.isArray(existing) && existing.length) {
      showToast('Already in favorites.');
      return;
    }
    await requestJson(ENDPOINTS.favorites, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: item.id,
        title: item.title,
        price: item.price,
        currency: item.currency,
        image: item.image,
        category: item.category
      })
    });
    showToast('Added to favorites.');
  } catch (error) {
    console.error(error);
    showToast('Could not update favorites.');
  } finally {
    if (button) button.disabled = false;
  }
}

async function addToCart(item, button) {
  try {
    const existing = await requestJson(`${ENDPOINTS.cart}?serviceId=${item.id}`);
    if (Array.isArray(existing) && existing.length) {
      const entry = existing[0];
      await requestJson(`${ENDPOINTS.cart}/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: (entry.quantity || 1) + 1 })
      });
      showToast('Quantity updated in cart.');
      return;
    }
    await requestJson(ENDPOINTS.cart, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: item.id,
        title: item.title,
        price: item.price,
        currency: item.currency,
        image: item.image,
        quantity: 1
      })
    });
    showToast('Added to cart.');
  } catch (error) {
    console.error(error);
    showToast('Could not update cart.');
  } finally {
    if (button) button.disabled = false;
  }
}

function triggerCatalogAction(action, item, button) {
  if (!button) return;
  button.disabled = true;
  if (action === 'favorite') {
    addToFavorites(item, button);
  } else if (action === 'cart') {
    addToCart(item, button);
  } else {
    button.disabled = false;
  }
}

function populateDetailModal(item) {
  if (!elements.detailModal || !item) return;
  activeDetailItem = item;

  if (elements.detailTitle) {
    elements.detailTitle.textContent = item.title || 'Untitled service';
  }

  if (elements.detailImage) {
    elements.detailImage.src = item.image || '';
    elements.detailImage.alt = item.title ? `${item.title} preview` : 'Service image';
  }

  if (elements.detailStock) {
    if (item.inStock === true || item.inStock === false) {
      elements.detailStock.textContent = item.inStock ? 'In stock' : 'Out of stock';
      elements.detailStock.hidden = false;
    } else {
      elements.detailStock.textContent = '';
      elements.detailStock.hidden = true;
    }
  }

  if (elements.detailShort) {
    elements.detailShort.textContent = item.shortDescription || 'Description will appear soon.';
  }

  if (elements.detailDetailsSection && elements.detailDetails) {
    const details = typeof item.details === 'string' ? item.details.trim() : '';
    if (details) {
      const normalizedDetails = details.replace(/\r\n/g, '\n');
      elements.detailDetailsSection.hidden = false;
      elements.detailDetails.innerHTML = '';
      normalizedDetails.split(/\n{2,}/).forEach((block) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = block.trim();
        elements.detailDetails.appendChild(paragraph);
      });
    } else {
      elements.detailDetailsSection.hidden = true;
      elements.detailDetails.innerHTML = '';
    }
  }

  if (elements.detailChips) {
    elements.detailChips.innerHTML = '';
    const chipItems = [
      createChip(item.category, ''),
      createChip(translateFormat(item.format), ''),
      createChip(formatDuration(item.durationMinutes, item.duration), ''),
      createChip(Number.isFinite(Number(item.rating)) ? `Rating ${Number(item.rating).toFixed(1)}` : '', ''),
      createChip(item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : '', ''),
      createChip(item.audience ? `Audience: ${item.audience}` : '', '')
    ].filter(Boolean);
    chipItems.forEach((chip) => elements.detailChips.appendChild(chip));
  }

  if (elements.detailPrice) {
    elements.detailPrice.textContent = formatPrice(item.price, item.currency);
  }

  if (elements.detailFavorite) {
    elements.detailFavorite.dataset.id = String(item.id);
    elements.detailFavorite.disabled = false;
  }

  if (elements.detailCart) {
    elements.detailCart.dataset.id = String(item.id);
    elements.detailCart.disabled = false;
  }
}

function handleCardClick(event) {
  if (event.target.closest('button[data-action]')) return;
  const card = event.target.closest('.c-card');
  if (!card) return;
  const itemId = Number(card.dataset.id);
  if (!Number.isFinite(itemId)) return;
  const item = currentItems.find((entry) => Number(entry.id) === itemId);
  if (!item) {
    showToast('Selected service is no longer available.');
    return;
  }
  populateDetailModal(item);
  openModal('catalog-detail-modal');
}

function handleDetailAction(event) {
  const button = event.currentTarget;
  if (!button) return;
  const action = button.dataset.action;
  const itemId = Number(button.dataset.id);
  if (!Number.isFinite(itemId)) return;
  const item = currentItems.find((entry) => Number(entry.id) === itemId) || activeDetailItem;
  if (!item) {
    showToast('The selected service is no longer available.');
    return;
  }
  triggerCatalogAction(action, item, button);
}

function handleCardActions(event) {
  const button = event.target.closest('button[data-action][data-id]');
  if (!button) return;
  const action = button.dataset.action;
  const itemId = Number(button.dataset.id);
  if (!Number.isFinite(itemId)) return;
  const item = currentItems.find((entry) => Number(entry.id) === itemId);
  if (!item) {
    showToast('Selected service is no longer available.');
    return;
  }

  triggerCatalogAction(action, item, button);
}

function handleSortChange(event) {
  const value = event.target.value;
  state.sortKey = value in SORT_MAP ? value : 'none';
  state.page = 1;
  fetchAndRender();
}

function registerEventHandlers() {
  if (elements.search) {
    const onSearch = debounce((event) => {
      state.search = event.target.value || '';
      state.page = 1;
      fetchAndRender();
    });
    elements.search.addEventListener('input', onSearch);
  }

  if (elements.sort) {
    elements.sort.addEventListener('change', handleSortChange);
  }

  if (elements.categories) {
    elements.categories.addEventListener('change', handleCategoryChange);
  }

  if (elements.controls) {
    elements.controls.addEventListener('click', handleControlsClick);
  }

  if (elements.advancedForm) {
    elements.advancedForm.addEventListener('submit', handleAdvancedSubmit);
    const resetButton = elements.advancedForm.querySelector('button[data-action="advanced-reset"]');
    if (resetButton) {
      resetButton.addEventListener('click', handleAdvancedReset);
    }
  }

  if (elements.pagination) {
    elements.pagination.addEventListener('click', handlePaginationClick);
  }

  if (elements.root) {
    elements.root.addEventListener('click', handleCardActions);
    elements.root.addEventListener('click', handleCardClick);
  }

  if (elements.detailFavorite) {
    elements.detailFavorite.addEventListener('click', handleDetailAction);
  }

  if (elements.detailCart) {
    elements.detailCart.addEventListener('click', handleDetailAction);
  }
}

async function initCatalog() {
  if (!elements.root) return;
  updateControlStates();
  await populateCategories();
  registerEventHandlers();
  fetchAndRender();
}

initCatalog();

























