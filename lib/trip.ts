// GAP / C&O Canal bike trip: Pittsburgh -> Washington DC, ~6 days.
// Each day goes from one waypoint to the next, so each city (except the very
// first/last) is both an "end" of one day and the "start" of the next.

export type Waypoint = {
  key: string;
  name: string;
  region: string; // state, for disambiguation
  lat: number;
  lon: number;
};

export type TripDay = {
  day: number;
  label: string;
  startKey: string;
  endKey: string;
  miles: number;
  elevationFt: number;
  surface: string;
};

// Ordered list of waypoints along the route (NW -> SE).
export const WAYPOINTS: Waypoint[] = [
  { key: "pittsburgh", name: "Pittsburgh", region: "PA", lat: 40.4406, lon: -79.9959 },
  { key: "smithton", name: "Smithton", region: "PA", lat: 40.1517, lon: -79.7401 },
  { key: "ohiopyle", name: "Ohiopyle", region: "PA", lat: 39.8692, lon: -79.4926 },
  { key: "frostburg", name: "Frostburg", region: "MD", lat: 39.6579, lon: -78.9281 },
  { key: "littleorleans", name: "Little Orleans", region: "MD", lat: 39.6354, lon: -78.3848 },
  { key: "sharpsburg", name: "Sharpsburg", region: "MD", lat: 39.4576, lon: -77.7486 },
  { key: "dc", name: "Washington", region: "DC", lat: 38.9072, lon: -77.0369 },
];

export const TRIP_DAYS: TripDay[] = [
  { day: 1, label: "Pitt to Smithton", startKey: "pittsburgh", endKey: "smithton", miles: 41, elevationFt: 1169, surface: "Mixed Surfaces" },
  { day: 2, label: "Smithton to Ohiopyle", startKey: "smithton", endKey: "ohiopyle", miles: 45.2, elevationFt: 2553, surface: "Mostly Unpaved" },
  { day: 3, label: "Ohiopyle to Frostburg", startKey: "ohiopyle", endKey: "frostburg", miles: 56.6, elevationFt: 2748, surface: "Mostly Unpaved" },
  { day: 4, label: "Frostburg to Little Orleans", startKey: "frostburg", endKey: "littleorleans", miles: 59.4, elevationFt: 788, surface: "Mostly Unpaved" },
  { day: 5, label: "Little Orleans to Sharpsburg", startKey: "littleorleans", endKey: "sharpsburg", miles: 66, elevationFt: 1089, surface: "Mostly Unpaved" },
  { day: 6, label: "Sharpsburg to DC", startKey: "sharpsburg", endKey: "dc", miles: 72.4, elevationFt: 676, surface: "Unknown" },
];

export function waypointByKey(key: string): Waypoint | undefined {
  return WAYPOINTS.find((w) => w.key === key);
}

// Trip start date (YYYY-MM-DD) from env, used to map calendar dates to "Day N".
export function tripStartDate(): string | null {
  const raw = process.env.TRIP_START_DATE?.trim();
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}
