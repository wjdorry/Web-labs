/**
 * Theme Switcher Module
 * Handles light/dark theme switching with localStorage persistence
 */

(function() {
    'use strict';

    const THEME_STORAGE_KEY = 'userTheme';
    const DEFAULT_THEME = 'dark'; // Default is dark theme
    
    // Theme configuration
    const themeConfig = {
        dark: {
            name: 'dark',
            images: {
                'block1-bg': {
                    webp: 'img/block1/IMAGE.webp',
                    png: 'img/block1/IMAGE.png'
                },
                'block5-bg': {
                    webp: 'img/block5/bgj.webp',
                    jpg: 'img/block5/bgj.jpg'
                },
                'block7-bg': {
                    webp: 'img/block7/bg.webp',
                    png: 'img/block7/bg.png'
                },
                'block1-men': {
                    webp: 'img/block1/men.webp',
                    png: 'img/block1/men.png'
                },
                'block2-men': {
                    webp: 'img/block2/men.webp',
                    jpg: 'img/block2/men.jpg'
                },
                'block7-image': {
                    webp: 'img/block7/IMAGE.webp',
                    png: 'img/block7/IMAGE.png'
                }
            }
        },
        light: {
            name: 'light',
            images: {
                // For light theme, we'll use the same images but can be changed later
                // If you have light theme images, replace paths here
                'block1-bg': {
                    webp: 'img/block1/IMAGE.webp',
                    png: 'img/block1/IMAGE.png'
                },
                'block5-bg': {
                    webp: 'img/block5/bgj.webp',
                    jpg: 'img/block5/bgj.jpg'
                },
                'block7-bg': {
                    webp: 'img/block7/bg.webp',
                    png: 'img/block7/bg.png'
                },
                'block1-men': {
                    webp: 'img/block1/men.webp',
                    png: 'img/block1/men.png'
                },
                'block2-men': {
                    webp: 'img/block2/men.webp',
                    jpg: 'img/block2/men.jpg'
                },
                'block7-image': {
                    webp: 'img/block7/IMAGE.webp',
                    png: 'img/block7/IMAGE.png'
                }
            }
        }
    };

    /**
     * Get current theme from localStorage or return default
     */
    function getCurrentTheme() {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        return savedTheme || DEFAULT_THEME;
    }

    /**
     * Save theme to localStorage
     */
    function saveTheme(theme) {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    /**
     * Apply theme to the document
     */
    function applyTheme(theme) {
        const html = document.documentElement;
        
        // Remove existing theme classes
        html.classList.remove('theme-light', 'theme-dark');
        
        // Add new theme class
        html.classList.add(`theme-${theme}`);
        
        // Force repaint to ensure styles are applied
        void html.offsetHeight;
        
        // Update images
        updateImages(theme);
        
        // Save theme preference
        saveTheme(theme);
        
        // Update toggle button state
        updateThemeToggle(theme);
    }

    /**
     * Update images based on theme
     */
    function updateImages(theme) {
        const config = themeConfig[theme];
        if (!config) return;

        const images = config.images;
        const isWebp = document.documentElement.classList.contains('webp');

        // Update block1 background
        const block1 = document.querySelector('.block1');
        if (block1 && images['block1-bg']) {
            const bgUrl = isWebp && images['block1-bg'].webp ? images['block1-bg'].webp : images['block1-bg'].png;
            block1.style.backgroundImage = `url(${bgUrl})`;
        }

        // Update block5 background (it-bg)
        const block5Bg = document.querySelector('.it-bg');
        if (block5Bg && images['block5-bg']) {
            const bgUrl = isWebp && images['block5-bg'].webp ? images['block5-bg'].webp : (images['block5-bg'].jpg || images['block5-bg'].png);
            block5Bg.style.backgroundImage = `url(${bgUrl})`;
        }

        // Update block7 background
        const block7 = document.querySelector('.block7');
        if (block7 && images['block7-bg']) {
            const bgUrl = isWebp && images['block7-bg'].webp ? images['block7-bg'].webp : images['block7-bg'].png;
            block7.style.backgroundImage = `url(${bgUrl})`;
        }

        // Update block1 men image - find picture element or direct img
        const block1ImgContainer = document.querySelector('.block1__img');
        if (block1ImgContainer && images['block1-men']) {
            const picture = block1ImgContainer.querySelector('picture');
            if (picture) {
                const source = picture.querySelector('source[type="image/webp"]');
                const img = picture.querySelector('img');
                if (source && isWebp) {
                    source.srcset = images['block1-men'].webp;
                }
                if (img) {
                    img.src = images['block1-men'].png;
                }
            } else {
                const img = block1ImgContainer.querySelector('img');
                if (img) {
                    img.src = isWebp && images['block1-men'].webp ? images['block1-men'].webp : images['block1-men'].png;
                }
            }
        }

        // Update block2 men image
        const block2MenContainer = document.querySelector('.block2__men-img');
        if (block2MenContainer && images['block2-men']) {
            const picture = block2MenContainer.querySelector('picture');
            if (picture) {
                const source = picture.querySelector('source[type="image/webp"]');
                const img = picture.querySelector('img');
                if (source && isWebp) {
                    source.srcset = images['block2-men'].webp;
                }
                if (img) {
                    img.src = images['block2-men'].jpg || images['block2-men'].png;
                }
            } else {
                const img = block2MenContainer.querySelector('img');
                if (img) {
                    img.src = isWebp && images['block2-men'].webp ? images['block2-men'].webp : (images['block2-men'].jpg || images['block2-men'].png);
                }
            }
        }

        // Update block7 image
        const block7Center = document.querySelector('.block7-centr');
        if (block7Center && images['block7-image']) {
            const picture = block7Center.querySelector('picture');
            if (picture) {
                const source = picture.querySelector('source[type="image/webp"]');
                const img = picture.querySelector('img');
                if (source && isWebp) {
                    source.srcset = images['block7-image'].webp;
                }
                if (img) {
                    img.src = images['block7-image'].png;
                }
            } else {
                const img = block7Center.querySelector('img');
                if (img) {
                    img.src = isWebp && images['block7-image'].webp ? images['block7-image'].webp : images['block7-image'].png;
                }
            }
        }
    }

    /**
     * Update theme toggle button state
     */
    function updateThemeToggle(theme) {
        const toggleBtn = document.querySelector('[data-theme-toggle]');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
            toggleBtn.setAttribute('data-theme', theme);
            
            // Update icon/text
            const icon = toggleBtn.querySelector('.theme-toggle__icon');
            if (icon) {
                icon.textContent = theme === 'dark' ? '☀️' : '🌙';
            }
        }
    }

    /**
     * Toggle between light and dark theme
     */
    function toggleTheme() {
        const currentTheme = getCurrentTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    /**
     * Reset theme to default
     */
    function resetTheme() {
        localStorage.removeItem(THEME_STORAGE_KEY);
        applyTheme(DEFAULT_THEME);
    }

    /**
     * Initialize theme switcher
     */
    function init() {
        // Apply saved theme on page load immediately
        const savedTheme = getCurrentTheme();
        
        // Apply theme class immediately to prevent flash
        document.documentElement.classList.add(`theme-${savedTheme}`);
        
        // Apply full theme (including images) after a short delay to ensure DOM is ready
        setTimeout(() => {
            applyTheme(savedTheme);
        }, 0);

        // Add event listeners
        const toggleBtn = document.querySelector('[data-theme-toggle]');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }

        const resetBtn = document.querySelector('[data-theme-reset]');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetTheme);
        }
    }

    // Initialize immediately to set theme class before render
    const savedTheme = getCurrentTheme();
    document.documentElement.classList.add(`theme-${savedTheme}`);
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export functions for global access if needed
    window.themeSwitcher = {
        toggle: toggleTheme,
        reset: resetTheme,
        apply: applyTheme,
        getCurrent: getCurrentTheme
    };
})();

