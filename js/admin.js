import './modal.js';
import { API_BASE, getCurrentUser, onSessionChange } from './session.js';

const ENDPOINTS = {
  services: `${API_BASE}/services`,
  feedback: `${API_BASE}/feedback`,
  users: `${API_BASE}/users`
};

const state = {
  user: getCurrentUser(),
  services: [],
  users: [],
  selectedServiceId: '',
  isSubmitting: false,
  filters: {
    serviceId: '',
    userId: ''
  }
};

const elements = {
  status: document.getElementById('admin-status'),
  toast: document.getElementById('admin-toast'),
  createForm: document.getElementById('service-create-form'),
  editForm: document.getElementById('service-edit-form'),
  createFields: {
    title: document.getElementById('create-title'),
    category: document.getElementById('create-category'),
    price: document.getElementById('create-price'),
    currency: document.getElementById('create-currency'),
    duration: document.getElementById('create-duration'),
    format: document.getElementById('create-format'),
    audience: document.getElementById('create-audience'),
    image: document.getElementById('create-image'),
    type: document.getElementById('create-type'),
    stock: document.getElementById('create-stock'),
    shortDescription: document.getElementById('create-short'),
    details: document.getElementById('create-details')
  },
  editFields: {
    select: document.getElementById('edit-select'),
    title: document.getElementById('edit-title'),
    category: document.getElementById('edit-category'),
    price: document.getElementById('edit-price'),
    currency: document.getElementById('edit-currency'),
    duration: document.getElementById('edit-duration'),
    format: document.getElementById('edit-format'),
    audience: document.getElementById('edit-audience'),
    image: document.getElementById('edit-image'),
    type: document.getElementById('edit-type'),
    stock: document.getElementById('edit-stock'),
    shortDescription: document.getElementById('edit-short'),
    details: document.getElementById('edit-details')
  },
  createSubmit: document.getElementById('create-submit'),
  editSubmit: document.getElementById('edit-submit'),
  deleteButton: document.getElementById('delete-service'),
  filterService: document.getElementById('filter-service'),
  filterUser: document.getElementById('filter-user'),
  reviewsList: document.getElementById('reviews-list')
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
  }, 3000);
}

