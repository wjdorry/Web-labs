import { openModal } from './modal.js';

const galleryItems = [
  {
    id: 'business-law',
    title: 'Business Law Strategy',
    image: 'img/catalog/Business Law.png',
    frequency: 220,
    wave: 'triangle'
  },
  {
    id: 'family-law',
    title: 'Family Law Advocacy',
    image: 'img/catalog/Family Law.png',
    frequency: 246,
    wave: 'sine'
  },
  {
    id: 'criminal-defense',
    title: 'Criminal Defense Stories',
    image: 'img/catalog/Criminal Defense.png',
    frequency: 262,
    wave: 'square'
  },
  {
    id: 'estate-planning',
    title: 'Estate Planning Insights',
    image: 'img/catalog/Estate Planning.png',
    frequency: 294,
    wave: 'triangle'
  },
  {
    id: 'immigration-law',
    title: 'Immigration Law Spotlight',
    image: 'img/catalog/Immigration Law.png',
    frequency: 330,
    wave: 'sine'
  },
  {
    id: 'tax-law',
    title: 'Tax Law Advisory',
    image: 'img/catalog/Tax Law Advisory.png',
    frequency: 352,
    wave: 'square'
  },
  {
    id: 'insurance-claims',
    title: 'Insurance Claims Desk',
    image: 'img/catalog/Insurance Claims.png',
    frequency: 392,
    wave: 'triangle'
  },
  {
    id: 'employment-law',
    title: 'Employment Law Rulings',
    image: 'img/catalog/Employment Law.png',
    frequency: 418,
    wave: 'sine'
  },
  {
    id: 'medical-malpractice',
    title: 'Medical Malpractice Brief',
    image: 'img/catalog/Medical Malpractice.png',
    frequency: 444,
    wave: 'square'
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property Dossier',
    image: 'img/catalog/Intellectual Property.png',
    frequency: 476,
    wave: 'triangle'
  },
  {
    id: 'wrongful-death-video',
    title: 'Landmark Case Documentary',
    image: 'img/catalog/Wrongful Death.png',
    frequency: 508,
    wave: 'sine',
    isVideo: true,
    videoSrc: 'media/case-study.mp4'
  }
];

const state = {
  currentIndex: 0,
  isPlaying: false
};

let audioContext = null;
let gainNode = null;
let currentOscillator = null;
let stopTimer = null;

const DEFAULT_VOLUME = 0.7;
const SOUND_DURATION = 0.9;

const stage = document.querySelector('[data-gallery-stage]');
const image = document.querySelector('[data-gallery-image]');
const caption = document.querySelector('[data-gallery-caption]');
const helper = document.querySelector('[data-gallery-helper]');
const indicator = document.querySelector('[data-gallery-indicator]');
const statusText = document.querySelector('[data-gallery-status]');
const volumeSlider = document.querySelector('[data-gallery-volume]');
const triggers = document.querySelectorAll('[data-gallery-trigger]');
const videoButton = document.querySelector('[data-gallery-video]');
const videoModal = document.getElementById('gallery-video-modal');
const videoPlayer = document.getElementById('gallery-video-player');

if (stage && image && caption && indicator && statusText && volumeSlider && videoModal && videoPlayer) {
  initGallery();
}

function initGallery() {
  volumeSlider.value = DEFAULT_VOLUME;
  applyItem(0, { playSound: false });

  triggers.forEach((button) => {
    button.addEventListener('click', () => {
      showRandomItem();
    });
  });

  stage.addEventListener('click', (event) => {
    const currentItem = galleryItems[state.currentIndex];
    if (currentItem.isVideo) {
      event.stopPropagation();
      openVideoModal(currentItem);
    } else {
      showRandomItem();
    }
  });

  if (videoButton) {
    videoButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const currentItem = galleryItems[state.currentIndex];
      if (currentItem.isVideo) {
        openVideoModal(currentItem);
      }
    });
  }

  volumeSlider.addEventListener('input', (event) => {
    const value = Number(event.target.value);
    updateVolume(value);
  });

  const observer = new MutationObserver(() => {
    if (videoModal.hasAttribute('hidden')) {
      resetVideoPlayer();
    }
  });

  observer.observe(videoModal, { attributes: true, attributeFilter: ['hidden'] });

  videoPlayer.addEventListener('error', handleVideoError);
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
    gainNode = audioContext.createGain();
    gainNode.gain.value = DEFAULT_VOLUME;
    gainNode.connect(audioContext.destination);
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function updateVolume(value) {
  ensureAudioContext();
  if (gainNode) {
    gainNode.gain.value = value;
  }
}

