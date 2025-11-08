import { getCurrentUser, onSessionChange, isAdmin } from './session.js';

const adminElements = Array.from(document.querySelectorAll('[data-admin-only]'));

function updateAdminLinks(user) {
  const allowed = isAdmin(user);

  adminElements.forEach((element) => {
    if (allowed) {
      element.hidden = false;
      element.style.display = '';
    } else {
      element.hidden = true;
      element.style.display = 'none';
    }
  });
}

updateAdminLinks(getCurrentUser());
onSessionChange(updateAdminLinks);

const navMenu = document.querySelector('[data-nav-menu]');
const navToggle = document.querySelector('[data-nav-toggle]');
const navOverlay = document.querySelector('[data-nav-overlay]');
const navLinks = navMenu ? Array.from(navMenu.querySelectorAll('a[href]')) : [];
const NAV_DESKTOP_BREAKPOINT = 1024;
let navIsOpen = false;

const isDesktop = () => window.innerWidth > NAV_DESKTOP_BREAKPOINT;

const applyHiddenState = (open) => {
  if (!navMenu) {
    return;
  }

  if (isDesktop()) {
    navMenu.removeAttribute('aria-hidden');
  } else {
    navMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
  }
};

const setNavState = (shouldOpen) => {
  if (!navMenu || !navToggle || !navOverlay) {
    return;
  }

  navIsOpen = shouldOpen;
  navToggle.classList.toggle('is-active', shouldOpen);
  navToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  navMenu.classList.toggle('is-open', shouldOpen);
  navOverlay.classList.toggle('is-visible', shouldOpen);
  navOverlay.toggleAttribute('hidden', !shouldOpen);
  navOverlay.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  document.body.classList.toggle('nav-open', shouldOpen);

  applyHiddenState(shouldOpen);

  if (shouldOpen) {
    const firstLink = navLinks.find((link) => link.offsetParent !== null);
    firstLink?.focus({ preventScroll: true });
  } else {
    navToggle?.focus({ preventScroll: true });
  }
};

const closeNav = () => {
  if (navIsOpen) {
    setNavState(false);
  }
};

const openNav = () => {
  if (!navIsOpen) {
    setNavState(true);
  }
};

navToggle?.addEventListener('click', () => {
  if (navIsOpen) {
    closeNav();
  } else {
    openNav();
  }
});

navOverlay?.addEventListener('click', closeNav);

navLinks.forEach((link) => {
  link.addEventListener('click', closeNav);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeNav();
  }
});

const handleViewportChange = () => {
  if (!navMenu || !navOverlay || !navToggle) {
    return;
  }

  if (isDesktop()) {
    navIsOpen = false;
    navMenu.classList.remove('is-open');
    navOverlay.classList.remove('is-visible');
    navOverlay.setAttribute('hidden', '');
    navOverlay.setAttribute('aria-hidden', 'true');
    navToggle.classList.remove('is-active');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }

  applyHiddenState(navIsOpen);
};

handleViewportChange();
window.addEventListener('resize', handleViewportChange);
window.addEventListener('orientationchange', handleViewportChange);
