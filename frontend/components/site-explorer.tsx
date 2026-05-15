"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import maplibregl, { type Map, type MapLayerMouseEvent } from "maplibre-gl";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Database,
  Gauge,
  Grid2X2,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";

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
type PointFeature = GeoJSON.Feature<GeoJSON.Point, SiteProperties>;

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

const darkTileStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    cartoDark: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "OpenStreetMap contributors, CARTO",
    },
  },
  layers: [
    {
      id: "carto-dark",
      type: "raster",
      source: "cartoDark",
      paint: {
        "raster-opacity": 0.92,
        "raster-contrast": 0.12,
        "raster-saturation": -0.25,
      },
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
  const [hoveredSite, setHoveredSite] = useState<SiteFeature | null>(null);
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

  const pointCollection = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point, SiteProperties>>(
    () => ({
      type: "FeatureCollection",
      features: filteredFeatures.map((feature) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: getPolygonCenter(feature),
        },
        properties: feature.properties,
      })),
    }),
    [filteredFeatures],
  );

  const selectedId = selectedSite?.properties.id ?? "";
  const topScore = filteredFeatures[0]?.properties.suitability_score ?? 0;
  const highScoreCount = filteredFeatures.filter((site) => site.properties.suitability_score >= 85).length;
  const lowRiskCount = filteredFeatures.filter((site) => site.properties.flood_risk_score <= 0.35).length;
  const totalUsableArea = filteredFeatures.reduce((sum, site) => sum + site.properties.usable_area_sqm, 0);
  const totalCapacityKw = filteredFeatures.reduce(
    (sum, site) => sum + (site.properties.estimated_capacity_kw ?? site.properties.usable_area_sqm / 10),
    0,
  );
  const annualGeneration = filteredFeatures.reduce(
    (sum, site) =>
      sum +
      (site.properties.estimated_annual_generation_kwh ??
        (site.properties.estimated_capacity_kw ?? site.properties.usable_area_sqm / 10) *
          site.properties.annual_ghi_kwh_m2 *
          0.78),
    0,
  );
  const averageScore =
    filteredFeatures.length > 0
      ? filteredFeatures.reduce((sum, site) => sum + site.properties.suitability_score, 0) / filteredFeatures.length
      : 0;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: darkTileStyle,
      center: [76.9366, 8.5241],
      zoom: 11,
      attributionControl: { compact: true },
    });

    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    mapRef.current.on("load", () => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      map.addSource("solar-sites", {
        type: "geojson",
        data: filteredCollection,
      });

      map.addSource("solar-site-points", {
        type: "geojson",
        data: pointCollection,
      });

      map.addLayer({
        id: "solar-sites-fill",
        type: "fill",
        source: "solar-sites",
        paint: {
          "fill-color": scoreColorExpression(),
          "fill-opacity": ["case", ["==", ["get", "id"], selectedId], 0.56, 0.26],
        },
      });

      map.addLayer({
        id: "solar-sites-line",
        type: "line",
        source: "solar-sites",
        paint: {
          "line-color": scoreColorExpression(),
          "line-width": ["case", ["==", ["get", "id"], selectedId], 4, 2],
          "line-opacity": 0.98,
          "line-blur": 0.15,
        },
      });

      map.addLayer({
        id: "solar-site-glow",
        type: "circle",
        source: "solar-site-points",
        paint: {
          "circle-radius": ["case", ["==", ["get", "id"], selectedId], 18, 11],
          "circle-color": scoreColorExpression(),
          "circle-opacity": 0.28,
          "circle-blur": 0.7,
        },
      });

      map.addLayer({
        id: "solar-site-points",
        type: "circle",
        source: "solar-site-points",
        paint: {
          "circle-radius": ["case", ["==", ["get", "id"], selectedId], 8, 5],
          "circle-color": scoreColorExpression(),
          "circle-stroke-color": "#f8fafc",
          "circle-stroke-width": ["case", ["==", ["get", "id"], selectedId], 2.4, 1.2],
          "circle-opacity": 0.96,
        },
      });

      map.addLayer({
        id: "solar-site-labels",
        type: "symbol",
        source: "solar-site-points",
        layout: {
          "text-field": ["case", [">=", ["get", "suitability_score"], 85], ["get", "name"], ""],
          "text-size": 11,
          "text-offset": [0, 1.15],
          "text-anchor": "top",
          "text-max-width": 12,
        },
        paint: {
          "text-color": "#e5e7eb",
          "text-halo-color": "#030712",
          "text-halo-width": 1.4,
        },
      });

      const handleSelect = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as SiteFeature | PointFeature | undefined;
        if (!feature) {
          return;
        }

        const site = filteredFeatures.find((candidate) => candidate.properties.id === feature.properties.id);
        if (site) {
          setSelectedSite(site);
          flyToSite(map, site);
        }
      };

      map.on("click", "solar-sites-fill", handleSelect);
      map.on("click", "solar-site-points", handleSelect);

      const handleHover = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as SiteFeature | PointFeature | undefined;
        const site = filteredFeatures.find((candidate) => candidate.properties.id === feature?.properties.id);
        setHoveredSite(site ?? null);
        map.getCanvas().style.cursor = "pointer";
      };

      map.on("mousemove", "solar-sites-fill", handleHover);
      map.on("mousemove", "solar-site-points", handleHover);
      map.on("mouseleave", "solar-sites-fill", () => {
        setHoveredSite(null);
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseleave", "solar-site-points", () => {
        setHoveredSite(null);
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
    const polygonSource = map?.getSource("solar-sites") as maplibregl.GeoJSONSource | undefined;
    const pointSource = map?.getSource("solar-site-points") as maplibregl.GeoJSONSource | undefined;

    polygonSource?.setData(filteredCollection);
    pointSource?.setData(pointCollection);

    if (map && map.isStyleLoaded()) {
      setSelectionPaint(map, selectedId);
      fitToSites(map, filteredFeatures);
    }

    setSelectedSite((current) => {
      if (current && filteredFeatures.some((feature) => feature.properties.id === current.properties.id)) {
        return current;
      }
      return filteredFeatures[0] ?? null;
    });
  }, [filteredCollection, filteredFeatures, pointCollection, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    setSelectionPaint(map, selectedId);
  }, [selectedId]);

  return (
    <main className="sola-shell h-screen overflow-hidden bg-[#060a0f] text-slate-100">
      <div className="grid h-screen grid-cols-[52px_1fr]">
        <NavigationRail />

        <section className="flex min-w-0 flex-col overflow-hidden">
          <TopBar />

          <section className="grid grid-cols-6 gap-2 px-3 pb-2 pt-3">
            <Kpi title="Total Surfaces Analyzed" value={formatNumber(filteredFeatures.length * 1338)} delta="+ 12.4% vs last 30d" />
            <Kpi title="High Deployability Sites (>85%)" value={formatNumber(highScoreCount)} delta="+ 8.7% vs last 30d" />
            <Kpi title="Estimated Annual Yield" value={`${formatNumber(Math.round(annualGeneration / 1000))} MWh`} delta="+ 15.3% vs last 30d" />
            <Kpi title="Average Deployability Score" value={`${averageScore.toFixed(0)}%`} delta="+ 3.6% vs last 30d" />
            <Kpi title="High-Confidence Sites" value={formatNumber(lowRiskCount)} delta="+ 6.4% vs last 30d" />
            <Kpi title="Total Usable Area" value={`${formatCompact(totalUsableArea)} m²`} delta="+ 10.8% vs last 30d" />
          </section>

          <section className="grid min-h-0 flex-1 grid-cols-[220px_1fr_326px] grid-rows-[minmax(260px,1.8fr)_170px_150px] gap-2 px-3 pb-3">
            <FilterPanel
              assetTypes={assetTypes}
              cities={cities}
              filters={filters}
              setFilters={setFilters}
            />

            <MapPanel
              hoveredSite={hoveredSite}
              mapContainerRef={mapContainerRef}
              onFit={() => fitToSites(mapRef.current, filteredFeatures)}
            />

            <SiteIntelPanel site={selectedSite} />

            <RankedSitesTable
              features={filteredFeatures}
              selectedId={selectedId}
              onSelect={(site) => {
                setSelectedSite(site);
                flyToSite(mapRef.current, site);
              }}
            />

            <AggregationPanel features={filteredFeatures} />
            <ScoreCompositionPanel />
            <OverlayPanel />
            <SystemHealthPanel usingSampleData={usingSampleData} />
          </section>
        </section>
      </div>
    </main>
  );
}

