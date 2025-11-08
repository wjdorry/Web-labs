import { API_BASE, getCurrentUser, onSessionChange } from './session.js';

const ENDPOINTS = {
  cart: `${API_BASE}/cart`,
  orders: `${API_BASE}/orders`
};

const state = {
  items: [],
  user: getCurrentUser(),
  isProcessing: false
};

const elements = {
  status: document.getElementById('cart-status'),
  error: document.getElementById('cart-error'),
  empty: document.getElementById('cart-empty'),
  root: document.getElementById('cart-root'),
  total: document.getElementById('cart-total'),
  count: document.getElementById('cart-count'),
  checkout: document.getElementById('cart-checkout'),
  toast: document.getElementById('cart-toast'),
  userInfo: document.getElementById('cart-user'),
  checkoutNotice: document.getElementById('cart-checkout-note')
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

function getDisplayName(user) {
  if (!user) return '';
  const parts = [];
  if (user.lastName) parts.push(user.lastName);
  if (user.firstName) parts.push(user.firstName);
  if (!parts.length && user.fullName) parts.push(user.fullName);
  if (!parts.length && user.nickname) parts.push(user.nickname);
  if (!parts.length && user.email) parts.push(user.email);
  return parts.join(' ').trim();
}

function updateUserDisplay() {
  if (!elements.userInfo) return;
  elements.userInfo.innerHTML = '';
  if (state.user) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cart-user__details';

    const label = document.createElement('span');
    label.className = 'cart-user__label';
    label.textContent = 'Signed in as:';

    const name = document.createElement('strong');
    name.className = 'cart-user__name';
    name.textContent = getDisplayName(state.user);

    wrapper.appendChild(label);
    wrapper.appendChild(name);

    if (state.user.role) {
      const role = document.createElement('span');
      role.className = 'cart-user__role';
      role.textContent = `Role: ${String(state.user.role).toLowerCase()}`;
      wrapper.appendChild(role);
    }

    elements.userInfo.appendChild(wrapper);
  } else {
    const prompt = document.createElement('div');
    prompt.className = 'cart-user__prompt';

    const text = document.createElement('span');
    text.textContent = 'You are not signed in.';

    const link = document.createElement('a');
    link.href = 'auth.html';
    link.textContent = 'Register or sign in to continue';
    link.className = 'cart-user__link';

    prompt.appendChild(text);
    prompt.appendChild(link);
    elements.userInfo.appendChild(prompt);
  }
}

function updateCheckoutState() {
  const hasItems = state.items.length > 0;
  const hasUser = Boolean(state.user);
  if (elements.checkout) {
    elements.checkout.disabled = !hasItems || !hasUser || state.isProcessing;
  }
  if (elements.checkoutNotice) {
    if (state.isProcessing) {
      elements.checkoutNotice.textContent = 'Please wait while we save your order.';
      elements.checkoutNotice.style.display = 'block';
    } else if (!hasUser) {
      elements.checkoutNotice.textContent = 'Please register or sign in to complete your purchase.';
      elements.checkoutNotice.style.display = 'block';
    } else if (!hasItems) {
      elements.checkoutNotice.textContent = 'Add services to your cart to proceed with checkout.';
      elements.checkoutNotice.style.display = 'block';
    } else {
      elements.checkoutNotice.textContent = '';
      elements.checkoutNotice.style.display = 'none';
    }
  }
}

function setUser(user) {
  state.user = user || null;
  updateUserDisplay();
  updateCheckoutState();
}

function generateOrderNumber(user) {
  const prefix = user && user.id ? String(user.id).toUpperCase() : 'GUEST';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `ORD-${prefix}-${timestamp}-${random}`;
}

function buildOrderPayload(user, items) {
  const { totals, count } = computeTotals(items);
  const currencyKeys = Object.keys(totals);
  const lineItems = items.map((item) => {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Number(item.price) || 0;
    const currency = item.currency || 'USD';
    const serviceRef = item.serviceId !== undefined && item.serviceId !== null ? item.serviceId : item.id;
    const normalizedServiceId = serviceRef !== undefined && serviceRef !== null ? String(serviceRef) : null;
    return {
      serviceId: normalizedServiceId,
      cartItemId: item.id,
      title: item.title,
      quantity,
      unitPrice,
      currency,
      lineTotal: Number((unitPrice * quantity).toFixed(2))
    };
  });

  const totalsByCurrency = currencyKeys.map((currency) => ({
    currency,
    amount: Number((totals[currency] || 0).toFixed(2))
  }));

  const orderNumber = generateOrderNumber(user);
  const payload = {
    orderNumber,
    userId: user.id,
    status: 'completed',
    createdAt: new Date().toISOString(),
    paymentMethod: 'card',
    itemCount: count,
    totalsByCurrency,
    items: lineItems
  };

  if (currencyKeys.length === 1) {
    payload.currency = currencyKeys[0];
    payload.totalAmount = Number((totals[currencyKeys[0]] || 0).toFixed(2));
  } else {
    payload.currency = 'MULTI';
  }

  const customerName = getDisplayName(user);
  if (customerName) payload.customerName = customerName;
  if (user.email) payload.customerEmail = user.email;
  if (user.role) payload.userRole = user.role;

  return payload;
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
  updateCheckoutState();
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
  const activeUser = state.user || getCurrentUser();
  if (!activeUser) {
    showToast('Please sign in to complete checkout.');
    setStatus('Sign in is required before completing a purchase.');
    setUser(null);
    return;
  }
  if (!activeUser.id) {
    showToast('Current user profile is missing an identifier. Please sign out and sign in again.');
    setStatus('Cannot place order: user identifier is missing.');
    return;
  }

  const itemsSnapshot = state.items.map((item) => ({ ...item }));
  state.isProcessing = true;
  updateCheckoutState();
  showError('');
  if (elements.checkout) elements.checkout.textContent = 'Placing order...';
  setStatus('Processing purchase...');

  try {
    const orderPayload = buildOrderPayload(activeUser, itemsSnapshot);
    const orderResponse = await fetch(ENDPOINTS.orders, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    if (!orderResponse.ok) throw new Error(`Failed to create order: ${orderResponse.status}`);
    const orderResult = await orderResponse.json();

    await Promise.all(
      itemsSnapshot.map(async (item) => {
        const response = await fetch(`${ENDPOINTS.cart}/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
        if (!response.ok) {
          throw new Error(`Failed to remove cart item ${item.id}: ${response.status}`);
        }
      })
    );

    state.items = [];
    renderCart(state.items);
    const orderRef = orderResult.orderNumber || orderResult.id || '';
    showToast(orderRef ? `Purchase completed! Order ${orderRef}` : 'Purchase completed successfully!');
    setStatus('Checkout completed. Thank you!');
  } catch (error) {
    console.error(error);
    showError('Unable to complete checkout. Please try again in a moment.');
    showToast('Unable to complete checkout.');
    await fetchCart();
  } finally {
    state.isProcessing = false;
    if (elements.checkout) {
      elements.checkout.textContent = 'Complete purchase';
    }
    updateCheckoutState();
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
  setUser(state.user);
  onSessionChange((user) => setUser(user));
  registerEvents();
  fetchCart();
}

initCartPage();
