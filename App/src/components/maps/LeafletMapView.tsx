import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import {
  WebView,
  type WebViewErrorEvent,
  type WebViewHttpErrorEvent,
  type WebViewMessageEvent,
  type WebViewRenderProcessGoneEvent,
  type WebViewTerminatedEvent,
} from 'react-native-webview';

import { pushCrashDebugLine } from '../../debug/crashDebugBuffer';

const LOG = '[ProMap:WebView]';

export type LeafletMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  /** reverse-geocoded address or coords string shown in popup */
  sub?: string;
  /** 'green' | 'red' | 'orange' | 'gold' | any hex */
  color?: string;
  /** Short label drawn inside the pin bubble: 'S', 'E', '1', '2', … */
  label?: string;
};

export type MapLayer = 'standard' | 'satellite' | 'hybrid';

export type LeafletMapHandle = {
  setData: (
    markers: LeafletMarker[],
    polyline?: { latitude: number; longitude: number }[]
  ) => void;
  fitAll: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setLayer: (layer: MapLayer) => void;
};

type Props = {
  style?: ViewStyle;
  onMarkerPress?: (id: string) => void;
  onReady?: () => void;
};

const COLOR_MAP: Record<string, string> = {
  green: '#22C55E',
  red:   '#EF4444',
  orange: '#F97316',
  gold:  '#FBBF24',
};

function resolveColor(c?: string): string {
  if (!c) return '#F97316';
  return COLOR_MAP[c] ?? c;
}

function finiteLat(n: number): number | null {
  if (!Number.isFinite(n) || n < -90 || n > 90) return null;
  return n;
}

function finiteLng(n: number): number | null {
  if (!Number.isFinite(n) || n < -180 || n > 180) return null;
  return n;
}

// Tile sources — all English labels, no API key required
// standard : CartoDB Voyager  → English street/place names worldwide
// satellite: Esri World Imagery → pure satellite, no labels
// hybrid   : Esri satellite + Esri English reference labels overlay

