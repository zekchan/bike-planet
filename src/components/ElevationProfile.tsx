type Point = { distance: number; elevation: number };

export function ElevationProfile({ points }: { points: Point[] }) {
  const width = 420;
  const height = 110;
  const padding = 5;
  const maxDistance = Math.max(...points.map((point) => point.distance), 1);
  const minElevation = Math.min(...points.map((point) => point.elevation));
  const maxElevation = Math.max(...points.map((point) => point.elevation));
  const elevationRange = Math.max(maxElevation - minElevation, 10);
  const path = points
    .map((point, index) => {
      const x = padding + (point.distance / maxDistance) * (width - padding * 2);
      const y = height - padding - ((point.elevation - minElevation) / elevationRange) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L${width - padding},${height - padding} L${padding},${height - padding} Z`;

  return (
    <svg className="profile-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Профиль высоты маршрута">
      <defs>
        <linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f766e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0f766e" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#profile-fill)" />
      <path d={path} fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
