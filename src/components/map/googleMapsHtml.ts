// Google Maps JavaScript API runs inside a WebView instead of a native SDK
// (react-native-maps/@react-native-google-maps) because those need a custom
// EAS dev client and won't load in plain Expo Go. This keeps the whole app
// runnable via `npx expo start`, same trade-off as the Mapbox version this
// file replaces. RN <-> WebView talk over postMessage as small JSON
// envelopes; see MapWebView.tsx for the RN side of the bridge.
export const googleMapsHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <style>
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
    .rm-dot { width: 22px; height: 22px; border-radius: 11px; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4); box-sizing: border-box; }
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
      box-sizing: border-box;
    }
    .rm-pulse { animation: rm-pulse 1.6s ease-in-out infinite; }
    @keyframes rm-pulse {
      0% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.15); }
      100% { transform: translate(-50%, -50%) scale(1); }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map = null;
    let markers = { pickup: null, dropoff: null, driver: null };
    let routeLine = null;
    let selectable = 'none';
    let initialCenter = { lat: 0, lng: 0 };
    let scriptRequested = false;

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

    // google.maps.OverlayView-based custom marker — the core Maps JS API
    // (no "marker" library) doesn't have a plain HTML marker like Mapbox's,
    // so this recreates the same positioning behavior manually.
    function makeOverlay(position, className, innerHtml) {
      function Overlay() {}
      Overlay.prototype = new google.maps.OverlayView();
      const overlay = new Overlay();
      overlay.position = position;
      overlay.div = null;
      overlay.onAdd = function () {
        const div = document.createElement('div');
        div.className = className;
        div.innerHTML = innerHtml;
        div.style.position = 'absolute';
        div.style.transform = 'translate(-50%, -50%)';
        this.div = div;
        this.getPanes().overlayLayer.appendChild(div);
      };
      overlay.draw = function () {
        if (!this.div) return;
        const proj = this.getProjection();
        if (!proj) return;
        const point = proj.fromLatLngToDivPixel(new google.maps.LatLng(this.position.lat, this.position.lng));
        if (point) {
          this.div.style.left = point.x + 'px';
          this.div.style.top = point.y + 'px';
        }
      };
      overlay.onRemove = function () {
        if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
        this.div = null;
      };
      overlay.setPosition = function (pos) {
        this.position = pos;
        this.draw();
      };
      overlay.remove = function () {
        this.setMap(null);
      };
      overlay.setMap(map);
      return overlay;
    }

    function animateMarkerTo(marker, toPos) {
      const from = marker.position;
      const duration = 800;
      const start = performance.now();
      function step(now) {
        const t = Math.min((now - start) / duration, 1);
        marker.setPosition({
          lat: from.lat + (toPos.lat - from.lat) * t,
          lng: from.lng + (toPos.lng - from.lng) * t,
        });
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
        markers.dropoff = makeOverlay({ lat: point.lat, lng: point.lng }, 'rm-dot rm-dot-dropoff', '');
      }
    }

    function setPickupMarker(point) {
      if (markers.pickup) {
        markers.pickup.remove();
        markers.pickup = null;
      }
      if (point) {
        markers.pickup = makeOverlay(
          { lat: point.lat, lng: point.lng },
          'rm-icon rm-pulse',
          personIcon(point.gender)
        );
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
        animateMarkerTo(markers.driver, { lat: point.lat, lng: point.lng });
        return;
      }
      markers.driver = makeOverlay(
        { lat: point.lat, lng: point.lng },
        'rm-icon rm-pulse',
        vehicleIcon(point.vehicleType)
      );
    }

    function setRoute(coords) {
      if (routeLine) {
        routeLine.setMap(null);
        routeLine = null;
      }
      if (coords && coords.length > 1) {
        routeLine = new google.maps.Polyline({
          path: coords.map(function (c) { return { lat: c.lat, lng: c.lng }; }),
          map: map,
          strokeColor: '#1A73E8',
          strokeWeight: 4,
          strokeOpacity: 0.85,
        });
      }
    }

    function loadGoogleMaps(key) {
      if (scriptRequested) return;
      scriptRequested = true;
      window.__initGoogleMap = function () {
        map = new google.maps.Map(document.getElementById('map'), {
          center: initialCenter,
          zoom: 14,
          disableDefaultUI: true,
          clickableIcons: false,
        });
        map.addListener('click', function (e) {
          if (selectable === 'none') return;
          post({ type: 'mapClick', lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
        post({ type: 'ready' });
      };
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&callback=__initGoogleMap';
      script.async = true;
      document.head.appendChild(script);
    }

    function handleMessage(raw) {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch (e) {
        return;
      }

      if (msg.type === 'init') {
        initialCenter = { lat: msg.center.lat, lng: msg.center.lng };
        loadGoogleMaps(msg.token);
        return;
      }

      if (!map) return;

      if (msg.type === 'setMarkers') {
        setPickupMarker(msg.pickup);
        setDropoffMarker(msg.dropoff);
        setDriverMarker(msg.driver);
        setRoute(msg.route);
        return;
      }

      if (msg.type === 'setSelectable') {
        selectable = msg.mode;
        return;
      }

      if (msg.type === 'recenter') {
        map.panTo({ lat: msg.point.lat, lng: msg.point.lng });
        if (msg.zoom) map.setZoom(msg.zoom);
        return;
      }
    }

    document.addEventListener('message', (e) => handleMessage(e.data));
    window.addEventListener('message', (e) => handleMessage(e.data));
  </script>
</body>
</html>
`;
