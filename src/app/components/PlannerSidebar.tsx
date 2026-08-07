import type { Mode, Point, RecommendedRoutes, RouteKind, RouteOption } from "../planner-types";
import { ModeSelector } from "./ModeSelector";
import { PointSelector } from "./PointSelector";
import { RouteKindSelector } from "./RouteKindSelector";
import { RouteResults } from "./RouteResults";
import { RouteSettings } from "./RouteSettings";

type Props = {
  start: Point | null;
  end: Point | null;
  routeKind: RouteKind;
  mode: Mode;
  targetDistanceKm: number;
  maxDetour: number;
  preferredGradient: number;
  routes: RouteOption[];
  recommended: RecommendedRoutes | null;
  selectedRoute?: RouteOption;
  loading: boolean;
  error: string | null;
  onReset: () => void;
  onRouteKindChange: (routeKind: RouteKind) => void;
  onModeChange: (mode: Mode) => void;
  onTargetDistanceChange: (value: number) => void;
  onMaxDetourChange: (value: number) => void;
  onPreferredGradientChange: (value: number) => void;
  onSelectRoute: (id: string) => void;
};

export function PlannerSidebar(props: Props) {
  return (
    <aside className="sidebar">
      <header className="brand-row">
        <div>
          <p className="eyebrow">BIKE PLANET</p>
          <h1>Маршрут без лишних горок</h1>
        </div>
        {(props.start || props.end) && (
          <button type="button" className="text-button" onClick={props.onReset}>
            Сбросить
          </button>
        )}
      </header>

      <RouteKindSelector routeKind={props.routeKind} onChange={props.onRouteKindChange} />
      <PointSelector start={props.start} end={props.end} routeKind={props.routeKind} />
      <ModeSelector mode={props.mode} onChange={props.onModeChange} />
      <RouteSettings
        isLoop={props.routeKind === "loop"}
        targetDistanceKm={props.targetDistanceKm}
        maxDetour={props.maxDetour}
        preferredGradient={props.preferredGradient}
        onTargetDistanceChange={props.onTargetDistanceChange}
        onMaxDetourChange={props.onMaxDetourChange}
        onPreferredGradientChange={props.onPreferredGradientChange}
      />

      {props.loading && <div className="status-card">Считаем варианты…</div>}
      {props.error && <div className="error-card">{props.error}</div>}

      {!props.loading && (
        <RouteResults
          routes={props.routes}
          selectedRoute={props.selectedRoute}
          recommended={props.recommended}
          mode={props.mode}
          routeKind={props.routeKind}
          onSelectRoute={props.onSelectRoute}
        />
      )}
    </aside>
  );
}
