import { NextResponse } from "next/server";

type Point = { lat: number; lon: number };
type ProfilePoint = { distance: number; elevation: number };

type Candidate = {
  id: string;
  name: string;
  encodedShape: string;
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  ascentMeters: number | null;
  maxGradient: number | null;
  typicalGradient: number | null;
  detourPercent: number;
  steepDistanceMeters: number;
  steepPenalty: number;
  profile: ProfilePoint[];
};

type ValhallaTrip = {
  summary: { length: number; time: number };
  legs: { shape: string }[];
};

type LoopSeed = {
  bearing: number;
  clockwise: boolean;
  useHills: number;
};

const valhallaUrl = process.env.VALHALLA_URL ?? "http://localhost:8002";

function decodePolyline6(encoded: string): [number, number][] {
  let index = 0;
  let lat = 0;
  let lon = 0;
  const coordinates: [number, number][] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push([lon / 1e6, lat / 1e6]);
  }
  return coordinates;
}

function encodePolyline6(coordinates: [number, number][]) {
  let previousLat = 0;
  let previousLon = 0;
  let encoded = "";

  const encodeValue = (value: number) => {
    let shifted = value < 0 ? ~(value << 1) : value << 1;
    while (shifted >= 0x20) {
      encoded += String.fromCharCode((0x20 | (shifted & 0x1f)) + 63);
      shifted >>= 5;
    }
    encoded += String.fromCharCode(shifted + 63);
  };

  for (const [lon, lat] of coordinates) {
    const nextLat = Math.round(lat * 1e6);
    const nextLon = Math.round(lon * 1e6);
    encodeValue(nextLat - previousLat);
    encodeValue(nextLon - previousLon);
    previousLat = nextLat;
    previousLon = nextLon;
  }
  return encoded;
}

function tripCoordinates(trip: ValhallaTrip) {
  return trip.legs.flatMap((leg, index) => {
    const coordinates = decodePolyline6(leg.shape);
    return index === 0 ? coordinates : coordinates.slice(1);
  });
}

async function requestJson<T>(path: string, body: unknown, timeoutMs = 45_000): Promise<T> {
  const response = await fetch(`${valhallaUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Valhalla ${response.status}: ${detail.slice(0, 180)}`);
  }
  return response.json() as Promise<T>;
}

function elevationMetrics(profile: ProfilePoint[], preferredGradient: number) {
  if (profile.length < 2) {
    return {
      ascentMeters: null,
      maxGradient: null,
      typicalGradient: null,
      steepDistanceMeters: 0,
      steepPenalty: 0,
    };
  }
  let ascentMeters = 0;
  let steepDistanceMeters = 0;
  let steepPenalty = 0;
  const positiveGradients: number[] = [];

  for (let index = 1; index < profile.length; index += 1) {
    const distance = profile[index].distance - profile[index - 1].distance;
    const rise = profile[index].elevation - profile[index - 1].elevation;
    if (distance <= 0) continue;
    const gradient = (rise / distance) * 100;
    if (rise > 0.7) ascentMeters += rise;
    if (gradient > 0) positiveGradients.push(gradient);
    if (gradient > preferredGradient) {
      steepDistanceMeters += distance;
      steepPenalty += distance * (gradient - preferredGradient) ** 2;
    }
  }

  positiveGradients.sort((a, b) => a - b);
  const typicalIndex = Math.floor((positiveGradients.length - 1) * 0.75);
  return {
    ascentMeters,
    maxGradient: positiveGradients.at(-1) ?? 0,
    typicalGradient: positiveGradients.length ? positiveGradients[Math.max(0, typicalIndex)] : 0,
    steepDistanceMeters,
    steepPenalty,
  };
}

async function enrichTrip(
  id: string,
  name: string,
  trip: ValhallaTrip,
  preferredGradient: number,
): Promise<Candidate> {
  const coordinates = tripCoordinates(trip);
  const encodedShape = encodePolyline6(coordinates);
  let profile: ProfilePoint[] = [];
  try {
    const elevation = await requestJson<{ range_height?: [number, number | null][] }>(
      "/height",
      {
        range: true,
        encoded_polyline: encodedShape,
        shape_format: "polyline6",
        resample_distance: 75,
        height_precision: 1,
      },
      6_000,
    );
    profile = (elevation.range_height ?? [])
      .filter((point): point is [number, number] => point[1] !== null)
      .map(([distance, elevationValue]) => ({ distance, elevation: elevationValue }));
  } catch {
    // Routing still works while elevation tiles are unavailable or being prepared.
  }

  const metrics = elevationMetrics(profile, preferredGradient);
  return {
    id,
    name,
    encodedShape,
    coordinates,
    distanceMeters: trip.summary.length * 1000,
    durationSeconds: trip.summary.time,
    detourPercent: 0,
    profile,
    ...metrics,
  };
}

