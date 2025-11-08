const header = document.querySelector('.header');

const normalisePath = (path) => {
  if (!path) return '/';
  let output = decodeURI(path)
    .replace(/\\+/g, '/')
    .replace(/\/+$/, '')
    .toLowerCase();
  if (!output) return '/';
  if (output.endsWith('/index.html')) {
    output = output.slice(0, -'/index.html'.length);
  }
  if (!output.startsWith('/')) {
    output = '/' + output;
  }
  return output || '/';
};

const getOffset = () => {
  if (!header) return 0;
  const style = getComputedStyle(header);
  return style.position === 'fixed' ? header.offsetHeight : 0;
};

const scrollToId = (id, shouldUpdateHash = true) => {
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;

  const headerOffset = getOffset();
  const rect = target.getBoundingClientRect();
  const top = window.pageYOffset + rect.top - headerOffset;

  window.scrollTo({ top, behavior: 'smooth' });

  if (shouldUpdateHash) {
    const newUrl = window.location.pathname + window.location.search + '#' + id;
    history.replaceState(null, '', newUrl);
  }
};

const handleLinkClick = (event) => {
  const link = event.target.closest('a');
  if (!link) return;

  const targetId = link.dataset.scrollTarget || (link.hash ? link.hash.substring(1) : '');
  if (!targetId) return;

  let linkUrl;
  try {
    linkUrl = new URL(link.href, window.location.href);
  } catch (_) {
    return;
  }

  const currentPath = normalisePath(window.location.pathname);
  const linkPath = normalisePath(linkUrl.pathname);

  if (linkUrl.origin !== window.location.origin) {
    return;
  }

  if (linkPath !== currentPath) {
    return;
  }

  if (!document.getElementById(targetId)) {
    return;
  }

  event.preventDefault();
  scrollToId(targetId, true);
};

document.addEventListener('click', handleLinkClick, { capture: true });

window.addEventListener('load', () => {
  const initialHash = window.location.hash ? window.location.hash.substring(1) : '';
  if (initialHash && document.getElementById(initialHash)) {
    setTimeout(() => scrollToId(initialHash, false), 60);
  }
});
