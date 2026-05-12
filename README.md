# Sola

**GIS-powered solar site discovery for utility-scale virtual aggregation — powering renewable data centers.**

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