function setFieldError(input, message) {
  if (!input) return;
  const field = input.closest('.form-field');
  if (!field) return;
  const error = field.querySelector(`[data-error-for="${input.id}"]`);
  field.classList.toggle('invalid', Boolean(message));
  if (error) error.textContent = message || '';
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function setAdminEnabled(enabled) {
  const forms = [elements.createForm, elements.editForm];
  forms.forEach((form) => {
    if (!form) return;
    Array.from(form.querySelectorAll('input, select, textarea, button')).forEach((control) => {
      control.disabled = !enabled;
    });
  });
  elements.filterService && (elements.filterService.disabled = !enabled);
  elements.filterUser && (elements.filterUser.disabled = !enabled);
  if (!enabled) {
    elements.createSubmit && (elements.createSubmit.disabled = true);
    elements.editSubmit && (elements.editSubmit.disabled = true);
    elements.deleteButton && (elements.deleteButton.disabled = true);
  }
}

function resetCreateForm() {
  elements.createForm?.reset();
  Object.values(elements.createFields).forEach((input) => setFieldError(input, ''));
  elements.createSubmit && (elements.createSubmit.disabled = true);
}

function resetEditForm() {
  elements.editForm?.reset();
  Object.values(elements.editFields).forEach((input) => setFieldError(input, ''));
  elements.editSubmit && (elements.editSubmit.disabled = true);
  elements.deleteButton && (elements.deleteButton.disabled = true);
  state.selectedServiceId = '';
}

function collectServiceData(source) {
  const fields = source === 'create' ? elements.createFields : elements.editFields;
  const errors = {};

  const title = fields.title?.value.trim() || '';
  if (title.length < 3) errors.title = 'Enter a title (at least 3 characters).';

  const category = fields.category?.value.trim() || '';
  if (!category) errors.category = 'Enter a category.';

  const price = Number(fields.price?.value);
  if (!Number.isFinite(price) || price <= 0) errors.price = 'Enter a valid price.';

  const currency = fields.currency?.value || '';
  if (!currency) errors.currency = 'Select currency.';

  const shortDescription = fields.shortDescription?.value.trim() || '';
  if (shortDescription.length < 20) errors.shortDescription = 'Enter a short description (min 20 characters).';

  let durationMinutes = null;
  if (fields.duration?.value) {
    const durationValue = Number(fields.duration.value);
    if (!Number.isFinite(durationValue) || durationValue < 0) {
      errors.duration = 'Enter a valid duration.';
    } else {
      durationMinutes = durationValue;
    }
  }

  Object.entries(errors).forEach(([key, message]) => setFieldError(fields[key], message));
  Object.keys(fields).forEach((key) => {
    if (!(key in errors)) setFieldError(fields[key], '');
  });

  if (Object.keys(errors).length) return null;

  return {
    title,
    category,
    price,
    currency,
    shortDescription,
    details: fields.details?.value.trim() || '',
    durationMinutes,
    format: fields.format?.value || '',
    audience: fields.audience?.value.trim() || '',
    image: fields.image?.value.trim() || '',
    type: fields.type?.value || 'service',
    inStock: fields.stock?.value === 'true',
    rating: 5,
    slug: slugify(title)
  };
}

async function fetchServices() {
  const response = await fetch(ENDPOINTS.services);
  if (!response.ok) throw new Error(`Failed to load services: ${response.status}`);
  const data = await response.json();
  state.services = Array.isArray(data) ? data : [];
}

async function fetchUsers() {
  const response = await fetch(ENDPOINTS.users);
  if (!response.ok) throw new Error(`Failed to load users: ${response.status}`);
  const data = await response.json();
  state.users = Array.isArray(data) ? data : [];
}

async function fetchReviews() {
  const params = new URLSearchParams();
  if (state.filters.serviceId) params.append('serviceId', state.filters.serviceId);
  if (state.filters.userId) params.append('userId', state.filters.userId);
  const query = params.toString();
  const url = query ? `${ENDPOINTS.feedback}?${query}` : ENDPOINTS.feedback;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load reviews: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function populateServiceSelects() {
  const editSelect = elements.editFields.select;
  if (editSelect) {
    const current = editSelect.value;
    editSelect.innerHTML = '<option value="">Select service</option>';
    state.services
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))
      .forEach((service) => {
        const option = document.createElement('option');
        option.value = String(service.id);
        option.textContent = `${service.title} — ${service.category}`;
        editSelect.appendChild(option);
      });
    editSelect.disabled = state.services.length === 0;
    if (current) editSelect.value = current;
  }

  const filterSelect = elements.filterService;
  if (filterSelect) {
    const current = filterSelect.value;
    filterSelect.innerHTML = '<option value="">All services</option>';
    state.services
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))
      .forEach((service) => {
        const option = document.createElement('option');
        option.value = String(service.id);
        option.textContent = service.title;
        filterSelect.appendChild(option);
      });
    if (current) filterSelect.value = current;
  }
}

function populateUserFilter() {
  const filterUser = elements.filterUser;
  if (!filterUser) return;
  const current = filterUser.value;
  filterUser.innerHTML = '<option value="">All users</option>';
  state.users
    .slice()
    .sort((a, b) => (a.fullName || a.nickname || a.email || '').localeCompare(b.fullName || b.nickname || b.email || ''))
    .forEach((user) => {
      const option = document.createElement('option');
      option.value = String(user.id);
      option.textContent = user.fullName || user.nickname || user.email;
      filterUser.appendChild(option);
    });
  if (current) filterUser.value = current;
}

