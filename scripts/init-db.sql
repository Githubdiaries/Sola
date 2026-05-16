CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS solar_sites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(160) NOT NULL,
    city varchar(100) NOT NULL,
    state varchar(100),
    country varchar(80) NOT NULL DEFAULT 'India',
    asset_type varchar(50) NOT NULL DEFAULT 'rooftop',
    owner_type varchar(80),
    address text,
    total_area_sqm double precision NOT NULL,
    usable_area_sqm double precision NOT NULL,
    annual_ghi_kwh_m2 double precision NOT NULL,
    flood_risk_score double precision NOT NULL DEFAULT 0,
    grid_distance_km double precision NOT NULL,
    roof_pitch_degrees double precision,
    shading_loss_pct double precision,
    structural_score double precision,
    suitability_score double precision NOT NULL,
    estimated_capacity_kw double precision NOT NULL,
    estimated_annual_generation_kwh double precision NOT NULL,
    data_source varchar(120) NOT NULL DEFAULT 'sample',
    ai_detection_status varchar(40) NOT NULL DEFAULT 'not_started',
    notes text,
    geom geometry(Polygon, 4326) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_solar_sites_city ON solar_sites (city);
CREATE INDEX IF NOT EXISTS ix_solar_sites_suitability_score ON solar_sites (suitability_score);
CREATE INDEX IF NOT EXISTS ix_solar_sites_city_score ON solar_sites (city, suitability_score DESC);
CREATE INDEX IF NOT EXISTS ix_solar_sites_geom ON solar_sites USING gist (geom);
CREATE UNIQUE INDEX IF NOT EXISTS ux_solar_sites_name_city ON solar_sites (name, city);