const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #111; }
    .leaflet-control-attribution { font-size: 8px; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false }).setView([28.6139, 77.209], 5);

  /* CartoDB Voyager: English labels for streets & places worldwide (free, no key) */
  var cartoVoyager = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    { maxZoom: 19, attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd' }
  );
  /* Esri satellite imagery (free, no key) */
  var esriSat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 19, attribution: '© Esri' }
  );
  /* Esri English reference labels — overlaid on satellite for hybrid mode */
  var esriLabels = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 19, attribution: '© Esri', opacity: 1 }
  );

  var tileLayers = { standard: cartoVoyager, satellite: esriSat, hybrid: esriSat };
  cartoVoyager.addTo(map);
  var currentLayer = 'standard';
  var hybridLabelsActive = false;

  var markerLayer = L.layerGroup().addTo(map);
  var polylineLayer = null;
  var allCoords = [];

  function safeLatLng(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    if (!isFinite(lat) || !isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return [lat, lng];
  }

  function fitMapToCoords() {
    try { map.invalidateSize(); } catch (e) {}
    if (allCoords.length === 0) return;
    if (allCoords.length === 1) {
      map.setView(allCoords[0], 15);
      return;
    }
    try {
      var b = L.latLngBounds(allCoords);
      if (!b.isValid()) {
        map.setView(allCoords[0], 15);
        return;
      }
      var ne = b.getNorthEast();
      var sw = b.getSouthWest();
      if (Math.abs(ne.lat - sw.lat) < 1e-8 && Math.abs(ne.lng - sw.lng) < 1e-8) {
        map.setView(allCoords[0], 15);
      } else {
        map.fitBounds(b, { padding: [40, 40], maxZoom: 16 });
      }
    } catch (e) {
      send({ type: 'webError', message: 'fitMapToCoords: ' + String(e && e.message ? e.message : e), stack: String(e && e.stack ? e.stack : '') });
      map.setView(allCoords[0], 15);
    }
  }

  function makeIcon(color, label) {
    var lbl = label || '';
    var isText = lbl.length > 0;
    var size = isText ? (lbl.length > 1 ? 28 : 24) : 14;
    var half = size / 2;
    var inner = isText
      ? '<div style="width:' + size + 'px;height:' + size + 'px;background:' + color + ';border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 10px ' + color + 'aa;display:flex;align-items:center;justify-content:center;font-size:' + (size <= 14 ? 7 : size <= 24 ? 9 : 8) + 'px;font-weight:900;color:#000;font-family:sans-serif"><span>' + lbl + '</span></div>'
      : '<div style="width:14px;height:14px;background:' + color + ';border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 8px ' + color + '80"></div>';
    return L.divIcon({
      html: inner,
      iconSize: [size, size], iconAnchor: [half, half], className: ''
    });
  }

  function send(obj) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e) {}
  }

  function handleMessage(msg) {
    try {
      var d = JSON.parse(msg);
      if (d.type === 'setData') {
        markerLayer.clearLayers();
        if (polylineLayer) { map.removeLayer(polylineLayer); polylineLayer = null; }
        allCoords = [];

        if (d.polyline && d.polyline.length > 1) {
          var pts = d.polyline.map(function(c) {
            return safeLatLng(Number(c.latitude), Number(c.longitude));
          }).filter(function(x) { return x !== null; });
          if (pts.length > 1) {
            polylineLayer = L.polyline(pts, { color: '#F97316', weight: 4, opacity: 0.9 }).addTo(map);
          }
        }

        (d.markers || []).forEach(function(m) {
          var latlng = safeLatLng(Number(m.latitude), Number(m.longitude));
          if (!latlng) return;
          allCoords.push(latlng);
          var mk = L.marker(latlng, { icon: makeIcon(m.color || '#F97316', m.label || '') }).addTo(markerLayer);
          var popupHtml = '<div style="min-width:160px">';
          if (m.label) popupHtml += '<div style="font-size:10px;font-weight:900;color:#F97316;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px">Stop ' + m.label + '</div>';
          if (m.title) popupHtml += '<b style="font-size:13px;color:#111">' + m.title + '</b>';
          if (m.sub)   popupHtml += '<br><span style="font-size:11px;color:#555">' + m.sub + '</span>';
          popupHtml += '</div>';
          mk.bindPopup(popupHtml, { maxWidth: 220 });
          mk.on('click', function() { send({ type: 'markerPress', id: m.id }); });
        });

        fitMapToCoords();
        send({ type: 'ready' });
      } else if (d.type === 'fitAll') {
        fitMapToCoords();
      } else if (d.type === 'zoomIn') {
        map.zoomIn();
      } else if (d.type === 'zoomOut') {
        map.zoomOut();
      } else if (d.type === 'setLayer') {
        if (d.layer !== currentLayer) {
          map.removeLayer(tileLayers[currentLayer]);
          if (hybridLabelsActive) { map.removeLayer(esriLabels); hybridLabelsActive = false; }
          tileLayers[d.layer].addTo(map);
          if (d.layer === 'hybrid') { esriLabels.addTo(map); hybridLabelsActive = true; }
          currentLayer = d.layer;
        }
      }
    } catch(e) {
      send({ type: 'webError', message: String(e && e.message ? e.message : e), stack: String(e && e.stack ? e.stack : '') });
    }
  }

  window.addEventListener('message', function(e) { handleMessage(e.data); });
  document.addEventListener('message', function(e) { handleMessage(e.data); });
  send({ type: 'mapLoaded' });
