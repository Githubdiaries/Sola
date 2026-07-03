-- Rank low-flood-risk, high-yield candidate sites near Kochi/Ernakulam.
SELECT site_id, site_name, city, suitability_score, nasa_annual_ghi_kwh_m2,
       flood_risk_score, grid_distance_km, estimated_annual_generation_kwh
FROM `PROJECT_ID.sola_decision_intelligence.site_enrichment`
WHERE LOWER(city) IN ('kochi', 'ernakulam')
  AND flood_risk_score < 0.05
  AND estimated_capacity_kw >= 10000
ORDER BY suitability_score DESC, estimated_annual_generation_kwh DESC
LIMIT 20;

-- Geospatial filter: candidates within 10 km of a planned substation.
DECLARE substation GEOGRAPHY DEFAULT ST_GEOGPOINT(76.2673, 9.9312);
SELECT site_id, site_name, ST_DISTANCE(geom, substation) / 1000 AS km_from_substation,
       suitability_score
FROM `PROJECT_ID.sola_decision_intelligence.site_enrichment`
WHERE ST_DWITHIN(geom, substation, 10000)
ORDER BY suitability_score DESC;
