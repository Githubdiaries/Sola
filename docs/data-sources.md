# Data Sources

Initial local data is synthetic sample data in `data/sample/solar_sites.geojson` and `scripts/init-db.sql`.

Production deployments should prioritize:

- Building footprints and rooftop polygons from municipal GIS, OpenStreetMap, or licensed parcel datasets.
- Irradiance from NSRDB, Solargis, NASA POWER, or country-specific solar atlases.
- Flood risk from municipal drainage layers, FEMA-style flood maps where available, and DEM-derived water accumulation.
- Grid proximity from utility substations, feeder maps, and public transmission datasets.
- Satellite or aerial imagery for AI roof detection and obstruction validation.

Every imported layer should retain source, capture date, license, and confidence metadata.
