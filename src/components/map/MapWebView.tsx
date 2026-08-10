import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import WebView from "react-native-webview";

import { googleMapsHtml } from "./googleMapsHtml";

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

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
  route?: LatLng[] | null;
  selectable?: SelectableTarget;
  onSelectLocation?: (point: LatLng) => void;
}

export function MapWebView({
  initialCenter,
  pickup,
  dropoff,
  driverLocation,
  route,
  selectable = "none",
  onSelectLocation,
}: MapWebViewProps) {
  const webviewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  function send(payload: unknown) {
    webviewRef.current?.postMessage(JSON.stringify(payload));
  }

  function handleLoadEnd() {
    send({ type: "init", token: GOOGLE_MAPS_KEY, center: initialCenter });
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
    send({
      type: "setMarkers",
      pickup: pickup ?? null,
      dropoff: dropoff ?? null,
      driver: driverLocation ?? null,
      route: route ?? null,
    });
  }, [ready, pickup, dropoff, driverLocation, route]);

  useEffect(() => {
    if (!ready) return;
    send({ type: "setSelectable", mode: selectable });
  }, [ready, selectable]);

  if (!GOOGLE_MAPS_KEY) {
    return <View style={styles.missingToken} />;
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: googleMapsHtml }}
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
