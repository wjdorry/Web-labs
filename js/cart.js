const API_BASE = 'http://localhost:3001';
const ENDPOINTS = {
  cart: `${API_BASE}/cart`
};

const state = {
  items: []
};

const elements = {
  status: document.getElementById('cart-status'),
  error: document.getElementById('cart-error'),
  empty: document.getElementById('cart-empty'),
  root: document.getElementById('cart-root'),
  total: document.getElementById('cart-total'),
  count: document.getElementById('cart-count'),
  checkout: document.getElementById('cart-checkout'),
  toast: document.getElementById('cart-toast')
};

let toastTimer = null;

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
  if (elements.checkout) elements.checkout.disabled = isEmpty;
}

function formatPrice(value, currency = 'USD') {
  const num = Number(value);
  if (!Number.isFinite(num)) return 'N/A';
  const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${formatted} ${currency}`.trim();
}

function formatTotals(totals) {
  const entries = Object.entries(totals).filter(([, value]) => Number.isFinite(value));
  if (!entries.length) return '0';
  return entries
    .map(([currency, value]) => `${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`)
    .join(' + ');
}

function createCartItem(item) {
  const article = document.createElement('article');
  article.className = 'cart-item';
  article.dataset.id = String(item.id);

  const banner = document.createElement('div');
  banner.className = 'cart-item__banner';
  const img = document.createElement('img');
  img.src = item.image || '';
  img.alt = item.title || 'Service image';
  banner.appendChild(img);

  const body = document.createElement('div');
  body.className = 'cart-item__body';

  const title = document.createElement('div');
  title.className = 'cart-item__title';
  title.textContent = item.title || 'Untitled service';

  const meta = document.createElement('div');
  meta.className = 'cart-item__meta';
  if (item.serviceId) {
    const chip = document.createElement('span');
    chip.className = 'cart-chip';
    chip.textContent = `ID: ${item.serviceId}`;
    meta.appendChild(chip);
  }

  body.appendChild(title);
  body.appendChild(meta);

  const footer = document.createElement('div');
  footer.className = 'cart-item__footer';

  const priceWrap = document.createElement('div');
  priceWrap.className = 'cart-item__price';
  const priceLabel = document.createElement('span');
  priceLabel.textContent = 'Unit price';
  const priceValue = document.createElement('strong');
  priceValue.textContent = formatPrice(item.price, item.currency);
  priceWrap.appendChild(priceLabel);
  priceWrap.appendChild(priceValue);

  const qtyControls = document.createElement('div');
  qtyControls.className = 'cart-qty';

  const decrement = document.createElement('button');
  decrement.type = 'button';
  decrement.dataset.action = 'decrement';
  decrement.dataset.id = String(item.id);
  decrement.textContent = '-';

  const input = document.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.max = '99';
  input.step = '1';
  input.value = String(item.quantity || 1);
  input.dataset.role = 'qty-input';
  input.dataset.id = String(item.id);

  const increment = document.createElement('button');
  increment.type = 'button';
  increment.dataset.action = 'increment';
  increment.dataset.id = String(item.id);
  increment.textContent = '+';

  qtyControls.appendChild(decrement);
  qtyControls.appendChild(input);
  qtyControls.appendChild(increment);

  const actions = document.createElement('div');
  actions.className = 'cart-item__actions';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'cart-btn';
  remove.dataset.action = 'remove';
  remove.dataset.id = String(item.id);
  remove.textContent = 'Remove';
  actions.appendChild(remove);

  const totalWrap = document.createElement('div');
  totalWrap.className = 'cart-item__price';
  const totalLabel = document.createElement('span');
  totalLabel.textContent = 'Line total';
  const totalValue = document.createElement('strong');
  totalValue.dataset.role = 'line-total';
  totalValue.dataset.id = String(item.id);
  totalWrap.appendChild(totalLabel);
  totalWrap.appendChild(totalValue);

  footer.appendChild(priceWrap);
  footer.appendChild(qtyControls);
  footer.appendChild(totalWrap);
  footer.appendChild(actions);

  article.appendChild(banner);
  article.appendChild(body);
  article.appendChild(footer);

  return article;
}

function computeTotals(items) {
  const totals = {};
  let count = 0;
  items.forEach((item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const price = Number(item.price) || 0;
    const currency = item.currency || 'USD';
    count += qty;
    totals[currency] = (totals[currency] || 0) + price * qty;
  });
  return { totals, count };
}

function updateSummary() {
  const { totals, count } = computeTotals(state.items);
  if (elements.count) elements.count.textContent = String(count);
  if (elements.total) elements.total.textContent = formatTotals(totals);
  const hasItems = state.items.length > 0;
  toggleEmpty(!hasItems);
  if (!hasItems) {
    setStatus('Your cart is empty.');
  } else {
    setStatus(`Cart contains ${state.items.length} items / ${count} units.`);
  }
}

function renderCart(items) {
  if (!elements.root) return;
  elements.root.innerHTML = '';
  if (!items || !items.length) {
    updateSummary();
    return;
  }
  const fragment = document.createDocumentFragment();
  items.forEach((item) => fragment.appendChild(createCartItem(item)));
  elements.root.appendChild(fragment);

  items.forEach((item) => {
    const lineTotalEl = elements.root.querySelector(`[data-role="line-total"][data-id="${item.id}"]`);
    if (lineTotalEl) {
      const lineTotal = (Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1);
      lineTotalEl.textContent = formatPrice(lineTotal, item.currency);
    }
  });

  updateSummary();
}

async function fetchCart() {
  setStatus('Loading cart...');
  showError('');
  try {
    const response = await fetch(ENDPOINTS.cart);
    if (!response.ok) throw new Error(`Failed to load cart: ${response.status}`);
    const data = await response.json();
    state.items = Array.isArray(data)
      ? data.map((item) => ({ ...item, quantity: Math.max(1, Number(item.quantity) || 1) }))
      : [];
    renderCart(state.items);
  } catch (error) {
    console.error(error);
    state.items = [];
    renderCart(state.items);
    showError('Unable to load cart. Please confirm JSON Server is running and try again.');
  }
}

async function updateQuantity(id, quantity) {
  const safeQty = Math.min(99, Math.max(1, Number(quantity) || 1));
  try {
    const response = await fetch(`${ENDPOINTS.cart}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: safeQty })
    });
    if (!response.ok) throw new Error(`Failed to update quantity: ${response.status}`);
    state.items = state.items.map((item) => (String(item.id) === String(id) ? { ...item, quantity: safeQty } : item));
    renderCart(state.items);
    showToast('Quantity updated.');
  } catch (error) {
    console.error(error);
    showToast('Unable to update quantity.');
    await fetchCart();
  }
}

