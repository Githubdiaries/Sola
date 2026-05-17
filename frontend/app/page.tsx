import { SiteExplorer, type SiteFeature } from "../components/site-explorer";
import { sampleSites } from "../lib/sample-sites";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

async function getSites() {
  if (!apiUrl) {
    return { ...sampleSites, source: "sample" as const };
  }

  try {
    const res = await fetch(`${apiUrl}/api/v1/sites?limit=100`, { next: { revalidate: 30 } });
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

  return <SiteExplorer sites={{ type: "FeatureCollection", features }} usingSampleData={usingSampleData} />;
}
