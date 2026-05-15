import { MapPin, SlidersHorizontal, Zap } from "lucide-react";
import type React from "react";

import { sampleSites } from "../lib/sample-sites";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type SiteFeature = (typeof sampleSites.features)[number];

async function getSites() {
  try {
    const res = await fetch(`${apiUrl}/api/v1/sites?limit=5`, { next: { revalidate: 60 } });
    if (!res.ok) {
      return { ...sampleSites, source: "sample" as const };
    }

    const payload = await res.json();
    return { ...payload, source: "api" as const };
  } catch {
    return { ...sampleSites, source: "sample" as const };
  }
}

export default async function Home() {
  const sites = await getSites();
  const features = (sites.features ?? []) as SiteFeature[];
  const usingSampleData = sites.source === "sample";

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">Sola</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-300">
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
            <span className="rounded border border-neutral-700 px-3 py-2">Mapbox-ready</span>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric icon={<Zap size={18} />} label="Top score" value={`${features[0]?.properties?.suitability_score ?? 0}`} />
          <Metric icon={<MapPin size={18} />} label="Sample sites" value={`${features.length}`} />
          <Metric icon={<SlidersHorizontal size={18} />} label="Filters" value="City, area, score" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="min-h-[520px] rounded border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex h-full items-center justify-center rounded bg-neutral-950 px-6 text-center text-sm text-neutral-400">
              Add a Mapbox token and wire this panel to mapbox-gl for live candidate polygons.
            </div>
          </div>
          <aside className="rounded border border-neutral-800 bg-neutral-900">
            <div className="border-b border-neutral-800 p-4">
              <h2 className="text-base font-medium">Highest viability sites</h2>
            </div>
            <div className="divide-y divide-neutral-800">
              {features.map((feature) => {
                const estimatedCapacityKw =
                  feature.properties.estimated_capacity_kw ?? Math.round(feature.properties.usable_area_sqm / 10);

                return (
                  <article key={feature.properties.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-medium">{feature.properties.name}</h3>
                        <p className="mt-1 text-xs text-neutral-400">{feature.properties.city}</p>
                      </div>
                      <span className="rounded bg-emerald-500 px-2 py-1 text-xs font-semibold text-neutral-950">
                        {feature.properties.suitability_score}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-neutral-300">
                      {feature.properties.usable_area_sqm.toLocaleString()} sqm usable area |{" "}
                      {estimatedCapacityKw.toLocaleString()} kW est.
                    </p>
                  </article>
                );
              })}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center gap-2 text-neutral-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}