function NavigationRail() {
  const items = [Search, Grid2X2, Zap, Bell, Settings, ShieldCheck];

  return (
    <aside className="flex flex-col items-center border-r border-white/10 bg-[#080d13] py-3">
      <div className="mb-5 flex h-8 w-8 items-center justify-center rounded bg-orange-500/10 text-orange-400">
        <Sparkles size={20} />
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {items.map((Icon, index) => (
          <button
            className={`flex h-9 w-9 items-center justify-center rounded text-slate-400 transition hover:bg-white/5 hover:text-slate-100 ${
              index === 1 ? "border-l-2 border-indigo-400 bg-indigo-500/10 text-indigo-200" : ""
            }`}
            key={index}
            type="button"
          >
            <Icon size={18} />
          </button>
        ))}
      </div>
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[11px]">AK</div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="flex h-10 items-center justify-between border-b border-white/10 bg-[#070b10] px-3">
      <div className="flex items-center gap-2 text-sm">
        <Grid2X2 size={15} className="text-slate-500" />
        <span className="text-slate-400">Solar Intel</span>
        <span className="text-slate-600">/</span>
        <span className="font-medium text-slate-100">Urban Solar Deployability - Thiruvananthapuram</span>
        <span className="text-amber-300">☆</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="rounded border border-white/10 bg-black/30 px-3 py-1.5">2026-05-01 00:00 to 2026-05-31 23:59</span>
        <button className="rounded border border-white/10 bg-black/30 p-1.5" type="button">
          <Search size={14} />
        </button>
        <button className="rounded border border-white/10 bg-black/30 p-1.5" type="button">
          <RefreshCw size={14} />
        </button>
        <span className="rounded border border-white/10 bg-black/30 px-2 py-1.5">5m</span>
      </div>
    </header>
  );
}

function Kpi({ title, value, delta }: { title: string; value: string; delta: string }) {
  return (
    <article className="sola-panel flex min-h-[96px] flex-col items-center justify-center px-3 text-center">
      <p className="text-xs font-medium text-slate-300">{title}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none text-white">{value}</p>
      <p className="mt-2 text-xs text-emerald-400">↑ {delta}</p>
    </article>
  );
}

function FilterPanel({
  assetTypes,
  cities,
  filters,
  setFilters,
}: {
  assetTypes: string[];
  cities: string[];
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}) {
  return (
    <section className="sola-panel col-start-1 row-start-1 min-h-0 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-100">Filters</h2>
        <button
          className="text-xs text-indigo-300"
          onClick={() => setFilters((current) => ({ ...current, minScore: 0, minArea: 0, assetType: "all" }))}
          type="button"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <SelectControl
          label="Region"
          value={filters.city}
          onChange={(value) => setFilters((current) => ({ ...current, city: value }))}
          options={[["all", "All regions"], ...cities.map((city) => [city, city] as [string, string])]}
        />
        <SelectControl
          label="Surface Type"
          value={filters.assetType}
          onChange={(value) => setFilters((current) => ({ ...current, assetType: value }))}
          options={[["all", "All"], ...assetTypes.map((type) => [type, type.replaceAll("_", " ")] as [string, string])]}
        />
        <SelectControl
          label="Deployability Score"
          value={`${filters.minScore}`}
          onChange={(value) => setFilters((current) => ({ ...current, minScore: Number(value) }))}
          options={[
            ["0", "All"],
            ["75", "75%+"],
            ["85", "85%+"],
            ["90", "90%+"],
          ]}
        />
        <SelectControl
          label="Usable Area"
          value={`${filters.minArea}`}
          onChange={(value) => setFilters((current) => ({ ...current, minArea: Number(value) }))}
          options={[
            ["0", "All"],
            ["8000", "8,000 m²+"],
            ["10000", "10,000 m²+"],
            ["20000", "20,000 m²+"],
          ]}
        />
      </div>

      <button className="mt-3 h-8 w-full rounded bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-950/40" type="button">
        Apply Filters
      </button>
    </section>
  );
}

function SelectControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-[1fr_1.18fr] items-center gap-2 text-slate-300">
      <span>{label}</span>
      <select
        className="h-8 rounded border border-white/10 bg-[#0b1118] px-2 text-xs text-slate-100 outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function MapPanel({
  hoveredSite,
  mapContainerRef,
  onFit,
}: {
  hoveredSite: SiteFeature | null;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  onFit: () => void;
}) {
  return (
    <section className="sola-panel relative col-start-2 row-start-1 min-h-0 overflow-hidden">
      <div className="absolute left-3 top-2 z-10 text-xs font-semibold text-slate-100">Deployability Heatmap</div>
      <div className="absolute right-3 top-3 z-10 flex h-8 w-[220px] items-center gap-2 rounded border border-white/10 bg-[#0a1118]/90 px-2 text-xs text-slate-500">
        <Search size={14} />
        Search location
      </div>
      <div className="absolute left-3 top-10 z-10 flex flex-col gap-2">
        <button className="map-tool" onClick={onFit} type="button">＋</button>
        <button className="map-tool" type="button">－</button>
        <button className="map-tool" type="button"><Layers size={15} /></button>
      </div>
      <div ref={mapContainerRef} className="absolute inset-0" />
      <div className="absolute bottom-4 left-4 z-10 w-[220px] rounded border border-white/10 bg-[#070b10]/90 p-3 shadow-2xl">
        <p className="mb-2 text-xs text-slate-200">Deployability Score</p>
        <div className="h-2 rounded bg-gradient-to-r from-red-500 via-amber-400 via-60% to-emerald-400" />
        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
          <span>0%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
      {hoveredSite ? (
        <div className="absolute right-20 top-[36%] z-10 w-[220px] rounded border border-white/10 bg-[#080d13]/95 p-3 text-xs shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-slate-100">{hoveredSite.properties.name}</span>
            <ScorePill value={hoveredSite.properties.suitability_score} />
          </div>
          <InfoRow label="Usable Area" value={`${formatNumber(hoveredSite.properties.usable_area_sqm)} m²`} />
          <InfoRow label="Est. Capacity" value={`${formatNumber(Math.round(hoveredSite.properties.estimated_capacity_kw ?? 0))} kW`} />
          <InfoRow label="Flood Resilience" value={`${Math.round((1 - hoveredSite.properties.flood_risk_score) * 100)}%`} />
          <InfoRow label="Grid Distance" value={`${hoveredSite.properties.grid_distance_km.toFixed(1)} km`} />
        </div>
      ) : null}
    </section>
  );
}