function destinationPoint(origin: Point, distanceKm: number, bearingDegrees: number): Point {
  const earthRadiusKm = 6371;
  const angularDistance = distanceKm / earthRadiusKm;
  const bearing = (bearingDegrees * Math.PI) / 180;
  const lat = (origin.lat * Math.PI) / 180;
  const lon = (origin.lon * Math.PI) / 180;
  const destinationLat = Math.asin(
    Math.sin(lat) * Math.cos(angularDistance) + Math.cos(lat) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const destinationLon =
    lon +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat),
      Math.cos(angularDistance) - Math.sin(lat) * Math.sin(destinationLat),
    );
  return {
    lat: (destinationLat * 180) / Math.PI,
    lon: (destinationLon * 180) / Math.PI,
  };
}

function loopLocations(start: Point, targetDistanceKm: number, seed: LoopSeed, scale = 1) {
  const sideKm = (targetDistanceKm / 3) * 0.55 * scale;
  const turn = seed.clockwise ? 60 : -60;
  return [
    start,
    destinationPoint(start, sideKm, seed.bearing),
    destinationPoint(start, sideKm, seed.bearing + turn),
    start,
  ];
}

async function requestLoopTrip(locations: Point[], useHills: number) {
  const route = await requestJson<{ trip: ValhallaTrip }>(
    "/route",
    {
      locations,
      costing: "bicycle",
      costing_options: {
        bicycle: {
          bicycle_type: "hybrid",
          use_hills: useHills,
          use_roads: 0,
          exclude_highways: true,
        },
      },
      directions_options: { units: "kilometers" },
    },
    5_000,
  );
  return route.trip;
}

async function buildLoopCandidates(start: Point, targetDistanceKm: number, preferredGradient: number) {
  const hillPreferences = [0.65, 0.25, 0];
  const seeds: LoopSeed[] = [0, 60, 120, 180, 240, 300].map((bearing, index) => ({
    bearing,
    clockwise: index % 2 === 0,
    useHills: hillPreferences[index % hillPreferences.length],
  }));
  const roughRoutes = await Promise.all(
    seeds.map(async (seed) => {
      try {
        return {
          seed,
          trip: await requestLoopTrip(loopLocations(start, targetDistanceKm, seed), seed.useHills),
        };
      } catch {
        return null;
      }
    }),
  );
  const availableRoutes = roughRoutes
    .filter((route) => route !== null)
    .sort(
      (left, right) =>
        Math.abs(left.trip.summary.length - targetDistanceKm) -
        Math.abs(right.trip.summary.length - targetDistanceKm),
    )
    .slice(0, 4);
  const refinedRoutes = await Promise.all(
    availableRoutes.map(async ({ seed, trip }) => {
      const scale = Math.min(1.65, Math.max(0.55, targetDistanceKm / trip.summary.length));
      try {
        return await requestLoopTrip(loopLocations(start, targetDistanceKm, seed, scale), seed.useHills);
      } catch {
        return trip;
      }
    }),
  );
  return Promise.all(
    refinedRoutes.map((trip, index) => enrichTrip(`loop-${index}`, "Loop", trip, preferredGradient)),
  );
}

async function buildCandidates(
  id: string,
  name: string,
  useHills: number,
  start: Point,
  end: Point,
  preferredGradient: number,
): Promise<Candidate[]> {
  const route = await requestJson<{ trip: ValhallaTrip; alternates?: { trip: ValhallaTrip }[] }>("/route", {
    locations: [start, end],
    costing: "bicycle",
    alternates: 2,
    costing_options: {
      bicycle: {
        bicycle_type: "hybrid",
        use_hills: useHills,
        use_roads: 0,
        exclude_highways: true,
      },
    },
    directions_options: { units: "kilometers" },
  });
  const trips = [route.trip, ...(route.alternates ?? []).map((alternate) => alternate.trip)];
  return Promise.all(
    trips.map((trip, index) =>
      enrichTrip(`${id}-${index}`, index === 0 ? name : `${name} alt`, trip, preferredGradient),
    ),
  );
}

