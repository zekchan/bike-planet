"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ElevationProfile } from "@/components/ElevationProfile";
import { RouteMap } from "@/components/RouteMap";

export type Point = { lat: number; lon: number };

export type RouteOption = {
  id: string;
  name: string;
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  ascentMeters: number | null;
  maxGradient: number | null;
  typicalGradient: number | null;
  detourPercent: number;
  steepDistanceMeters: number;
  profile: { distance: number; elevation: number }[];
};

type Mode = "direct" | "balanced" | "flattest";

const modes: { id: Mode; label: string; note: string }[] = [
  { id: "direct", label: "Direct", note: "короче" },
  { id: "balanced", label: "Balanced", note: "разумный баланс" },
  { id: "flattest", label: "Flattest", note: "меньше подъёма" },
];

const formatDistance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)} м` : `${(meters / 1000).toFixed(1)} км`;

const formatDuration = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} мин` : `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
};

export default function Home() {
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [mode, setMode] = useState<Mode>("flattest");
  const [maxDetour, setMaxDetour] = useState(30);
  const [preferredGradient, setPreferredGradient] = useState(8);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [recommended, setRecommended] = useState<Record<Mode, string> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildRoutes = useCallback(async () => {
    if (!start || !end) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end, maxDetour, preferredGradient }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось построить маршрут");
      setRoutes(data.routes);
      setRecommended(data.recommended);
      setSelectedId(data.recommended[mode]);
    } catch (routeError) {
      setRoutes([]);
      setRecommended(null);
      setSelectedId(null);
      setError(routeError instanceof Error ? routeError.message : "Не удалось построить маршрут");
    } finally {
      setLoading(false);
    }
  }, [start, end, maxDetour, preferredGradient, mode]);

  useEffect(() => {
    if (recommended) setSelectedId(recommended[mode]);
  }, [mode, recommended]);

  useEffect(() => {
    if (!start || !end) return;
    const timeout = window.setTimeout(buildRoutes, 350);
    return () => window.clearTimeout(timeout);
  }, [start, end, buildRoutes]);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedId) ?? routes[0],
    [routes, selectedId],
  );

  const handleMapClick = useCallback(
    (point: Point) => {
      setError(null);
      if (!start || end) {
        setStart(point);
        setEnd(null);
        setRoutes([]);
        setSelectedId(null);
      } else {
        setEnd(point);
      }
    },
    [start, end],
  );

  const reset = () => {
    setStart(null);
    setEnd(null);
    setRoutes([]);
    setSelectedId(null);
    setError(null);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <header className="brand-row">
          <div>
            <p className="eyebrow">BIKE PLANET</p>
            <h1>Маршрут без лишних горок</h1>
          </div>
          {(start || end) && (
            <button type="button" className="text-button" onClick={reset}>
              Сбросить
            </button>
          )}
        </header>

        <section className="point-card">
          <div className="point-row">
            <span className="point-dot point-a">A</span>
            <div>
              <strong>{start ? "Старт выбран" : "Выберите старт"}</strong>
              <small>{start ? `${start.lat.toFixed(5)}, ${start.lon.toFixed(5)}` : "Нажмите на карту"}</small>
            </div>
          </div>
          <div className="point-line" />
          <div className="point-row">
            <span className="point-dot point-b">B</span>
            <div>
              <strong>{end ? "Финиш выбран" : "Выберите финиш"}</strong>
              <small>{end ? `${end.lat.toFixed(5)}, ${end.lon.toFixed(5)}` : "Второй клик по карте"}</small>
            </div>
          </div>
        </section>

        <section>
          <p className="section-label">Режим</p>
          <div className="mode-grid">
            {modes.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`mode-button ${mode === item.id ? "active" : ""}`}
                onClick={() => setMode(item.id)}
              >
                <strong>{item.label}</strong>
                <span>{item.note}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-grid">
          <label>
            <span>
              <b>Макс. крюк</b>
              <output>{maxDetour}%</output>
            </span>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={maxDetour}
              onChange={(event) => setMaxDetour(Number(event.target.value))}
            />
          </label>
          <label>
            <span>
              <b>Комфортный уклон</b>
              <output>{preferredGradient}%</output>
            </span>
            <input
              type="range"
              min="3"
              max="15"
              value={preferredGradient}
              onChange={(event) => setPreferredGradient(Number(event.target.value))}
            />
          </label>
        </section>

        {loading && <div className="status-card">Считаем варианты…</div>}
        {error && <div className="error-card">{error}</div>}

        {!loading && routes.length > 0 && (
          <section className="results">
            <div className="results-heading">
              <span className="section-label">Варианты</span>
              <small>{routes.length} маршрута</small>
            </div>
            <div className="route-list">
              {routes.map((route, index) => (
                <button
                  type="button"
                  key={route.id}
                  className={`route-card ${selectedRoute?.id === route.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(route.id)}
                >
                  <div className="route-card-title">
                    <span className={`route-swatch route-${index}`} />
                    <strong>{route.name}</strong>
                    {recommended?.[mode] === route.id && <em>лучший</em>}
                  </div>
                  <div className="route-stats">
                    <span>
                      <b>{formatDistance(route.distanceMeters)}</b>
                      <small>{formatDuration(route.durationSeconds)}</small>
                    </span>
                    <span>
                      <b>{route.ascentMeters === null ? "—" : `+${Math.round(route.ascentMeters)} м`}</b>
                      <small>набор</small>
                    </span>
                    <span>
                      <b>{route.typicalGradient === null ? "—" : `${route.typicalGradient.toFixed(1)}%`}</b>
                      <small>типичный</small>
                    </span>
                    <span>
                      <b>{route.maxGradient === null ? "—" : `${route.maxGradient.toFixed(1)}%`}</b>
                      <small>макс.</small>
                    </span>
                  </div>
                  <div className="detour-row">
                    <span>Крюк {route.detourPercent.toFixed(0)}%</span>
                    {route.steepDistanceMeters > 0 && (
                      <span>круто: {formatDistance(route.steepDistanceMeters)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {selectedRoute?.profile.length > 1 && (
          <section className="profile-card">
            <div className="results-heading">
              <span className="section-label">Профиль высоты</span>
              <small>
                {Math.round(Math.min(...selectedRoute.profile.map((p) => p.elevation)))}–
                {Math.round(Math.max(...selectedRoute.profile.map((p) => p.elevation)))} м
              </small>
            </div>
            <ElevationProfile points={selectedRoute.profile} />
          </section>
        )}
      </aside>

      <section className="map-area" aria-label="Карта маршрута">
        <RouteMap
          start={start}
          end={end}
          routes={routes}
          selectedId={selectedRoute?.id ?? null}
          onMapClick={handleMapClick}
          onSelectRoute={setSelectedId}
        />
        {!start && <div className="map-hint">Нажмите на карту, чтобы поставить точку A</div>}
        {start && !end && <div className="map-hint">Теперь поставьте точку B</div>}
      </section>
    </main>
  );
}
