import type { RouteKind } from "../planner-types";

type Props = {
  routeKind: RouteKind;
  onChange: (routeKind: RouteKind) => void;
};

export function RouteKindSelector({ routeKind, onChange }: Props) {
  return (
    <section className="route-kind-section">
      <p className="section-label">Форма маршрута</p>
      <div className="route-kind-grid">
        <button
          type="button"
          className={`mode-button ${routeKind === "point-to-point" ? "active" : ""}`}
          onClick={() => onChange("point-to-point")}
        >
          <strong>Из A в B</strong>
          <span>Выбрать две точки</span>
        </button>
        <button
          type="button"
          className={`mode-button ${routeKind === "loop" ? "active" : ""}`}
          onClick={() => onChange("loop")}
        >
          <strong>Кольцо</strong>
          <span>Вернуться к старту</span>
        </button>
      </div>
    </section>
  );
}