function stopSound() {
  if (currentOscillator) {
    try {
      currentOscillator.stop();
    } catch (_) {
      // oscillator might already be stopped
    }
    currentOscillator.disconnect();
    currentOscillator = null;
  }

  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }

  setIndicator(false);
}

function playSoundForItem(item) {
  ensureAudioContext();
  stopSound();

  currentOscillator = audioContext.createOscillator();
  currentOscillator.type = item.wave || 'sine';
  currentOscillator.frequency.value = item.frequency || 220;
  currentOscillator.connect(gainNode);

  setIndicator(true);
  currentOscillator.start();
  const duration = Math.max(0.2, Math.min(SOUND_DURATION, 1.5));
  currentOscillator.stop(audioContext.currentTime + duration);

  currentOscillator.onended = () => {
    stopSound();
  };

  stopTimer = setTimeout(() => {
    stopSound();
  }, duration * 1000 + 80);
}

function setIndicator(isPlaying) {
  state.isPlaying = isPlaying;
  indicator.classList.toggle('is-playing', isPlaying);
  statusText.textContent = isPlaying ? 'Playing' : 'Paused';
}

function getRandomIndex() {
  if (galleryItems.length <= 1) {
    return 0;
  }

  let index = Math.floor(Math.random() * galleryItems.length);

  if (index === state.currentIndex) {
    index = (index + 1) % galleryItems.length;
  }

  return index;
}

function showRandomItem() {
  const index = getRandomIndex();
  applyItem(index, { playSound: true });
}

function applyItem(index, options = { playSound: true }) {
  const item = galleryItems[index];
  state.currentIndex = index;

  image.classList.add('is-hidden');
  setTimeout(() => {
    image.src = item.image;
    image.alt = item.title;
    caption.textContent = item.title;
    image.classList.remove('is-hidden');

    if (item.isVideo) {
      stage.classList.add('is-video');
      videoButton.hidden = false;
      videoButton.dataset.video = item.videoSrc || '';
      if (helper) {
        helper.textContent = 'Tap the image or the play button to launch the local case documentary stored in media/case-study.mp4.';
      }
    } else {
      stage.classList.remove('is-video');
      videoButton.hidden = true;
      videoButton.dataset.video = '';
      if (helper) {
        helper.textContent = 'Tap the canvas or buttons to discover the next case.';
      }
    }

    if (options.playSound) {
      playSoundForItem(item);
    } else {
      setIndicator(false);
    }
  }, 200);
}

function openVideoModal(item) {
  if (!item.videoSrc) {
    return;
  }

  stopSound();
  resetVideoPlayer();
  videoPlayer.src = item.videoSrc;
  videoPlayer.poster = item.image;
  videoPlayer.currentTime = 0;
  openModal('gallery-video-modal');

  const playPromise = videoPlayer.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      // Autoplay might be blocked; user can press play manually.
    });
  }
}

function resetVideoPlayer() {
  videoPlayer.pause();
  videoPlayer.removeAttribute('src');
  videoPlayer.load();
}

function handleVideoError() {
  console.warn('Case study video could not be loaded from media/case-study.mp4');
  if (helper) {
    helper.textContent = 'Case documentary is missing. Place an MP4 file at media/case-study.mp4 and try again.';
  }
}

