# API

Base URL: `http://localhost:8000`

## `GET /api/v1/sites`

Returns a GeoJSON FeatureCollection of ranked solar candidate sites.

Query parameters:

- `district`: exact Kerala district filter, case-insensitive. `city` remains as a backwards-compatible alias.
- `min_area_sqm`: minimum usable area.
- `min_score`: minimum suitability score from 0 to 100.
- `limit`: maximum number of sites.

Example:

```bash
curl "http://localhost:8000/api/v1/sites?district=Ernakulam&min_area_sqm=8000&min_score=80"
```

## `POST /api/v1/analysis/suitability`

Scores a candidate before it is persisted.

```bash
curl -X POST "http://localhost:8000/api/v1/analysis/suitability" \
  -H "Content-Type: application/json" \
  -d '{"usable_area_sqm":9000,"annual_ghi_kwh_m2":1880,"flood_risk_score":0.2,"grid_distance_km":1.8}'
```
