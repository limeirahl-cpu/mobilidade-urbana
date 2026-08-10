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
    .rm-marker { width: 22px; height: 22px; border-radius: 11px; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
    .rm-marker-pickup { background: #16a34a; }
    .rm-marker-dropoff { background: #dc2626; }
    .rm-marker-driver { background: #2563eb; }
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

    function makeMarkerEl(kind) {
      const el = document.createElement('div');
      el.className = 'rm-marker rm-marker-' + kind;
      return el;
    }

    function setMarker(kind, point) {
      if (markers[kind]) {
        markers[kind].remove();
        markers[kind] = null;
      }
      if (point) {
        markers[kind] = new mapboxgl.Marker({ element: makeMarkerEl(kind) })
          .setLngLat([point.lng, point.lat])
          .addTo(map);
      }
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
        setMarker('pickup', msg.pickup);
        setMarker('dropoff', msg.dropoff);
        setMarker('driver', msg.driver);
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
