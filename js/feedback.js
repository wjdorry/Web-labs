import { API_BASE, getCurrentUser, onSessionChange } from './session.js';

const ENDPOINTS = {
  services: `${API_BASE}/services`,
  orders: `${API_BASE}/orders`,
  feedback: `${API_BASE}/feedback`
};

const MIN_REVIEW_LENGTH = 60;

const state = {
  user: getCurrentUser(),
  services: [],
  purchasedServiceIds: new Set(),
  isSubmitting: false
};

const elements = {
  status: document.getElementById('feedback-status'),
  form: document.getElementById('feedback-form'),
  serviceSelect: document.getElementById('feedback-service'),
  ratingInput: document.getElementById('feedback-rating'),
  commentInput: document.getElementById('feedback-comment'),
  counter: document.getElementById('feedback-counter'),
  submit: document.getElementById('feedback-submit'),
  toast: document.getElementById('feedback-toast')
};

let toastTimer = null;

function showStatus(message, type = 'info') {
  if (!elements.status) return;
  elements.status.textContent = message || '';
  elements.status.dataset.type = type;
}

function showToast(message, type = 'info') {
  if (!elements.toast || !message) return;
  elements.toast.textContent = message;
  elements.toast.setAttribute('data-type', type);
  elements.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove('is-visible');
  }, 2800);
}

function setFieldError(input, message) {
  if (!input) return;
  const field = input.closest('.form-field');
  if (!field) return;
  const error = field.querySelector(`[data-error-for="${input.id}"]`);
  field.classList.toggle('invalid', Boolean(message));
  if (error) error.textContent = message || '';
}

function clearFormErrors() {
  [elements.serviceSelect, elements.ratingInput, elements.commentInput].forEach((input) => setFieldError(input, ''));
}

function disableForm(message) {
  elements.form?.setAttribute('data-disabled', 'true');
  elements.serviceSelect && (elements.serviceSelect.disabled = true);
  elements.submit && (elements.submit.disabled = true);
  showStatus(message, 'error');
}

function updateCounter() {
  if (!elements.counter || !elements.commentInput) return;
  const length = elements.commentInput.value.trim().length;
  const remaining = Math.max(0, MIN_REVIEW_LENGTH - length);
  elements.counter.textContent = remaining > 0
    ? `Enter at least ${remaining} more characters`
    : `Ready to send (${length} characters)`;
}

function updateSubmitState() {
  if (!elements.submit) return;
  const hasUser = Boolean(state.user);
  const selectedService = elements.serviceSelect?.value || '';
  const ratingValue = Number(elements.ratingInput?.value || 0);
  const commentLength = elements.commentInput?.value.trim().length || 0;
  const ready =
    hasUser &&
    state.purchasedServiceIds.has(selectedService) &&
    ratingValue >= 1 &&
    ratingValue <= 5 &&
    commentLength >= MIN_REVIEW_LENGTH &&
    !state.isSubmitting &&
    state.user.role !== 'administrator';
  elements.submit.disabled = !ready;
}

function populateServiceOptions() {
  if (!elements.serviceSelect) return;
  elements.serviceSelect.innerHTML = '<option value="">Select a purchased service</option>';
  const fragment = document.createDocumentFragment();
  state.services
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
    .forEach((service) => {
      const option = document.createElement('option');
      option.value = String(service.id);
      option.textContent = `${service.title} — ${service.category}`;
      if (!state.purchasedServiceIds.has(String(service.id))) {
        option.disabled = true;
        option.textContent += ' (not available)';
      }
      fragment.appendChild(option);
    });
  elements.serviceSelect.appendChild(fragment);
  elements.serviceSelect.disabled = state.purchasedServiceIds.size === 0;
}

async function fetchServices() {
  const response = await fetch(ENDPOINTS.services);
  if (!response.ok) throw new Error(`Failed to load services: ${response.status}`);
  const data = await response.json();
  state.services = Array.isArray(data) ? data : [];
}

async function fetchPurchasedServices(userId) {
  const response = await fetch(`${ENDPOINTS.orders}?userId=${encodeURIComponent(userId)}`);
  if (!response.ok) throw new Error(`Failed to load orders: ${response.status}`);
  const orders = await response.json();
  const ids = new Set();
  if (Array.isArray(orders)) {
    orders.forEach((order) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item) => {
          if (item?.serviceId) ids.add(String(item.serviceId));
        });
      }
    });
  }
  state.purchasedServiceIds = ids;
}

