"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet + Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

type Ping = {
  latitude: number;
  longitude: number;
  createdAt: string;
};

type Props = {
  pings: Ping[];
};

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center);
  return null;
}

export default function AdminMap({ pings }: Props) {
  if (!pings || pings.length === 0) {
    return (
      <div className="no-map-data">
        <span className="material-symbols-outlined">map</span>
        <p>No GPS data available for this date.</p>
        <style jsx>{`
          .no-map-data {
            height: 400px;
            background: #1c1b1b;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #99907c;
            gap: 12px;
          }
          .no-map-data .material-symbols-outlined { font-size: 48px; opacity: 0.5; }
        `}</style>
      </div>
    );
  }

  const positions: [number, number][] = pings.map(p => [p.latitude, p.longitude]);
  const center = positions[positions.length - 1]; // Center on last known position

  return (
    <div className="map-wrapper">
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", borderRadius: "12px" }}
      >
        <ChangeView center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          className="map-tiles"
        />
        
        {/* The Path */}
        <Polyline 
          positions={positions} 
          pathOptions={{ color: "#ffc0a8", weight: 3, opacity: 0.6, dashArray: "5, 10" }} 
        />

        {/* Markers for pings */}
        {pings.map((ping, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === pings.length - 1;
          
          // Create a numbered icon
          const numberedIcon = L.divIcon({
            className: "numbered-marker",
            html: `<div class="marker-pin ${isFirst ? 'is-start' : ''} ${isLast ? 'is-end' : ''}">${idx + 1}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          return (
            <Marker key={idx} position={[ping.latitude, ping.longitude]} icon={numberedIcon}>
              <Popup>
                <div className="ping-popup">
                  <div className="popup-header">
                    <strong>Point #{idx + 1}</strong>
                    {isFirst && <span className="tag start">START</span>}
                    {isLast && <span className="tag end">LATEST</span>}
                  </div>
                  <div className="popup-time">
                    {new Date(ping.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <style jsx global>{`
        .leaflet-container {
          background: #0a0a0a !important;
        }
        .numbered-marker {
          background: none;
          border: none;
        }
        .marker-pin {
          width: 24px;
          height: 24px;
          background: #1c1b1b;
          border: 2px solid #ffc0a8;
          border-radius: 50%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          box-shadow: 0 0 10px rgba(255, 192, 168, 0.4);
        }
        .marker-pin.is-start {
          background: #4ade80;
          color: #064e3b;
          border-color: #064e3b;
        }
        .marker-pin.is-end {
          background: #ffc0a8;
          color: #5a1c00;
          border-color: white;
          transform: scale(1.2);
          z-index: 1000 !important;
        }
        .ping-popup {
          font-family: var(--font-headline), sans-serif;
          min-width: 100px;
        }
        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .tag {
          font-size: 8px;
          padding: 1px 4px;
          border-radius: 3px;
          font-weight: 900;
        }
        .tag.start { background: #4ade80; color: #064e3b; }
        .tag.end { background: #ffc0a8; color: #5a1c00; }
        .popup-time {
          font-size: 11px;
          color: #666;
        }
        .map-wrapper {
          height: 500px;
          width: 100%;
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}
