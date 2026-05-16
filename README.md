# Sola

Sola is a full-stack solar site intelligence platform for small and mid-size solar EPCs, developers, and commercial rooftop sales teams.

The product helps teams find rooftops and land parcels with the most usable solar area and strongest project viability, then rank them quickly enough to turn GIS data into qualified pipeline.

## Customer Value

- Find high-potential commercial rooftops and sites without manual map trawling.
- Prioritize leads by usable area, irradiance, flood risk, and grid proximity.
- Return ranked polygons as GeoJSON for map workflows and downstream analysis.
- Keep the data model ready for AI roof detection, shading analysis, and grid hosting layers.
- Give sales and development teams a shared source of truth for early site screening.

## Current Stack

- Backend: Python 3.11, FastAPI async, SQLAlchemy 2.0, GeoAlchemy2.
- Database: PostgreSQL 16 with PostGIS 3.4.
- GIS: GeoPandas, Shapely, PVLib, Rasterio.
- Frontend: Next.js 15 App Router, TypeScript, Tailwind, MapLibre GL JS.
- Container: Docker Compose with PostGIS, backend API, and Grafana.

## Repository Structure

```text
Sola/
├── backend/              # FastAPI application
├── frontend/             # Next.js 15 App Router frontend
├── gis-processing/       # GeoPandas/PVLib/Rasterio processing workspace
├── grafana/              # Monitoring dashboards and provisioning
├── data/                 # Raw, processed, and sample datasets
├── docs/                 # Architecture, data, API, contribution docs
└── scripts/              # Setup, seed, and utility scripts
```

## Features

- `GET /api/v1/sites` returns GeoJSON FeatureCollections.
- Filters: `city`, `min_area_sqm`, `min_score`, and `limit`.
- Token-free MVP map using MapLibre GL JS and OpenStreetMap raster tiles.
- Realistic suitability scoring:
  - usable area weight
  - irradiance weight
  - flood risk weight
  - grid proximity weight
- Sample PostGIS data loads automatically on first database startup.
- Kerala MVP candidate sites are included in `scripts/load-thiruvananthapuram-sites.sql` and `data/sample/thiruvananthapuram_solar_sites.csv`.
- Structured JSON logging and defensive API error handling.
- Data model includes AI-detection status fields for later roof segmentation workflows.
- Grafana provisioning is ready for operational dashboards.

## How to Run Locally

1. Clone and enter the repository:

```bash
git clone https://github.com/Githubdiaries/Sola.git
cd Sola
```

2. Create your local environment file:

```bash
cp .env.example .env
```

3. Start PostGIS, the FastAPI backend, and Grafana:

```bash
docker compose up --build
```

4. Verify the backend:

```bash
curl http://localhost:8000/health
```

5. Query ranked solar sites:

```bash
curl "http://localhost:8000/api/v1/sites?city=Kochi&min_area_sqm=8000&min_score=80"
```

6. Open service UIs:

- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Grafana: [http://localhost:3001](http://localhost:3001)

Default Grafana credentials are `admin` / `admin` unless changed in `.env`.

## Running the Frontend

The frontend is scaffolded separately so product work can continue in parallel with GIS/API development.

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Examples

List all top-ranked sites:

```bash
curl "http://localhost:8000/api/v1/sites?limit=25"
```

Filter by project viability:

```bash
curl "http://localhost:8000/api/v1/sites?min_score=85&min_area_sqm=7000"
```

View the Kerala MVP pipeline:

```bash
curl "http://localhost:8000/api/v1/sites?city=Thiruvananthapuram&limit=50"
```

If your database volume already existed before the Thiruvananthapuram seed file was added, load it once:

```bash
type scripts\load-thiruvananthapuram-sites.sql | docker exec -i sola-postgis psql -U sola -d sola
```

Score a candidate before saving it:

```bash
curl -X POST "http://localhost:8000/api/v1/analysis/suitability" \
  -H "Content-Type: application/json" \
  -d '{"usable_area_sqm":9000,"annual_ghi_kwh_m2":1880,"flood_risk_score":0.2,"grid_distance_km":1.8}'
```

## Development Notes

- Backend configuration lives in `backend/app/core/config.py`.
- Database sessions and PostGIS initialization live in `backend/app/core/database.py`.
- The candidate site model lives in `backend/app/models/solar_site.py`.
- Scoring logic lives in `backend/app/services/suitability_service.py`.
- Sample seed data lives in `scripts/init-db.sql`.

The scoring service is intentionally isolated from the API endpoint so future AI roof detection can update polygons, usable area, shading loss, and confidence metadata without changing route contracts.

## License

AGPL-3.0. See [LICENSE](LICENSE).
