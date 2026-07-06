# Sola ☀️

Sola is an AI-powered solar decision-intelligence platform for solar EPCs, rooftop sales teams, sustainability managers, and public-sector planners.

It helps a real user decide which rooftops or parcels are worth a site visit by turning messy geospatial data into a ranked shortlist, a map view, and exportable recommendations in seconds instead of manual map trawling.

## Submission Snapshot

- **Problem:** solar site screening is slow, manual, and hard to compare across many rooftops and parcels.
- **User:** EPC pre-sales teams, rooftop developers, and city sustainability analysts.
- **Decision:** which sites deserve a survey, feasibility review, or budget allocation first.
- **Pipeline:** site data is ingested into PostGIS, scored, ranked, filtered, and rendered as GeoJSON for the frontend.
- **Output:** a ranked shortlist, interactive map, score breakdowns, and CSV/GeoJSON export.
- **Acceleration story:** the shortlist updates instantly as the user changes filters, reducing time-to-insight versus manual map review.
- **Cloud/GPU narrative:** the repo is structured to map cleanly onto Cloud Storage, BigQuery, GKE, and RAPIDS if the team wants to scale the demo beyond the local MVP.

## Real-World User and Decision

- **User:** solar EPC pre-sales teams, commercial rooftop developers, and city sustainability analysts.
- **Decision:** which sites deserve a site survey, feasibility review, or engineering budget first.
- **Bottleneck:** manual GIS review across many polygons, distance checks, and risk factors is slow and hard to compare consistently.
- **Outcome:** Sola ranks candidate sites by solar irradiance first, then maximum usable solar space, then flood risk and grid proximity so the best options can be acted on faster.

## MVP

## User View

<img width="631" height="293" alt="Screenshot 2026-05-18 025533" src="https://github.com/user-attachments/assets/b4851c06-23e4-45fb-bc29-8d4bc21eff6f" />

<br><br>

<img width="631" height="292" alt="Screenshot 2026-05-18 024732" src="https://github.com/user-attachments/assets/d02529f3-3ef1-4db1-b95e-12a9e4df300e" />

## Admin View

<img width="1536" height="1024" alt="Solana" src="https://github.com/user-attachments/assets/816575ac-2678-43c6-9a2b-2f24b233b7bc" />









## Customer Value

- Find high-potential commercial rooftops and sites without manual map trawling.
- Prioritize leads by solar irradiance first, then usable solar space, flood risk, and grid proximity.
- Return ranked polygons as GeoJSON for map workflows and downstream analysis.
- Keep the data model ready for AI roof detection, shading analysis, and grid hosting layers.
- Give sales and development teams a shared source of truth for early site screening.

## Submission Fit

This repository is positioned to satisfy the hackathon brief as a practical data intelligence tool:

- **Data pipeline:** sample and PostGIS-backed geospatial site data is ingested, cleaned, scored, ranked, and rendered as GeoJSON for a map-first workflow.
- **Useful output:** ranked recommendations, interactive filtering, suitability scoring, and CSV/GeoJSON export.
- **Acceleration story:** the app collapses what is usually a manual screening workflow into an interactive shortlist that can be refreshed and re-ranked instantly as filters change.
- **Community value:** the same pattern applies to solar planning, public asset optimization, and other city-scale sustainability decisions.

## Judge Checklist

- A real-world user and problem are named.
- The decision bottleneck is explicit.
- The data pipeline is visible end to end.
- The output is useful for actual planning work.
- The acceleration claim is tied to faster shortlist generation.
- The cloud and GPU layer are described honestly as the scale-up path, not as a fake implementation claim.

## Google Cloud and NVIDIA Alignment

The current implementation is a local-first MVP, but the architecture is compatible with the required stack for a submission narrative or deployment path:

- **Cloud Storage:** store source rasters, parcel feeds, and cleaned GeoJSON layers.
- **BigQuery:** host large tabular site inventories, risk tables, and feature engineering outputs.
- **Google Kubernetes Engine:** run the API, frontend, and scheduled workers as scalable services.
- **NVIDIA acceleration layer:** use RAPIDS, cuDF, or Spark RAPIDS to accelerate large-scale geospatial joins, scoring, and ranking when the dataset grows.

In the current repo, PostGIS and the FastAPI scoring service provide the same product behavior locally; the cloud and GPU layers are the natural scale-up path for the submission.

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

The frontend is the primary demo surface for the hackathon story: it shows the user, the decision, the shortlist, and the acceleration effect in one screen.

## Demo Script

1. Open the map and explain the target user: solar EPC pre-sales teams and city planners.
2. Show the ranked list and explain the scoring order.
3. Change the district, score, or minimum area to demonstrate instant re-ranking.
4. Open a top site and point to the map, score, and export path.
5. Explain that Cloud Storage, BigQuery, GKE, and RAPIDS are the natural scale-up path for larger public or utility datasets.

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
