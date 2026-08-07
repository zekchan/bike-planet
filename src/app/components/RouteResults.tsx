import type { Mode, RecommendedRoutes, RouteOption } from "../planner-types";
import { formatDistance, formatDuration } from "../planner-utils";
import { ElevationProfile } from "./ElevationProfile";

type Props = {
  routes: RouteOption[];
  selectedRoute?: RouteOption;
  recommended: RecommendedRoutes | null;
  mode: Mode;
  onSelectRoute: (id: string) => void;
};

export function RouteResults({ routes, selectedRoute, recommended, mode, onSelectRoute }: Props) {
  if (!routes.length) return null;

  return (
    <>
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
              onClick={() => onSelectRoute(route.id)}
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

      {selectedRoute && selectedRoute.profile.length > 1 && (
        <section className="profile-card">
          <div className="results-heading">
            <span className="section-label">Профиль высоты</span>
            <small>
              {Math.round(Math.min(...selectedRoute.profile.map((point) => point.elevation)))}–
              {Math.round(Math.max(...selectedRoute.profile.map((point) => point.elevation)))} м
            </small>
          </div>
          <ElevationProfile points={selectedRoute.profile} />
        </section>
      )}
    </>
  );
}
