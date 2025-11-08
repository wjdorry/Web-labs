(function () {
    const preloader = document.querySelector('[data-preloader]');
    if (!preloader) {
        return;
    }

    const body = document.body;
    let isHidden = false;
    const minimumVisibleTime = 600;
    const startTime = Date.now();

    body.classList.add('is-preloading');

    const hidePreloader = () => {
        if (isHidden) {
            return;
        }
        isHidden = true;

        preloader.classList.add('is-hidden');
        body.classList.remove('is-preloading');

        window.setTimeout(() => {
            preloader.remove();
        }, 700);
    };

    const finalize = () => {
        const elapsed = Date.now() - startTime;

        if (elapsed < minimumVisibleTime) {
            window.setTimeout(hidePreloader, minimumVisibleTime - elapsed);
        } else {
            hidePreloader();
        }
    };

    const fallbackTimer = window.setTimeout(hidePreloader, 6000);

    window.addEventListener(
        'load',
        () => {
            window.clearTimeout(fallbackTimer);
            finalize();
        },
        { once: true }
    );

    window.addEventListener(
        'pageshow',
        (event) => {
            if (event.persisted) {
                window.clearTimeout(fallbackTimer);
                finalize();
            }
        },
        { once: true }
    );
})();