function renderReviews(reviews) {
  if (!elements.reviewsList) return;
  elements.reviewsList.innerHTML = '';
  if (!reviews.length) {
    const placeholder = document.createElement('div');
    placeholder.className = 'empty-placeholder';
    placeholder.textContent = 'No reviews found for the selected filters.';
    elements.reviewsList.appendChild(placeholder);
    return;
  }

  const serviceMap = new Map(state.services.map((service) => [String(service.id), service]));
  const userMap = new Map(state.users.map((user) => [String(user.id), user]));

  reviews.forEach((review) => {
    const card = document.createElement('article');
    card.className = 'review-card';

    const meta = document.createElement('div');
    meta.className = 'review-card__meta';

    const service = serviceMap.get(String(review.serviceId));
    const user = userMap.get(String(review.userId));

    const serviceTag = document.createElement('span');
    serviceTag.textContent = `Service: ${service ? service.title : review.serviceId}`;
    meta.appendChild(serviceTag);

    const userTag = document.createElement('span');
    userTag.textContent = `User: ${user ? (user.fullName || user.nickname || user.email) : review.userId}`;
    meta.appendChild(userTag);

    const ratingTag = document.createElement('span');
    ratingTag.textContent = `Rating: ${review.rating}`;
    meta.appendChild(ratingTag);

    const dateTag = document.createElement('span');
    dateTag.textContent = `Date: ${new Date(review.createdAt).toLocaleString()}`;
    meta.appendChild(dateTag);

    const comment = document.createElement('p');
    comment.className = 'review-card__comment';
    comment.textContent = review.comment;

    const actions = document.createElement('div');
    actions.className = 'review-card__actions';
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-outline';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => handleDeleteReview(review.id));
    actions.appendChild(deleteBtn);

    card.appendChild(meta);
    card.appendChild(comment);
    card.appendChild(actions);
    elements.reviewsList.appendChild(card);
  });
}

async function handleDeleteReview(id) {
  if (!window.confirm('Delete this review?')) return;
  try {
    const response = await fetch(`${ENDPOINTS.feedback}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Failed to delete review: ${response.status}`);
    showToast('Review removed.', 'success');
    await refreshReviews();
  } catch (error) {
    console.error(error);
    showToast('Unable to delete review.', 'error');
  }
}

async function refreshServices() {
  await fetchServices();
  populateServiceSelects();
  populateEditFormSelection();
  updateCreateButtonState();
  updateEditButtonState();
}

async function refreshReviews() {
  try {
    const data = await fetchReviews();
    renderReviews(data);
  } catch (error) {
    console.error(error);
    showToast('Unable to refresh reviews.', 'error');
  }
}

function updateCreateButtonState() {
  if (!elements.createSubmit) return;
  const payload = collectServiceData('create');
  elements.createSubmit.disabled = !payload || state.isSubmitting;
}

function populateEditFormSelection() {
  const select = elements.editFields.select;
  if (!select) return;
  const service = state.services.find((item) => String(item.id) === select.value);
  state.selectedServiceId = select.value;
  Object.entries(elements.editFields).forEach(([key, input]) => {
    if (key === 'select') return;
    setFieldError(input, '');
    if (!service) {
      input && (input.value = '');
    }
  });
  if (!service) {
    elements.editSubmit && (elements.editSubmit.disabled = true);
    elements.deleteButton && (elements.deleteButton.disabled = true);
    return;
  }
  elements.editFields.title.value = service.title || '';
  elements.editFields.category.value = service.category || '';
  elements.editFields.price.value = service.price ?? '';
  elements.editFields.currency.value = service.currency || 'USD';
  elements.editFields.duration.value = service.durationMinutes ?? '';
  elements.editFields.format.value = service.format || '';
  elements.editFields.audience.value = service.audience || '';
  elements.editFields.image.value = service.image || '';
  elements.editFields.type.value = service.type || 'service';
  elements.editFields.stock.value = service.inStock ? 'true' : 'false';
  elements.editFields.shortDescription.value = service.shortDescription || '';
  elements.editFields.details.value = service.details || '';
  elements.deleteButton && (elements.deleteButton.disabled = false);
  updateEditButtonState();
}

function updateEditButtonState() {
  if (!elements.editSubmit) return;
  if (!state.selectedServiceId) {
    elements.editSubmit.disabled = true;
    return;
  }
  const payload = collectServiceData('edit');
  elements.editSubmit.disabled = !payload || state.isSubmitting;
}

