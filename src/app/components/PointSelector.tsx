import type { Point, RouteKind } from "../planner-types";

function pointCoordinates(point: Point | null, fallback: string) {
  return point ? `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}` : fallback;
}

type Props = {
  start: Point | null;
  end: Point | null;
  routeKind: RouteKind;
};

export function PointSelector({ start, end, routeKind }: Props) {
  const isLoop = routeKind === "loop";
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
          <strong>{isLoop ? "Возврат в точку A" : end ? "Финиш выбран" : "Выберите финиш"}</strong>
          <small>
            {isLoop
              ? pointCoordinates(start, "Сначала выберите старт")
              : pointCoordinates(end, "Второй клик по карте")}
          </small>
        </div>
      </div>
    </section>
  );
}