async function removeItem(id) {
  try {
    const response = await fetch(`${ENDPOINTS.cart}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Failed to remove from cart: ${response.status}`);
    state.items = state.items.filter((item) => String(item.id) !== String(id));
    renderCart(state.items);
    showToast('Removed from cart.');
  } catch (error) {
    console.error(error);
    showToast('Unable to update cart.');
  }
}

async function checkout() {
  if (!state.items.length) return;
  if (elements.checkout) {
    elements.checkout.disabled = true;
    elements.checkout.textContent = 'Placing order...';
  }
  setStatus('Processing purchase...');
  try {
    await Promise.all(
      state.items.map((item) =>
        fetch(`${ENDPOINTS.cart}/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      )
    );
    state.items = [];
    renderCart(state.items);
    showToast('Purchase completed successfully!');
    setStatus('Checkout completed. Thank you!');
  } catch (error) {
    console.error(error);
    showToast('Unable to complete checkout.');
    await fetchCart();
  } finally {
    if (elements.checkout) {
      elements.checkout.disabled = state.items.length === 0;
      elements.checkout.textContent = 'Complete purchase';
    }
  }
}

function handleRootClick(event) {
  const button = event.target.closest('button[data-action][data-id]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (!id) return;
  const item = state.items.find((entry) => String(entry.id) === id || String(entry.serviceId) === id);
  if (!item) {
    showToast('Selected item is no longer available.');
    return;
  }
  if (action === 'remove') {
    removeItem(item.id);
  } else if (action === 'increment') {
    updateQuantity(item.id, (Number(item.quantity) || 1) + 1);
  } else if (action === 'decrement') {
    updateQuantity(item.id, (Number(item.quantity) || 1) - 1);
  }
}

function handleQuantityInput(event) {
  const input = event.target.closest('input[data-role="qty-input"][data-id]');
  if (!input) return;
  const id = input.dataset.id;
  if (!id) return;
  const value = Number(input.value);
  if (!Number.isFinite(value)) {
    const item = state.items.find((entry) => String(entry.id) === id || String(entry.serviceId) === id);
    input.value = String(item ? item.quantity : 1);
    return;
  }
  updateQuantity(id, value);
}

function registerEvents() {
  if (elements.root) {
    elements.root.addEventListener('click', handleRootClick);
    elements.root.addEventListener('change', handleQuantityInput);
    elements.root.addEventListener(
      'blur',
      (event) => {
        const input = event.target.closest('input[data-role="qty-input"][data-id]');
        if (!input) return;
        const id = input.dataset.id;
        const item = state.items.find((entry) => String(entry.id) === id || String(entry.serviceId) === id);
        if (item) input.value = String(item.quantity);
      },
      true
    );
  }
  if (elements.checkout) {
    elements.checkout.addEventListener('click', checkout);
  }
}

function initCartPage() {
  registerEvents();
  fetchCart();
}

initCartPage();
