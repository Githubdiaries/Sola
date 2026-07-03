CREATE SCHEMA IF NOT EXISTS `PROJECT_ID.sola_decision_intelligence`
OPTIONS(location = 'US');

CREATE TABLE IF NOT EXISTS `PROJECT_ID.sola_decision_intelligence.site_enrichment` (
  site_id STRING NOT NULL,
  site_name STRING,
  asset_type STRING,
  city STRING,
  country STRING,
  geom GEOGRAPHY NOT NULL,
  latitude FLOAT64,
  longitude FLOAT64,
  usable_area_sqm FLOAT64,
  annual_ghi_kwh_m2 FLOAT64,
  nasa_annual_ghi_kwh_m2 FLOAT64,
  dni_kwh_m2 FLOAT64,
  dhi_kwh_m2 FLOAT64,
  mean_temperature_c FLOAT64,
  flood_risk_score FLOAT64,
  grid_distance_km FLOAT64,
  suitability_score FLOAT64,
  estimated_capacity_kw FLOAT64,
  estimated_annual_generation_kwh FLOAT64,
  data_sources ARRAY<STRING>,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(updated_at)
CLUSTER BY city, asset_type;
