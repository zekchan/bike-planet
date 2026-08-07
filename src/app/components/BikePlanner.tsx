"use client";

import { useRoutePlanner } from "../hooks/useRoutePlanner";
import { PlannerSidebar } from "./PlannerSidebar";
import { RouteMap } from "./RouteMap";

export function BikePlanner() {
  const planner = useRoutePlanner();

  return (
    <main className="app-shell">
      <PlannerSidebar
        start={planner.start}
        end={planner.end}
        mode={planner.mode}
        maxDetour={planner.maxDetour}
        preferredGradient={planner.preferredGradient}
        routes={planner.routes}
        recommended={planner.recommended}
        selectedRoute={planner.selectedRoute}
        loading={planner.loading}
        error={planner.error}
        onReset={planner.reset}
        onModeChange={planner.setMode}
        onMaxDetourChange={planner.setMaxDetour}
        onPreferredGradientChange={planner.setPreferredGradient}
        onSelectRoute={planner.setSelectedId}
      />

      <section className="map-area" aria-label="Карта маршрута">
        <RouteMap
          start={planner.start}
          end={planner.end}
          routes={planner.routes}
          selectedId={planner.selectedRoute?.id ?? null}
          onMapClick={planner.handleMapClick}
          onSelectRoute={planner.setSelectedId}
        />
        {!planner.start && <div className="map-hint">Нажмите на карту, чтобы поставить точку A</div>}
        {planner.start && !planner.end && <div className="map-hint">Теперь поставьте точку B</div>}
      </section>
    </main>
  );
}
