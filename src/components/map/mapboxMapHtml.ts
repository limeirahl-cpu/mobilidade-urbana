// Mapbox GL JS runs inside a WebView instead of the native @rnmapbox/maps
// SDK because that SDK needs a custom EAS dev client and won't load in
// plain Expo Go. This keeps the whole app runnable via `npx expo start`.
// RN <-> WebView talk over postMessage as small JSON envelopes; see
// MapWebView.tsx for the RN side of the bridge.
export const mapboxMapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css" rel="stylesheet" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.js"></script>
  <style>
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
    .rm-dot { width: 22px; height: 22px; border-radius: 11px; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
    .rm-dot-dropoff { background: #dc2626; }
    .rm-icon {
      width: 34px;
      height: 34px;
      border-radius: 17px;
      background: #fff;
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      line-height: 1;
    }
    .rm-pulse { animation: rm-pulse 1.6s ease-in-out infinite; }
    @keyframes rm-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map = null;
    let markers = { pickup: null, dropoff: null, driver: null };
    let selectable = 'none';

    function post(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    function personIcon(gender) {
      if (gender === 'male') return '\u{1F468}';
      if (gender === 'female') return '\u{1F469}';
      return '\u{1F9D1}';
    }

    function vehicleIcon(vehicleType) {
      return vehicleType === 'moto' ? '\u{1F3CD}\u{FE0F}' : '\u{1F697}';
    }

    function makeDropoffEl() {
      const el = document.createElement('div');
      el.className = 'rm-dot rm-dot-dropoff';
      return el;
    }

    function makeIconEl(icon) {
      const el = document.createElement('div');
      el.className = 'rm-icon rm-pulse';
      el.textContent = icon;
      return el;
    }

    function animateMarkerTo(marker, toLngLat) {
      const from = marker.getLngLat();
      const fromArr = [from.lng, from.lat];
      const duration = 800;
      const start = performance.now();
      function step(now) {
        const t = Math.min((now - start) / duration, 1);
        const lng = fromArr[0] + (toLngLat[0] - fromArr[0]) * t;
        const lat = fromArr[1] + (toLngLat[1] - fromArr[1]) * t;
        marker.setLngLat([lng, lat]);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function setDropoffMarker(point) {
      if (markers.dropoff) {
        markers.dropoff.remove();
        markers.dropoff = null;
      }
      if (point) {
        markers.dropoff = new mapboxgl.Marker({ element: makeDropoffEl() })
          .setLngLat([point.lng, point.lat])
          .addTo(map);
      }
    }

    function setPickupMarker(point) {
      if (markers.pickup) {
        markers.pickup.remove();
        markers.pickup = null;
      }
      if (point) {
        markers.pickup = new mapboxgl.Marker({ element: makeIconEl(personIcon(point.gender)) })
          .setLngLat([point.lng, point.lat])
          .addTo(map);
      }
    }

    function setDriverMarker(point) {
      if (!point) {
        if (markers.driver) {
          markers.driver.remove();
          markers.driver = null;
        }
        return;
      }
      if (markers.driver) {
        animateMarkerTo(markers.driver, [point.lng, point.lat]);
        return;
      }
      markers.driver = new mapboxgl.Marker({ element: makeIconEl(vehicleIcon(point.vehicleType)) })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
    }

    function handleMessage(raw) {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch (e) {
        return;
      }

      if (msg.type === 'init') {
        mapboxgl.accessToken = msg.token;
        map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [msg.center.lng, msg.center.lat],
          zoom: 14,
        });
        map.on('load', () => post({ type: 'ready' }));
        map.on('click', (e) => {
          if (selectable === 'none') return;
          post({ type: 'mapClick', lat: e.lngLat.lat, lng: e.lngLat.lng });
        });
        return;
      }

      if (!map) return;

      if (msg.type === 'setMarkers') {
        setPickupMarker(msg.pickup);
        setDropoffMarker(msg.dropoff);
        setDriverMarker(msg.driver);
        return;
      }

      if (msg.type === 'setSelectable') {
        selectable = msg.mode;
        return;
      }

      if (msg.type === 'recenter') {
        map.flyTo({ center: [msg.point.lng, msg.point.lat], zoom: msg.zoom || 14 });
        return;
      }
    }

    document.addEventListener('message', (e) => handleMessage(e.data));
    window.addEventListener('message', (e) => handleMessage(e.data));
  </script>
</body>
</html>
`;
