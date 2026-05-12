# Sola

*GIS-powered solar site discovery for utility-scale virtual aggregation — powering renewable data centers.*

An open-source geospatial platform that identifies and ranks the **best locations** for solar PV installations within a city, with maximum usable surface area after all practical constraints.

### Core Purpose
Help data center operators (hyperscale & edge) discover high-potential solar sites for **Virtual Power Purchase Agreements (VPPAs)**, wheeling, and renewable energy aggregation.

---

### Key Features
 City-wide interactive map with ranked solar potential spots
- Multi-criteria suitability scoring (area, irradiance, flood risk, grid proximity, etc.)
- Private B2B dashboard for energy procurement teams
- Post-installation performance monitoring with **Grafana**
- Open data export for governments & developers

### Tech Stack
- **Backend**: Python + FastAPI
- **Database**: PostgreSQL + PostGIS
- **Frontend**: Next.js + TypeScript + Mapbox GL JS
- **GIS/ML**: GeoPandas, Rasterio, PVLib, PyTorch (roof segmentation)
- **Monitoring**: Grafana + TimescaleDB
- **Deployment**: Docker + Docker Compose

### Project Structure

```bash
solarforge/
├── backend/           # FastAPI application
├── frontend/          # Next.js frontend
├── gis-processing/    # Jupyter notebooks + processing scripts
├── grafana/           # Dashboard definitions
├── data/              # Sample data + ingestion scripts
├── docs/              # Documentation
├── docker-compose.yml
├── README.md
└── LICENSE
``` 

### Expected Pre-view

<img width="1536" height="1024" alt="Sola AI" src="https://github.com/user-attachments/assets/7cae982c-69e1-4742-b7c8-603059a527d7" />



---

### Local Development

```bash
# 1. Start the stack
docker-compose up -d

# 2. Backend + DB will be available
# 3. Grafana at http://localhost:3000

```

### Current Status

**Phase 0: Repository setup + architecture**
**Next: Data ingestion pipeline for first pilot city**

### Contributing
We welcome contributions! See docs/CONTRIBUTING.md (coming soon).
License
AGPL-3.0