function validateService() {
  if (!elements.serviceSelect) return false;
  const value = elements.serviceSelect.value;
  if (!value) {
    setFieldError(elements.serviceSelect, 'Select a service.');
    return false;
  }
  if (!state.purchasedServiceIds.has(value)) {
    setFieldError(elements.serviceSelect, 'You can review only services you purchased.');
    return false;
  }
  setFieldError(elements.serviceSelect, '');
  return true;
}

function validateRating() {
  if (!elements.ratingInput) return false;
  const value = Number(elements.ratingInput.value);
  if (!Number.isFinite(value) || value < 1 || value > 5) {
    setFieldError(elements.ratingInput, 'Use a rating between 1 and 5.');
    return false;
  }
  setFieldError(elements.ratingInput, '');
  return true;
}

function validateComment() {
  if (!elements.commentInput) return false;
  const value = elements.commentInput.value.trim();
  if (value.length < MIN_REVIEW_LENGTH) {
    setFieldError(elements.commentInput, `Write at least ${MIN_REVIEW_LENGTH} characters.`);
    return false;
  }
  setFieldError(elements.commentInput, '');
  return true;
}

async function submitFeedback(event) {
  event.preventDefault();
  if (state.isSubmitting) return;
  if (!state.user) {
    showToast('Sign in to submit a review.', 'error');
    return;
  }
  if (state.user.role === 'administrator') {
    showToast('Administrators cannot submit reviews.', 'error');
    return;
  }

  const validService = validateService();
  const validRating = validateRating();
  const validComment = validateComment();
  if (!validService || !validRating || !validComment) {
    updateSubmitState();
    showToast('Please correct the highlighted fields.', 'info');
    return;
  }

  state.isSubmitting = true;
  updateSubmitState();
  showStatus('Sending review...', 'info');

  const payload = {
    serviceId: elements.serviceSelect.value,
    userId: state.user.id,
    rating: Number(elements.ratingInput.value),
    comment: elements.commentInput.value.trim(),
    createdAt: new Date().toISOString(),
    moderationStatus: 'pending',
    nickname: state.user.nickname || state.user.fullName || state.user.email
  };

  try {
    const response = await fetch(ENDPOINTS.feedback, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Failed to submit feedback: ${response.status}`);
    elements.commentInput.value = '';
    elements.ratingInput.value = '5';
    updateCounter();
    clearFormErrors();
    showToast('Thanks! Your review is awaiting moderation.', 'success');
  } catch (error) {
    console.error(error);
    showToast('Unable to submit review. Please try later.', 'error');
  } finally {
    state.isSubmitting = false;
    updateSubmitState();
    showStatus('Select a purchased service, rate it, and share your experience.', 'info');
  }
}

function updateAccessMessage() {
  if (!state.user) {
    disableForm('Sign in or register to submit a review.');
    return;
  }
  if (state.user.role === 'administrator') {
    disableForm('Administrators are not allowed to submit reviews.');
    return;
  }
  if (state.purchasedServiceIds.size === 0) {
    disableForm('Purchase at least one service before leaving a review.');
    return;
  }
  elements.form?.removeAttribute('data-disabled');
  elements.serviceSelect && (elements.serviceSelect.disabled = false);
  showStatus('Select a purchased service, rate it, and share your experience.', 'success');
}

async function loadFeedbackData() {
  if (!state.user) return;
  try {
    showStatus('Loading your purchases...', 'info');
    await Promise.all([fetchServices(), fetchPurchasedServices(state.user.id)]);
    populateServiceOptions();
    updateAccessMessage();
  } catch (error) {
    console.error(error);
    disableForm('Unable to load data. Make sure the JSON server is running.');
  } finally {
    updateSubmitState();
  }
}

function handleServiceChange() {
  validateService();
  updateSubmitState();
}

function handleRatingChange() {
  validateRating();
  updateSubmitState();
}

function handleCommentInput() {
  updateCounter();
  validateComment();
  updateSubmitState();
}

function setUser(user) {
  state.user = user;
  state.purchasedServiceIds = new Set();
  populateServiceOptions();
  clearFormErrors();
  updateCounter();
  updateSubmitState();
  if (!user) {
    updateAccessMessage();
    return;
  }
  loadFeedbackData();
}

function registerEventListeners() {
  elements.serviceSelect?.addEventListener('change', handleServiceChange);
  elements.ratingInput?.addEventListener('input', handleRatingChange);
  elements.commentInput?.addEventListener('input', handleCommentInput);
  elements.form?.addEventListener('submit', submitFeedback);
}

function initFeedbackPage() {
  updateCounter();
  registerEventListeners();
  setUser(state.user);
  onSessionChange(setUser);
}

initFeedbackPage();
