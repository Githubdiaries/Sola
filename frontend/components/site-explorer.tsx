"use client";

import { type Dispatch, type RefObject, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map, type MapLayerMouseEvent } from "maplibre-gl";
import {
  Bell,
  ChevronDown,
  Layers,
  Minus,
  Plus,
  SlidersHorizontal,
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

type Filters = {
  assetType: string;
  district: string;
  minArea: number;
  minScore: number;
  query: string;
};

const numberFormatter = new Intl.NumberFormat("en-US");
const districtOrder = [
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Ernakulam",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
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
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const featuresRef = useRef<SiteFeature[]>([]);
  const selectedIdRef = useRef("");
  const [selectedSite, setSelectedSite] = useState<SiteFeature | null>(sites.features[0] ?? null);
  const [hoveredSite, setHoveredSite] = useState<SiteFeature | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [areaUnit, setAreaUnit] = useState<"sqm" | "sqft">("sqm");
  const [districtZoomedIn, setDistrictZoomedIn] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    assetType: "all",
    district: "Thiruvananthapuram",
    minArea: 0,
    minScore: 70,
    query: "",
  });

  const scopedFeatures = useMemo(
    () =>
      sites.features.filter(
        (site) => site.properties.state === "Kerala" || districtOrder.includes(site.properties.city),
      ),
    [sites.features],
  );
  const districts = useMemo(
    () =>
      districtOrder.filter((district) => scopedFeatures.some((site) => site.properties.city === district)),
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
        properties.city === filters.district &&
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
    if (districts.length > 0 && !districts.includes(filters.district)) {
      setFilters((current) => ({ ...current, district: districts[0] }));
    }
  }, [districts, filters.district]);

  useEffect(() => {
    if (!filteredFeatures.length) {
      setSelectedSite(null);
      return;
    }

    if (!selectedSite || !filteredFeatures.some((site) => site.properties.id === selectedSite.properties.id)) {
      setSelectedSite(filteredFeatures[0]);
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

      map.addLayer({
        id: "solar-sites-fill",
        paint: {
          "fill-color": scoreColorExpression(),
          "fill-opacity": ["case", ["==", ["get", "id"], selectedIdRef.current], 0.42, 0.22],
        },
        source: "solar-sites",
        type: "fill",
      });

      map.addLayer({
        id: "solar-sites-line",
        paint: {
          "line-blur": 0.2,
          "line-color": scoreColorExpression(),
          "line-opacity": 0.96,
          "line-width": ["case", ["==", ["get", "id"], selectedIdRef.current], 3.2, 1.7],
        },
        source: "solar-sites",
        type: "line",
      });

      const selectFeature = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as SiteFeature | undefined;
        const site = featuresRef.current.find((candidate) => candidate.properties.id === feature?.properties.id);
        if (site) {
          setSelectedSite(site);
          flyToSite(map, site);
        }
      };

      const hoverFeature = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as SiteFeature | undefined;
        const site = featuresRef.current.find((candidate) => candidate.properties.id === feature?.properties.id);
        setHoveredSite(site ?? null);
        setHoverPosition(site ? { x: event.point.x, y: event.point.y } : null);
        map.getCanvas().style.cursor = site ? "pointer" : "";
      };

      map.on("click", "solar-sites-fill", selectFeature);
      map.on("mousemove", "solar-sites-fill", hoverFeature);
      map.on("mouseleave", "solar-sites-fill", () => {
        setHoveredSite(null);
        setHoverPosition(null);
        map.getCanvas().style.cursor = "";
      });

      const currentFeatures = featuresRef.current.length ? featuresRef.current : filteredFeatures;
      const currentCollection: SiteCollection = {
        ...emptyCollection,
        features: currentFeatures,
      };
      const source = map.getSource("solar-sites") as maplibregl.GeoJSONSource | undefined;
      source?.setData(currentCollection);
      syncHtmlMarkers({
        features: currentFeatures,
        map,
        markersRef,
        onSelect: (site) => {
          setSelectedSite(site);
          flyToSite(map, site);
        },
        selectedId: selectedIdRef.current,
      });
      fitToSites(map, currentFeatures);
    });

    return () => {
      clearHtmlMarkers(map, markersRef);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const polygonSource = map?.getSource("solar-sites") as maplibregl.GeoJSONSource | undefined;
    polygonSource?.setData(filteredCollection);

    if (map) {
      updateSelectionPaint(map, selectedId);
      syncHtmlMarkers({
        features: filteredFeatures,
        map,
        markersRef,
        onSelect: (site) => {
          setSelectedSite(site);
          flyToSite(map, site);
        },
        selectedId,
      });
      fitToSites(map, filteredFeatures);
      setDistrictZoomedIn(false);
    }

    setSelectedSite((current) => {
      if (current && filteredFeatures.some((feature) => feature.properties.id === current.properties.id)) {
        return current;
      }
      return filteredFeatures[0] ?? null;
    });
  }, [filteredCollection, filteredFeatures]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      updateSelectionPaint(map, selectedId);
      syncHtmlMarkers({
        features: filteredFeatures,
        map,
        markersRef,
        onSelect: (site) => {
          setSelectedSite(site);
          flyToSite(map, site);
        },
        selectedId,
      });
    }
  }, [filteredFeatures, selectedId]);

  const toggleDistrictFocus = () => {
    const map = mapRef.current;
    if (!map || filteredFeatures.length === 0) {
      return;
    }

    if (districtZoomedIn) {
      fitToSites(map, filteredFeatures);
      setDistrictZoomedIn(false);
      return;
    }

    zoomToDistrictDetail(map, filteredFeatures);
    setDistrictZoomedIn(true);
  };

  return (
    <main className="min-h-screen bg-[#05060f] text-[#f8fafd]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.13),transparent_34%),linear-gradient(180deg,#090b15_0%,#05060f_42%)]">
        <TopNav query={filters.query} setQuery={(query) => setFilters((current) => ({ ...current, query }))} />

        <section className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 pb-6 pt-5 lg:h-[calc(100vh-72px)] lg:flex-row lg:overflow-hidden">
          <FilterSidebar
            areaUnit={areaUnit}
            assetTypes={assetTypes}
            districts={districts}
            filters={filters}
            onSelectSite={(site) => {
              setSelectedSite(site);
              flyToSite(mapRef.current, site);
            }}
            setAreaUnit={setAreaUnit}
            setFilters={setFilters}
            selectedId={selectedId}
            sites={filteredFeatures}
            topSite={topSite}
          />

          <section className="min-w-0 flex-1">
            <div className="mb-3">
              <p className="sola-wordmark text-2xl text-[#f8fafd]">Sola</p>
              <p className="mt-1 text-sm text-[#a3b4d0]">Premium solar site intelligence platform</p>
            </div>

            <div className="relative h-[760px] overflow-hidden rounded-2xl border border-[#1e2538] bg-[#0c0f1c] shadow-[0_28px_90px_rgba(0,0,0,0.42)] lg:h-[calc(100vh-142px)]">
              <MapCanvas
                districtZoomedIn={districtZoomedIn}
                hoveredSite={hoveredSite}
                hoverPosition={hoverPosition}
                mapContainerRef={mapContainerRef}
                onToggleFocus={toggleDistrictFocus}
                onZoomDelta={(delta) => nudgeZoom(mapRef.current, delta)}
              />

              <MapSummary avgScore={avgScore} count={filteredFeatures.length} totalArea={totalArea} totalCapacityKw={totalCapacityKw} />
            </div>
          </section>

          <MobileRankedStrip
            features={filteredFeatures}
            onSelect={(site) => {
              setSelectedSite(site);
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
  districts,
  filters,
  onSelectSite,
  setAreaUnit,
  setFilters,
  selectedId,
  sites,
  topSite,
}: {
  areaUnit: "sqm" | "sqft";
  assetTypes: string[];
  districts: string[];
  filters: Filters;
  onSelectSite: (site: SiteFeature) => void;
  setAreaUnit: (unit: "sqm" | "sqft") => void;
  setFilters: Dispatch<SetStateAction<Filters>>;
  selectedId: string;
  sites: SiteFeature[];
  topSite: SiteFeature | null;
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
          <h2 className="text-lg font-semibold text-[#f8fafd]">Filters</h2>
        </div>
        <SlidersHorizontal className="text-[#a3ff12]" size={18} />
      </div>

      <div className="space-y-5 pt-5">
        <label className="block">
          <span className="text-sm font-medium text-[#f8fafd]">District</span>
          <span className="relative mt-2 block">
            <select
              className="h-11 w-full appearance-none rounded-xl border border-[#1e2538] bg-[#141927] px-3 pr-10 text-sm text-[#f8fafd] outline-none transition focus:border-[#a3ff12]/60"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  district: event.target.value,
                  assetType: "all",
                }))
              }
              value={filters.district}
            >
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
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

        <BestSiteList onSelectSite={onSelectSite} selectedId={selectedId} sites={sites} topSite={topSite} />
      </div>
    </aside>
  );
}

