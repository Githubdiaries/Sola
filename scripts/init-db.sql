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

INSERT INTO solar_sites (
    name, city, state, country, asset_type, owner_type, address,
    total_area_sqm, usable_area_sqm, annual_ghi_kwh_m2, flood_risk_score,
    grid_distance_km, roof_pitch_degrees, shading_loss_pct, structural_score,
    suitability_score, estimated_capacity_kw, estimated_annual_generation_kwh,
    data_source, ai_detection_status, notes, geom
) VALUES
(
    'Peenya Industrial Shed Cluster A', 'Bengaluru', 'Karnataka', 'India', 'industrial_rooftop',
    'private_industrial', 'Peenya Industrial Area, Bengaluru',
    14200, 10950, 1875, 0.18, 1.4, 4, 6.5, 0.82,
    91.83, 1095, 1601437.5, 'sample', 'ready_for_ai_validation',
    'Large contiguous roof plane close to distribution infrastructure.',
    ST_GeomFromText('POLYGON((77.5149 13.0297,77.5162 13.0297,77.5162 13.0310,77.5149 13.0310,77.5149 13.0297))', 4326)
),
(
    'Whitefield Logistics Park Roof 3', 'Bengaluru', 'Karnataka', 'India', 'warehouse_rooftop',
    'private_logistics', 'Whitefield, Bengaluru',
    18800, 13240, 1842, 0.26, 2.1, 3, 8.0, 0.78,
    89.78, 1324, 1900560.24, 'sample', 'not_started',
    'High area; moderate waterlogging risk needs validation.',
    ST_GeomFromText('POLYGON((77.7471 12.9716,77.7487 12.9716,77.7487 12.9730,77.7471 12.9730,77.7471 12.9716))', 4326)
),
(
    'Gurugram Cyber Park Block B', 'Gurugram', 'Haryana', 'India', 'commercial_rooftop',
    'private_commercial', 'DLF Cyber City, Gurugram',
    9800, 7210, 1940, 0.12, 1.9, 2, 10.0, 0.86,
    86.94, 721, 1091365.2, 'sample', 'ready_for_ai_validation',
    'Premium C&I lead with strong irradiation and nearby substation.',
    ST_GeomFromText('POLYGON((77.0890 28.4945,77.0900 28.4945,77.0900 28.4954,77.0890 28.4954,77.0890 28.4945))', 4326)
),
(
    'Chennai Oragadam Auto Supplier Roof', 'Chennai', 'Tamil Nadu', 'India', 'industrial_rooftop',
    'private_industrial', 'Oragadam Industrial Corridor, Chennai',
    12400, 8600, 1810, 0.38, 3.2, 5, 7.5, 0.76,
    75.44, 860, 1214508, 'sample', 'not_started',
    'Good usable area; flood and evacuation layers should be reviewed.',
    ST_GeomFromText('POLYGON((80.0050 12.8451,80.0062 12.8451,80.0062 12.8462,80.0050 12.8462,80.0050 12.8451))', 4326)
),
(
    'Hyderabad Genome Valley Facility', 'Hyderabad', 'Telangana', 'India', 'commercial_rooftop',
    'private_commercial', 'Genome Valley, Hyderabad',
    7600, 5630, 1965, 0.09, 4.6, 6, 5.0, 0.81,
    81.15, 563, 863081.1, 'sample', 'ready_for_ai_validation',
    'Strong solar resource; grid upgrade cost may shape payback.',
    ST_GeomFromText('POLYGON((78.6030 17.6700,78.6040 17.6700,78.6040 17.6710,78.6030 17.6710,78.6030 17.6700))', 4326)
)
ON CONFLICT (id) DO NOTHING;