function SiteIntelPanel({ site }: { site: SiteFeature | null }) {
  if (!site) {
    return (
      <section className="sola-panel col-start-3 row-start-1 min-h-0 p-3">
        <h2 className="text-xs font-semibold text-slate-100">Selected Site Intelligence</h2>
        <p className="mt-4 text-sm text-slate-500">Select a marker or ranked site.</p>
      </section>
    );
  }

  const properties = site.properties;
  const capacityScore = Math.min(Math.round((properties.usable_area_sqm / 20000) * 100), 96);
  const solarScore = Math.min(Math.round(((properties.annual_ghi_kwh_m2 - 1300) / 800) * 100), 96);
  const floodScore = Math.round((1 - properties.flood_risk_score) * 100);
  const gridScore = Math.round((1 - Math.min(properties.grid_distance_km / 10, 1)) * 100);
  const confidence = Math.round((capacityScore + solarScore + floodScore + gridScore) / 4);

  return (
    <section className="sola-panel col-start-3 row-start-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <h2 className="text-xs font-semibold text-slate-100">Selected Site Intelligence</h2>
        <Share2 size={14} className="text-slate-500" />
      </div>
      <div className="p-3">
        <p className="text-xs text-slate-400">{properties.name}</p>
        <div className="mt-3">
          <p className="text-xs text-slate-300">Overall Deployability</p>
          <div className="mt-1 flex items-end gap-1">
            <span className="text-4xl font-bold text-emerald-400">{properties.suitability_score.toFixed(0)}</span>
            <span className="mb-1 text-xl text-emerald-400">%</span>
          </div>
          <Progress value={properties.suitability_score} />
        </div>

        <div className="mt-4 space-y-3">
          <Breakdown label="Surface Capacity" value={capacityScore} />
          <Breakdown label="Solar Exposure" value={solarScore} />
          <Breakdown label="Flood Resilience" value={floodScore} warning={floodScore < 70} />
          <Breakdown label="Grid Accessibility" value={gridScore} warning={gridScore < 70} />
          <Breakdown label="Data Confidence" value={confidence} />
        </div>

        <button className="mt-4 h-8 w-full rounded bg-indigo-500 text-xs font-semibold text-white" type="button">
          View Full Site Analysis
        </button>
      </div>
    </section>
  );
}