function BestSiteList({
  onSelectSite,
  selectedId,
  sites,
  topSite,
}: {
  onSelectSite: (site: SiteFeature) => void;
  selectedId: string;
  sites: SiteFeature[];
  topSite: SiteFeature | null;
}) {
  const rankedSites = (sites.length ? sites : topSite ? [topSite] : []).slice(0, 5);

  return (
    <section className="border-t border-[#1e2538] pt-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#f8fafd]">Best sites</h3>
        <span className="text-xs text-[#a3b4d0]">{rankedSites.length} shown</span>
      </div>

      <div className="mt-3 space-y-2">
        {rankedSites.map((site, index) => {
          const active = selectedId === site.properties.id;
          const capacityKw = site.properties.estimated_capacity_kw ?? site.properties.usable_area_sqm / 10;

          return (
            <button
              className={`w-full rounded-xl border p-3 text-left transition ${
                active
                  ? "border-[#22c55e]/55 bg-[#22c55e]/10 shadow-[0_0_28px_rgba(34,197,94,0.12)]"
                  : "border-[#1e2538] bg-[#141927]/70 hover:border-[#eab308]/45 hover:bg-[#141927]"
              }`}
              key={site.properties.id}
              onClick={() => onSelectSite(site)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-[#a3b4d0]">Rank {index + 1}</p>
                  <h4 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#f8fafd]">{site.properties.name}</h4>
                </div>
                <ScorePill value={site.properties.suitability_score} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#a3b4d0]">
                <span>{formatCompact(site.properties.usable_area_sqm)} m2</span>
                <span>{formatCompact(capacityKw)} kWp</span>
                <span>{site.properties.grid_distance_km.toFixed(1)} km</span>
              </div>
            </button>
          );
        })}

        {rankedSites.length === 0 ? (
          <p className="rounded-xl border border-[#1e2538] bg-[#141927]/70 p-3 text-sm text-[#a3b4d0]">
            No sites match this district and filter set.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function MapCanvas({
  districtZoomedIn,
  hoveredSite,
  hoverPosition,
  mapContainerRef,
  onToggleFocus,
  onZoomDelta,
}: {
  districtZoomedIn: boolean;
  hoveredSite: SiteFeature | null;
  hoverPosition: { x: number; y: number } | null;
  mapContainerRef: RefObject<HTMLDivElement | null>;
  onToggleFocus: () => void;
  onZoomDelta: (delta: number) => void;
}) {
  return (
    <div className="absolute inset-0">
      <div ref={mapContainerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,15,0.34),transparent_28%,rgba(5,6,15,0.18)_100%),radial-gradient(circle_at_50%_20%,transparent_0%,rgba(5,6,15,0.24)_68%,rgba(5,6,15,0.6)_100%)]" />

      <div className="absolute bottom-5 left-6 z-10 flex overflow-hidden rounded-xl border border-[#1e2538] bg-[#0c0f1c]/86 shadow-2xl backdrop-blur">
        <button className="grid h-10 w-11 place-items-center text-[#a3b4d0] transition hover:bg-[#141927] hover:text-[#f8fafd]" onClick={() => onZoomDelta(0.5)} type="button">
          <Plus size={16} />
        </button>
        <button className="grid h-10 w-11 place-items-center border-l border-[#1e2538] text-[#a3b4d0] transition hover:bg-[#141927] hover:text-[#f8fafd]" onClick={() => onZoomDelta(-0.5)} type="button">
          <Minus size={16} />
        </button>
        <button
          aria-label={districtZoomedIn ? "Zoom back to district" : "Zoom into district"}
          className="grid h-10 w-11 place-items-center border-l border-[#1e2538] text-[#a3b4d0] transition hover:bg-[#141927] hover:text-[#f8fafd]"
          onClick={onToggleFocus}
          type="button"
        >
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
    0,
    "#ffe500",
    70,
    "#ffe500",
    78,
    "#a3ff12",
    85,
    "#a3ff12",
    90,
    "#22c55e",
    100,
    "#22c55e",
  ] as maplibregl.ExpressionSpecification;
}

function updateSelectionPaint(map: Map, selectedId: string) {
  if (!map.getLayer("solar-sites-fill")) {
    return;
  }

  map.setPaintProperty("solar-sites-fill", "fill-opacity", ["case", ["==", ["get", "id"], selectedId], 0.42, 0.22]);
  map.setPaintProperty("solar-sites-line", "line-width", ["case", ["==", ["get", "id"], selectedId], 3.2, 1.7]);
}

function syncHtmlMarkers({
  features,
  map,
  markersRef,
  onSelect,
  selectedId,
}: {
  features: SiteFeature[];
  map: Map;
  markersRef: RefObject<maplibregl.Marker[]>;
  onSelect: (site: SiteFeature) => void;
  selectedId: string;
}) {
  clearHtmlMarkers(map, markersRef);

  markersRef.current = features.map((site) => {
    const markerElement = createHtmlMarker(site, selectedId === site.properties.id);
    markerElement.addEventListener("click", (event) => {
      event.stopPropagation();
      onSelect(site);
    });

    return new maplibregl.Marker({
      anchor: "bottom",
      element: markerElement,
    })
      .setLngLat(getPolygonCenter(site))
      .addTo(map);
  });
}

function clearHtmlMarkers(map: Map, markersRef: RefObject<maplibregl.Marker[]>) {
  markersRef.current.forEach((marker) => marker.remove());
  markersRef.current = [];
  map.getContainer().querySelectorAll(".maplibregl-marker").forEach((element) => element.remove());
}

function createHtmlMarker(site: SiteFeature, selected: boolean) {
  const score = site.properties.suitability_score;
  const element = document.createElement("button");
  element.type = "button";
  element.className = `sola-html-marker-shell${selected ? " is-selected" : ""}`;
  element.dataset.solaMarker = "true";
  element.dataset.tone = getMarkerTone(score);
  element.setAttribute("aria-label", `Select ${site.properties.name}`);
  element.innerHTML = `
    <span class="sola-html-marker-glow" aria-hidden="true"></span>
    <span class="sola-html-marker-pin" aria-hidden="true">
      <span class="sola-html-marker-dot"></span>
    </span>
    <span class="sola-html-marker-tooltip">${escapeHtml(site.properties.name)}</span>
  `;
  return element;
}

function getMarkerTone(score: number) {
  if (score > 85) {
    return "green";
  }

  if (score >= 70) {
    return "amber";
  }

  return "red";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[character];
  });
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
    maxZoom: features.length > 1 ? 12.1 : 13.2,
    padding: getResponsiveMapPadding(map, "overview"),
  });
}

function zoomToDistrictDetail(map: Map | null, features: SiteFeature[]) {
  if (!map) {
    return;
  }

  const bounds = getFeatureBounds(features);
  if (!bounds) {
    return;
  }

  map.fitBounds(bounds, {
    duration: 760,
    maxZoom: features.length > 1 ? 15.6 : 16.6,
    padding: getResponsiveMapPadding(map, "detail"),
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
    padding: getResponsiveMapPadding(map, "site"),
  });
}

function getResponsiveMapPadding(map: Map, mode: "overview" | "site" | "detail") {
  const width = map.getCanvas().clientWidth;
  const height = map.getCanvas().clientHeight;
  const isTight = mode === "site" || mode === "detail";
  const left = Math.min(isTight ? 320 : 360, Math.max(32, Math.floor(width * 0.2)));
  const right = Math.min(isTight ? 96 : 72, Math.max(28, Math.floor(width * 0.06)));
  const top = Math.min(isTight ? 104 : 56, Math.max(28, Math.floor(height * 0.08)));
  const bottom = Math.min(isTight ? 104 : 56, Math.max(28, Math.floor(height * 0.08)));

  return { bottom, left, right, top };
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
