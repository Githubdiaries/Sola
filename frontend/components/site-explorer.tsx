"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import maplibregl, { type Map, type MapLayerMouseEvent } from "maplibre-gl";
import { Filter, MapPin, Ruler, Zap } from "lucide-react";

type SiteProperties = {
  id: string;
  name: string;
  city: string;
  state?: string | null;
  asset_type: string;
  usable_area_sqm: number;
  annual_ghi_kwh_m2: number;
  flood_risk_score: number;
  grid_distance_km: number;
  suitability_score: number;
  estimated_capacity_kw?: number | null;
  estimated_annual_generation_kwh?: number | null;
  notes?: string | null;
};

export type SiteFeature = GeoJSON.Feature<GeoJSON.Polygon, SiteProperties>;

type SiteCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon, SiteProperties>;

type Filters = {
  city: string;
  minScore: number;
  minArea: number;
  assetType: string;
};

const emptyCollection: SiteCollection = {
  type: "FeatureCollection",
  features: [],
};

const numberFormatter = new Intl.NumberFormat("en-US");

const rasterStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

export function SiteExplorer({
  sites,
  usingSampleData,
}: {
  sites: SiteCollection;
  usingSampleData: boolean;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [selectedSite, setSelectedSite] = useState<SiteFeature | null>(sites.features[0] ?? null);
  const [filters, setFilters] = useState<Filters>({
    city: sites.features.some((site) => site.properties.city === "Thiruvananthapuram") ? "Thiruvananthapuram" : "all",
    minScore: 0,
    minArea: 0,
    assetType: "all",
  });

  const cities = useMemo(
    () => Array.from(new Set(sites.features.map((site) => site.properties.city))).sort(),
    [sites.features],
  );

  const assetTypes = useMemo(
    () => Array.from(new Set(sites.features.map((site) => site.properties.asset_type))).sort(),
    [sites.features],
  );

  const filteredFeatures = useMemo(() => {
    return sites.features.filter((site) => {
      const properties = site.properties;
      return (
        (filters.city === "all" || properties.city === filters.city) &&
        properties.suitability_score >= filters.minScore &&
        properties.usable_area_sqm >= filters.minArea &&
        (filters.assetType === "all" || properties.asset_type === filters.assetType)
      );
    });
  }, [filters, sites.features]);

  const filteredCollection = useMemo<SiteCollection>(
    () => ({
      ...emptyCollection,
      features: filteredFeatures,
    }),
    [filteredFeatures],
  );

  const topScore = filteredFeatures[0]?.properties.suitability_score ?? 0;
  const totalCapacityKw = filteredFeatures.reduce(
    (sum, site) => sum + (site.properties.estimated_capacity_kw ?? site.properties.usable_area_sqm / 10),
    0,
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: rasterStyle,
      center: [76.9366, 8.5241],
      zoom: 11,
      attributionControl: { compact: true },
    });

    mapRef.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    mapRef.current.on("load", () => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      map.addSource("solar-sites", {
        type: "geojson",
        data: filteredCollection,
      });

      map.addLayer({
        id: "solar-sites-fill",
        type: "fill",
        source: "solar-sites",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "suitability_score"],
            70,
            "#f59e0b",
            82,
            "#84cc16",
            90,
            "#10b981",
          ],
          "fill-opacity": 0.48,
        },
      });

      map.addLayer({
        id: "solar-sites-line",
        type: "line",
        source: "solar-sites",
        paint: {
          "line-color": "#ecfeff",
          "line-width": 2,
          "line-opacity": 0.95,
        },
      });

      map.on("click", "solar-sites-fill", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as SiteFeature | undefined;
        if (feature) {
          setSelectedSite(feature);
        }
      });

      map.on("mouseenter", "solar-sites-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "solar-sites-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      fitToSites(map, filteredFeatures);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("solar-sites") as maplibregl.GeoJSONSource | undefined;
    source?.setData(filteredCollection);

    if (map && map.isStyleLoaded()) {
      fitToSites(map, filteredFeatures);
    }

    setSelectedSite((current) => {
      if (current && filteredFeatures.some((feature) => feature.properties.id === current.properties.id)) {
        return current;
      }
      return filteredFeatures[0] ?? null;
    });
  }, [filteredCollection, filteredFeatures]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <section className="flex min-h-screen flex-col">
        <header className="border-b border-neutral-800 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">Sola</h1>
              <p className="mt-1 max-w-2xl text-sm text-neutral-300">
                Solar site intelligence for EPCs, developers, and commercial rooftop teams.
              </p>
              {usingSampleData ? (
                <p className="mt-2 text-xs text-amber-300">
                  Running on bundled sample site data while the backend is unavailable.
                </p>
              ) : null}
            </div>
            <div className="flex gap-2 text-sm text-neutral-300">
              <span className="rounded border border-neutral-700 px-3 py-2">PostGIS</span>
              <span className="rounded border border-neutral-700 px-3 py-2">MapLibre</span>
              <span className="rounded border border-neutral-700 px-3 py-2">Token-free</span>
            </div>
          </div>
        </header>

        <section className="grid flex-1 lg:grid-cols-[360px_1fr_380px]">
          <aside className="border-r border-neutral-800 bg-neutral-900 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric icon={<Zap size={17} />} label="Top score" value={topScore.toFixed(2)} />
              <Metric icon={<MapPin size={17} />} label="Sites" value={`${filteredFeatures.length}`} />
              <Metric icon={<Ruler size={17} />} label="Capacity" value={`${formatNumber(Math.round(totalCapacityKw))} kW`} wide />
            </div>

            <section className="mt-5 rounded border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-200">
                <Filter size={16} />
                Filters
              </div>

              <label className="text-xs text-neutral-400" htmlFor="city">
                City
              </label>
              <select
                id="city"
                value={filters.city}
                onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}
                className="mt-2 h-10 w-full rounded border border-neutral-700 bg-neutral-900 px-3 text-sm outline-none"
              >
                <option value="all">All cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              <label className="mt-4 block text-xs text-neutral-400" htmlFor="score">
                Minimum score: {filters.minScore}
              </label>
              <input
                id="score"
                type="range"
                min="0"
                max="100"
                value={filters.minScore}
                onChange={(event) => setFilters((current) => ({ ...current, minScore: Number(event.target.value) }))}
                className="mt-2 w-full accent-emerald-400"
              />

              <label className="mt-4 block text-xs text-neutral-400" htmlFor="area">
                Minimum usable area
              </label>
              <input
                id="area"
                type="number"
                min="0"
                value={filters.minArea}
                onChange={(event) => setFilters((current) => ({ ...current, minArea: Number(event.target.value) }))}
                className="mt-2 h-10 w-full rounded border border-neutral-700 bg-neutral-900 px-3 text-sm outline-none"
              />

              <label className="mt-4 block text-xs text-neutral-400" htmlFor="asset-type">
                Asset type
              </label>
              <select
                id="asset-type"
                value={filters.assetType}
                onChange={(event) => setFilters((current) => ({ ...current, assetType: event.target.value }))}
                className="mt-2 h-10 w-full rounded border border-neutral-700 bg-neutral-900 px-3 text-sm outline-none"
              >
                <option value="all">All asset types</option>
                {assetTypes.map((assetType) => (
                  <option key={assetType} value={assetType}>
                    {assetType.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </section>

            <section className="mt-5 max-h-[calc(100vh-360px)] overflow-auto rounded border border-neutral-800 bg-neutral-950">
              {filteredFeatures.map((feature) => (
                <button
                  key={feature.properties.id}
                  type="button"
                  onClick={() => {
                    setSelectedSite(feature);
                    flyToSite(mapRef.current, feature);
                  }}
                  className="block w-full border-b border-neutral-800 p-4 text-left transition hover:bg-neutral-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-medium">{feature.properties.name}</h2>
                      <p className="mt-1 text-xs text-neutral-400">{feature.properties.asset_type.replaceAll("_", " ")}</p>
                    </div>
                    <span className="rounded bg-emerald-400 px-2 py-1 text-xs font-semibold text-neutral-950">
                      {feature.properties.suitability_score}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-neutral-300">
                  {formatNumber(feature.properties.usable_area_sqm)} sqm usable area
                  </p>
                </button>
              ))}
            </section>
          </aside>

          <section className="relative min-h-[560px]">
            <div ref={mapContainerRef} className="absolute inset-0" />
            <div className="pointer-events-none absolute bottom-4 left-4 rounded border border-neutral-700 bg-neutral-950/90 px-3 py-2 text-xs text-neutral-300">
              OpenStreetMap tiles via MapLibre. Candidate areas are MVP screening polygons.
            </div>
          </section>

          <SiteDetail site={selectedSite} />
        </section>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded border border-neutral-800 bg-neutral-950 p-3 ${wide ? "col-span-2" : ""}`}>
      <div className="flex items-center gap-2 text-neutral-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function SiteDetail({ site }: { site: SiteFeature | null }) {
  if (!site) {
    return (
      <aside className="border-l border-neutral-800 bg-neutral-900 p-5">
        <p className="text-sm text-neutral-400">Select a candidate area to inspect project viability.</p>
      </aside>
    );
  }

  const properties = site.properties;
  const capacityKw = properties.estimated_capacity_kw ?? properties.usable_area_sqm / 10;
  const annualGeneration = properties.estimated_annual_generation_kwh ?? capacityKw * properties.annual_ghi_kwh_m2 * 0.78;

  return (
    <aside className="border-l border-neutral-800 bg-neutral-900">
      <div className="border-b border-neutral-800 p-5">
        <p className="text-xs uppercase text-neutral-500">{properties.city}</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight">{properties.name}</h2>
        <p className="mt-2 text-sm text-neutral-400">{properties.asset_type.replaceAll("_", " ")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5">
        <DetailMetric label="Score" value={properties.suitability_score.toFixed(2)} />
        <DetailMetric label="Usable area" value={`${formatNumber(properties.usable_area_sqm)} sqm`} />
        <DetailMetric label="Capacity" value={`${formatNumber(Math.round(capacityKw))} kW`} />
        <DetailMetric label="Annual yield" value={`${formatNumber(Math.round(annualGeneration))} kWh`} />
      </div>

      <dl className="space-y-4 border-t border-neutral-800 p-5 text-sm">
        <div>
          <dt className="text-neutral-500">Annual GHI</dt>
          <dd className="mt-1 text-neutral-100">{formatNumber(properties.annual_ghi_kwh_m2)} kWh/m2</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Flood risk</dt>
          <dd className="mt-1 text-neutral-100">{properties.flood_risk_score.toFixed(2)} / 1.00</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Grid distance</dt>
          <dd className="mt-1 text-neutral-100">{properties.grid_distance_km.toFixed(1)} km</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Notes</dt>
          <dd className="mt-1 leading-6 text-neutral-200">{properties.notes ?? "No notes provided."}</dd>
        </div>
      </dl>
    </aside>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-950 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function fitToSites(map: Map, features: SiteFeature[]) {
  const bounds = getFeatureBounds(features);
  if (!bounds) {
    return;
  }

  map.fitBounds(bounds, {
    padding: { top: 60, right: 60, bottom: 60, left: 60 },
    maxZoom: 14,
    duration: 900,
  });
}

function flyToSite(map: Map | null, feature: SiteFeature) {
  if (!map) {
    return;
  }

  const bounds = getFeatureBounds([feature]);
  if (!bounds) {
    return;
  }

  map.fitBounds(bounds, {
    padding: { top: 120, right: 120, bottom: 120, left: 120 },
    maxZoom: 16,
    duration: 700,
  });
}

function getFeatureBounds(features: SiteFeature[]) {
  const coordinates = features
    .flatMap((feature) => feature.geometry.coordinates.flat())
    .filter((coordinate): coordinate is [number, number] => coordinate.length >= 2);
  if (coordinates.length === 0) {
    return null;
  }

  const bounds = new maplibregl.LngLatBounds(coordinates[0], coordinates[0]);
  coordinates.forEach((coordinate) => bounds.extend(coordinate));
  return bounds;
}
