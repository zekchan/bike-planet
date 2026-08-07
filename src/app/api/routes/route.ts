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

async function requestJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${valhallaUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Valhalla ${response.status}: ${detail.slice(0, 180)}`);
  }
  return response.json() as Promise<T>;
}

function elevationMetrics(profile: ProfilePoint[], preferredGradient: number) {
  if (profile.length < 2) {
    return { ascentMeters: null, maxGradient: null, typicalGradient: null, steepDistanceMeters: 0, steepPenalty: 0 };
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
    maxGradient: positiveGradients.length ? positiveGradients.at(-1)! : 0,
    typicalGradient: positiveGradients.length ? positiveGradients[Math.max(0, typicalIndex)] : 0,
    steepDistanceMeters,
    steepPenalty,
  };
}

async function buildCandidate(
  id: string,
  name: string,
  useHills: number,
  start: Point,
  end: Point,
  preferredGradient: number,
): Promise<Candidate> {
  const route = await requestJson<{ trip: ValhallaTrip }>("/route", {
    locations: [start, end],
    costing: "bicycle",
    costing_options: {
      bicycle: { bicycle_type: "hybrid", use_hills: useHills, use_roads: 0.2 },
    },
    directions_options: { units: "kilometers" },
  });

  const encodedShape = route.trip.legs.map((leg) => leg.shape).join("");
  let profile: ProfilePoint[] = [];
  try {
    const elevation = await requestJson<{ range_height?: [number, number | null][] }>("/height", {
      range: true,
      encoded_polyline: encodedShape,
      shape_format: "polyline6",
      resample_distance: 75,
      height_precision: 1,
    });
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
    coordinates: decodePolyline6(route.trip.legs[0].shape),
    distanceMeters: route.trip.summary.length * 1000,
    durationSeconds: route.trip.summary.time,
    detourPercent: 0,
    profile,
    ...metrics,
  };
}

function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const point = value as Point;
  return Number.isFinite(point.lat) && Number.isFinite(point.lon) && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { start, end } = body;
    const maxDetour = Math.min(100, Math.max(0, Number(body.maxDetour) || 30));
    const preferredGradient = Math.min(25, Math.max(1, Number(body.preferredGradient) || 8));
    if (!isPoint(start) || !isPoint(end)) {
      return NextResponse.json({ error: "Некорректные координаты точек" }, { status: 400 });
    }

    const requests = [
      buildCandidate("direct", "Direct", 0.65, start, end, preferredGradient),
      buildCandidate("balanced", "Balanced", 0.25, start, end, preferredGradient),
      buildCandidate("flattest", "Flattest", 0, start, end, preferredGradient),
    ];
    const settled = await Promise.allSettled(requests);
    const candidates = settled
      .filter((result): result is PromiseFulfilledResult<Candidate> => result.status === "fulfilled")
      .map((result) => result.value)
      .filter((candidate, index, all) => all.findIndex((item) => item.encodedShape === candidate.encodedShape) === index);

    if (!candidates.length) {
      const reason = settled.find((result) => result.status === "rejected");
      console.error("Valhalla routing failed", reason);
      return NextResponse.json(
        { error: "Маршрутизатор ещё не готов. Проверьте, что контейнер Valhalla закончил подготовку карты." },
        { status: 503 },
      );
    }

    const shortestDistance = Math.min(...candidates.map((candidate) => candidate.distanceMeters));
    candidates.forEach((candidate) => {
      candidate.detourPercent = ((candidate.distanceMeters - shortestDistance) / shortestDistance) * 100;
    });

    const byScore = (score: (candidate: Candidate) => number, pool = candidates) =>
      [...pool].sort((a, b) => score(a) - score(b))[0].id;
    const allowed = candidates.filter((candidate) => candidate.detourPercent <= maxDetour + 0.01);
    const elevationAware = (candidate: Candidate, ascentWeight: number, steepWeight: number) =>
      candidate.distanceMeters + (candidate.ascentMeters ?? 0) * ascentWeight + candidate.steepPenalty * steepWeight;

    const recommended = {
      direct: byScore((candidate) => candidate.distanceMeters),
      balanced: byScore((candidate) => elevationAware(candidate, 7, 0.02)),
      flattest: byScore(
        (candidate) => (candidate.ascentMeters ?? 0) * 100 + candidate.steepPenalty * 0.2 + candidate.distanceMeters * 0.05,
        allowed.length ? allowed : candidates,
      ),
    };

    const publicCandidates = candidates.map(({ encodedShape: _encodedShape, steepPenalty: _steepPenalty, ...candidate }) => candidate);
    return NextResponse.json({ routes: publicCandidates, recommended });
  } catch (error) {
    console.error("Route API error", error);
    return NextResponse.json({ error: "Не удалось связаться с маршрутизатором" }, { status: 502 });
  }
}
