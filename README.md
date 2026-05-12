# Sola ☀️

**GIS-powered solar site discovery for utility-scale virtual aggregation — powering renewable data centres, one optimal spot at a time.**

Sola is an open-source B2B geospatial platform that identifies and ranks the best locations for solar PV installations within a city. It focuses on maximum usable surface area (rooftops, parking canopies, industrial land, brownfields, and suitable open spaces) after accounting for setbacks, shading, structural viability, flood/damp risk, land-use restrictions, and grid proximity.

### MVP

<img width="1536" height="1024" alt="Sola AI v.0" src="https://github.com/user-attachments/assets/f1ece94d-e9e8-4144-a5f3-946aefc817e8" />
" />

---

## Core Purpose

Enable data-centre operators (hyperscale and edge/mini) to discover high-potential solar sites for:

- Virtual Power Purchase Agreements (VPPAs)
- Wheeling and renewable energy attribute aggregation
- Reliable green power matching via the existing grid

---

## Key Features (MVP)

| Feature | Status |
|---|---|
| City-wide interactive map (ranked solar spots) | ✅ |
| Multi-criteria suitability scoring engine | ✅ |
| Private B2B dashboard with KPIs & site table | ✅ |
| Adjustable scoring weights | ✅ |
| CSV + GeoJSON export | ✅ |
| Post-installation Grafana monitoring dashboard | ✅ |
| Crowdsourced / satellite validation layer | 🔜 |

---

## Scoring Model

Each candidate site is scored on five dimensions (each normalised to 0–1):

| Criterion | Default Weight | Description |
|---|---|---|
| Usable area | 0.30 | Normalised usable surface m² (rooftop / parking / brownfield) |
| Irradiance | 0.25 | Annual GHI (kWh/m²/yr) normalised to city range |
| Flood risk | 0.20 | Inverted — lower risk yields higher score |
| Grid proximity | 0.15 | Inverted — closer to HV substation = higher score |
| Structural viability | 0.10 | Land-use / structural suitability (direct 0–1 input) |

Weights are configurable via the **Scoring Weights** page in the UI.

---

## Architecture

MVP (this repository):

```
sola/
├── app/
│   ├── main.py            # Streamlit entry point
│   ├── scoring.py         # Multi-criteria scoring engine
│   ├── map_view.py        # Folium interactive map builder
│   └── data/
│       └── sample_sites.py  # Synthetic city-site generator (demo)
├── grafana/
│   └── dashboards/
│       └── solar_monitoring.json   # Grafana provisioning JSON
├── tests/
│   ├── test_scoring.py
│   └── test_data.py
└── requirements.txt
```

Planned full-stack architecture:

```
sola/
├── backend/           # FastAPI application
├── frontend/          # Next.js + TypeScript + Mapbox GL JS
├── gis-processing/    # GeoPandas, Rasterio, PVLib notebooks
├── grafana/           # Dashboard definitions
├── data/              # Data ingestion scripts
├── docs/
└── docker-compose.yml
```

**MVP tech stack**: Python · Streamlit · Folium · Pandas · NumPy  
**Planned stack**: FastAPI · PostgreSQL/PostGIS · Next.js · GeoPandas · PVLib · PyTorch · Grafana/TimescaleDB · Docker

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Githubdiaries/Sola.git
cd Sola

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
streamlit run app/main.py
```

Open [http://localhost:8501](http://localhost:8501) in your browser.

---

## Running Tests

```bash
pytest tests/ -v
```

---

## Grafana Monitoring

Import `grafana/dashboards/solar_monitoring.json` into a Grafana instance (≥ 10.0). The dashboard expects a time-series data source (e.g., InfluxDB or Prometheus) tagged with `site_id`. Panels include:

- Total active power (kW)
- Today's energy yield (kWh)
- Performance ratio (%)
- CO₂ avoided (kg)
- 24-hour AC power time-series
- Irradiance vs output correlation
- Monthly energy yield (MWh)

---

## Target Users

- Renewable / energy procurement teams at hyperscale & edge data centres
- Solar EPCs and project developers
- Government bodies for policy planning

---

## Current Status

- ✅ Phase 0: Repository setup + architecture
- ✅ Phase 1: MVP — Streamlit scoring & mapping app
- 🔜 Phase 2: Data ingestion pipeline for first pilot city
- 🔜 Phase 3: Full-stack (FastAPI + Next.js + PostGIS)

---

## Roadmap

- [ ] Real GIS data ingestion (OS MasterMap, OpenStreetMap, satellite imagery)
- [ ] Shading analysis (horizon / 3-D building model)
- [ ] Grid connection capacity layer
- [ ] VPPA aggregation calculator
- [ ] Crowdsourced validation layer
- [ ] Role-based access control (B2B multi-tenant)
- [ ] REST API for third-party integrations

---

## Contributing

We welcome contributions! See `docs/CONTRIBUTING.md` (coming soon).

---

## License

AGPL-3.0
