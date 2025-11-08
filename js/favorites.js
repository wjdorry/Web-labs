const API_BASE = 'http://localhost:3001';
const ENDPOINTS = {
  favorites: `${API_BASE}/favorites`,
  services: `${API_BASE}/services`,
  cart: `${API_BASE}/cart`
};

const elements = {
  status: document.getElementById('fav-status'),
  root: document.getElementById('fav-root'),
  empty: document.getElementById('fav-empty'),
  error: document.getElementById('fav-error'),
  toast: document.getElementById('fav-toast'),
  refresh: document.getElementById('fav-refresh'),
  count: document.getElementById('fav-count')
};

let favorites = [];
let toastTimer = null;
let isInitialLoad = true;

function animateCounter(element, target, current) {
  if (!element) return;
  const duration = 800;
  const startTime = performance.now();
  const start = current;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(start + (target - start) * easeOut);
    
    element.textContent = String(value);
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

function setStatus(message) {
  if (elements.status) elements.status.textContent = message;
}

function showError(message) {
  if (!elements.error) return;
  elements.error.textContent = message || '';
  elements.error.style.display = message ? 'block' : 'none';
}

function showToast(message) {
  if (!elements.toast || !message) return;
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove('is-visible');
  }, 2400);
}

function toggleEmpty(isEmpty) {
  if (!elements.empty) return;
  elements.empty.style.display = isEmpty ? 'block' : 'none';
}

function formatPrice(price, currency = 'USD') {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return 'N/A';
  const formatted = numeric.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${formatted} ${currency}`.trim();
}

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'fav-card';
  card.dataset.id = String(item.id);

  const banner = document.createElement('div');
  banner.className = 'fav-card__banner';
  const img = document.createElement('img');
  img.src = item.image || '';
  img.alt = item.title || 'Service image';
  banner.appendChild(img);

  const body = document.createElement('div');
  body.className = 'fav-card__body';
  const title = document.createElement('div');
  title.className = 'fav-card__title';
  title.textContent = item.title || 'Untitled service';

  const description = document.createElement('div');
  description.className = 'fav-card__desc';
  description.textContent = item.details || item.shortDescription || '';

  const meta = document.createElement('div');
  meta.className = 'fav-card__meta';

  if (item.category) {
    const chip = document.createElement('span');
    chip.className = 'fav-chip';
    chip.textContent = item.category;
    meta.appendChild(chip);
  }

  if (item.rating !== undefined && item.rating !== null) {
    const ratingChip = document.createElement('span');
    ratingChip.className = 'fav-chip';
    ratingChip.textContent = `Rating ${Number(item.rating).toFixed(1)}`;
    meta.appendChild(ratingChip);
  }

  if (item.format) {
    const formatChip = document.createElement('span');
    formatChip.className = 'fav-chip';
    const formatMap = {
      online: 'Online',
      in_person: 'In person',
      hybrid: 'Hybrid'
    };
    formatChip.textContent = formatMap[item.format] || item.format;
    meta.appendChild(formatChip);
  }

  if (item.durationMinutes || item.duration) {
    const durationChip = document.createElement('span');
    durationChip.className = 'fav-chip';
    const value = item.durationMinutes ? `${item.durationMinutes} min` : item.duration;
    durationChip.textContent = `Duration: ${value}`;
    meta.appendChild(durationChip);
  }

  body.appendChild(title);
  body.appendChild(description);
  body.appendChild(meta);

  const footer = document.createElement('div');
  footer.className = 'fav-card__footer';

  const price = document.createElement('div');
  price.className = 'fav-card__price';
  const priceValue = document.createElement('span');
  priceValue.textContent = formatPrice(item.price, item.currency);
  price.appendChild(priceValue);

  const actions = document.createElement('div');
  actions.className = 'fav-card__actions';

  const toCart = document.createElement('button');
  toCart.type = 'button';
  toCart.className = 'fav-card__btn';
  toCart.dataset.action = 'add-to-cart';
  toCart.dataset.id = String(item.id);
  toCart.textContent = 'Add to cart';

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'fav-card__btn';
  remove.dataset.action = 'remove';
  remove.dataset.id = String(item.id);
  remove.textContent = 'Remove';

  actions.appendChild(toCart);
  actions.appendChild(remove);

  footer.appendChild(price);
  footer.appendChild(actions);

  card.appendChild(banner);
  card.appendChild(body);
  card.appendChild(footer);

  return card;
}

function renderFavorites(list) {
  if (!elements.root) return;
  elements.root.innerHTML = '';
  if (!list || !list.length) {
    toggleEmpty(true);
    return;
  }
  toggleEmpty(false);
  const fragment = document.createDocumentFragment();
  list.forEach((item) => fragment.appendChild(createCard(item)));
  elements.root.appendChild(fragment);
}

async function fetchFavorites() {
  setStatus('Loading favorites...');
  showError('');
  try {
    const response = await fetch(ENDPOINTS.favorites);
    if (!response.ok) throw new Error(`Failed to load favorites: ${response.status}`);
    const data = await response.json();
    favorites = Array.isArray(data) ? data : [];
    renderFavorites(favorites);
    const count = favorites.length;
    const currentCount = Number(elements.count?.textContent || 0);
    
    if (elements.count) {
      // Skip animation on initial load
      if (isInitialLoad) {
        elements.count.textContent = String(count);
        isInitialLoad = false;
      } else if (currentCount !== count) {
        animateCounter(elements.count, count, currentCount);
      }
    }
    
    const noun = count === 1 ? 'service' : 'services';
    setStatus(count ? `You have ${count} saved ${noun}.` : 'Your favorites list is empty.');
    if (!count) toggleEmpty(true);
  } catch (error) {
    console.error(error);
    favorites = [];
    renderFavorites(favorites);
    toggleEmpty(true);
    setStatus('Unable to load favorites.');
    showError('Unable to load favorites. Please confirm JSON Server is running and try again.');
  }
}

async function addToCart(item, button) {
  try {
    const existingResponse = await fetch(`${ENDPOINTS.cart}?serviceId=${item.serviceId || item.id}`);
    if (!existingResponse.ok) throw new Error('Unable to read cart data.');
    const existing = await existingResponse.json();
    if (Array.isArray(existing) && existing.length) {
      const entry = existing[0];
      await fetch(`${ENDPOINTS.cart}/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: (entry.quantity || 1) + 1 })
      });
      showToast('Quantity updated in cart.');
    } else {
      await fetch(ENDPOINTS.cart, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: item.serviceId || item.id,
          title: item.title,
          price: item.price,
          currency: item.currency,
          image: item.image,
          quantity: 1
        })
      });
      showToast('Added to cart.');
    }
  } catch (error) {
    console.error(error);
    showToast('Could not update cart.');
  } finally {
    if (button) button.disabled = false;
  }
}

