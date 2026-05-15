# Sola Architecture

Sola is organized around a geospatial API, a map-first frontend, and offline GIS processing.

- FastAPI serves scored candidate sites as GeoJSON.
- PostgreSQL 16 with PostGIS 3.4 stores polygons and spatial indexes.
- The suitability service keeps scoring logic independent from geometry extraction, which makes future AI roof detection a data enrichment step rather than an API rewrite.
- GIS processing scripts and notebooks handle heavy raster/vector work before curated outputs enter PostGIS.
- Grafana monitors data freshness, API health, and post-installation system performance.

## Extension points

- AI roof detection can populate `ai_detection_status`, refined roof polygons, shading loss, and usable area.
- Grid hosting capacity can be added as a new spatial layer joined by distance or feeder ID.
- Flood and climate risk can be refreshed from raster overlays in `gis-processing`.
