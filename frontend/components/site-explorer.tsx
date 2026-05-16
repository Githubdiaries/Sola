"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map, type MapLayerMouseEvent } from "maplibre-gl";
import { CheckCircle2, Gauge, GripHorizontal, MapPin, Minus, Plus, Search, SlidersHorizontal } from "lucide-react";

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
  query: string;
};

const numberFormatter = new Intl.NumberFormat("en-US");

const emptyCollection: SiteCollection = {
  type: "FeatureCollection",
  features: [],
};

const mapStyle: maplibregl.StyleSpecification = {
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
        "raster-opacity": 0.96,
        "raster-contrast": 0.08,
        "raster-saturation": -0.18,
      },
    },
  ],
};

export function SiteExplorer({ sites, usingSampleData }: { sites: SiteCollection; usingSampleData: boolean }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [selectedSite, setSelectedSite] = useState<SiteFeature | null>(sites.features[0] ?? null);
  const [hoveredSite, setHoveredSite] = useState<SiteFeature | null>(null);
  const [mapZoom, setMapZoom] = useState(11);
  const [rankedHeight, setRankedHeight] = useState(340);
  const [filters, setFilters] = useState<Filters>({
    city: sites.features.some((site) => site.properties.city === "Thiruvananthapuram") ? "Thiruvananthapuram" : "all",
    minScore: 0,
    minArea: 0,
    assetType: "all",
    query: "",
  });

  const cities = useMemo(() => Array.from(new Set(sites.features.map((site) => site.properties.city))).sort(), [sites.features]);
  const assetTypes = useMemo(
    () => Array.from(new Set(sites.features.map((site) => site.properties.asset_type))).sort(),
    [sites.features],
  );

  const filteredFeatures = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    return sites.features.filter((site) => {
      const properties = site.properties;
      const matchesQuery =
        !query ||
        properties.name.toLowerCase().includes(query) ||
        properties.asset_type.toLowerCase().includes(query) ||
        properties.city.toLowerCase().includes(query);

      return (
        matchesQuery &&
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
  const topSite = filteredFeatures[0] ?? null;
  const totalArea = filteredFeatures.reduce((sum, site) => sum + site.properties.usable_area_sqm, 0);
  const totalCapacityKw = filteredFeatures.reduce(
    (sum, site) => sum + (site.properties.estimated_capacity_kw ?? site.properties.usable_area_sqm / 10),
    0,
  );
  const totalAnnualMwh = filteredFeatures.reduce(
    (sum, site) => sum + (site.properties.estimated_annual_generation_kwh ?? 0) / 1000,
    0,
  );
  const nearGridCount = filteredFeatures.filter((site) => site.properties.grid_distance_km <= 2).length;
  const lowFloodRiskCount = filteredFeatures.filter((site) => site.properties.flood_risk_score <= 0.35).length;
  const avgScore =
    filteredFeatures.length > 0
      ? filteredFeatures.reduce((sum, site) => sum + site.properties.suitability_score, 0) / filteredFeatures.length
      : 0;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [76.9366, 8.5241],
      zoom: 11,
      pitch: 18,
      attributionControl: { compact: true },
    });

    mapRef.current = map;
    map.on("zoom", () => setMapZoom(Number(map.getZoom().toFixed(2))));

    map.on("load", () => {
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
          "fill-opacity": ["case", ["==", ["get", "id"], selectedId], 0.64, 0.38],
        },
      });

      map.addLayer({
        id: "solar-sites-line",
        type: "line",
        source: "solar-sites",
        paint: {
          "line-color": scoreColorExpression(),
          "line-width": ["case", ["==", ["get", "id"], selectedId], 4.6, 2.8],
          "line-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "solar-site-glow",
        type: "circle",
        source: "solar-site-points",
        paint: {
          "circle-radius": ["case", ["==", ["get", "id"], selectedId], 30, 18],
          "circle-color": scoreColorExpression(),
          "circle-opacity": 0.3,
          "circle-blur": 0.72,
        },
      });

      map.addLayer({
        id: "solar-site-points",
        type: "circle",
        source: "solar-site-points",
        paint: {
          "circle-radius": ["case", ["==", ["get", "id"], selectedId], 8, 5.5],
          "circle-color": scoreColorExpression(),
          "circle-stroke-color": "#f8fafc",
          "circle-stroke-width": ["case", ["==", ["get", "id"], selectedId], 2.8, 1.3],
          "circle-opacity": 0.98,
        },
      });

      map.addLayer({
        id: "solar-site-labels",
        type: "symbol",
        source: "solar-site-points",
        layout: {
          "text-field": ["case", [">=", ["get", "suitability_score"], 85], ["get", "name"], ""],
          "text-size": 11,
          "text-offset": [0, 1.25],
          "text-anchor": "top",
          "text-max-width": 14,
        },
        paint: {
          "text-color": "#e5e7eb",
          "text-halo-color": "#020617",
          "text-halo-width": 1.4,
        },
      });

      const selectFeature = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as SiteFeature | PointFeature | undefined;
        const site = filteredFeatures.find((candidate) => candidate.properties.id === feature?.properties.id);
        if (site) {
          setSelectedSite(site);
          flyToSite(map, site);
        }
      };

      const hoverFeature = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as SiteFeature | PointFeature | undefined;
        const site = filteredFeatures.find((candidate) => candidate.properties.id === feature?.properties.id);
        setHoveredSite(site ?? null);
        map.getCanvas().style.cursor = site ? "pointer" : "";
      };

      map.on("click", "solar-sites-fill", selectFeature);
      map.on("click", "solar-site-points", selectFeature);
      map.on("mousemove", "solar-sites-fill", hoverFeature);
      map.on("mousemove", "solar-site-points", hoverFeature);
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
      map.remove();
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
      updateSelectionPaint(map, selectedId);
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
    if (map && map.isStyleLoaded()) {
      updateSelectionPaint(map, selectedId);
    }
  }, [selectedId]);

  return (
    <main className="min-h-screen bg-[#06110d] text-[#e9f7ef] xl:h-screen xl:overflow-hidden">
      <div className="sola-grid-bg min-h-screen xl:h-screen">
        <header className="mx-auto flex h-[72px] w-full max-w-[1560px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-300/12 text-sm font-semibold text-emerald-100 shadow-[0_0_28px_rgba(52,211,153,0.16)]">
              S
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-emerald-100/58">Sola / Urban Solar Deployability</p>
              <h1 className="truncate text-base font-semibold text-white sm:text-xl">Thiruvananthapuram Solar Intel</h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs text-emerald-50/70 lg:flex">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">PostGIS live</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">MapLibre token-free</span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-emerald-100">
              {filteredFeatures.length} active sites
            </span>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-[1560px] gap-4 px-4 pb-4 sm:px-6 xl:h-[calc(100vh-72px)] xl:grid-cols-[310px_minmax(0,1fr)_350px]">
          <aside className="flex min-h-0 flex-col gap-4 xl:h-full xl:overflow-auto xl:pr-1">
            <HeroPanel
              avgScore={avgScore}
              nearGridCount={nearGridCount}
              topScore={topSite?.properties.suitability_score ?? 0}
              totalArea={totalArea}
            />
            <ControlPanel
              assetTypes={assetTypes}
              cities={cities}
              filters={filters}
              setFilters={setFilters}
            />
            <RankedList
              features={filteredFeatures}
              height={rankedHeight}
              onResize={setRankedHeight}
              selectedId={selectedId}
              onSelect={(site) => {
                setSelectedSite(site);
                flyToSite(mapRef.current, site);
              }}
            />
          </aside>

          <section className="grid min-h-[720px] min-w-0 grid-rows-[auto_minmax(520px,1fr)] gap-4 xl:h-full xl:min-h-0">
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Deployability" value={`${avgScore.toFixed(1)}%`} tone="green" />
              <Metric label="Usable Area" value={`${formatCompact(totalArea)} m2`} />
              <Metric label="Est. DC" value={`${formatCompact(totalCapacityKw)} kW`} />
              <Metric label="Annual Yield" value={`${formatCompact(totalAnnualMwh)} MWh`} />
            </div>

            <section className="min-h-[520px] overflow-hidden rounded-[30px] border border-white/10 bg-[#07140f] shadow-2xl shadow-black/35">
              <MapWorkspace
                hoveredSite={hoveredSite}
                mapContainerRef={mapContainerRef}
                onFit={() => fitToSites(mapRef.current, filteredFeatures)}
                onZoomChange={(zoom) => setMapZoomLevel(mapRef.current, zoom)}
                onZoomDelta={(delta) => setMapZoomLevel(mapRef.current, mapZoom + delta)}
                zoom={mapZoom}
              />
            </section>
          </section>

          <aside className="flex min-h-0 flex-col gap-4 xl:h-full xl:overflow-auto xl:pl-1">
            <SiteDetail site={selectedSite} />
            <OpportunityCard lowFloodRiskCount={lowFloodRiskCount} nearGridCount={nearGridCount} topSite={topSite} />
            <PipelineCard features={filteredFeatures} usingSampleData={usingSampleData} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function HeroPanel({
  avgScore,
  nearGridCount,
  topScore,
  totalArea,
}: {
  avgScore: number;
  nearGridCount: number;
  topScore: number;
  totalArea: number;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#081610]/88 p-4 shadow-2xl shadow-black/25">
      <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
        <CheckCircle2 size={14} />
        MVP territory ready
      </p>
      <h2 className="mt-4 text-2xl font-semibold leading-tight text-white">
        Find viable rooftops before the first sales call.
      </h2>
      <p className="mt-3 text-sm leading-6 text-emerald-50/62">
        Rank commercial roofs by area, solar exposure, flood risk, and grid proximity in one map-first workspace.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Top" value={`${topScore.toFixed(0)}%`} />
        <MiniStat label="Avg" value={`${avgScore.toFixed(0)}%`} />
        <MiniStat label="Grid" value={`${nearGridCount}`} />
      </div>
      <div className="mt-3 rounded-2xl border border-white/10 bg-black/16 px-3 py-2 text-xs text-emerald-100/58">
        {formatCompact(totalArea)} m2 deployable surface in current filters
      </div>
    </section>
  );
}

function ControlPanel({
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
    <section className="rounded-[24px] border border-white/10 bg-[#081610]/85 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <SlidersHorizontal size={16} />
          Filters
        </div>
        <button
          className="text-xs text-emerald-200/70 hover:text-emerald-100"
          onClick={() => setFilters((current) => ({ ...current, minScore: 0, minArea: 0, assetType: "all", query: "" }))}
          type="button"
        >
          Reset
        </button>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/40" size={15} />
        <input
          className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-white outline-none placeholder:text-emerald-100/35 focus:border-emerald-300/40"
          onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
          placeholder="Search sites"
          value={filters.query}
        />
      </label>

      <div className="mt-4 space-y-3">
        <SelectField
          label="City"
          onChange={(value) => setFilters((current) => ({ ...current, city: value }))}
          options={[["all", "All cities"], ...cities.map((city) => [city, city] as [string, string])]}
          value={filters.city}
        />
        <SelectField
          label="Asset type"
          onChange={(value) => setFilters((current) => ({ ...current, assetType: value }))}
          options={[["all", "All types"], ...assetTypes.map((type) => [type, type.replaceAll("_", " ")] as [string, string])]}
          value={filters.assetType}
        />
        <SelectField
          label="Minimum score"
          onChange={(value) => setFilters((current) => ({ ...current, minScore: Number(value) }))}
          options={[
            ["0", "Any score"],
            ["75", "75%+"],
            ["85", "85%+"],
            ["90", "90%+"],
          ]}
          value={`${filters.minScore}`}
        />
        <SelectField
          label="Minimum area"
          onChange={(value) => setFilters((current) => ({ ...current, minArea: Number(value) }))}
          options={[
            ["0", "Any area"],
            ["8000", "8,000 m2+"],
            ["10000", "10,000 m2+"],
            ["20000", "20,000 m2+"],
          ]}
          value={`${filters.minArea}`}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <QuickButton label="High score" onClick={() => setFilters((current) => ({ ...current, minScore: 85 }))} />
        <QuickButton label="Large roof" onClick={() => setFilters((current) => ({ ...current, minArea: 10000 }))} />
      </div>
    </section>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-emerald-100/50">{label}</span>
      <select
        className="mt-1 h-10 w-full rounded-2xl border border-white/10 bg-[#0b1b14] px-3 text-sm text-emerald-50 outline-none focus:border-emerald-300/40"
        onChange={(event) => onChange(event.target.value)}
        value={value}
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

function QuickButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="h-10 rounded-2xl border border-emerald-300/20 bg-emerald-300/8 text-sm text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-300/14"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function RankedList({
  features,
  height,
  onResize,
  onSelect,
  selectedId,
}: {
  features: SiteFeature[];
  height: number;
  onResize: (height: number) => void;
  onSelect: (site: SiteFeature) => void;
  selectedId: string;
}) {
  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = height;

    const move = (moveEvent: PointerEvent) => {
      const nextHeight = startHeight + moveEvent.clientY - startY;
      onResize(Math.max(260, Math.min(520, nextHeight)));
    };

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  return (
    <section className="relative shrink-0 rounded-[24px] border border-white/10 bg-[#081610]/85 p-3" style={{ height }}>
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-white">Ranked candidates</h3>
        <span className="text-xs text-emerald-100/50">{features.length} sites / drag</span>
      </div>
      <div className="space-y-2 overflow-auto pr-1" style={{ height: height - 58 }}>
        {features.map((site, index) => (
          <button
            className={`w-full rounded-2xl border p-3 text-left transition ${
              selectedId === site.properties.id
                ? "border-emerald-300/55 bg-emerald-300/12"
                : "border-white/8 bg-black/14 hover:border-emerald-300/30"
            }`}
            key={site.properties.id}
            onClick={() => onSelect(site)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-100/40">Rank {index + 1}</p>
                <h4 className="mt-1 text-sm font-medium leading-5 text-white">{site.properties.name}</h4>
              </div>
              <ScoreChip value={site.properties.suitability_score} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-emerald-100/55">
              <span>{formatCompact(site.properties.usable_area_sqm)} m2</span>
              <span>{site.properties.grid_distance_km.toFixed(1)} km grid</span>
            </div>
          </button>
        ))}
      </div>
      <div
        aria-label="Resize ranked candidates"
        className="absolute bottom-0 left-4 right-4 flex h-8 cursor-row-resize items-end justify-center rounded-b-[24px] bg-gradient-to-t from-[#081610] via-[#081610]/92 to-transparent pb-1 text-emerald-100/45 hover:text-emerald-100"
        onPointerDown={startResize}
        role="separator"
      >
        <GripHorizontal size={18} />
      </div>
    </section>
  );
}

function MapWorkspace({
  hoveredSite,
  mapContainerRef,
  onFit,
  onZoomChange,
  onZoomDelta,
  zoom,
}: {
  hoveredSite: SiteFeature | null;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  onFit: () => void;
  onZoomChange: (zoom: number) => void;
  onZoomDelta: (delta: number) => void;
  zoom: number;
}) {
  return (
    <div className="relative h-full min-h-[520px]">
      <div ref={mapContainerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0%,rgba(6,17,13,0.28)_72%,rgba(6,17,13,0.66)_100%)]" />

      <div className="absolute left-4 top-4 z-10 rounded-2xl border border-white/10 bg-[#07140f]/86 px-4 py-3 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/45">Map view</p>
        <h3 className="mt-1 text-sm font-medium text-white">Deployability surface</h3>
      </div>

      <button
        className="absolute right-4 top-4 z-10 inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-[#07140f]/86 px-4 text-sm text-emerald-50 backdrop-blur transition hover:border-emerald-300/35"
        onClick={onFit}
        type="button"
      >
        <MapPin size={15} />
        Fit city
      </button>

      <div className="absolute right-4 top-16 z-10 w-[214px] rounded-2xl border border-white/10 bg-[#07140f]/90 p-3 shadow-2xl backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-emerald-100/50">Zoom</span>
          <span className="font-medium text-emerald-100">{zoom.toFixed(1)}x</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Zoom out slightly"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/22 text-emerald-50 transition hover:border-emerald-300/35 hover:bg-emerald-300/10"
            onClick={() => onZoomDelta(-0.35)}
            type="button"
          >
            <Minus size={15} />
          </button>
          <input
            aria-label="Map zoom level"
            className="sola-zoom-slider min-w-0 flex-1"
            max={17}
            min={9}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            step={0.1}
            type="range"
            value={zoom}
          />
          <button
            aria-label="Zoom in slightly"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/22 text-emerald-50 transition hover:border-emerald-300/35 hover:bg-emerald-300/10"
            onClick={() => onZoomDelta(0.35)}
            type="button"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 w-[240px] rounded-2xl border border-white/10 bg-[#07140f]/90 p-4 shadow-2xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Score legend</span>
          <Gauge size={15} className="text-emerald-200/70" />
        </div>
        <div className="h-2 rounded-full bg-gradient-to-r from-red-400 via-amber-300 via-lime-300 to-emerald-300" />
        <div className="mt-2 flex justify-between text-[11px] text-emerald-100/45">
          <span>Review</span>
          <span>Strong</span>
          <span>Excellent</span>
        </div>
      </div>

      {hoveredSite ? (
        <div className="absolute bottom-4 right-4 z-10 w-[280px] rounded-2xl border border-white/10 bg-[#07140f]/92 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-emerald-100/50">Hovered site</p>
              <h4 className="mt-1 text-sm font-medium text-white">{hoveredSite.properties.name}</h4>
            </div>
            <ScoreChip value={hoveredSite.properties.suitability_score} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-emerald-50/70">
            <InfoTile label="Area" value={`${formatCompact(hoveredSite.properties.usable_area_sqm)} m2`} />
            <InfoTile label="Grid" value={`${hoveredSite.properties.grid_distance_km.toFixed(1)} km`} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SiteDetail({ site }: { site: SiteFeature | null }) {
  if (!site) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-[#081610]/85 p-4">
        <p className="text-sm text-emerald-100/60">Select a candidate to inspect viability.</p>
      </section>
    );
  }

  const properties = site.properties;
  const capacityKw = properties.estimated_capacity_kw ?? properties.usable_area_sqm / 10;
  const annualGeneration = properties.estimated_annual_generation_kwh ?? capacityKw * properties.annual_ghi_kwh_m2 * 0.78;
  const floodSafety = Math.round((1 - properties.flood_risk_score) * 100);
  const gridAccess = Math.round((1 - Math.min(properties.grid_distance_km / 10, 1)) * 100);

  return (
    <section className="rounded-[24px] border border-white/10 bg-[#081610]/85 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/45">Selected site</p>
          <h3 className="mt-2 text-xl font-semibold leading-tight text-white">{properties.name}</h3>
          <p className="mt-2 text-sm text-emerald-100/55">{properties.asset_type.replaceAll("_", " ")}</p>
        </div>
        <ScoreChip value={properties.suitability_score} large />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <InfoTile label="Usable area" value={`${formatCompact(properties.usable_area_sqm)} m2`} />
        <InfoTile label="Capacity" value={`${formatCompact(capacityKw)} kW`} />
        <InfoTile label="Annual yield" value={`${formatCompact(annualGeneration / 1000)} MWh`} />
        <InfoTile label="Grid distance" value={`${properties.grid_distance_km.toFixed(1)} km`} />
      </div>

      <div className="mt-5 space-y-3">
        <ScoreBar label="Solar exposure" value={Math.min(((properties.annual_ghi_kwh_m2 - 1300) / 800) * 100, 96)} />
        <ScoreBar label="Flood safety" value={floodSafety} warning={floodSafety < 70} />
        <ScoreBar label="Grid accessibility" value={gridAccess} warning={gridAccess < 70} />
      </div>

      <p className="mt-5 rounded-2xl border border-white/10 bg-black/16 p-3 text-sm leading-6 text-emerald-50/68">
        {properties.notes ?? "No notes provided."}
      </p>
    </section>
  );
}

function OpportunityCard({
  lowFloodRiskCount,
  nearGridCount,
  topSite,
}: {
  lowFloodRiskCount: number;
  nearGridCount: number;
  topSite: SiteFeature | null;
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-[#081610]/85 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">MVP signal</h3>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs text-emerald-100">
          sales-ready
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <SignalRow label="Best first pitch" value={topSite?.properties.name ?? "No active site"} />
        <SignalRow label="Low flood risk" value={`${lowFloodRiskCount} sites`} />
        <SignalRow label="Grid within 2 km" value={`${nearGridCount} sites`} />
      </div>
    </section>
  );
}

function PipelineCard({ features, usingSampleData }: { features: SiteFeature[]; usingSampleData: boolean }) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-[#081610]/85 p-4">
      <h3 className="text-sm font-medium text-white">Pipeline health</h3>
      <div className="mt-4 space-y-3 text-sm">
        <HealthRow label="API source" value={usingSampleData ? "Sample fallback" : "Live PostGIS"} ok={!usingSampleData} />
        <HealthRow label="Candidate count" value={`${features.length} active`} ok />
        <HealthRow label="Map tiles" value="Open provider" ok />
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[11px] text-emerald-100/45">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Metric({ label, tone = "default", value }: { label: string; tone?: "default" | "green"; value: string }) {
  return (
    <article
      className={`rounded-[24px] border p-4 shadow-xl shadow-black/18 ${
        tone === "green"
          ? "border-emerald-300/25 bg-emerald-300/10"
          : "border-white/10 bg-[#081610]/86"
      }`}
    >
      <p className="text-xs text-emerald-100/50">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/16 p-3">
      <p className="text-xs text-emerald-100/45">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function ScoreChip({ large = false, value }: { large?: boolean; value: number }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-300/15 font-semibold text-emerald-100 ${
        large ? "h-16 w-16 text-xl" : "h-10 min-w-14 px-3 text-sm"
      }`}
    >
      {value.toFixed(large ? 0 : 1)}
    </span>
  );
}

function ScoreBar({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-emerald-100/55">{label}</span>
        <span className={warning ? "text-amber-200" : "text-emerald-200"}>{Math.round(value)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className={`h-2 rounded-full ${warning ? "bg-amber-300" : "bg-emerald-300"}`}
          style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
        />
      </div>
    </div>
  );
}

function HealthRow({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-emerald-100/55">{label}</span>
      <span className={ok ? "text-emerald-200" : "text-amber-200"}>{value}</span>
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/14 p-3">
      <p className="text-xs text-emerald-100/45">{label}</p>
      <p className="mt-1 text-sm font-medium leading-5 text-white">{value}</p>
    </div>
  );
}

function scoreColorExpression() {
  return [
    "interpolate",
    ["linear"],
    ["get", "suitability_score"],
    70,
    "#f87171",
    78,
    "#fbbf24",
    84,
    "#bef264",
    90,
    "#34d399",
  ] as maplibregl.ExpressionSpecification;
}

function updateSelectionPaint(map: Map, selectedId: string) {
  if (!map.getLayer("solar-sites-fill")) {
    return;
  }

  map.setPaintProperty("solar-sites-fill", "fill-opacity", ["case", ["==", ["get", "id"], selectedId], 0.64, 0.38]);
  map.setPaintProperty("solar-sites-line", "line-width", ["case", ["==", ["get", "id"], selectedId], 4.6, 2.8]);
  map.setPaintProperty("solar-site-glow", "circle-radius", ["case", ["==", ["get", "id"], selectedId], 30, 18]);
  map.setPaintProperty("solar-site-points", "circle-radius", ["case", ["==", ["get", "id"], selectedId], 8, 5.5]);
  map.setPaintProperty("solar-site-points", "circle-stroke-width", ["case", ["==", ["get", "id"], selectedId], 2.8, 1.3]);
}

function setMapZoomLevel(map: Map | null, zoom: number) {
  if (!map) {
    return;
  }

  const clampedZoom = Math.max(9, Math.min(17, zoom));
  map.easeTo({ zoom: clampedZoom, duration: 220 });
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
    padding: { top: 76, right: 76, bottom: 76, left: 76 },
    maxZoom: 13.5,
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
    padding: { top: 140, right: 140, bottom: 140, left: 140 },
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

function getPolygonCenter(feature: SiteFeature): [number, number] {
  const coordinates = feature.geometry.coordinates.flat();
  const total = coordinates.reduce(
    (sum, coordinate) => [sum[0] + coordinate[0], sum[1] + coordinate[1]],
    [0, 0],
  );
  return [total[0] / coordinates.length, total[1] / coordinates.length];
}

function formatNumber(value: number) {
  return numberFormatter.format(Math.round(value));
}

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 1 : 2)}K`;
  }

  return formatNumber(value);
}
