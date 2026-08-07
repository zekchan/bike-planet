import type { Mode } from "./planner-types";

export const MODE_OPTIONS: { id: Mode; label: string; note: string }[] = [
  { id: "direct", label: "Direct", note: "короче" },
  { id: "balanced", label: "Balanced", note: "разумный баланс" },
  { id: "flattest", label: "Flattest", note: "меньше подъёма" },
];

export const formatDistance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)} м` : `${(meters / 1000).toFixed(1)} км`;

export function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} мин` : `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
}
