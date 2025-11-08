(function () {
  const containerId = 'office-map';
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  const coordinates = [36.1677, -115.1485];

  const initMap = () => {
    if (!window.ymaps || typeof ymaps.Map !== 'function') {
      return;
    }

    const map = new ymaps.Map(containerId, {
      center: coordinates,
      zoom: 15,
      controls: ['zoomControl', 'fullscreenControl']
    });

    map.behaviors.disable('scrollZoom');

    const placemark = new ymaps.Placemark(
      coordinates,
      {
        iconCaption: 'Attorney Law Office',
        balloonContentHeader: 'Attorney Law Office',
        balloonContentBody: '<strong>121 King Street, Las Vegas 90027, USA</strong><br>Mon–Fri 09:00 – 18:00<br>Phone: (011) 9876 54321',
        balloonContentFooter: '<a href="https://yandex.com/maps/?rtext=~36.1677,-115.1485" target="_blank" rel="noopener">Build a route</a>'
      },
      {
        preset: 'islands#goldDotIcon',
        iconColor: '#D1B06B'
      }
    );

    map.geoObjects.add(placemark);
  };

  const waitForYmaps = () => {
    if (window.ymaps && typeof ymaps.ready === 'function') {
      ymaps.ready(initMap);
    } else {
      window.setTimeout(waitForYmaps, 120);
    }
  };

  waitForYmaps();
})();
