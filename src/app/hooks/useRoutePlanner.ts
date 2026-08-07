"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Mode,
  Point,
  RecommendedRoutes,
  RouteKind,
  RouteOption,
  RoutesResponse,
} from "../planner-types";

export function useRoutePlanner() {
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [routeKind, setRouteKind] = useState<RouteKind>("point-to-point");
  const [mode, setMode] = useState<Mode>("flattest");
  const [targetDistanceKm, setTargetDistanceKm] = useState(20);
  const [maxDetour, setMaxDetour] = useState(30);
  const [preferredGradient, setPreferredGradient] = useState(8);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [recommended, setRecommended] = useState<RecommendedRoutes | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildRoutes = useCallback(
    async (signal: AbortSignal) => {
      if (!start || (routeKind === "point-to-point" && !end)) return;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            start,
            end,
            routeKind,
            targetDistanceKm,
            maxDetour,
            preferredGradient,
          }),
        });
        const data = (await response.json()) as RoutesResponse;
        if (!response.ok) throw new Error(data.error || "Не удалось построить маршрут");
        setRoutes(data.routes);
        setRecommended(data.recommended);
      } catch (routeError) {
        if (signal.aborted) return;
        setRoutes([]);
        setRecommended(null);
        setSelectedId(null);
        setError(routeError instanceof Error ? routeError.message : "Не удалось построить маршрут");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [start, end, routeKind, targetDistanceKm, maxDetour, preferredGradient],
  );

  useEffect(() => {
    if (recommended) setSelectedId(recommended[mode]);
  }, [mode, recommended]);

  useEffect(() => {
    const controller = new AbortController();
    if (!start || (routeKind === "point-to-point" && !end)) {
      setLoading(false);
      return () => controller.abort();
    }
    const timeout = window.setTimeout(() => buildRoutes(controller.signal), 350);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [start, end, routeKind, buildRoutes]);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedId) ?? routes[0],
    [routes, selectedId],
  );

  const handleMapClick = useCallback(
    (point: Point) => {
      setError(null);
      if (routeKind === "loop") {
        setStart(point);
        setEnd(null);
        setRoutes([]);
        setSelectedId(null);
        return;
      }
      if (!start || end) {
        setStart(point);
        setEnd(null);
        setRoutes([]);
        setSelectedId(null);
      } else {
        setEnd(point);
      }
    },
    [start, end, routeKind],
  );

  const changeRouteKind = useCallback((nextRouteKind: RouteKind) => {
    setRouteKind(nextRouteKind);
    setEnd(null);
    setRoutes([]);
    setRecommended(null);
    setSelectedId(null);
    setError(null);
  }, []);

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
    routeKind,
    mode,
    targetDistanceKm,
    maxDetour,
    preferredGradient,
    routes,
    recommended,
    selectedRoute,
    loading,
    error,
    changeRouteKind,
    setMode,
    setTargetDistanceKm,
    setMaxDetour,
    setPreferredGradient,
    setSelectedId,
    handleMapClick,
    reset,
  };
}