</script>
</body>
</html>`;

const LeafletMapView = forwardRef<LeafletMapHandle, Props>(
  ({ style, onMarkerPress, onReady }, ref) => {
    const webviewRef = useRef<WebView>(null);

    useEffect(() => {
      pushCrashDebugLine(`${LOG}`, 'Leaflet WebView component mounted');
      return () => {
        pushCrashDebugLine(`${LOG}`, 'Leaflet WebView component unmounted');
      };
    }, []);

    const post = useCallback((obj: object) => {
      try {
        const encoded = JSON.stringify(JSON.stringify(obj));
        if (encoded.length > 1_200_000) {
          console.warn(LOG, 'injectJavaScript payload is very large (bytes ~)', encoded.length);
        }
        webviewRef.current?.injectJavaScript(
          `(function(){ window.dispatchEvent(new MessageEvent('message',{data:${encoded}})); })()`
        );
      } catch (e) {
        console.error(LOG, 'injectJavaScript failed', e);
        pushCrashDebugLine(`${LOG} injectJavaScript`, String(e));
      }
    }, []);

    useImperativeHandle(ref, () => ({
      setData: (markers, polyline) => {
        const cleanMarkers: LeafletMarker[] = [];
        for (const m of markers) {
          const lat = finiteLat(Number(m.latitude));
          const lng = finiteLng(Number(m.longitude));
          if (lat == null || lng == null) continue;
          cleanMarkers.push({
            ...m,
            latitude: lat,
            longitude: lng,
            color: resolveColor(m.color),
          });
        }

        const cleanPoly: { latitude: number; longitude: number }[] = [];
        for (const c of polyline ?? []) {
          const lat = finiteLat(Number(c.latitude));
          const lng = finiteLng(Number(c.longitude));
          if (lat == null || lng == null) continue;
          cleanPoly.push({ latitude: lat, longitude: lng });
        }

        post({
          type: 'setData',
          markers: cleanMarkers,
          polyline: cleanPoly,
        });
      },
      fitAll: () => post({ type: 'fitAll' }),
      zoomIn: () => post({ type: 'zoomIn' }),
      zoomOut: () => post({ type: 'zoomOut' }),
      setLayer: (layer) => post({ type: 'setLayer', layer }),
    }));

    const onMessage = useCallback(
      (e: WebViewMessageEvent) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg.type === 'webError') {
            console.error(LOG, 'Leaflet/page error:', msg.message, msg.stack ?? '');
            pushCrashDebugLine(`${LOG} Leaflet`, String(msg.message), String(msg.stack ?? ''));
            return;
          }
          if (msg.type === 'markerPress' && onMarkerPress) onMarkerPress(msg.id);
          if (msg.type === 'mapLoaded' && onReady) onReady();
        } catch {
          /* noop */
        }
      },
      [onMarkerPress, onReady]
    );

    const onError = useCallback((event: WebViewErrorEvent) => {
      const d = event.nativeEvent;
      console.error(LOG, 'onError', { code: d.code, description: d.description, url: d.url });
      pushCrashDebugLine(
        `${LOG} onError`,
        `code=${d.code} ${d.description}`,
        d.url ? `url=${d.url}` : undefined
      );
    }, []);

    const onHttpError = useCallback((event: WebViewHttpErrorEvent) => {
      const d = event.nativeEvent;
      console.error(LOG, 'onHttpError', { statusCode: d.statusCode, description: d.description, url: d.url });
      pushCrashDebugLine(
        `${LOG} onHttpError`,
        `status=${d.statusCode} ${d.description}`,
        d.url
      );
    }, []);

    const onRenderProcessGone = useCallback((event: WebViewRenderProcessGoneEvent) => {
      console.error(LOG, 'onRenderProcessGone (Android WebView process died)', event.nativeEvent);
      pushCrashDebugLine(`${LOG} onRenderProcessGone`, `didCrash=${String(event.nativeEvent.didCrash)}`);
    }, []);

    const onContentProcessDidTerminate = useCallback((event: WebViewTerminatedEvent) => {
      console.error(LOG, 'onContentProcessDidTerminate (iOS WebView)', event.nativeEvent);
      pushCrashDebugLine(`${LOG} onContentProcessDidTerminate`, 'WebView content process ended');
    }, []);

    return (
      <View style={[styles.root, style]}>
        <WebView
          ref={webviewRef}
          source={{ html: HTML }}
          style={styles.web}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={onMessage}
          onError={onError}
          onHttpError={onHttpError}
          {...(Platform.OS === 'android'
            ? {
                onRenderProcessGone,
                androidLayerType: 'software' as const,
                cacheEnabled: false,
              }
            : { onContentProcessDidTerminate })}
          scrollEnabled={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          bounces={false}
          allowsLinkPreview={false}
          // Fabric / New Arch Android expects an array here, not a string (ClassCastException otherwise).
          dataDetectorTypes={['none']}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }
);

LeafletMapView.displayName = 'LeafletMapView';
export default LeafletMapView;

const styles = StyleSheet.create({
  root: { overflow: 'hidden', borderRadius: 16 },
  web: { flex: 1, backgroundColor: '#111' },
});
