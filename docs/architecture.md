# Sola Architecture

Sola is organized around a geospatial API, a map-first frontend, and offline GIS processing.

## System Overview

- **Ingest:** curated rooftop or parcel data enters the project as CSV or GeoJSON.
- **Store:** PostGIS holds the operational site inventory and spatial indexes.
- **Score:** the suitability service ranks each site using irradiance, usable area, flood risk, and grid proximity.
- **Serve:** FastAPI returns ranked GeoJSON to the frontend.
- **Visualize:** the Next.js app shows the ranked shortlist, filters, and site-level details.
- **Export:** users can download CSV and GeoJSON for GIS review or planning workflows.

- FastAPI serves scored candidate sites as GeoJSON.
- PostgreSQL 16 with PostGIS 3.4 stores polygons and spatial indexes.
- The suitability service keeps scoring logic independent from geometry extraction, which makes future AI roof detection a data enrichment step rather than an API rewrite.
- GIS processing scripts and notebooks handle heavy raster/vector work before curated outputs enter PostGIS.
- Grafana monitors data freshness, API health, and post-installation system performance.

## Scale-Up Path

- Cloud Storage can hold raw imagery, parcel layers, and processed exports.
- BigQuery can become the analytical store for large site inventories and feature tables.
- GKE can host the API and frontend when the demo needs a managed deployment.
- RAPIDS or cuDF can accelerate the batch scoring and join step when the dataset grows.

## Extension points

- AI roof detection can populate `ai_detection_status`, refined roof polygons, shading loss, and usable area.
- Grid hosting capacity can be added as a new spatial layer joined by distance or feeder ID.
- Flood and climate risk can be refreshed from raster overlays in `gis-processing`.
