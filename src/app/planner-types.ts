export type Point = {
  lat: number;
  lon: number;
};

export type ProfilePoint = {
  distance: number;
  elevation: number;
};

export type RouteOption = {
  id: string;
  name: string;
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  ascentMeters: number | null;
  maxGradient: number | null;
  typicalGradient: number | null;
  detourPercent: number;
  steepDistanceMeters: number;
  profile: ProfilePoint[];
};

export type Mode = "direct" | "balanced" | "flattest";

export type RecommendedRoutes = Record<Mode, string>;

export type RoutesResponse = {
  routes: RouteOption[];
  recommended: RecommendedRoutes;
  error?: string;
};