function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const point = value as Point;
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lon) <= 180
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { start, end } = body;
    const routeKind = body.routeKind === "loop" ? "loop" : "point-to-point";
    const maxDetour = Math.min(100, Math.max(0, Number(body.maxDetour) || 30));
    const preferredGradient = Math.min(25, Math.max(1, Number(body.preferredGradient) || 8));
    const targetDistanceKm = Math.min(100, Math.max(5, Number(body.targetDistanceKm) || 20));
    if (!isPoint(start) || (routeKind === "point-to-point" && !isPoint(end))) {
      return NextResponse.json({ error: "Некорректные координаты точек" }, { status: 400 });
    }

    const requests =
      routeKind === "loop"
        ? [buildLoopCandidates(start, targetDistanceKm, preferredGradient)]
        : [
            buildCandidates("direct", "Direct", 0.65, start, end, preferredGradient),
            buildCandidates("balanced", "Balanced", 0.25, start, end, preferredGradient),
            buildCandidates("flattest", "Flattest", 0, start, end, preferredGradient),
          ];
    const settled = await Promise.allSettled(requests);
    const candidates = settled
      .filter((result): result is PromiseFulfilledResult<Candidate[]> => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .filter(
        (candidate, index, all) =>
          all.findIndex((item) => item.encodedShape === candidate.encodedShape) === index,
      );

    if (!candidates.length) {
      const reason = settled.find((result) => result.status === "rejected");
      console.error("Valhalla routing failed", reason);
      return NextResponse.json(
        { error: "Маршрутизатор ещё не готов. Проверьте, что контейнер Valhalla закончил подготовку карты." },
        { status: 503 },
      );
    }

    const targetDistanceMeters = targetDistanceKm * 1000;
    const shortestDistance = Math.min(...candidates.map((candidate) => candidate.distanceMeters));
    candidates.forEach((candidate) => {
      candidate.detourPercent =
        routeKind === "loop"
          ? ((candidate.distanceMeters - targetDistanceMeters) / targetDistanceMeters) * 100
          : ((candidate.distanceMeters - shortestDistance) / shortestDistance) * 100;
    });

    const byScore = (score: (candidate: Candidate) => number, pool = candidates) =>
      [...pool].sort((a, b) => score(a) - score(b))[0];
    const allowed = candidates.filter((candidate) =>
      routeKind === "loop"
        ? Math.abs(candidate.detourPercent) <= 15
        : candidate.detourPercent <= maxDetour + 0.01,
    );
    const elevationAware = (candidate: Candidate, ascentWeight: number, steepWeight: number) =>
      candidate.distanceMeters +
      (candidate.ascentMeters ?? 0) * ascentWeight +
      candidate.steepPenalty * steepWeight;

    const distanceError = (candidate: Candidate) => Math.abs(candidate.distanceMeters - targetDistanceMeters);
    const direct = byScore((candidate) =>
      routeKind === "loop" ? distanceError(candidate) : candidate.distanceMeters,
    );
    const balanced = byScore((candidate) =>
      routeKind === "loop"
        ? distanceError(candidate) * 2 + (candidate.ascentMeters ?? 0) * 7 + candidate.steepPenalty * 0.02
        : elevationAware(candidate, 7, 0.02),
    );
    const flattest = byScore(
      (candidate) =>
        (candidate.ascentMeters ?? 0) * 100 +
        candidate.steepPenalty * 0.2 +
        (routeKind === "loop" ? distanceError(candidate) * 0.2 : candidate.distanceMeters * 0.05),
      allowed.length ? allowed : candidates,
    );
    const recommended = {
      direct: direct.id,
      balanced: balanced.id,
      flattest: flattest.id,
    };

    const visibleCandidates = [direct, balanced, flattest];
    for (const candidate of [...candidates].sort(
      (a, b) => elevationAware(a, 7, 0.02) - elevationAware(b, 7, 0.02),
    )) {
      if (!visibleCandidates.some((visible) => visible.id === candidate.id))
        visibleCandidates.push(candidate);
      if (new Set(visibleCandidates.map((visible) => visible.id)).size >= 3) break;
    }
    const uniqueVisible = visibleCandidates
      .filter((candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index)
      .slice(0, 3);
    const publicCandidates = uniqueVisible.map(
      ({ encodedShape: _encodedShape, steepPenalty: _steepPenalty, ...candidate }) => ({
        ...candidate,
        name:
          candidate.id === direct.id
            ? routeKind === "loop"
              ? "Closest"
              : "Direct"
            : candidate.id === balanced.id
              ? "Balanced"
              : candidate.id === flattest.id
                ? "Flattest"
                : "Alternative",
      }),
    );
    return NextResponse.json({ routes: publicCandidates, recommended });
  } catch (error) {
    console.error("Route API error", error);
    return NextResponse.json({ error: "Не удалось связаться с маршрутизатором" }, { status: 502 });
  }
}
