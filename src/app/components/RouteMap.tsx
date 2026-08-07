"use client";

import {
  type GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type StyleSpecification,
} from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { Point, RouteOption } from "../planner-types";

type Props = {
  start: Point | null;
  end: Point | null;
  routes: RouteOption[];
  selectedId: string | null;
  onMapClick: (point: Point) => void;
  onSelectRoute: (id: string) => void;
};

const colors = ["#0f766e", "#ea580c", "#2563eb"];

const emptyRoutes: Parameters<GeoJSONSource["setData"]>[0] = {
  type: "FeatureCollection",
  features: [],
};

const mapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
    routes: {
      type: "geojson",
      data: emptyRoutes,
    },
  },
  layers: [
    { id: "osm", type: "raster", source: "osm" },
    {
      id: "route-lines-hit",
      type: "line",
      source: "routes",
      paint: { "line-color": "rgba(0,0,0,0)", "line-width": 18 },
    },
  ],
};

function markerElement(label: string, kind: "a" | "b") {
  const element = document.createElement("div");
  element.className = `map-marker map-marker-${kind}`;
  element.textContent = label;
  return element;
}

function routeData(routes: RouteOption[], selectedId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: routes.map((route, index) => ({
      type: "Feature" as const,
      properties: {
        id: route.id,
        color: colors[index % colors.length],
        selected: route.id === selectedId ? 1 : 0,
      },
      geometry: { type: "LineString" as const, coordinates: route.coordinates },
    })),
  } satisfies Parameters<GeoJSONSource["setData"]>[0];
}

export function RouteMap({ start, end, routes, selectedId, onMapClick, onSelectRoute }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const routeOverlayRef = useRef<SVGSVGElement | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const clickHandlerRef = useRef(onMapClick);
  const selectHandlerRef = useRef(onSelectRoute);

  useEffect(() => {
    clickHandlerRef.current = onMapClick;
  }, [onMapClick]);
  useEffect(() => {
    selectHandlerRef.current = onSelectRoute;
  }, [onSelectRoute]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: mapStyle,
      center: [-9.1427, 38.7369],
      zoom: 12,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    const routeOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    routeOverlay.classList.add("route-overlay");
    routeOverlay.setAttribute("aria-hidden", "true");
    containerRef.current.append(routeOverlay);
    routeOverlayRef.current = routeOverlay;
    map.on("click", "route-lines-hit", (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (id) selectHandlerRef.current(id);
    });
    map.on("mouseenter", "route-lines-hit", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "route-lines-hit", () => {
      map.getCanvas().style.cursor = "crosshair";
    });
    map.on("click", (event) => {
      const clickedRoute =
        map.getLayer("route-lines-hit") &&
        map.queryRenderedFeatures(event.point, { layers: ["route-lines-hit"] }).length > 0;
      if (clickedRoute) return;
      clickHandlerRef.current({ lat: event.lngLat.lat, lon: event.lngLat.lng });
    });
    mapRef.current = map;
    return () => {
      routeOverlay.remove();
      routeOverlayRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => {
      marker.remove();
    });
    markersRef.current = [];
    if (start)
      markersRef.current.push(
        new Marker({ element: markerElement("A", "a") }).setLngLat([start.lon, start.lat]).addTo(map),
      );
    if (end)
      markersRef.current.push(
        new Marker({ element: markerElement("B", "b") }).setLngLat([end.lon, end.lat]).addTo(map),
      );
  }, [start, end]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => {
      const source = map.getSource("routes") as GeoJSONSource | undefined;
      source?.setData(routeData(routes, selectedId));
    };

    if (map.isStyleLoaded()) {
      update();
      return;
    }
    map.on("style.load", update);
    return () => {
      map.off("style.load", update);
    };
  }, [routes, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const overlay = routeOverlayRef.current;
    if (!map || !overlay) return;

    const orderedRoutes = [...routes].sort(
      (left, right) => Number(left.id === selectedId) - Number(right.id === selectedId),
    );
    const paths = orderedRoutes.map((route) => {
      const selected = route.id === selectedId;
      const casing = document.createElementNS("http://www.w3.org/2000/svg", "path");
      casing.setAttribute("class", "route-overlay-casing");
      casing.setAttribute("stroke-width", selected ? "9" : "7");
      casing.setAttribute("opacity", selected ? "0.9" : "0.65");

      const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
      line.setAttribute("class", "route-overlay-line");
      line.setAttribute("stroke", colors[routes.indexOf(route) % colors.length]);
      line.setAttribute("stroke-width", selected ? "6" : "4");
      line.setAttribute("opacity", selected ? "1" : "0.6");

      overlay.append(casing, line);
      return { route, casing, line };
    });

    const draw = () => {
      for (const { route, casing, line } of paths) {
        const path = route.coordinates
          .map(([lon, lat], index) => {
            const point = map.project([lon, lat]);
            return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
          })
          .join(" ");
        casing.setAttribute("d", path);
        line.setAttribute("d", path);
      }
    };

    draw();
    map.on("move", draw);
    map.on("resize", draw);
    return () => {
      map.off("move", draw);
      map.off("resize", draw);
      overlay.replaceChildren();
    };
  }, [routes, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routes.length) return;
    const bounds = new LngLatBounds();
    routes.forEach((route) => {
      route.coordinates.forEach((coordinate) => {
        bounds.extend(coordinate);
      });
    });
    map.fitBounds(bounds, { padding: 70, duration: 600, maxZoom: 15 });
  }, [routes]);

  return <div ref={containerRef} className="map" />;
}
