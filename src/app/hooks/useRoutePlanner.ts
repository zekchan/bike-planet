"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Mode, Point, RecommendedRoutes, RouteOption, RoutesResponse } from "../planner-types";

export function useRoutePlanner() {
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [mode, setMode] = useState<Mode>("flattest");
  const [maxDetour, setMaxDetour] = useState(30);
  const [preferredGradient, setPreferredGradient] = useState(8);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [recommended, setRecommended] = useState<RecommendedRoutes | null>(null);
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
      const data = (await response.json()) as RoutesResponse;
      if (!response.ok) throw new Error(data.error || "Не удалось построить маршрут");
      setRoutes(data.routes);
      setRecommended(data.recommended);
    } catch (routeError) {
      setRoutes([]);
      setRecommended(null);
      setSelectedId(null);
      setError(routeError instanceof Error ? routeError.message : "Не удалось построить маршрут");
    } finally {
      setLoading(false);
    }
  }, [start, end, maxDetour, preferredGradient]);

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

  const reset = useCallback(() => {
    setStart(null);
    setEnd(null);
    setRoutes([]);
    setRecommended(null);
    setSelectedId(null);
    setError(null);
  }, []);

  return {
    start,
    end,
    mode,
    maxDetour,
    preferredGradient,
    routes,
    recommended,
    selectedRoute,
    loading,
    error,
    setMode,
    setMaxDetour,
    setPreferredGradient,
    setSelectedId,
    handleMapClick,
    reset,
  };
}
