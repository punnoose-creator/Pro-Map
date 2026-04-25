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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />
        
        {/* The Path */}
        <Polyline 
          positions={positions} 
          pathOptions={{ color: "#ffc0a8", weight: 4, opacity: 0.7, dashArray: "10, 10" }} 
        />

        {/* Markers for start, end, and pings */}
        {pings.map((ping, idx) => (
          <Marker key={idx} position={[ping.latitude, ping.longitude]}>
            <Popup>
              <div className="ping-popup">
                <strong>Ping #{idx + 1}</strong><br />
                {new Date(ping.createdAt).toLocaleTimeString()}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style jsx global>{`
        .leaflet-container {
          background: #131313 !important;
        }
        .map-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .ping-popup {
          font-family: sans-serif;
          font-size: 12px;
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
