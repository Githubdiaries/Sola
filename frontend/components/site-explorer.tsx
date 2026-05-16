"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map, type MapLayerMouseEvent } from "maplibre-gl";
import {
  Bell,
  ChevronDown,
  Layers,
  Minus,
  Plus,
  SlidersHorizontal,
  X,
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
  assetType: string;
  city: string;
  minArea: number;
  minScore: number;
  query: string;
};

const numberFormatter = new Intl.NumberFormat("en-US");
const cityOrder = [
  "Thiruvananthapuram",
  "Kochi",
  "Cochin",
  "Kalamassery",
  "Thrissur",
  "Palakkad",
  "Kozhikode",
  "Kannur",
  "Malappuram",
  "Kollam",
  "Kottayam",
  "Alappuzha",
  "Pathanamthitta",
  "Kalpetta",
  "Kasaragod",
];

const emptyCollection: SiteCollection = {
  type: "FeatureCollection",
  features: [],
};

const mapStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics",
    },
    labels: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "OpenStreetMap contributors, CARTO",
    },
  },
  layers: [
    {
      id: "satellite",
      type: "raster",
      source: "imagery",
      paint: {
        "raster-brightness-max": 0.72,
        "raster-brightness-min": 0.05,
        "raster-contrast": -0.04,
        "raster-opacity": 0.86,
        "raster-saturation": -0.28,
      },
    },
    {
      id: "labels",
      type: "raster",
      source: "labels",
      paint: {
        "raster-opacity": 0.58,
      },
    },
  ],
};

