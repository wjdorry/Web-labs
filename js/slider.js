(function () {
    const slider = document.querySelector('[data-slider]');
    if (!slider) {
        return;
    }

    const slides = Array.from(slider.querySelectorAll('[data-slide]'));
    if (!slides.length) {
        return;
    }

    const prevButton = slider.querySelector('[data-slider-prev]');
    const nextButton = slider.querySelector('[data-slider-next]');
    const dotsContainer = slider.querySelector('[data-slider-dots]');
    const statusCurrent = slider.querySelector('[data-slider-current]');
    const statusTotal = slider.querySelector('[data-slider-total]');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const autoPlayEnabled = slider.dataset.auto !== 'false' && !prefersReducedMotion;
    const interval = Number.parseInt(slider.dataset.interval, 10) || 6000;
    const focusableElements = [prevButton, nextButton];
    let activeIndex = slides.findIndex((slide) => slide.classList.contains('is-active'));
    let autoTimer = null;
    let isHovered = false;
    let isFocused = false;

    if (activeIndex < 0) {
        activeIndex = 0;
        slides[0].classList.add('is-active');
        slides[0].setAttribute('aria-hidden', 'false');
    }

    if (!dotsContainer) {
        return;
    }

    if (statusTotal) {
        statusTotal.textContent = String(slides.length).padStart(2, '0');
    }

    const dots = slides.map((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'case-slider__dot';
        dot.setAttribute('aria-label', `Show slide ${index + 1}`);
        dot.dataset.index = String(index);

        dot.addEventListener('click', () => {
            goToSlide(index);
        });

        dotsContainer.appendChild(dot);
        return dot;
    });

    const goToSlide = (nextIndex) => {
        const newIndex = (nextIndex + slides.length) % slides.length;

        if (newIndex === activeIndex) {
            return;
        }

        const previousSlide = slides[activeIndex];
        const nextSlide = slides[newIndex];

        previousSlide.classList.remove('is-active');
        previousSlide.setAttribute('aria-hidden', 'true');

        nextSlide.classList.add('is-active');
        nextSlide.setAttribute('aria-hidden', 'false');

        dots[activeIndex].classList.remove('is-active');
        dots[newIndex].classList.add('is-active');

        activeIndex = newIndex;

        if (statusCurrent) {
            statusCurrent.textContent = String(activeIndex + 1).padStart(2, '0');
        }

        resetTimer();
    };

    const nextSlide = () => {
        goToSlide(activeIndex + 1);
    };

    const prevSlide = () => {
        goToSlide(activeIndex - 1);
    };

    const startTimer = () => {
        if (!autoPlayEnabled || autoTimer) {
            return;
        }

        autoTimer = window.setTimeout(() => {
            nextSlide();
            autoTimer = null;
            startTimer();
        }, interval);
    };

    const stopTimer = () => {
        if (autoTimer) {
            window.clearTimeout(autoTimer);
            autoTimer = null;
        }
    };

    const resetTimer = () => {
        stopTimer();

        if (!isHovered && !isFocused) {
            startTimer();
        }
    };

    prevButton?.addEventListener('click', prevSlide);
    nextButton?.addEventListener('click', nextSlide);

    slider.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            nextSlide();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            prevSlide();
        }
    });

    slider.addEventListener('mouseenter', () => {
        isHovered = true;
        stopTimer();
    });

    slider.addEventListener('mouseleave', () => {
        isHovered = false;
        resetTimer();
    });

    focusableElements.forEach((element) => {
        element?.addEventListener('focusin', () => {
            isFocused = true;
            stopTimer();
        });
        element?.addEventListener('focusout', () => {
            isFocused = false;
            resetTimer();
        });
    });

    dotsContainer.addEventListener('focusin', () => {
        isFocused = true;
        stopTimer();
    });

    dotsContainer.addEventListener('focusout', () => {
        isFocused = false;
        resetTimer();
    });

    dots[activeIndex].classList.add('is-active');
    if (statusCurrent) {
        statusCurrent.textContent = String(activeIndex + 1).padStart(2, '0');
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopTimer();
        } else {
            resetTimer();
        }
    });

    startTimer();
})();
