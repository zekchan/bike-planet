import type { Mode, Point, RecommendedRoutes, RouteOption } from "../planner-types";
import { ModeSelector } from "./ModeSelector";
import { PointSelector } from "./PointSelector";
import { RouteResults } from "./RouteResults";
import { RouteSettings } from "./RouteSettings";

type Props = {
  start: Point | null;
  end: Point | null;
  mode: Mode;
  maxDetour: number;
  preferredGradient: number;
  routes: RouteOption[];
  recommended: RecommendedRoutes | null;
  selectedRoute?: RouteOption;
  loading: boolean;
  error: string | null;
  onReset: () => void;
  onModeChange: (mode: Mode) => void;
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

      <PointSelector start={props.start} end={props.end} />
      <ModeSelector mode={props.mode} onChange={props.onModeChange} />
      <RouteSettings
        maxDetour={props.maxDetour}
        preferredGradient={props.preferredGradient}
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
          onSelectRoute={props.onSelectRoute}
        />
      )}
    </aside>
  );
}
