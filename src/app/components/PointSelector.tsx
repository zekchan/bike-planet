import type { Point } from "../planner-types";

function pointCoordinates(point: Point | null, fallback: string) {
  return point ? `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}` : fallback;
}

export function PointSelector({ start, end }: { start: Point | null; end: Point | null }) {
  return (
    <section className="point-card">
      <div className="point-row">
        <span className="point-dot point-a">A</span>
        <div>
          <strong>{start ? "Старт выбран" : "Выберите старт"}</strong>
          <small>{pointCoordinates(start, "Нажмите на карту")}</small>
        </div>
      </div>
      <div className="point-line" />
      <div className="point-row">
        <span className="point-dot point-b">B</span>
        <div>
          <strong>{end ? "Финиш выбран" : "Выберите финиш"}</strong>
          <small>{pointCoordinates(end, "Второй клик по карте")}</small>
        </div>
      </div>
    </section>
  );
}
