import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import * as api from "../api";
import { FlowLayer, type FlowMode } from "./FlowLayer";
import type {
  Localized,
  FishingArea,
  GeofenceAlert,
  Language,
  Location,
  MarineAlert,
  PFZZone,
  PositionCheck,
  RouteOption,
  ZoneFeature,
} from "../types";
import { RATING_COLOR } from "./FishingPanel";
import { CompassMark } from "./glyphs";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

const ZONE_COLOR: Record<string, string> = {
  critical: "#AF2318",
  warning: "#BF4E12",
  info: "#2A7391",
};

const HINT: Localized<string> = {
  en: "Drag the boat to check any position",
  hi: "किसी भी स्थान की जाँच के लिए नाव खींचें",
  mr: "कोणतेही ठिकाण तपासण्यासाठी होडी ओढा",
};

const LEGEND: Localized<Record<string, string>> = {
  en: {
    symbols: "Symbols",
    veryGood: "Very good chance",
    some: "Some chance",
    noEntry: "Do not enter",
    course: "Safest course",
    storm: "Cyclone / warning area",
    marginL: "Indian coastal waters · scale varies",
    marginR: "Illustrative boundaries — not for navigation",
    flow: "Sea in motion",
    wind: "Wind",
    current: "Current",
    off: "Off",
    sstCool: "cool",
    sstWarm: "warm",
    sstLabel: "Sea temperature",
  },
  hi: {
    symbols: "संकेत",
    veryGood: "बहुत अच्छी संभावना",
    some: "कुछ संभावना",
    noEntry: "प्रवेश न करें",
    course: "सबसे सुरक्षित मार्ग",
    storm: "चक्रवात / चेतावनी क्षेत्र",
    marginL: "भारतीय तटीय जल · पैमाना बदलता है",
    marginR: "सांकेतिक सीमाएँ — नौवहन के लिए नहीं",
    flow: "बहता समुद्र",
    wind: "हवा",
    current: "धारा",
    off: "बंद",
    sstCool: "ठंडा",
    sstWarm: "गर्म",
    sstLabel: "समुद्री तापमान",
  },
  mr: {
    symbols: "खुणा",
    veryGood: "खूप चांगली शक्यता",
    some: "थोडी शक्यता",
    noEntry: "प्रवेश करू नका",
    course: "सर्वात सुरक्षित मार्ग",
    storm: "चक्रीवादळ / इशारा क्षेत्र",
    marginL: "भारतीय किनारी पाणी · प्रमाण बदलते",
    marginR: "सांकेतिक सीमा — नौकानयनासाठी नाही",
    flow: "वाहता समुद्र",
    wind: "वारा",
    current: "प्रवाह",
    off: "बंद",
    sstCool: "थंड",
    sstWarm: "उबदार",
    sstLabel: "समुद्र तापमान",
  },
};

const STATUS_STYLE: Record<PositionCheck["status"], string> = {
  clear: "bg-risk-low",
  warning: "bg-risk-high",
  critical: "bg-risk-extreme",
};

const SERIF = `'Fraunces Variable',Georgia,serif`;
const MONO = `'Spline Sans Mono Variable',Consolas,monospace`;

/** Degrees → radians for great-circle circle approximation */
const RAD = Math.PI / 180;

/** Build a GeoJSON polygon approximating a circle on the globe */
function circleGeoJSON(lat: number, lon: number, radiusKm: number, steps = 64) {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusKm / 111.32) * Math.sin(angle);
    const dLon = (radiusKm / (111.32 * Math.cos(lat * RAD))) * Math.cos(angle);
    coords.push([lon + dLon, lat + dLat]);
  }
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [coords] },
    properties: {},
  };
}

/** Unique source/layer id factory to avoid Mapbox duplicate-id errors */
let _uid = 0;
const uid = (prefix: string) => `${prefix}-${++_uid}`;

