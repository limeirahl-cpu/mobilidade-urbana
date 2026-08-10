import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import WebView from "react-native-webview";

import { mapboxMapHtml } from "./mapboxMapHtml";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PickupPoint extends LatLng {
  gender?: "male" | "female" | null;
}

export interface DriverPoint extends LatLng {
  vehicleType?: "car" | "moto" | null;
}

export type SelectableTarget = "pickup" | "dropoff" | "none";

interface MapWebViewProps {
  initialCenter: LatLng;
  pickup?: PickupPoint | null;
  dropoff?: LatLng | null;
  driverLocation?: DriverPoint | null;
  selectable?: SelectableTarget;
  onSelectLocation?: (point: LatLng) => void;
}

export function MapWebView({
  initialCenter,
  pickup,
  dropoff,
  driverLocation,
  selectable = "none",
  onSelectLocation,
}: MapWebViewProps) {
  const webviewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  function send(payload: unknown) {
    webviewRef.current?.postMessage(JSON.stringify(payload));
  }

  function handleLoadEnd() {
    send({ type: "init", token: MAPBOX_TOKEN, center: initialCenter });
  }

  function handleMessage(event: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "ready") {
        setReady(true);
      } else if (msg.type === "mapClick" && onSelectLocation) {
        onSelectLocation({ lat: msg.lat, lng: msg.lng });
      }
    } catch {
      // ignore malformed bridge messages
    }
  }

  useEffect(() => {
    if (!ready) return;
    send({ type: "setMarkers", pickup: pickup ?? null, dropoff: dropoff ?? null, driver: driverLocation ?? null });
  }, [ready, pickup, dropoff, driverLocation]);

  useEffect(() => {
    if (!ready) return;
    send({ type: "setSelectable", mode: selectable });
  }, [ready, selectable]);

  if (!MAPBOX_TOKEN) {
    return <View style={styles.missingToken} />;
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: mapboxMapHtml }}
        onLoadEnd={handleLoadEnd}
        onMessage={handleMessage}
        javaScriptEnabled
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  missingToken: { flex: 1, backgroundColor: "#eee" },
});
