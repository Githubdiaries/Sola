# Contributing

Keep changes small, testable, and aligned with the platform stack:

- Python 3.11, FastAPI async endpoints, SQLAlchemy 2.0, GeoAlchemy2.
- PostgreSQL 16 with PostGIS 3.4 for spatial persistence.
- Next.js 15 App Router, TypeScript, Tailwind, and Mapbox GL JS for the frontend.
- GIS-heavy work belongs in `gis-processing` before it reaches the API.

Before opening a pull request, run backend tests and confirm `docker compose up --build` starts cleanly.
