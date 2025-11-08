// Scroll Effects and Animations
(function() {
    "use strict";

    // Initialize scroll animations
    function initScrollEffects() {
        // Fade-in elements on scroll
        initFadeInOnScroll();
        
        // Slide-in elements from sides
        initSlideInOnScroll();
        
        // Scale-in elements
        initScaleOnScroll();
        
        // Parallax effect for hero section
        initParallax();
        
        // Progress indicator
        initScrollProgress();
        
        // Counter animation for statistics
        initCounterAnimation();
    }

    // Fade-in animation on scroll
    function initFadeInOnScroll() {
        const observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // Optional: unobserve after animation
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe elements with fade-in class
        const fadeElements = document.querySelectorAll('.fade-in');
        fadeElements.forEach(el => observer.observe(el));

        // Also add to common sections
        const commonSections = document.querySelectorAll('.block2, .block3, .block4, .block5, .block6, .block7');
        commonSections.forEach(el => observer.observe(el));
        
        // Observe block4 items specifically
        const block4Items = document.querySelectorAll('.block4__item');
        block4Items.forEach(el => observer.observe(el));
    }

    // Slide-in from left animation
    function initSlideInOnScroll() {
        const observerOptions = {
            threshold: 0.2,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('slide-in--visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const slideElements = document.querySelectorAll('.slide-in-left, .slide-in-right');
        slideElements.forEach(el => observer.observe(el));
    }

    // Scale animation on scroll
    function initScaleOnScroll() {
        const observerOptions = {
            threshold: 0.3,
            rootMargin: '0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scale-in--visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const scaleElements = document.querySelectorAll('.scale-in');
        scaleElements.forEach(el => observer.observe(el));
    }

    // Multi-layer parallax effect
    function initParallax() {
        const parallaxSection = document.querySelector('.parallax-section');
        if (!parallaxSection) return;

        const parallaxElements = document.querySelectorAll('.parallax-layer');
        if (parallaxElements.length === 0) return;

        let ticking = false;
        const isMobile = window.innerWidth < 768;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function updateParallax() {
            if (isMobile || prefersReducedMotion) return;

            const scrollY = window.scrollY;
            const sectionTop = parallaxSection.offsetTop;
            const sectionHeight = parallaxSection.offsetHeight;
            
            // Only apply parallax when section is in view
            if (scrollY + window.innerHeight < sectionTop || scrollY > sectionTop + sectionHeight) {
                ticking = false;
                return;
            }

            parallaxElements.forEach(element => {
                const speed = parseFloat(element.dataset.speed) || 0.5;
                const direction = parseInt(element.dataset.direction) || 1;
                const offsetFromTop = scrollY - sectionTop;
                const yPos = -(offsetFromTop * speed * direction);
                element.style.transform = `translateY(${yPos}px)`;
            });
            
            ticking = false;
        }

        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(updateParallax);
                ticking = true;
            }
        });

        // Handle window resize
        window.addEventListener('resize', function() {
            const newIsMobile = window.innerWidth < 768;
            if (newIsMobile !== isMobile) {
                // Reset transforms on mobile mode change
                parallaxElements.forEach(element => {
                    element.style.transform = '';
                });
            }
        });
    }

    // Scroll progress indicator
    function initScrollProgress() {
        // Create progress bar element
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress';
        progressBar.innerHTML = '<div class="scroll-progress__bar"></div>';
        document.body.appendChild(progressBar);

        window.addEventListener('scroll', function() {
            const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrolled = window.scrollY;
            const progress = (scrolled / windowHeight) * 100;
            
            const bar = document.querySelector('.scroll-progress__bar');
            if (bar) {
                bar.style.width = progress + '%';
            }
        });
    }

    // Counter animation for numbers
    function initCounterAnimation() {
        const counters = document.querySelectorAll('.counter');
        if (counters.length === 0) return;

        const observerOptions = {
            threshold: 0.5
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        counters.forEach(counter => observer.observe(counter));
    }

    function animateCounter(element) {
        const target = parseInt(element.dataset.target || element.textContent);
        const duration = parseInt(element.dataset.duration || 2000);
        const startTime = performance.now();
        const startValue = 0;

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const value = Math.round(startValue + (target - startValue) * easeOut);
            
            // Format numbers with commas for thousands
            if (target >= 1000) {
                element.textContent = value.toLocaleString('en-US');
            } else {
                element.textContent = value;
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };

        requestAnimationFrame(updateCounter);
    }

    // Add stagger delay for multiple elements
    function addStaggerDelay(containerSelector, childSelector, delay = 100) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        const children = container.querySelectorAll(childSelector);
        children.forEach((child, index) => {
            child.style.transitionDelay = `${index * delay}ms`;
        });
    }

    // Apply stagger effect to common sections
    function applyStaggerEffects() {
        addStaggerDelay('.block4__colums', '.block4__item');
        addStaggerDelay('.block3', '.block3__left, .block3__right');
        addStaggerDelay('.case-slider__container', '.case-slide');
    }

    // Initialize on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initScrollEffects();
            applyStaggerEffects();
        });
    } else {
        initScrollEffects();
        applyStaggerEffects();
    }

})();