async function handleCreateSubmit(event) {
  event.preventDefault();
  if (state.isSubmitting) return;
  const payload = collectServiceData('create');
  if (!payload) {
    updateCreateButtonState();
    return;
  }
  state.isSubmitting = true;
  updateCreateButtonState();
  showStatus('Creating service...', 'info');
  try {
    const response = await fetch(ENDPOINTS.services, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Failed to create service: ${response.status}`);
    showToast('Service added.', 'success');
    resetCreateForm();
    await refreshServices();
  } catch (error) {
    console.error(error);
    showToast('Unable to add service.', 'error');
  } finally {
    state.isSubmitting = false;
    updateCreateButtonState();
    showStatus('Administrator mode enabled.', 'success');
  }
}

async function handleEditSubmit(event) {
  event.preventDefault();
  if (state.isSubmitting || !state.selectedServiceId) return;
  const payload = collectServiceData('edit');
  if (!payload) {
    updateEditButtonState();
    return;
  }
  state.isSubmitting = true;
  updateEditButtonState();
  showStatus('Saving changes...', 'info');
  try {
    const response = await fetch(`${ENDPOINTS.services}/${encodeURIComponent(state.selectedServiceId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Failed to update service: ${response.status}`);
    showToast('Service updated.', 'success');
    await refreshServices();
  } catch (error) {
    console.error(error);
    showToast('Unable to update service.', 'error');
  } finally {
    state.isSubmitting = false;
    updateEditButtonState();
    showStatus('Administrator mode enabled.', 'success');
  }
}

async function handleDeleteService() {
  if (!state.selectedServiceId) return;
  if (!window.confirm('Delete this service?')) return;
  state.isSubmitting = true;
  elements.deleteButton && (elements.deleteButton.disabled = true);
  try {
    const response = await fetch(`${ENDPOINTS.services}/${encodeURIComponent(state.selectedServiceId)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Failed to delete service: ${response.status}`);
    showToast('Service deleted.', 'success');
    resetEditForm();
    await refreshServices();
  } catch (error) {
    console.error(error);
    showToast('Unable to delete service.', 'error');
  } finally {
    state.isSubmitting = false;
    showStatus('Administrator mode enabled.', 'success');
  }
}

async function handleFiltersChange() {
  state.filters.serviceId = elements.filterService?.value || '';
  state.filters.userId = elements.filterUser?.value || '';
  await refreshReviews();
}

function bindCreateFormValidation() {
  Object.values(elements.createFields).forEach((input) => {
    input?.addEventListener('input', updateCreateButtonState);
    input?.addEventListener('change', updateCreateButtonState);
  });
}

function bindEditFormValidation() {
  Object.entries(elements.editFields).forEach(([key, input]) => {
    if (key === 'select') return;
    input?.addEventListener('input', updateEditButtonState);
    input?.addEventListener('change', updateEditButtonState);
  });
}

async function loadAdminData() {
  if (!state.user || state.user.role !== 'administrator') return;
  try {
    showStatus('Loading admin data...', 'info');
    await Promise.all([fetchServices(), fetchUsers()]);
    populateServiceSelects();
    populateUserFilter();
    populateEditFormSelection();
    await refreshReviews();
    showStatus('Administrator mode enabled.', 'success');
  } catch (error) {
    console.error(error);
    showStatus('Unable to load admin data. Check JSON Server.', 'error');
  } finally {
    updateCreateButtonState();
    updateEditButtonState();
  }
}

function setUser(user) {
  state.user = user;
  if (!user) {
    setAdminEnabled(false);
    showStatus('Authorization required. Sign in as administrator.', 'error');
    elements.reviewsList && (elements.reviewsList.innerHTML = '');
    return;
  }
  if (user.role !== 'administrator') {
    setAdminEnabled(false);
    showStatus('Access restricted. Administrator role is required.', 'error');
    elements.reviewsList && (elements.reviewsList.innerHTML = '');
    return;
  }
  setAdminEnabled(true);
  loadAdminData();
}

function registerEventListeners() {
  elements.createForm?.addEventListener('submit', handleCreateSubmit);
  elements.editForm?.addEventListener('submit', handleEditSubmit);
  elements.deleteButton?.addEventListener('click', handleDeleteService);
  elements.editFields.select?.addEventListener('change', () => {
    populateEditFormSelection();
    updateEditButtonState();
  });
  elements.filterService?.addEventListener('change', handleFiltersChange);
  elements.filterUser?.addEventListener('change', handleFiltersChange);
  bindCreateFormValidation();
  bindEditFormValidation();
}

function initAdminPage() {
  registerEventListeners();
  setUser(state.user);
  onSessionChange(setUser);
}

initAdminPage();

