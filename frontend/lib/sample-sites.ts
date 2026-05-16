const thiruvananthapuramSites = [
  ["Technopark Phase 1", 8.558, 76.881, 45000, 1980, 0.3, 1.2, "commercial_rooftop", 87.7, 4500, 6949800, "Large IT campus with multiple buildings - excellent candidate"],
  ["Technopark Phase 2", 8.5525, 76.878, 32000, 1980, 0.3, 1.5, "commercial_rooftop", 87.25, 3200, 4942080, "Major IT buildings"],
  ["Technopark Phase 3", 8.55, 76.88, 28000, 1980, 0.3, 1.8, "commercial_rooftop", 86.8, 2800, 4324320, "Newer expansion area"],
  ["Government Secretariat", 8.5245, 76.936, 12000, 1980, 0.4, 1, "government", 86, 1200, 1853280, "Main administrative complex"],
  ["Trivandrum International Airport Terminal", 8.482, 76.92, 25000, 1980, 0.25, 4, "airport", 84.5, 2500, 3861000, "Large terminal + cargo buildings (check permissions)"],
  ["SCTIMST Hospital", 8.5225, 76.925, 10000, 1980, 0.4, 2, "institutional", 84.5, 1000, 1544400, "Prestigious medical institute"],
  ["Mall of Travancore", 8.478, 76.92, 15000, 1980, 0.35, 3, "commercial_rooftop", 84, 1500, 2316600, "Near airport - high visibility"],
  ["Lulu Mall Thiruvananthapuram", 8.5153, 76.8986, 18000, 1980, 0.4, 2.5, "commercial_rooftop", 83.75, 1800, 2779920, "Large modern mall rooftop + parking canopy potential"],
  ["Kinfra Film & Video Park", 8.58, 76.87, 18000, 1980, 0.3, 4, "industrial", 83.5, 1800, 2779920, "Industrial + studio rooftops"],
  ["University of Kerala Kariavattom Campus", 8.568, 76.88, 22000, 1980, 0.35, 3.5, "institutional", 83.25, 2200, 3397680, "University buildings + open areas"],
  ["Technocity Pallippuram", 8.59, 76.86, 35000, 1980, 0.25, 5, "commercial_rooftop", 83, 3500, 5405400, "Emerging IT township"],
  ["Medical College Hospital Trivandrum", 8.522, 76.927, 15000, 1980, 0.5, 2.2, "institutional", 82.2, 1500, 2316600, "Large hospital campus"],
  ["Trivandrum Central Railway Station", 8.487, 76.9525, 8000, 1980, 0.45, 0.8, "transport_rooftop", 78.3, 800, 1235520, "Main station roof + platforms"],
  ["Lulu Hypermarket Attingal", 8.7, 76.82, 12000, 1980, 0.4, 12, "commercial_rooftop", 72.5, 1200, 1853280, "Large retail site near Thiruvananthapuram"],
] as const;

export const sampleSites = {
  type: "FeatureCollection",
  features: thiruvananthapuramSites.map(
    ([name, latitude, longitude, usableArea, annualGhi, floodRisk, gridDistance, assetType, score, capacity, annualGeneration, notes]) => ({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [squarePolygon(longitude, latitude)],
      },
      properties: {
        id: `sample-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
        name,
        city: "Thiruvananthapuram",
        state: "Kerala",
        asset_type: assetType,
        usable_area_sqm: usableArea,
        annual_ghi_kwh_m2: annualGhi,
        flood_risk_score: floodRisk,
        grid_distance_km: gridDistance,
        suitability_score: score,
        estimated_capacity_kw: capacity,
        estimated_annual_generation_kwh: annualGeneration,
        notes,
      },
    }),
  ),
} as const;

function squarePolygon(longitude: number, latitude: number) {
  const delta = 0.0011;
  return [
    [longitude - delta, latitude - delta],
    [longitude - delta, latitude + delta],
    [longitude + delta, latitude + delta],
    [longitude + delta, latitude - delta],
    [longitude - delta, latitude - delta],
  ];
}
