CREATE UNIQUE INDEX IF NOT EXISTS ux_solar_sites_name_city ON solar_sites (name, city);

DELETE FROM solar_sites
WHERE data_source IN ('kerala_mvp_seed', 'kerala_district_mvp_seed', 'sample', 'user_mvp_seed');

INSERT INTO solar_sites (
    name, city, state, country, asset_type, owner_type, address,
    total_area_sqm, usable_area_sqm, annual_ghi_kwh_m2, flood_risk_score, grid_distance_km,
    roof_pitch_degrees, shading_loss_pct, structural_score,
    suitability_score, estimated_capacity_kw, estimated_annual_generation_kwh,
    data_source, ai_detection_status, notes, geom
)
VALUES
  (
    'Technopark Phase 1', 'Thiruvananthapuram', 'Kerala', 'India', 'commercial_rooftop',
    'private_commercial', 'Technopark Phase 1, Thiruvananthapuram, Kerala',
    56250, 45000, 1980, 0.35, 1.2,
    4.0, 7.5, 0.80, 92, 4500, 6949800,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Flagship IT campus',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.8799 8.5569, 76.8799 8.5591, 76.8821 8.5591, 76.8821 8.5569, 76.8799 8.5569)')), 4326)
  ),
  (
    'Technocity Pallippuram', 'Thiruvananthapuram', 'Kerala', 'India', 'commercial_rooftop',
    'private_commercial', 'Technocity Pallippuram, Thiruvananthapuram, Kerala',
    50000, 40000, 1980, 0.3, 5,
    4.0, 7.5, 0.80, 88.96, 4000, 6177600,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Emerging IT township',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.8589 8.5889, 76.8589 8.5911, 76.8611 8.5911, 76.8611 8.5889, 76.8589 8.5889)')), 4326)
  ),
  (
    'Technopark Phase 3', 'Thiruvananthapuram', 'Kerala', 'India', 'commercial_rooftop',
    'private_commercial', 'Technopark Phase 3, Thiruvananthapuram, Kerala',
    43750, 35000, 1980, 0.35, 2,
    4.0, 7.5, 0.80, 91.84, 3500, 5405400,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Expansion area',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.8789 8.5489, 76.8789 8.5511, 76.8811 8.5511, 76.8811 8.5489, 76.8789 8.5489)')), 4326)
  ),
  (
    'Lulu Mall', 'Thiruvananthapuram', 'Kerala', 'India', 'commercial_rooftop',
    'private_commercial', 'Lulu Mall, Thiruvananthapuram, Kerala',
    27500, 22000, 1980, 0.4, 3,
    4.0, 7.5, 0.80, 86.28, 2200, 3397680,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Largest mall in southern Kerala',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.8975 8.5142, 76.8975 8.5164, 76.8997 8.5164, 76.8997 8.5142, 76.8975 8.5142)')), 4326)
  ),
  (
    'Government Secretariat', 'Thiruvananthapuram', 'Kerala', 'India', 'government',
    'public_government', 'Government Secretariat, Thiruvananthapuram, Kerala',
    17500, 14000, 1980, 0.4, 0.8,
    4.0, 7.5, 0.80, 86.76, 1400, 2162160,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'State headquarters',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.9349 8.5234, 76.9349 8.5256, 76.9371 8.5256, 76.9371 8.5234, 76.9349 8.5234)')), 4326)
  ),
  (
    'Kollam KINFRA Park', 'Kollam', 'Kerala', 'India', 'industrial',
    'private_industrial', 'Kollam KINFRA Park, Kollam, Kerala',
    22500, 18000, 1970, 0.5, 3,
    4.0, 7.5, 0.80, 83.53, 1800, 2765880,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Industrial development area',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.5789 8.8789, 76.5789 8.8811, 76.5811 8.8811, 76.5811 8.8789, 76.5789 8.8789)')), 4326)
  ),
  (
    'Kollam Railway Station', 'Kollam', 'Kerala', 'India', 'transport_rooftop',
    'transport_authority', 'Kollam Railway Station, Kollam, Kerala',
    9375, 7500, 1970, 0.55, 1,
    4.0, 7.5, 0.80, 81.65, 750, 1152450,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Major rail station',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.5889 8.8889, 76.5889 8.8911, 76.5911 8.8911, 76.5911 8.8889, 76.5889 8.8889)')), 4326)
  ),
  (
    'Pathanamthitta District Hospital', 'Pathanamthitta', 'Kerala', 'India', 'institutional',
    'public_institutional', 'Pathanamthitta District Hospital, Pathanamthitta, Kerala',
    10625, 8500, 1970, 0.5, 4,
    4.0, 7.5, 0.80, 78.08, 850, 1306110,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'District hospital campus',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.7789 9.2589, 76.7789 9.2611, 76.7811 9.2611, 76.7811 9.2589, 76.7789 9.2589)')), 4326)
  ),
  (
    'Pathanamthitta Government Buildings', 'Pathanamthitta', 'Kerala', 'India', 'government',
    'public_government', 'Pathanamthitta Government Buildings, Pathanamthitta, Kerala',
    7500, 6000, 1970, 0.45, 3.5,
    4.0, 7.5, 0.80, 77.84, 600, 921960,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'District admin complex',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.7789 9.2689, 76.7789 9.2711, 76.7811 9.2711, 76.7811 9.2689, 76.7789 9.2689)')), 4326)
  ),
  (
    'Alappuzha Medical College', 'Alappuzha', 'Kerala', 'India', 'institutional',
    'public_institutional', 'Alappuzha Medical College, Alappuzha, Kerala',
    15000, 12000, 1950, 0.6, 2.5,
    4.0, 7.5, 0.80, 79.93, 1200, 1825200,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Major hospital',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.3389 9.4989, 76.3389 9.5011, 76.3411 9.5011, 76.3411 9.4989, 76.3389 9.4989)')), 4326)
  ),
  (
    'Alappuzha Railway Station', 'Alappuzha', 'Kerala', 'India', 'transport_rooftop',
    'transport_authority', 'Alappuzha Railway Station, Alappuzha, Kerala',
    8750, 7000, 1950, 0.65, 1,
    4.0, 7.5, 0.80, 79.34, 700, 1064700,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Backwater region station',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.3289 9.4889, 76.3289 9.4911, 76.3311 9.4911, 76.3311 9.4889, 76.3289 9.4889)')), 4326)
  ),
  (
    'Kottayam Medical College', 'Kottayam', 'Kerala', 'India', 'institutional',
    'public_institutional', 'Kottayam Medical College, Kottayam, Kerala',
    17500, 14000, 1960, 0.55, 2.8,
    4.0, 7.5, 0.80, 81.32, 1400, 2140320,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Major medical campus',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.5189 9.5789, 76.5189 9.5811, 76.5211 9.5811, 76.5211 9.5789, 76.5189 9.5789)')), 4326)
  ),
  (
    'Kottayam Railway Station', 'Kottayam', 'Kerala', 'India', 'transport_rooftop',
    'transport_authority', 'Kottayam Railway Station, Kottayam, Kerala',
    8125, 6500, 1960, 0.5, 1.2,
    4.0, 7.5, 0.80, 80.57, 650, 993720,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Main station',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.5289 9.5889, 76.5289 9.5911, 76.5311 9.5911, 76.5311 9.5889, 76.5289 9.5889)')), 4326)
  ),
  (
    'Idukki District Hospital', 'Idukki', 'Kerala', 'India', 'institutional',
    'public_institutional', 'Idukki District Hospital, Idukki, Kerala',
    10625, 8500, 1850, 0.35, 4.5,
    4.0, 7.5, 0.80, 71.14, 850, 1226550,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'District headquarters hospital',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.9489 9.8489, 76.9489 9.8511, 76.9511 9.8511, 76.9511 9.8489, 76.9489 9.8489)')), 4326)
  ),
  (
    'Cochin International Airport', 'Ernakulam', 'Kerala', 'India', 'airport',
    'transport_authority', 'Cochin International Airport, Ernakulam, Kerala',
    56250, 45000, 1950, 0.3, 2.5,
    4.0, 7.5, 0.80, 92, 4500, 6844500,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'World''s first solar-powered airport',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.3909 10.1509, 76.3909 10.1531, 76.3931 10.1531, 76.3931 10.1509, 76.3909 10.1509)')), 4326)
  ),
  (
    'Infopark Kakkanad Phase 1', 'Ernakulam', 'Kerala', 'India', 'commercial_rooftop',
    'private_commercial', 'Infopark Kakkanad Phase 1, Ernakulam, Kerala',
    52500, 42000, 1950, 0.45, 1.5,
    4.0, 7.5, 0.80, 91.63, 4200, 6388200,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Major IT hub',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.3629 10.0094, 76.3629 10.0116, 76.3651 10.0116, 76.3651 10.0094, 76.3629 10.0094)')), 4326)
  ),
  (
    'Infopark Phase 2', 'Ernakulam', 'Kerala', 'India', 'commercial_rooftop',
    'private_commercial', 'Infopark Phase 2, Ernakulam, Kerala',
    35000, 28000, 1950, 0.45, 1.8,
    4.0, 7.5, 0.80, 87.63, 2800, 4258800,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'IT expansion',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.3439 10.0139, 76.3439 10.0161, 76.3461 10.0161, 76.3461 10.0139, 76.3439 10.0139)')), 4326)
  ),
  (
    'Lulu Mall Kochi', 'Ernakulam', 'Kerala', 'India', 'commercial_rooftop',
    'private_commercial', 'Lulu Mall Kochi, Ernakulam, Kerala',
    31250, 25000, 1950, 0.5, 2.5,
    4.0, 7.5, 0.80, 85.31, 2500, 3802500,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'One of India''s largest malls',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.3069 10.0264, 76.3069 10.0286, 76.3091 10.0286, 76.3091 10.0264, 76.3069 10.0264)')), 4326)
  ),
  (
    'Aster Medcity', 'Ernakulam', 'Kerala', 'India', 'institutional',
    'public_institutional', 'Aster Medcity, Ernakulam, Kerala',
    22500, 18000, 1950, 0.4, 3,
    4.0, 7.5, 0.80, 83.1, 1800, 2737800,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Large multi-specialty hospital',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.2770 10.0422, 76.2770 10.0444, 76.2792 10.0444, 76.2792 10.0422, 76.2770 10.0422)')), 4326)
  ),
  (
    'Thrissur KINFRA Park', 'Thrissur', 'Kerala', 'India', 'industrial',
    'private_industrial', 'Thrissur KINFRA Park, Thrissur, Kerala',
    22500, 18000, 1960, 0.45, 4,
    4.0, 7.5, 0.80, 81.82, 1800, 2751840,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Central Kerala industrial area',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.2089 10.5189, 76.2089 10.5211, 76.2111 10.5211, 76.2111 10.5189, 76.2089 10.5189)')), 4326)
  ),
  (
    'Thrissur Medical College', 'Thrissur', 'Kerala', 'India', 'institutional',
    'public_institutional', 'Thrissur Medical College, Thrissur, Kerala',
    18750, 15000, 1960, 0.45, 2.5,
    4.0, 7.5, 0.80, 82.97, 1500, 2293200,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Major medical campus',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.2189 10.5189, 76.2189 10.5211, 76.2211 10.5211, 76.2211 10.5189, 76.2189 10.5189)')), 4326)
  ),
  (
    'Thrissur Railway Station', 'Thrissur', 'Kerala', 'India', 'transport_rooftop',
    'transport_authority', 'Thrissur Railway Station, Thrissur, Kerala',
    10000, 8000, 1960, 0.45, 1,
    4.0, 7.5, 0.80, 82.1, 800, 1223040,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Main rail hub',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.2089 10.5139, 76.2089 10.5161, 76.2111 10.5161, 76.2111 10.5139, 76.2089 10.5139)')), 4326)
  ),
  (
    'KSIDC Kanjikode', 'Palakkad', 'Kerala', 'India', 'industrial',
    'private_industrial', 'KSIDC Kanjikode, Palakkad, Kerala',
    47500, 38000, 1970, 0.55, 3.5,
    4.0, 7.5, 0.80, 88.11, 3800, 5839080,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Major industrial zone',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.6489 10.8489, 76.6489 10.8511, 76.6511 10.8511, 76.6511 10.8489, 76.6489 10.8489)')), 4326)
  ),
  (
    'Palakkad Railway Station', 'Palakkad', 'Kerala', 'India', 'transport_rooftop',
    'transport_authority', 'Palakkad Railway Station, Palakkad, Kerala',
    10000, 8000, 1970, 0.5, 1,
    4.0, 7.5, 0.80, 82.32, 800, 1229280,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Major rail junction',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.6489 10.7789, 76.6489 10.7811, 76.6511 10.7811, 76.6511 10.7789, 76.6489 10.7789)')), 4326)
  ),
  (
    'KINFRA Malappuram Park', 'Malappuram', 'Kerala', 'India', 'industrial',
    'private_industrial', 'KINFRA Malappuram Park, Malappuram, Kerala',
    27500, 22000, 1940, 0.45, 4,
    4.0, 7.5, 0.80, 81.92, 2200, 3329040,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Techno Industrial Park',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(75.9989 11.0489, 75.9989 11.0511, 76.0011 11.0511, 76.0011 11.0489, 75.9989 11.0489)')), 4326)
  ),
  (
    'Malappuram Medical College', 'Malappuram', 'Kerala', 'India', 'institutional',
    'public_institutional', 'Malappuram Medical College, Malappuram, Kerala',
    16250, 13000, 1940, 0.5, 3.5,
    4.0, 7.5, 0.80, 79.04, 1300, 1967160,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'District hospital',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(75.9989 11.0789, 75.9989 11.0811, 76.0011 11.0811, 76.0011 11.0789, 75.9989 11.0789)')), 4326)
  ),
  (
    'Calicut International Airport', 'Kozhikode', 'Kerala', 'India', 'airport',
    'transport_authority', 'Calicut International Airport, Kozhikode, Kerala',
    25000, 20000, 1920, 0.35, 4,
    4.0, 7.5, 0.80, 80.84, 2000, 2995200,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Important northern airport',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(75.9489 11.1289, 75.9489 11.1311, 75.9511 11.1311, 75.9511 11.1289, 75.9489 11.1289)')), 4326)
  ),
  (
    'Kozhikode Medical College', 'Kozhikode', 'Kerala', 'India', 'institutional',
    'public_institutional', 'Kozhikode Medical College, Kozhikode, Kerala',
    20000, 16000, 1920, 0.5, 3,
    4.0, 7.5, 0.80, 79.73, 1600, 2396160,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'North Kerala major hospital',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(75.7789 11.2589, 75.7789 11.2611, 75.7811 11.2611, 75.7811 11.2589, 75.7789 11.2589)')), 4326)
  ),
  (
    'Kozhikode Railway Station', 'Kozhikode', 'Kerala', 'India', 'transport_rooftop',
    'transport_authority', 'Kozhikode Railway Station, Kozhikode, Kerala',
    11875, 9500, 1920, 0.5, 1,
    4.0, 7.5, 0.80, 80, 950, 1422720,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Main station',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(75.7789 11.2449, 75.7789 11.2471, 75.7811 11.2471, 75.7811 11.2449, 75.7789 11.2449)')), 4326)
  ),
  (
    'Wayanad Medical College', 'Wayanad', 'Kerala', 'India', 'institutional',
    'public_institutional', 'Wayanad Medical College, Wayanad, Kerala',
    11250, 9000, 1880, 0.45, 5.5,
    4.0, 7.5, 0.80, 70.94, 900, 1319760,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'District hospital',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.0989 11.6489, 76.0989 11.6511, 76.1011 11.6511, 76.1011 11.6489, 76.0989 11.6489)')), 4326)
  ),
  (
    'Kalpetta Government Buildings', 'Wayanad', 'Kerala', 'India', 'government',
    'public_government', 'Kalpetta Government Buildings, Wayanad, Kerala',
    7500, 6000, 1880, 0.4, 6,
    4.0, 7.5, 0.80, 70, 600, 879840,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Wayanad district admin',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(76.0789 11.6089, 76.0789 11.6111, 76.0811 11.6111, 76.0811 11.6089, 76.0789 11.6089)')), 4326)
  ),
  (
    'Kannur International Airport', 'Kannur', 'Kerala', 'India', 'airport',
    'transport_authority', 'Kannur International Airport, Kannur, Kerala',
    22500, 18000, 1900, 0.3, 5,
    4.0, 7.5, 0.80, 77.83, 1800, 2667600,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'New airport with strong potential',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(75.5489 11.9189, 75.5489 11.9211, 75.5511 11.9211, 75.5511 11.9189, 75.5489 11.9189)')), 4326)
  ),
  (
    'Lulu Mall Kannur', 'Kannur', 'Kerala', 'India', 'commercial_rooftop',
    'private_commercial', 'Lulu Mall Kannur, Kannur, Kerala',
    17500, 14000, 1900, 0.45, 2.5,
    4.0, 7.5, 0.80, 78.88, 1400, 2074800,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Large retail mall',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(75.3689 11.8789, 75.3689 11.8811, 75.3711 11.8811, 75.3711 11.8789, 75.3689 11.8789)')), 4326)
  ),
  (
    'Kannur Medical College', 'Kannur', 'Kerala', 'India', 'institutional',
    'public_institutional', 'Kannur Medical College, Kannur, Kerala',
    13750, 11000, 1900, 0.45, 3,
    4.0, 7.5, 0.80, 76.87, 1100, 1630200,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Major hospital',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(75.3689 11.8689, 75.3689 11.8711, 75.3711 11.8711, 75.3711 11.8689, 75.3689 11.8689)')), 4326)
  ),
  (
    'Kasaragod KINFRA Park', 'Kasaragod', 'Kerala', 'India', 'industrial',
    'private_industrial', 'Kasaragod KINFRA Park, Kasaragod, Kerala',
    18750, 15000, 1850, 0.45, 5,
    4.0, 7.5, 0.80, 72.45, 1500, 2164500,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'Northern industrial area',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(74.9789 12.4989, 74.9789 12.5011, 74.9811 12.5011, 74.9811 12.4989, 74.9789 12.4989)')), 4326)
  ),
  (
    'Kasaragod Government Complex', 'Kasaragod', 'Kerala', 'India', 'government',
    'public_government', 'Kasaragod Government Complex, Kasaragod, Kerala',
    8750, 7000, 1850, 0.5, 4.5,
    4.0, 7.5, 0.80, 70, 700, 1010100,
    'kerala_district_mvp_seed', 'needs_ai_validation', 'District headquarters',
    ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(74.9989 12.4789, 74.9989 12.4811, 75.0011 12.4811, 75.0011 12.4789, 74.9989 12.4789)')), 4326)
  )
ON CONFLICT (name, city) DO UPDATE SET
    state = EXCLUDED.state,
    country = EXCLUDED.country,
    asset_type = EXCLUDED.asset_type,
    owner_type = EXCLUDED.owner_type,
    address = EXCLUDED.address,
    total_area_sqm = EXCLUDED.total_area_sqm,
    usable_area_sqm = EXCLUDED.usable_area_sqm,
    annual_ghi_kwh_m2 = EXCLUDED.annual_ghi_kwh_m2,
    flood_risk_score = EXCLUDED.flood_risk_score,
    grid_distance_km = EXCLUDED.grid_distance_km,
    roof_pitch_degrees = EXCLUDED.roof_pitch_degrees,
    shading_loss_pct = EXCLUDED.shading_loss_pct,
    structural_score = EXCLUDED.structural_score,
    suitability_score = EXCLUDED.suitability_score,
    estimated_capacity_kw = EXCLUDED.estimated_capacity_kw,
    estimated_annual_generation_kwh = EXCLUDED.estimated_annual_generation_kwh,
    data_source = EXCLUDED.data_source,
    ai_detection_status = EXCLUDED.ai_detection_status,
    notes = EXCLUDED.notes,
    geom = EXCLUDED.geom,
    updated_at = now();