export function SiteExplorer({ sites }: { sites: SiteCollection; usingSampleData: boolean }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const featuresRef = useRef<SiteFeature[]>([]);
  const selectedIdRef = useRef("");
  const [selectedSite, setSelectedSite] = useState<SiteFeature | null>(sites.features[0] ?? null);
  const [hoveredSite, setHoveredSite] = useState<SiteFeature | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [areaUnit, setAreaUnit] = useState<"sqm" | "sqft">("sqm");
  const [detailOpen, setDetailOpen] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    assetType: "all",
    city: "Thiruvananthapuram",
    minArea: 0,
    minScore: 70,
    query: "",
  });

  const scopedFeatures = useMemo(
    () =>
      sites.features.filter(
        (site) => site.properties.state === "Kerala" || cityOrder.includes(site.properties.city),
      ),
    [sites.features],
  );
  const cities = useMemo(
    () =>
      Array.from(new Set(scopedFeatures.map((site) => site.properties.city))).sort(
        (a, b) => cityOrder.indexOf(a) - cityOrder.indexOf(b),
      ),
    [scopedFeatures],
  );
  const assetTypes = useMemo(
    () => Array.from(new Set(scopedFeatures.map((site) => site.properties.asset_type))).sort(),
    [scopedFeatures],
  );

  const filteredFeatures = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    return scopedFeatures.filter((site) => {
      const properties = site.properties;
      const matchesQuery =
        !query ||
        properties.name.toLowerCase().includes(query) ||
        properties.asset_type.toLowerCase().includes(query) ||
        properties.city.toLowerCase().includes(query);

      return (
        matchesQuery &&
        properties.city === filters.city &&
        properties.suitability_score >= filters.minScore &&
        properties.usable_area_sqm >= filters.minArea &&
        (filters.assetType === "all" || filters.assetType === properties.asset_type)
      );
    });
  }, [filters, scopedFeatures]);

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
  const avgScore =
    filteredFeatures.length > 0
      ? filteredFeatures.reduce((sum, site) => sum + site.properties.suitability_score, 0) / filteredFeatures.length
      : 0;

  useEffect(() => {
    if (cities.length > 0 && !cities.includes(filters.city)) {
      setFilters((current) => ({ ...current, city: cities[0] }));
    }
  }, [cities, filters.city]);

  useEffect(() => {
    if (!filteredFeatures.length) {
      setSelectedSite(null);
      setDetailOpen(false);
      return;
    }

    if (!selectedSite || !filteredFeatures.some((site) => site.properties.id === selectedSite.properties.id)) {
      setSelectedSite(filteredFeatures[0]);
      setDetailOpen(true);
    }
  }, [filteredFeatures, selectedSite]);

  useEffect(() => {
    featuresRef.current = filteredFeatures;
    selectedIdRef.current = selectedId;
  }, [filteredFeatures, selectedId]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      attributionControl: { compact: true },
      bearing: -14,
      center: [76.881, 8.558],
      container: mapContainerRef.current,
      pitch: 22,
      style: mapStyle,
      zoom: 15,
    });

    mapRef.current = map;

    map.on("load", () => {
      map.addSource("solar-sites", {
        data: filteredCollection,
        type: "geojson",
      });

      map.addSource("solar-site-points", {
        data: pointCollection,
        type: "geojson",
      });

      map.addLayer({
        id: "solar-sites-fill",
        paint: {
          "fill-color": scoreColorExpression(),
          "fill-opacity": ["case", ["==", ["get", "id"], selectedIdRef.current], 0.45, 0.26],
        },
        source: "solar-sites",
        type: "fill",
      });

      map.addLayer({
        id: "solar-sites-line",
        paint: {
          "line-blur": 0.25,
          "line-color": scoreColorExpression(),
          "line-opacity": 0.96,
          "line-width": ["case", ["==", ["get", "id"], selectedIdRef.current], 3.4, 1.8],
        },
        source: "solar-sites",
        type: "line",
      });

      map.addLayer({
        id: "solar-site-glow",
        paint: {
          "circle-blur": 0.72,
          "circle-color": scoreColorExpression(),
          "circle-opacity": 0.26,
          "circle-radius": ["case", ["==", ["get", "id"], selectedIdRef.current], 27, 18],
        },
        source: "solar-site-points",
        type: "circle",
      });

      map.addLayer({
        id: "solar-site-points",
        layout: {
          "text-field": "📍",
          "text-size": ["case", ["==", ["get", "id"], selectedIdRef.current], 34, 28],
          "text-allow-overlap": true,
          "text-anchor": "bottom",
          "text-offset": [0, 0.35],
        },
        paint: {
          "text-color": scoreColorExpression(),
          "text-halo-color": "#f8fafd",
          "text-halo-width": 0.7,
          "text-opacity": 0.98,
        },
        source: "solar-site-points",
        type: "symbol",
      });

      const selectFeature = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as SiteFeature | PointFeature | undefined;
        const site = featuresRef.current.find((candidate) => candidate.properties.id === feature?.properties.id);
        if (site) {
          setSelectedSite(site);
          setDetailOpen(true);
          flyToSite(map, site);
        }
      };

      const hoverFeature = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as SiteFeature | PointFeature | undefined;
        const site = featuresRef.current.find((candidate) => candidate.properties.id === feature?.properties.id);
        setHoveredSite(site ?? null);
        setHoverPosition(site ? { x: event.point.x, y: event.point.y } : null);
        map.getCanvas().style.cursor = site ? "pointer" : "";
      };

      map.on("click", "solar-sites-fill", selectFeature);
      map.on("click", "solar-site-points", selectFeature);
      map.on("mousemove", "solar-sites-fill", hoverFeature);
      map.on("mousemove", "solar-site-points", hoverFeature);
      map.on("mouseleave", "solar-sites-fill", () => {
        setHoveredSite(null);
        setHoverPosition(null);
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseleave", "solar-site-points", () => {
        setHoveredSite(null);
        setHoverPosition(null);
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
    <main className="min-h-screen bg-[#05060f] text-[#f8fafd]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.13),transparent_34%),linear-gradient(180deg,#090b15_0%,#05060f_42%)]">
        <TopNav query={filters.query} setQuery={(query) => setFilters((current) => ({ ...current, query }))} />

        <section className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 pb-6 pt-5 lg:h-[calc(100vh-72px)] lg:flex-row lg:overflow-hidden">
          <FilterSidebar
            areaUnit={areaUnit}
            assetTypes={assetTypes}
            cities={cities}
            filters={filters}
            setAreaUnit={setAreaUnit}
            setFilters={setFilters}
          />

          <section className="min-w-0 flex-1">
            <div className="mb-3">
              <p className="sola-wordmark text-2xl text-[#f8fafd]">Sola</p>
              <p className="mt-1 text-sm text-[#a3b4d0]">Premium solar site intelligence platform</p>
            </div>

            <div className="relative h-[760px] overflow-hidden rounded-2xl border border-[#1e2538] bg-[#0c0f1c] shadow-[0_28px_90px_rgba(0,0,0,0.42)] lg:h-[calc(100vh-142px)]">
              <MapCanvas
                hoveredSite={hoveredSite}
                hoverPosition={hoverPosition}
                mapContainerRef={mapContainerRef}
                onFit={() => fitToSites(mapRef.current, filteredFeatures)}
                onZoomDelta={(delta) => nudgeZoom(mapRef.current, delta)}
              />

              <MapSummary avgScore={avgScore} count={filteredFeatures.length} totalArea={totalArea} totalCapacityKw={totalCapacityKw} />

              {detailOpen && selectedSite ? (
                <DetailPanel onClose={() => setDetailOpen(false)} site={selectedSite} />
              ) : null}
            </div>
          </section>

          <MobileRankedStrip
            features={filteredFeatures}
            onSelect={(site) => {
              setSelectedSite(site);
              setDetailOpen(true);
              flyToSite(mapRef.current, site);
            }}
            selectedId={selectedId}
            topSite={topSite}
          />
        </section>
      </div>
    </main>
  );
}

