const MODAL_SELECTOR = '[data-modal]';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

const modalStack = [];
const focusMemory = new Map();

function getModalElement(id) {
  if (!id) return null;
  return document.getElementById(id);
}

function isFocusable(element) {
  return element && typeof element.focus === 'function';
}

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((node) => {
    if (node.hasAttribute('disabled')) return false;
    if (node.getAttribute('aria-hidden') === 'true') return false;
    return node.offsetParent !== null || node === document.activeElement;
  });
}

function setModalVisibility(modal, visible) {
  if (!modal) return;
  if (visible) {
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    });
  } else {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
      if (!modal.classList.contains('is-open')) {
        modal.setAttribute('hidden', '');
      }
    }, 260);
  }
}

function syncBodyScroll() {
  if (modalStack.length > 0) {
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
  }
}

export function openModal(id, options = {}) {
  const modal = getModalElement(id);
  if (!modal || !modal.matches(MODAL_SELECTOR)) {
    console.warn(`Modal "${id}" not found.`);
    return;
  }
  if (modalStack.some((entry) => entry.modal === modal)) {
    return;
  }

  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  focusMemory.set(modal, previouslyFocused);

  setModalVisibility(modal, true);

  const dialog = modal.querySelector('.modal__dialog');
  const focusables = getFocusableElements(dialog);
  const focusTarget =
    (options && options.focusTarget && isFocusable(options.focusTarget) && options.focusTarget) ||
    focusables[0] ||
    dialog;

  window.setTimeout(() => {
    if (isFocusable(focusTarget)) {
      focusTarget.focus({ preventScroll: true });
    }
  }, 40);

  modalStack.push({ id, modal });
  syncBodyScroll();
}

export function closeModal(id) {
  const modal = getModalElement(id);
  if (!modal || !modal.matches(MODAL_SELECTOR)) {
    return;
  }

  const stackIndex = modalStack.findIndex((entry) => entry.modal === modal);
  if (stackIndex === -1) {
    return;
  }

  modalStack.splice(stackIndex, 1);
  setModalVisibility(modal, false);
  syncBodyScroll();

  const previouslyFocused = focusMemory.get(modal);
  focusMemory.delete(modal);
  if (isFocusable(previouslyFocused)) {
    previouslyFocused.focus({ preventScroll: true });
  }
}

function closeTopModal() {
  const top = modalStack[modalStack.length - 1];
  if (top) {
    closeModal(top.id);
  }
}

function handleDocumentClick(event) {
  const openTrigger = event.target.closest('[data-modal-open]');
  if (openTrigger) {
    const targetId = openTrigger.getAttribute('data-modal-open');
    if (targetId) {
      event.preventDefault();
      openModal(targetId);
    }
    return;
  }

  const closeTrigger = event.target.closest('[data-modal-close]');
  if (closeTrigger) {
    const modal = closeTrigger.closest(MODAL_SELECTOR);
    if (modal?.id) {
      event.preventDefault();
      closeModal(modal.id);
    }
    return;
  }
}

function handleModalBackdropClick(event) {
  const modal = event.currentTarget;
  if (!(modal instanceof HTMLElement)) return;
  const dialog = modal.querySelector('.modal__dialog');
  if (!dialog) return;
  if (!dialog.contains(event.target)) {
    closeModal(modal.id);
  }
}

function handleKeyDown(event) {
  if (!modalStack.length) return;
  const top = modalStack[modalStack.length - 1];
  if (!top) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal(top.id);
    return;
  }

  if (event.key !== 'Tab') return;
  const dialog = top.modal.querySelector('.modal__dialog');
  const focusables = getFocusableElements(dialog);
  if (!focusables.length) {
    event.preventDefault();
    dialog?.focus({ preventScroll: true });
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  } else if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus({ preventScroll: true });
  }
}

function initModals() {
  const modals = Array.from(document.querySelectorAll(MODAL_SELECTOR));
  modals.forEach((modal) => {
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('hidden', '');
    modal.addEventListener('click', handleModalBackdropClick);
  });
}

document.addEventListener('click', handleDocumentClick);
document.addEventListener('keydown', handleKeyDown, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModals, { once: true });
} else {
  initModals();
}

export default {
  open: openModal,
  close: closeModal
};
