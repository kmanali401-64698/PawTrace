"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
    lat: number;
    lng: number;
    label: string; // shown in the popup
    kind: "scan" | "message";
};

// OpenStreetMap tiles need no API key. For production traffic you can plug in a
// keyed provider (e.g. MapTiler) by setting NEXT_PUBLIC_MAPTILER_KEY.
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const TILE_URL = MAPTILER_KEY
    ? `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = MAPTILER_KEY
    ? '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function escapeHtml(text: string) {
    return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Interactive map of where a pet's tag was scanned / where finders reported it. Newest point first. */
export default function LocationMap({ points, className = "" }: { points: MapPoint[]; className?: string }) {
    const container = useRef<HTMLDivElement>(null);
    const key = JSON.stringify(points);

    useEffect(() => {
        if (!container.current || points.length === 0) return;
        let cancelled = false;
        let map: import("leaflet").Map | undefined;

        // Leaflet touches `window`, so load it only in the browser
        import("leaflet").then((L) => {
            if (cancelled || !container.current) return;

            map = L.map(container.current, { scrollWheelZoom: false });
            L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);

            const latLngs: [number, number][] = [];
            // Draw oldest first so the newest marker sits on top
            [...points].reverse().forEach((p, i, all) => {
                const newest = i === all.length - 1;
                const color = p.kind === "message" ? "#D97A56" : "#6B8E5A";
                const marker = L.circleMarker([p.lat, p.lng], {
                    radius: newest ? 11 : 7,
                    color: "#fff",
                    weight: 2,
                    fillColor: color,
                    fillOpacity: newest ? 1 : 0.7,
                })
                    .addTo(map!)
                    .bindPopup(
                        `<strong>${newest ? "Latest: " : ""}${escapeHtml(p.label)}</strong><br>` +
                            `<a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener noreferrer">Directions</a>`
                    );
                if (newest) marker.openPopup();
                latLngs.push([p.lat, p.lng]);
            });

            const fit = () => {
                if (!map) return;
                map.invalidateSize();
                if (latLngs.length === 1) {
                    map.setView(latLngs[0], 16);
                } else {
                    map.fitBounds(latLngs, { padding: [30, 30], maxZoom: 16 });
                }
            };
            fit();

            // The card can change size after the map is created (layout settling, window resize);
            // re-measure and re-centre so every pin stays in view.
            observer = new ResizeObserver(fit);
            observer.observe(container.current);
        });

        let observer: ResizeObserver | undefined;

        return () => {
            cancelled = true;
            observer?.disconnect();
            map?.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the point list
    }, [key]);

    return <div ref={container} className={"w-full h-72 rounded-xl overflow-hidden z-0 " + className} />;
}