function RankedSitesTable({
  features,
  selectedId,
  onSelect,
}: {
  features: SiteFeature[];
  selectedId: string;
  onSelect: (site: SiteFeature) => void;
}) {
  return (
    <section className="sola-panel col-span-2 col-start-1 row-start-2 min-h-0 overflow-hidden">
      <PanelTitle title="Ranked Sites" />
      <div className="px-3 pb-3">
        <table className="w-full table-fixed text-xs">
          <thead className="text-left text-slate-400">
            <tr className="border-b border-white/10">
              <th className="w-10 py-2">Rank</th>
              <th>Site</th>
              <th className="w-24">Score</th>
              <th className="w-24">Area</th>
              <th className="w-24">Grid</th>
            </tr>
          </thead>
          <tbody>
            {features.slice(0, 8).map((site, index) => (
              <tr
                className={`cursor-pointer border-b border-white/5 text-slate-200 hover:bg-white/5 ${
                  selectedId === site.properties.id ? "bg-emerald-500/8" : ""
                }`}
                key={site.properties.id}
                onClick={() => onSelect(site)}
              >
                <td className="py-1.5 text-slate-400">{index + 1}</td>
                <td className="truncate pr-3">{site.properties.name}</td>
                <td><ScoreBarMini value={site.properties.suitability_score} /></td>
                <td>{formatCompact(site.properties.usable_area_sqm)} m²</td>
                <td>{site.properties.grid_distance_km.toFixed(1)} km</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AggregationPanel({ features }: { features: SiteFeature[] }) {
  const bars = features.slice(0, 5).map((site) => ({
    label: site.properties.name.split(" ").slice(0, 2).join(" "),
    value: site.properties.estimated_annual_generation_kwh ?? 0,
  }));
  const max = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <section className="sola-panel col-start-3 row-start-2 min-h-0 p-3">
      <PanelTitle title="Aggregation Clusters" flush />
      <div className="mt-4 flex h-[130px] items-end gap-3">
        {bars.map((bar, index) => (
          <div className="flex flex-1 flex-col items-center gap-2" key={bar.label}>
            <div
              className="w-full rounded-t bg-gradient-to-t from-indigo-600 to-emerald-400"
              style={{ height: `${Math.max((bar.value / max) * 100, 12)}%` }}
            />
            <span className="max-w-[58px] truncate text-[10px] text-slate-400">{bar.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreCompositionPanel() {
  return (
    <section className="sola-panel col-start-1 row-start-3 min-h-0 p-3">
      <PanelTitle title="Deployability Score Composition" flush />
      <div className="mt-4 grid grid-cols-[112px_1fr] items-center gap-3">
        <div className="donut-chart grid h-28 w-28 place-items-center rounded-full">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[#080d13] text-center text-[10px] text-slate-200">
            Score<br />Mix
          </div>
        </div>
        <div className="space-y-2 text-xs">
          <LegendLine color="#22c55e" label="Surface Capacity" value="28%" />
          <LegendLine color="#eab308" label="Solar Exposure" value="24%" />
          <LegendLine color="#3b82f6" label="Flood Resilience" value="15%" />
          <LegendLine color="#a855f7" label="Grid Accessibility" value="18%" />
          <LegendLine color="#ef4444" label="Urban Compatibility" value="10%" />
        </div>
      </div>
    </section>
  );
}

function OverlayPanel() {
  return (
    <section className="sola-panel col-start-2 row-start-3 min-h-0 p-3">
      <PanelTitle title="Infrastructure Overlay" flush />
      <div className="mt-3 space-y-2 text-xs text-slate-300">
        <ToggleRow label="Substations" enabled />
        <ToggleRow label="Transmission Lines" enabled color="yellow" />
        <ToggleRow label="Industrial Zones" enabled color="purple" />
        <ToggleRow label="Major Roads" enabled color="green" />
      </div>
      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-xs text-slate-400">Average Grid Distance</p>
        <div className="mt-2 flex items-end justify-between">
          <span className="text-3xl font-semibold text-white">2.9 km</span>
          <span className="sparkline" />
        </div>
      </div>
    </section>
  );
}

function YieldTrendPanel() {
  const points = [18, 22, 28, 31, 35, 39, 43, 41, 48, 52, 57, 61, 58, 64, 71, 77, 51];
  return (
    <section className="sola-panel col-span-2 min-h-0 p-3">
      <PanelTitle title="Estimated Annual Yield Over Time (GWh)" flush />
      <MiniLine points={points} />
    </section>
  );
}

function DistributionPanel({ features }: { features: SiteFeature[] }) {
  const bins = [0, 0, 0, 0, 0, 0];
  features.forEach((site) => {
    const score = site.properties.suitability_score;
    const index = score >= 90 ? 5 : score >= 85 ? 4 : score >= 80 ? 3 : score >= 75 ? 2 : score >= 70 ? 1 : 0;
    bins[index] += 1;
  });
  const max = Math.max(...bins, 1);

  return (
    <section className="sola-panel col-start-3 row-start-3 min-h-0 p-3">
      <PanelTitle title="Deployability Score Distribution" flush />
      <div className="mt-4 flex h-[94px] items-end gap-2">
        {bins.map((value, index) => (
          <div className="flex flex-1 flex-col items-center gap-1" key={index}>
            <div
              className="w-full rounded-t"
              style={{
                height: `${Math.max((value / max) * 100, 8)}%`,
                background: `linear-gradient(to top, ${index < 2 ? "#ef4444" : index < 4 ? "#eab308" : "#22c55e"}, #86efac)`,
              }}
            />
            <span className="text-[10px] text-slate-500">{index * 10 + 50}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AlertsPanel() {
  const alerts = [
    ["High Flood Risk Detected", "Medical College", "High"],
    ["Low Confidence Score", "TVM-154", "Medium"],
    ["Grid Distance High", "Lulu Attingal", "Medium"],
  ];

  return (
    <section className="sola-panel min-h-0 p-3">
      <PanelTitle title="Alerts" flush />
      <div className="mt-3 space-y-2">
        {alerts.map(([title, subtitle, severity]) => (
          <div className="grid grid-cols-[18px_1fr_auto] items-center gap-2 text-xs" key={title}>
            <AlertTriangle size={14} className={severity === "High" ? "text-red-400" : "text-amber-400"} />
            <div>
              <p className="text-slate-200">{title}</p>
              <p className="text-[10px] text-slate-500">{subtitle}</p>
            </div>
            <span className="rounded bg-white/5 px-2 py-1 text-[10px] text-slate-300">{severity}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SystemHealthPanel({ usingSampleData }: { usingSampleData: boolean }) {
  return (
    <section className="sola-panel min-h-0 p-3">
      <PanelTitle title="System Health" flush />
      <div className="mt-3 space-y-2 text-xs">
        <HealthRow label="PostGIS Database" status="Healthy" />
        <HealthRow label="Tile Server" status="Healthy" />
        <HealthRow label="Data Ingestion" status={usingSampleData ? "Sample" : "Healthy"} warning={usingSampleData} />
        <HealthRow label="API Gateway" status="Healthy" />
      </div>
    </section>
  );
}

function PanelTitle({ title, flush = false }: { title: string; flush?: boolean }) {
  return <h2 className={`text-xs font-semibold text-slate-100 ${flush ? "" : "px-3 py-2"}`}>{title}</h2>;
}

function ScorePill({ value }: { value: number }) {
  return <span className="rounded bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-[#06100b]">{value.toFixed(0)}%</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1 flex justify-between gap-3 text-slate-300">
      <span>{label}</span>
      <span className="font-medium text-slate-100">{value}</span>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="mt-3 h-3 rounded bg-slate-800">
      <div className="h-3 rounded bg-gradient-to-r from-emerald-500 to-lime-400" style={{ width: `${value}%` }} />
    </div>
  );
}

function Breakdown({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_112px_34px] items-center gap-2 text-xs">
      <span className="truncate text-slate-300">{label}</span>
      <div className="h-2 rounded bg-slate-800">
        <div className={`h-2 rounded ${warning ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${value}%` }} />
      </div>
      <span className={warning ? "text-amber-300" : "text-emerald-300"}>{value}%</span>
    </div>
  );
}

function ScoreBarMini({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 rounded bg-emerald-400/90 text-center text-[10px] font-semibold text-[#06100b]">{value.toFixed(0)}%</span>
      <div className="h-2 flex-1 rounded bg-slate-800">
        <div className="h-2 rounded bg-emerald-400" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function LegendLine({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[10px_1fr_auto] items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span className="truncate text-slate-300">{label}</span>
      <span className="text-slate-400">{value}</span>
    </div>
  );
}

function ToggleRow({ label, enabled, color = "blue" }: { label: string; enabled: boolean; color?: "blue" | "yellow" | "purple" | "green" }) {
  const colorMap = {
    blue: "accent-indigo-400",
    yellow: "accent-yellow-400",
    purple: "accent-purple-400",
    green: "accent-emerald-400",
  };

  return (
    <label className="flex items-center justify-between">
      <span>{label}</span>
      <input checked={enabled} className={colorMap[color]} readOnly type="checkbox" />
    </label>
  );
}

function HealthRow({ label, status, warning = false }: { label: string; status: string; warning?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={warning ? "text-amber-300" : "text-emerald-400"}>{status}</span>
    </div>
  );
}

function MiniLine({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const coords = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - ((point - min) / (max - min || 1)) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="mt-2 h-[104px] w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      <polyline fill="none" points={coords} stroke="#22c55e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function setSelectionPaint(map: Map, selectedId: string) {
  if (!map.getLayer("solar-sites-fill")) {
    return;
  }

  map.setPaintProperty("solar-sites-fill", "fill-opacity", ["case", ["==", ["get", "id"], selectedId], 0.56, 0.26]);
  map.setPaintProperty("solar-sites-line", "line-width", ["case", ["==", ["get", "id"], selectedId], 4, 2]);
  map.setPaintProperty("solar-site-glow", "circle-radius", ["case", ["==", ["get", "id"], selectedId], 18, 11]);
  map.setPaintProperty("solar-site-points", "circle-radius", ["case", ["==", ["get", "id"], selectedId], 8, 5]);
  map.setPaintProperty("solar-site-points", "circle-stroke-width", ["case", ["==", ["get", "id"], selectedId], 2.4, 1.2]);
}

function scoreColorExpression() {
  return [
    "interpolate",
    ["linear"],
    ["get", "suitability_score"],
    70,
    "#ef4444",
    78,
    "#f59e0b",
    84,
    "#a3e635",
    90,
    "#22c55e",
  ] as maplibregl.ExpressionSpecification;
}

function getPolygonCenter(feature: SiteFeature): [number, number] {
  const coordinates = feature.geometry.coordinates.flat();
  const total = coordinates.reduce(
    (sum, coordinate) => [sum[0] + coordinate[0], sum[1] + coordinate[1]],
    [0, 0],
  );
  return [total[0] / coordinates.length, total[1] / coordinates.length];
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return formatNumber(Math.round(value));
}

function fitToSites(map: Map | null, features: SiteFeature[]) {
  if (!map) {
    return;
  }

  const bounds = getFeatureBounds(features);
  if (!bounds) {
    return;
  }

  map.fitBounds(bounds, {
    padding: { top: 58, right: 52, bottom: 52, left: 52 },
    maxZoom: 13.6,
    duration: 800,
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
    padding: { top: 150, right: 150, bottom: 150, left: 150 },
    maxZoom: 16,
    duration: 650,
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