function TopNav({ query, setQuery }: { query: string; setQuery: (query: string) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#1e2538]/80 bg-[#05060f]/82 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] w-full max-w-[1480px] items-center gap-4 px-4">
        <div className="flex min-w-[210px] items-center gap-2">
          <span className="sola-wordmark text-[26px] leading-none text-[#f8fafd]">Sola</span>
        </div>

        <label className="relative mx-auto hidden w-full max-w-[520px] md:block">
          <input
            className="h-11 w-full rounded-xl border border-[#1e2538] bg-[#0c0f1c] px-5 text-sm text-[#f8fafd] outline-none transition placeholder:text-[#a3b4d0]/48 focus:border-[#a3ff12]/55 focus:ring-4 focus:ring-[#a3ff12]/10"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Global Search"
            value={query}
          />
        </label>

        <div className="ml-auto flex items-center gap-3">
          <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#1e2538] bg-[#0c0f1c] text-[#a3b4d0] transition hover:text-[#f8fafd]" type="button">
            <Bell size={17} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#a3ff12]" />
          </button>
          <button className="flex h-10 items-center gap-2 rounded-xl border border-[#1e2538] bg-[#0c0f1c] px-2.5 text-sm text-[#f8fafd]" type="button">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(135deg,#a3ff12,#22c55e)] text-xs font-semibold text-[#05060f]">
              A
            </span>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}

function FilterSidebar({
  areaUnit,
  assetTypes,
  cities,
  filters,
  setAreaUnit,
  setFilters,
}: {
  areaUnit: "sqm" | "sqft";
  assetTypes: string[];
  cities: string[];
  filters: Filters;
  setAreaUnit: (unit: "sqm" | "sqft") => void;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}) {
  const displayedArea = areaUnit === "sqm" ? filters.minArea : Math.round(filters.minArea * 10.7639);
  const areaInputValue = displayedArea === 0 ? "0" : String(displayedArea);
  const parseAreaValue = (rawValue: string) => {
    const normalized = rawValue.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
    return normalized === "" ? 0 : Number(normalized);
  };

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-[#1e2538] bg-[#0c0f1c]/88 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur lg:w-[292px] lg:overflow-auto">
      <div className="flex items-center justify-between border-b border-[#1e2538] pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a3b4d0]">Filters</p>
          <h2 className="mt-1 text-lg font-semibold text-[#f8fafd]">Site criteria</h2>
        </div>
        <SlidersHorizontal className="text-[#a3ff12]" size={18} />
      </div>

      <div className="space-y-6 pt-5">
        <label className="block">
          <span className="text-sm font-medium text-[#f8fafd]">City</span>
          <span className="relative mt-2 block">
            <select
              className="h-11 w-full appearance-none rounded-xl border border-[#1e2538] bg-[#141927] px-3 pr-10 text-sm text-[#f8fafd] outline-none transition focus:border-[#a3ff12]/60"
              onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}
              value={filters.city}
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#a3b4d0]" size={16} />
          </span>
        </label>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#f8fafd]">Min Score</span>
            <span className="rounded-lg border border-[#a3ff12]/36 bg-[#a3ff12]/12 px-2 py-1 text-xs font-semibold text-[#ecfccb]">
              {filters.minScore}
            </span>
          </div>
          <input
            className="solarforge-range mt-4 w-full"
            max={100}
            min={0}
            onChange={(event) => setFilters((current) => ({ ...current, minScore: Number(event.target.value) }))}
            type="range"
            value={filters.minScore}
          />
          <div className="mt-2 flex justify-between text-xs text-[#a3b4d0]/65">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-[#f8fafd]">Min Area</span>
          <div className="mt-2 flex overflow-hidden rounded-xl border border-[#1e2538] bg-[#141927]">
            <input
              aria-label={`Min Area ${areaUnit}`}
              className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#f8fafd] outline-none"
              inputMode="numeric"
              onChange={(event) => {
                const parsedArea = parseAreaValue(event.target.value);
                setFilters((current) => ({
                  ...current,
                  minArea: areaUnit === "sqm" ? parsedArea : Math.round(parsedArea / 10.7639),
                }));
              }}
              onFocus={(event) => event.currentTarget.select()}
              pattern="[0-9]*"
              type="text"
              value={areaInputValue}
            />
            <button
              className="w-16 border-l border-[#1e2538] text-xs font-medium text-[#a3b4d0] transition hover:text-[#f8fafd]"
              onClick={() => setAreaUnit(areaUnit === "sqm" ? "sqft" : "sqm")}
              type="button"
            >
              {areaUnit}
            </button>
          </div>
        </label>

        <div>
          <span className="text-sm font-medium text-[#f8fafd]">Asset Type</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {assetTypes.map((assetType) => {
              const active = filters.assetType === assetType;
              return (
                <button
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-[#a3ff12]/70 bg-[#a3ff12]/16 text-[#f8fafd]"
                      : "border-[#1e2538] bg-[#141927] text-[#a3b4d0] hover:border-[#a3ff12]/36 hover:text-[#f8fafd]"
                  }`}
                  key={assetType}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      assetType: active ? "all" : assetType,
                    }))
                  }
                  type="button"
                >
                  {assetType.replaceAll("_", " ")}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}

function MapCanvas({
  hoveredSite,
  hoverPosition,
  mapContainerRef,
  onFit,
  onZoomDelta,
}: {
  hoveredSite: SiteFeature | null;
  hoverPosition: { x: number; y: number } | null;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  onFit: () => void;
  onZoomDelta: (delta: number) => void;
}) {
  return (
    <div className="absolute inset-0">
      <div ref={mapContainerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,15,0.34),transparent_28%,rgba(5,6,15,0.18)_100%),radial-gradient(circle_at_50%_20%,transparent_0%,rgba(5,6,15,0.24)_68%,rgba(5,6,15,0.6)_100%)]" />

      <div className="absolute bottom-4 left-4 z-10 grid grid-cols-2 overflow-hidden rounded-xl border border-[#1e2538] bg-[#0c0f1c]/86 shadow-2xl backdrop-blur">
        <button className="grid h-10 w-10 place-items-center text-[#a3b4d0] transition hover:bg-[#141927] hover:text-[#f8fafd]" onClick={() => onZoomDelta(0.75)} type="button">
          <Plus size={16} />
        </button>
        <button className="grid h-10 w-10 place-items-center border-l border-[#1e2538] text-[#a3b4d0] transition hover:bg-[#141927] hover:text-[#f8fafd]" onClick={() => onZoomDelta(-0.75)} type="button">
          <Minus size={16} />
        </button>
        <button className="col-span-2 grid h-10 place-items-center border-t border-[#1e2538] text-[#a3b4d0] transition hover:bg-[#141927] hover:text-[#f8fafd]" onClick={onFit} type="button">
          <Layers size={16} />
        </button>
      </div>

      {hoveredSite && hoverPosition ? (
        <div
          className="pointer-events-none absolute z-20 w-[250px] rounded-xl border border-[#1e2538] bg-[#0c0f1c]/94 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur"
          style={{
            left: hoverPosition.x,
            top: hoverPosition.y,
            transform: hoverPosition.x > 760 ? "translate(-108%, -44%)" : "translate(18px, -44%)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold leading-5 text-[#f8fafd]">{hoveredSite.properties.name}</h4>
            <ScorePill value={hoveredSite.properties.suitability_score} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#a3b4d0]">
            <InfoMetric label="Area" value={`${formatCompact(hoveredSite.properties.usable_area_sqm)} m2`} />
            <InfoMetric label="Grid" value={`${hoveredSite.properties.grid_distance_km.toFixed(1)} km`} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MapSummary({
  avgScore,
  count,
  totalArea,
  totalCapacityKw,
}: {
  avgScore: number;
  count: number;
  totalArea: number;
  totalCapacityKw: number;
}) {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-10 hidden w-[318px] grid-cols-3 gap-1.5 md:grid">
      <SummaryTile label="Sites" value={`${count}`} />
      <SummaryTile label="Avg Score" value={`${avgScore.toFixed(0)}%`} />
      <SummaryTile label="Capacity" value={`${formatCompact(totalCapacityKw)} kWp`} />
      <SummaryTile className="col-span-2" label="Filtered roof area" value={`${formatCompact(totalArea)} m2`} />
    </div>
  );
}

function SummaryTile({ className = "", label, value }: { className?: string; label: string; value: string }) {
  return (
    <div className={`rounded-lg border border-[#1e2538] bg-[#0c0f1c]/78 px-2.5 py-1.5 shadow-xl backdrop-blur ${className}`}>
      <p className="text-[9px] leading-none text-[#a3b4d0]">{label}</p>
      <p className="mt-1 text-xs font-semibold leading-none text-[#f8fafd]">{value}</p>
    </div>
  );
}

function DetailPanel({ onClose, site }: { onClose: () => void; site: SiteFeature }) {
  const properties = site.properties;
  const capacityKw = properties.estimated_capacity_kw ?? properties.usable_area_sqm / 10;
  const cityLine = [properties.city, properties.state].filter(Boolean).join(", ");

  return (
    <>
      <aside className="absolute left-5 top-5 z-20 w-[300px] rounded-2xl border border-[#1e2538] bg-[#0c0f1c]/92 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl max-md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="min-w-0 text-lg font-semibold leading-tight tracking-[-0.02em] text-[#f8fafd]">{properties.name}</h3>
              <ScorePill value={properties.suitability_score} />
            </div>
            <p className="mt-1 text-sm text-[#a3b4d0]">{cityLine}</p>
          </div>
          <button className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#a3b4d0] transition hover:bg-[#141927] hover:text-[#f8fafd]" onClick={onClose} type="button">
            <X size={15} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <InfoMetric label="Area" value={`${formatCompact(properties.usable_area_sqm)} m2`} />
          <InfoMetric label="Est." value={`${formatCompact(capacityKw)} kWp`} />
          <InfoMetric label="Grid" value={`${properties.grid_distance_km.toFixed(1)} km`} />
        </div>

      </aside>

      <aside className="absolute inset-x-3 bottom-3 z-20 rounded-2xl border border-[#1e2538] bg-[#0c0f1c]/94 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="min-w-0 text-base font-semibold leading-tight text-[#f8fafd]">{properties.name}</h3>
              <ScorePill value={properties.suitability_score} />
            </div>
            <p className="mt-1 text-xs text-[#a3b4d0]">{cityLine}</p>
          </div>
          <button className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#a3b4d0] transition hover:bg-[#141927] hover:text-[#f8fafd]" onClick={onClose} type="button">
            <X size={15} />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <InfoMetric label="Area" value={`${formatCompact(properties.usable_area_sqm)} m2`} />
          <InfoMetric label="Est." value={`${formatCompact(capacityKw)} kWp`} />
          <InfoMetric label="Score" value={`${Math.round(properties.suitability_score)}/100`} />
        </div>
      </aside>
    </>
  );
}

function MobileRankedStrip({
  features,
  onSelect,
  selectedId,
  topSite,
}: {
  features: SiteFeature[];
  onSelect: (site: SiteFeature) => void;
  selectedId: string;
  topSite: SiteFeature | null;
}) {
  return (
    <aside className="rounded-2xl border border-[#1e2538] bg-[#0c0f1c]/90 p-4 lg:hidden">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a3b4d0]">Ranked sites</p>
      <div className="mt-3 flex gap-3 overflow-auto pb-1">
        {(features.length ? features : topSite ? [topSite] : []).slice(0, 8).map((site, index) => (
          <button
            className={`w-[230px] shrink-0 rounded-xl border p-3 text-left ${
              selectedId === site.properties.id ? "border-[#a3ff12]/55 bg-[#a3ff12]/12" : "border-[#1e2538] bg-[#141927]"
            }`}
            key={site.properties.id}
            onClick={() => onSelect(site)}
            type="button"
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#a3b4d0]">Rank {index + 1}</p>
            <h4 className="mt-1 text-sm font-semibold leading-5 text-[#f8fafd]">{site.properties.name}</h4>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[#a3b4d0]">{formatCompact(site.properties.usable_area_sqm)} m2</span>
              <ScorePill value={site.properties.suitability_score} />
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#1e2538] bg-[#141927]/76 p-3">
      <p className="text-[11px] text-[#a3b4d0]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#f8fafd]">{value}</p>
    </div>
  );
}

function ScorePill({ large = false, value }: { large?: boolean; value: number }) {
  const tone =
    value >= 88
      ? "border-[#22c55e]/70 bg-[#22c55e]/18 text-[#bbf7d0]"
      : value >= 82
        ? "border-[#a3ff12]/60 bg-[#a3ff12]/16 text-[#ecfccb]"
        : "border-[#facc15]/58 bg-[#facc15]/16 text-[#fef9c3]";

  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full border font-semibold ${tone} ${large ? "h-14 min-w-14 px-3 text-base" : "h-8 min-w-11 px-2 text-xs"}`}>
      {Math.round(value)}
    </span>
  );
}

function scoreColorExpression() {
  return [
    "interpolate",
    ["linear"],
    ["get", "suitability_score"],
    70,
    "#cf3f35",
    78,
    "#c8892b",
    84,
    "#c8cf34",
    90,
    "#17a44a",
  ] as maplibregl.ExpressionSpecification;
}

function updateSelectionPaint(map: Map, selectedId: string) {
  if (!map.getLayer("solar-sites-fill")) {
    return;
  }

  map.setPaintProperty("solar-sites-fill", "fill-opacity", ["case", ["==", ["get", "id"], selectedId], 0.45, 0.26]);
  map.setPaintProperty("solar-sites-line", "line-width", ["case", ["==", ["get", "id"], selectedId], 3.4, 1.8]);
  map.setPaintProperty("solar-site-glow", "circle-radius", ["case", ["==", ["get", "id"], selectedId], 27, 18]);
  map.setLayoutProperty("solar-site-points", "text-size", ["case", ["==", ["get", "id"], selectedId], 34, 28]);
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
    duration: 900,
    maxZoom: features.length > 1 ? 15.4 : 16.2,
    padding: { bottom: 56, left: 420, right: 72, top: 56 },
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
    duration: 780,
    maxZoom: 17,
    padding: { bottom: 140, left: 420, right: 120, top: 140 },
  });
}

function nudgeZoom(map: Map | null, delta: number) {
  if (!map) {
    return;
  }

  map.easeTo({ duration: 240, zoom: Math.max(5, Math.min(18, map.getZoom() + delta)) });
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