export default function MarineMap({
  origin,
  zones,
  pfz,
  areas = [],
  radiusKm,
  routes,
  geofence,
  alerts = [],
  language = "en",
  onPickLocation,
  focusRank,
  heightPx,
  fill = false,
  fitParent = false,
  portFeatures,
  pfzGeoJson,
}: {
  origin: Location | null;
  zones: ZoneFeature[];
  pfz: PFZZone[];
  areas?: FishingArea[];
  radiusKm?: number;
  routes: RouteOption[];
  geofence: GeofenceAlert[];
  alerts?: MarineAlert[];
  heightPx?: number;
  fill?: boolean;
  fitParent?: boolean;
  language?: Language;
  onPickLocation?: (lat: number, lon: number) => void;
  focusRank?: number | null;
  portFeatures?: Array<{ name: string; state: string; lat: number; lon: number }>;
  pfzGeoJson?: Array<{ lat: number; lon: number; label?: string; confidence?: number }>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const flowRef = useRef<FlowLayer | null>(null);
  const sailRaf = useRef(0);
  const [legendOpen, setLegendOpen] = useState(() => typeof window === "undefined" || window.innerHeight >= 820);
  const [flowMode, setFlowMode] = useState<FlowMode>("wind");
  const [probe, setProbe] = useState<PositionCheck | null>(null);
  const [dragging, setDragging] = useState(false);
  const mapHeight = heightPx ?? (areas.length ? 540 : 420);

  // ---- init once -------------------------------------------------------
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/navigation-night-v1",
      center: [72.6, 18.92],
      zoom: 9,
      attributionControl: true,
      pitchWithRotate: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-left");

    map.on("load", () => {
      mapRef.current = map;
      flowRef.current = new FlowLayer(map);
      flowRef.current.setMode("wind");
    });

    return () => {
      cancelAnimationFrame(sailRaf.current);
      flowRef.current?.destroy();
      flowRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // sync flow mode
  useEffect(() => {
    flowRef.current?.setMode(flowMode);
  }, [flowMode]);

  // resize when height prop changes
  useEffect(() => {
    const id = window.setTimeout(() => mapRef.current?.resize(), 60);
    return () => window.clearTimeout(id);
  }, [mapHeight]);

  // resize observer for fill / fitParent modes
  useEffect(() => {
    const el = containerRef.current;
    if ((!fill && !fitParent) || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => mapRef.current?.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill, fitParent]);

  // click-to-pick-position
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onPickLocation) return;
    const handler = (e: mapboxgl.MapMouseEvent) =>
      onPickLocation(+e.lngLat.lat.toFixed(4), +e.lngLat.lng.toFixed(4));
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [onPickLocation]);

  // ---- redraw content --------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // --- clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    cancelAnimationFrame(sailRaf.current);
    setProbe(null);

    // --- clear previous GeoJSON layers / sources
    const layerIds = map.getStyle()?.layers?.map((l) => l.id) ?? [];
    for (const id of layerIds) {
      if (id.startsWith("marvo-")) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
    }
    const sourceIds = Object.keys(map.getStyle()?.sources ?? {});
    for (const id of sourceIds) {
      if (id.startsWith("marvo-")) map.removeSource(id);
    }

    const bounds = new mapboxgl.LngLatBounds();
    let hasBounds = false;

    const addBound = (lat: number, lon: number) => {
      bounds.extend([lon, lat]);
      hasBounds = true;
    };

    // ---- helpers -------------------------------------------------------
    const addSource = (id: string, data: GeoJSON.FeatureCollection | GeoJSON.Feature) => {
      if (!map.getSource(id)) map.addSource(id, { type: "geojson", data });
    };

    // ---- search radius -------------------------------------------------
    if (origin && radiusKm) {
      const sid = uid("marvo-radius");
      addSource(sid, circleGeoJSON(origin.latitude, origin.longitude, radiusKm));
      map.addLayer({
        id: sid,
        type: "line",
        source: sid,
        paint: { "line-color": "#2A7391", "line-width": 1.6, "line-dasharray": [2, 5], "line-opacity": 0.75 },
      });
    }

    // ---- restricted zones ----------------------------------------------
    zones.forEach((z) => {
      const severity = z.properties.severity in ZONE_COLOR ? z.properties.severity : "critical";
      const color = ZONE_COLOR[severity];
      const fillId = uid("marvo-zone-fill");
      const lineId = uid("marvo-zone-line");
      addSource(fillId, z as unknown as GeoJSON.Feature);
      map.addLayer({ id: fillId, type: "fill", source: fillId, paint: { "fill-color": color, "fill-opacity": 0.08 } });
      map.addLayer({ id: lineId, type: "line", source: fillId, paint: { "line-color": color, "line-width": 2, "line-dasharray": [9, 5] } });
    });

    // ---- official warnings with geometry (cyclones) --------------------
    alerts.forEach((al) => {
      const s = al.storm;
      if (!s) return;
      const isCyclone = al.type === "cyclone_warning";

      // warning area
      const circId = uid("marvo-storm-circle");
      addSource(circId, circleGeoJSON(s.latitude, s.longitude, s.radius_km));
      map.addLayer({ id: circId + "-fill", type: "fill", source: circId, paint: { "fill-color": "#AF2318", "fill-opacity": 0.07 } });
      map.addLayer({ id: circId + "-line", type: "line", source: circId, paint: { "line-color": "#AF2318", "line-width": 2, "line-dasharray": [10, 6] } });

      // track
      const track = s.track ?? [];
      if (track.length > 1) {
        const coords = track.map((p) => [p.longitude, p.latitude] as [number, number]);
        const trackId = uid("marvo-track");
        addSource(trackId, { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} });
        map.addLayer({ id: trackId, type: "line", source: trackId, paint: { "line-color": "#AF2318", "line-width": 2.5, "line-dasharray": [3, 7], "line-opacity": 0.85 } });
        track.forEach((p) => {
          const el = document.createElement("div");
          el.style.cssText = "width:11px;height:11px;border-radius:50%;background:#1a2e3d;border:2.5px solid #AF2318;box-shadow:0 1px 4px rgba(18,33,45,.4)";
          const mk = new mapboxgl.Marker({ element: el })
            .setLngLat([p.longitude, p.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 8 }).setHTML(`<span style="font-size:11px">${p.label}</span>`))
            .addTo(map);
          markersRef.current.push(mk);
          addBound(p.latitude, p.longitude);
        });
      }

      // storm icon
      if (isCyclone) {
        const el = document.createElement("div");
        el.innerHTML = `<div class="storm-spin" style="width:56px;height:56px;filter:drop-shadow(0 0 3px rgba(30,50,70,.9)) drop-shadow(0 2px 6px rgba(18,33,45,.4))">
          <svg viewBox="0 0 56 56" width="56" height="56" fill="none">
            <path d="M28 5 A 23 23 0 0 1 51 28" stroke="#AF2318" stroke-width="6" stroke-linecap="round"/>
            <path d="M28 51 A 23 23 0 0 1 5 28" stroke="#AF2318" stroke-width="6" stroke-linecap="round"/>
            <circle cx="28" cy="28" r="10.5" fill="#AF2318"/>
            <circle cx="28" cy="28" r="4" fill="#e8f0f4"/>
          </svg></div>`;
        const mk = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([s.longitude, s.latitude])
          .setPopup(new mapboxgl.Popup({ offset: 36 }).setHTML(`<b>${al.headline}</b><br>${al.detail}<br><span style="font-size:10px;opacity:.65">${al.source}</span>`))
          .addTo(map);
        markersRef.current.push(mk);
      }
      addBound(s.latitude, s.longitude);
    });

    // ---- routes --------------------------------------------------------
    routes.forEach((r) => {
      const coords = r.legs.map((l) => [l.longitude, l.latitude] as [number, number]);
      coords.forEach(([lon, lat]) => addBound(lat, lon));
      const rec = r.recommended;
      const routeId = uid("marvo-route");
      addSource(routeId, { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} });
      map.addLayer({
        id: routeId,
        type: "line",
        source: routeId,
        paint: {
          "line-color": rec ? "#1D7A50" : "#5D7386",
          "line-width": rec ? 4 : 2.5,
          "line-opacity": rec ? 0.95 : 0.55,
          "line-dasharray": rec ? [12, 12] : [2, 8],
        },
      });

      // waypoint risk dots
      (r.waypoint_conditions ?? []).forEach((wp, i) => {
        if (wp?.lat == null || wp?.lon == null) return;
        const riskScore = typeof wp.risk_factor === "number" ? wp.risk_factor * 100 : 0;
        const wpColor = riskScore >= 50 ? "#c62828" : riskScore >= 30 ? "#f57c00" : "#2e7d32";
        const dist = wp.distance_from_start_km?.toFixed(1) ?? "—";
        const wave = wp.wave_m?.toFixed(1) ?? "—";
        const wind = wp.wind_kmh?.toFixed(1) ?? "—";
        const el = document.createElement("div");
        el.style.cssText = `width:10px;height:10px;border-radius:50%;background:${wpColor};border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)`;
        const mk = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([wp.lon, wp.lat])
          .setPopup(new mapboxgl.Popup({ offset: 8 }).setHTML(
            `<div style="font-family:${MONO};font-size:11px;line-height:1.4">
               <b>Waypoint #${i + 1}</b> (${dist} km)<br/>
               <span style="color:${wpColor};font-weight:bold">Risk: ${Math.round(riskScore)} (${wp.risk_level ?? "—"})</span><br/>
               Wave: ${wave} m · Wind: ${wind} km/h
             </div>`
          ))
          .addTo(map);
        markersRef.current.push(mk);
      });
    });

    // animated sailor along recommended route
    const recRoute = routes.find((r) => r.recommended && r.legs.length > 1);
    if (recRoute && !(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)) {
      const pts = recRoute.legs.map((l) => [l.longitude, l.latitude] as [number, number]);
      const seg: number[] = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        seg.push(d);
        total += d;
      }
      if (total > 0) {
        const sailEl = document.createElement("div");
        sailEl.innerHTML = `<div class="sail-dot"><span class="sail-wake"></span></div>`;
        const sailor = new mapboxgl.Marker({ element: sailEl, anchor: "center" })
          .setLngLat(pts[0])
          .addTo(map);
        markersRef.current.push(sailor);
        const started = performance.now();
        const LOOP_MS = 14000;
        const tick = (now: number) => {
          const f = (((now - started) % LOOP_MS) / LOOP_MS) * total;
          let acc = 0, i = 0;
          while (i < seg.length - 1 && acc + seg[i] < f) acc += seg[i++];
          const k = seg[i] ? Math.min(1, (f - acc) / seg[i]) : 0;
          sailor.setLngLat([
            pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k,
            pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k,
          ]);
          sailRaf.current = requestAnimationFrame(tick);
        };
        sailRaf.current = requestAnimationFrame(tick);
      }
    }

    // ---- fishing areas (ranked buoys) ----------------------------------
    if (areas.length) {
      areas.forEach((a) => {
        const best = a.rank === 1;
        const size = best ? 46 : 38;
        const color = RATING_COLOR[a.rating];
        const focused = focusRank === a.rank;
        const el = document.createElement("div");
        el.style.cssText = `width:${size}px;height:${size}px`;
        el.innerHTML = `<div class="bob" style="position:relative;width:${size}px;height:${size}px;animation-delay:${((a.rank * 7) % 10) / 3}s">
          ${focused ? `<div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${color};animation:ping2 1.6s cubic-bezier(0,0,.2,1) infinite"></div>` : ""}
          <div class="buoy" style="position:absolute;inset:0;border-radius:50%;background:#13202b;border:${best ? 4 : 3.5}px solid ${color};display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;gap:1px;box-shadow:0 3px 12px rgba(0,0,0,.6);color:#e8f0f4">
            <span style="font:${best ? "800 16px" : "700 14px"} ${SERIF}">${a.rank}</span>
            <span style="font:600 ${best ? 8.5 : 8}px ${MONO};color:#8fb0c0">${a.probability}%</span>
          </div></div>`;
        const mk = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([a.longitude, a.latitude])
          .setPopup(new mapboxgl.Popup({ offset: size / 2 + 4 }).setHTML(
            `<b>Area ${a.rank}</b> — ${a.probability}% chance of fish<br/>
             ${Math.round(a.distance_km)} km ${a.bearing}<br/>
             SST ${a.sst_c ?? "—"} °C · chlorophyll ${a.chlorophyll_mg_m3 ?? "—"} mg/m³<br/>
             ${a.likely_species?.length ? `Likely: ${a.likely_species.join(", ")}<br/>` : ""}
             <span style="font-size:10px;opacity:.65">A likelihood from the data — never a guarantee of fish.</span>`
          ))
          .addTo(map);
        markersRef.current.push(mk);
        addBound(a.latitude, a.longitude);
      });
    } else {
      // PFZ zones
      pfz.forEach((z) => {
        const best = z.rank === 1;
        const size = best ? 40 : 32;
        const color = best ? "#1D7A50" : "#2A7391";
        const el = document.createElement("div");
        el.style.cssText = `width:${size}px;height:${size}px`;
        el.innerHTML = `<div class="bob" style="width:${size}px;height:${size}px;animation-delay:${((z.rank * 7) % 10) / 3}s">
          <div class="buoy" style="width:100%;height:100%;border-radius:50%;background:#13202b;border:${best ? 4 : 3}px solid ${color};display:grid;place-items:center;color:#e8f0f4;font:${best ? "800 16px" : "700 13px"} ${SERIF};box-shadow:0 3px 10px rgba(0,0,0,.5)">${z.rank}</div></div>`;
        const mk = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([z.longitude, z.latitude])
          .setPopup(new mapboxgl.Popup({ offset: size / 2 + 4 }).setHTML(
            `<b>Fishing zone #${z.rank}</b><br/>${z.distance_km} km ${z.bearing}<br/>
             SST ${z.sst_c ?? "—"} °C · chlorophyll ${z.chlorophyll_mg_m3 ?? "—"} mg/m³<br/>
             confidence ${Math.round(z.confidence * 100)}%<br/>
             <span style="font-size:10px;opacity:.65">Potential zone — not a guarantee of fish.</span>`
          ))
          .addTo(map);
        markersRef.current.push(mk);
        addBound(z.latitude, z.longitude);
      });

      // PFZ GeoJSON layer
      (pfzGeoJson ?? []).forEach((pt, i) => {
        const el = document.createElement("div");
        el.style.cssText = "width:28px;height:28px;border-radius:50%;background:#13202b;border:2.5px solid #2A7391;display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.4);font-size:12px";
        el.textContent = "🐟";
        const mk = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([pt.lon, pt.lat])
          .setPopup(new mapboxgl.Popup({ offset: 18 }).setHTML(
            `<b>PFZ Advisory ${i + 1}</b><br/>${pt.label ?? "Potential Fishing Zone"}<br/>
             ${pt.confidence != null ? `Confidence: ${Math.round(pt.confidence * 100)}%<br/>` : ""}
             <span style="font-size:10px;opacity:.65">Official INCOIS advisory — not a guarantee.</span>`
          ))
          .addTo(map);
        markersRef.current.push(mk);
      });
    }

    // ---- draggable vessel ----------------------------------------------
    if (origin) {
      const boatEl = document.createElement("div");
      boatEl.innerHTML = `<div class="roll" style="position:relative;width:34px;height:34px;cursor:grab">
        <div class="radar-sweep" aria-hidden="true"></div>
        <div style="position:absolute;inset:-9px;border-radius:50%;border:2px solid rgba(42,115,145,.6);animation:ping2 2s cubic-bezier(0,0,.2,1) infinite"></div>
        <div class="buoy" style="position:absolute;inset:0;border-radius:50%;background:#0d1c27;border:2.5px solid #8fb0c0;box-shadow:0 3px 10px rgba(0,0,0,.6);display:grid;place-items:center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8f0f4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v10"/><path d="M12 5l7 8H5l7-8z" fill="#e8f0f4" stroke="none"/>
            <path d="M3 17c2 1.6 4 1.6 6 0s4-1.6 6 0 4 1.6 6 0"/>
          </svg>
        </div></div>`;

      const boat = new mapboxgl.Marker({ element: boatEl, anchor: "center", draggable: true })
        .setLngLat([origin.longitude, origin.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(`<b>${origin.name}</b><br/>Drag me anywhere to check that position`))
        .addTo(map);

      boat.on("dragstart", () => setDragging(true));
      boat.on("dragend", async () => {
        setDragging(false);
        const { lat, lng } = boat.getLngLat();
        try {
          setProbe(await api.checkPosition(+lat.toFixed(4), +lng.toFixed(4)));
        } catch {
          setProbe(null);
        }
      });

      markersRef.current.push(boat);
      addBound(origin.latitude, origin.longitude);
    }

    // ---- port markers --------------------------------------------------
    (portFeatures ?? []).forEach((port) => {
      const el = document.createElement("div");
      el.style.cssText = "width:28px;height:28px;border-radius:50%;background:#0d1c27;border:2px solid #8fb0c0;display:grid;place-items:center;box-shadow:0 2px 5px rgba(0,0,0,.5);cursor:pointer";
      el.title = port.name;
      el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8f0f4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="20"/>
        <path d="M5 13c2 4 10 4 14 0"/></svg>`;
      const mk = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([port.lon, port.lat])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setHTML(
          `<b>⚓ ${port.name}</b><br/><span style="font-size:11px;opacity:.75">${port.state}</span>`
        ))
        .addTo(map);
      el.addEventListener("click", () => { if (onPickLocation) onPickLocation(port.lat, port.lon); });
      markersRef.current.push(mk);
    });

    // fit map
    if (hasBounds) {
      map.fitBounds(bounds, { padding: 60, animate: true, maxZoom: 12 });
    } else if (origin) {
      map.flyTo({ center: [origin.longitude, origin.latitude], zoom: 10, animate: true });
    }

  }, [origin, zones, pfz, pfzGeoJson, areas, routes, radiusKm, focusRank, alerts, portFeatures, onPickLocation]);

  // re-run content after style loads (first time)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) return;
    const onLoad = () => {
      // trigger redraw by nudging a dep — we flip a ref instead
      flowRef.current = new FlowLayer(map);
      flowRef.current.setMode(flowMode);
    };
    map.on("load", onLoad);
    return () => { map.off("load", onLoad); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // fly to focused fishing area
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusRank) return;
    const target = areas.find((a) => a.rank === focusRank);
    if (target) map.flyTo({ center: [target.longitude, target.latitude], zoom: 11, duration: 800 });
  }, [focusRank, areas]);

  const critical = geofence.filter((g) => g.severity === "critical");
  const banner =
    probe != null
      ? { style: STATUS_STYLE[probe.status], text: probe.headline, sub: probeSub(probe) }
      : critical.length
        ? { style: STATUS_STYLE.critical, text: critical[0].message, sub: null }
        : null;

  return (
    <div className={fill ? "map-deck" : fitParent ? "chart-sheet chart-sheet-fit" : "chart-sheet"}>
      <div className={fill ? "map-deck-frame" : fitParent ? "chart-frame chart-frame-fit" : "chart-frame"}>
        <div ref={containerRef} className="w-full" style={{ height: fill || fitParent ? "100%" : mapHeight }} />

        {fill && <div className="map-vignette" aria-hidden />}
        {fill && (
          <div className="map-waves" aria-hidden>
            <span /><span /><span />
          </div>
        )}

        {/* compass rose */}
        <CompassMark
          size={fill ? 48 : 62}
          className="pointer-events-none absolute right-3 top-3 z-[500] text-[#8fb0c0] opacity-70"
        />

        {/* flow layer control */}
        <div className={`absolute left-3 ${fill ? "top-[84px]" : "top-[92px]"} z-[500] rounded-[2px] border border-[#2a3f52] bg-[#0d1c27]/95 px-2 pb-2 pt-1.5 shadow-md`}>
          <div className="mb-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#8fb0c0]">
            {(LEGEND[language] ?? LEGEND.en).flow}
          </div>
          <div className="flex gap-1">
            {(["wind", "current", "off"] as FlowMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setFlowMode(m)}
                className={`rounded-[2px] border px-1.5 py-0.5 font-mono text-[9.5px] font-bold transition ${
                  flowMode === m
                    ? "border-[#2A7391] bg-[#2A7391] text-white"
                    : "border-[#2a3f52] text-[#8fb0c0] hover:text-white"
                }`}
              >
                {(LEGEND[language] ?? LEGEND.en)[m]}
              </button>
            ))}
          </div>
        </div>

        {/* legend */}
        <div className={`absolute bottom-3 left-3 z-[500] rounded-[2px] border border-[#2a3f52] bg-[#0d1c27]/95 px-3 pb-2 pt-1.5 shadow-md ${legendOpen ? "" : "!pb-1.5"}`}>
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            aria-expanded={legendOpen}
            className="mb-1 flex w-full items-center justify-between gap-3 font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#8fb0c0] hover:text-white"
          >
            <span>{(LEGEND[language] ?? LEGEND.en).symbols}</span>
            <span className={`transition-transform ${legendOpen ? "" : "rotate-180"}`}>▾</span>
          </button>
          <div className={legendOpen ? "" : "hidden"}>
            {[
              ["#1D7A50", (LEGEND[language] ?? LEGEND.en).veryGood],
              ["#B08000", (LEGEND[language] ?? LEGEND.en).some],
            ].map(([c, label]) => (
              <div key={label} className="flex items-center gap-2 py-[1.5px] text-[10.5px] font-medium text-[#8fb0c0]">
                <span className="h-2.5 w-2.5 rounded-full border-2 bg-[#0d1c27]" style={{ borderColor: c }} />
                {label}
              </div>
            ))}
            <div className="flex items-center gap-2 py-[1.5px] text-[10.5px] font-medium text-[#8fb0c0]">
              <svg width="10" height="10" aria-hidden>
                <rect x="0.5" y="0.5" width="9" height="9" fill="rgba(175,35,24,0.15)" stroke="#AF2318" strokeWidth="1" />
              </svg>
              {(LEGEND[language] ?? LEGEND.en).noEntry}
            </div>
            <div className="flex items-center gap-2 py-[1.5px] text-[10.5px] font-medium text-[#8fb0c0]">
              <svg width="12" height="6" aria-hidden>
                <line x1="0" y1="3" x2="12" y2="3" stroke="#1D7A50" strokeWidth="2" strokeDasharray="4 2.5" />
              </svg>
              {(LEGEND[language] ?? LEGEND.en).course}
            </div>
            {alerts.some((a) => a.storm) && (
              <div className="flex items-center gap-2 py-[1.5px] text-[10.5px] font-medium text-[#8fb0c0]">
                <svg width="11" height="11" viewBox="0 0 56 56" fill="none" aria-hidden>
                  <path d="M28 5 A 23 23 0 0 1 51 28" stroke="#AF2318" strokeWidth="9" strokeLinecap="round" />
                  <path d="M28 51 A 23 23 0 0 1 5 28" stroke="#AF2318" strokeWidth="9" strokeLinecap="round" />
                  <circle cx="28" cy="28" r="12" fill="#AF2318" />
                </svg>
                {(LEGEND[language] ?? LEGEND.en).storm}
              </div>
            )}
            {flowMode !== "off" && (
              <div
                className="mt-1 flex items-center gap-1.5 border-t pt-1 text-[9px] font-medium text-[#5d8099]"
                style={{ borderColor: "#1a2e3d" }}
                title={(LEGEND[language] ?? LEGEND.en).sstLabel}
              >
                <span>{(LEGEND[language] ?? LEGEND.en).sstCool}</span>
                <span className="h-[5px] w-14 rounded-sm" style={{ background: "linear-gradient(90deg,#3E7A99,#2F8A7D,#7E9A4A,#B08532,#BF6A1F)" }} />
                <span>{(LEGEND[language] ?? LEGEND.en).sstWarm}</span>
              </div>
            )}
          </div>
        </div>

        {/* drag hint */}
        {origin && !probe && !dragging && (
          <div className="pointer-events-none absolute bottom-3 right-3 z-[500] rounded-[2px] border border-[#2a3f52] bg-[#0d1c27]/95 px-2.5 py-1.5 text-[10.5px] font-medium text-[#8fb0c0] shadow-md">
            {HINT[language] ?? HINT.en}
          </div>
        )}

        {/* geofence / probe banner */}
        {banner && (
          <div
            className={`absolute left-1/2 ${fill ? "top-[68px]" : "top-3"} z-[500] max-w-[78%] -translate-x-1/2 animate-rise rounded-[2px] px-3.5 py-2 text-[12px] font-semibold text-white shadow-lg ${banner.style}`}
          >
            <div>{banner.text}</div>
            {banner.sub && (
              <div className="mt-0.5 font-mono text-[10px] font-normal opacity-85">{banner.sub}</div>
            )}
          </div>
        )}
      </div>

      {/* sheet margin note */}
      {!fill && (
        <div className="mt-[7px] shrink-0 flex items-baseline justify-between">
          <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-[#5d8099]">
            {(LEGEND[language] ?? LEGEND.en).marginL}
          </span>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#3a5566]">
            {(LEGEND[language] ?? LEGEND.en).marginR}
          </span>
        </div>
      )}
    </div>
  );
}

function probeSub(p: PositionCheck): string {
  const bits: string[] = [];
  if (p.distance_from_shore_km != null) bits.push(`${p.distance_from_shore_km} km offshore`);
  if (p.nearest_zone_name && p.nearest_zone_km != null && !p.inside_restricted_zone)
    bits.push(`${p.nearest_zone_name}: ${p.nearest_zone_km} km`);
  return bits.join(" · ");
}