async function removeFromFavorites(id, button) {
  try {
    const response = await fetch(`${ENDPOINTS.favorites}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Failed to remove from favorites: ${response.status}`);
    favorites = favorites.filter((item) => String(item.id) !== String(id));
    renderFavorites(favorites);
    const count = favorites.length;
    const currentCount = Number(elements.count?.textContent || 0);
    
    if (elements.count) {
      if (currentCount !== count) {
        animateCounter(elements.count, count, currentCount);
      } else {
        elements.count.textContent = String(count);
      }
    }
    
    toggleEmpty(!count);
    const noun = count === 1 ? 'service' : 'services';
    setStatus(count ? `You have ${count} saved ${noun}.` : 'Your favorites list is empty.');
    showToast('Removed from favorites.');
  } catch (error) {
    console.error(error);
    showToast('Unable to update favorites.');
  } finally {
    if (button) button.disabled = false;
  }
}

function handleRootClick(event) {
  const button = event.target.closest('button[data-action][data-id]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (!id) return;
  const item = favorites.find((entry) => String(entry.id) === id || String(entry.serviceId) === id);
  if (!item) {
    showToast('Selected favorite could not be found.');
    return;
  }
  button.disabled = true;
  if (action === 'remove') {
    removeFromFavorites(id, button);
  } else if (action === 'add-to-cart') {
    addToCart(item, button);
  } else {
    button.disabled = false;
  }
}

function registerEvents() {
  if (elements.root) {
    elements.root.addEventListener('click', handleRootClick);
  }
  if (elements.refresh) {
    elements.refresh.addEventListener('click', fetchFavorites);
  }
}

function initFavoritesPage() {
  registerEvents();
  fetchFavorites();
}

initFavoritesPage();
