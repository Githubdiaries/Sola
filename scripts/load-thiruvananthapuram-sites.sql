CREATE UNIQUE INDEX IF NOT EXISTS ux_solar_sites_name_city ON solar_sites (name, city);

INSERT INTO solar_sites (
    name, city, state, country, asset_type, owner_type, address,
    total_area_sqm, usable_area_sqm, annual_ghi_kwh_m2, flood_risk_score,
    grid_distance_km, roof_pitch_degrees, shading_loss_pct, structural_score,
    suitability_score, estimated_capacity_kw, estimated_annual_generation_kwh,
    data_source, ai_detection_status, notes, geom
) VALUES
(
    'Technopark Phase 1', 'Thiruvananthapuram', 'Kerala', 'India', 'commercial_rooftop',
    'private_commercial', 'Technopark Phase 1, Kazhakootam, Thiruvananthapuram',
    56250, 45000, 1980, 0.30, 1.2, 4, 7.0, 0.82,
    87.70, 4500, 6949800, 'user_mvp_seed', 'needs_ai_validation',
    'Large IT campus with multiple buildings - excellent candidate',
    ST_MakeEnvelope(76.8799, 8.5569, 76.8821, 8.5591, 4326)
),
(
    'Technopark Phase 2', 'Thiruvananthapuram', 'Kerala', 'India', 'commercial_rooftop',
    'private_commercial', 'Technopark Phase 2, Thiruvananthapuram',
    40000, 32000, 1980, 0.30, 1.5, 4, 7.5, 0.80,
    87.25, 3200, 4942080, 'user_mvp_seed', 'needs_ai_validation',
    'Major IT buildings',
    ST_MakeEnvelope(76.8769, 8.5514, 76.8791, 8.5536, 4326)
),
(
    'Technopark Phase 3', 'Thiruvananthapuram', 'Kerala', 'India', 'commercial_rooftop',
    'private_commercial', 'Technopark Phase 3, Thiruvananthapuram',
    35000, 28000, 1980, 0.30, 1.8, 4, 8.0, 0.80,
    86.80, 2800, 4324320, 'user_mvp_seed', 'needs_ai_validation',
    'Newer expansion area',
    ST_MakeEnvelope(76.8789, 8.5489, 76.8811, 8.5511, 4326)
),
(
    'Lulu Mall Thiruvananthapuram', 'Thiruvananthapuram', 'Kerala', 'India', 'commercial_rooftop',
    'private_retail', 'Lulu Mall, Thiruvananthapuram',
    22500, 18000, 1980, 0.40, 2.5, 3, 8.5, 0.84,
    83.75, 1800, 2779920, 'user_mvp_seed', 'needs_ai_validation',
    'Large modern mall rooftop + parking canopy potential',
    ST_MakeEnvelope(76.8975, 8.5142, 76.8997, 8.5164, 4326)
),
(
    'Mall of Travancore', 'Thiruvananthapuram', 'Kerala', 'India', 'commercial_rooftop',
    'private_retail', 'Mall of Travancore, Thiruvananthapuram',
    18750, 15000, 1980, 0.35, 3.0, 3, 9.0, 0.82,
    84.00, 1500, 2316600, 'user_mvp_seed', 'needs_ai_validation',
    'Near airport - high visibility',
    ST_MakeEnvelope(76.9189, 8.4769, 76.9211, 8.4791, 4326)
),
(
    'Trivandrum Central Railway Station', 'Thiruvananthapuram', 'Kerala', 'India', 'transport_rooftop',
    'public_transport', 'Thampanoor, Thiruvananthapuram',
    10000, 8000, 1980, 0.45, 0.8, 5, 11.0, 0.72,
    78.30, 800, 1235520, 'user_mvp_seed', 'needs_ai_validation',
    'Main station roof + platforms',
    ST_MakeEnvelope(76.9514, 8.4859, 76.9536, 8.4881, 4326)
),
(
    'Trivandrum International Airport Terminal', 'Thiruvananthapuram', 'Kerala', 'India', 'airport',
    'public_transport', 'Trivandrum International Airport, Thiruvananthapuram',
    31250, 25000, 1980, 0.25, 4.0, 2, 6.5, 0.78,
    84.50, 2500, 3861000, 'user_mvp_seed', 'needs_permissions_review',
    'Large terminal + cargo buildings (check permissions)',
    ST_MakeEnvelope(76.9189, 8.4809, 76.9211, 8.4831, 4326)
),
(
    'Government Secretariat', 'Thiruvananthapuram', 'Kerala', 'India', 'government',
    'public_government', 'Government Secretariat, Thiruvananthapuram',
    15000, 12000, 1980, 0.40, 1.0, 4, 9.0, 0.75,
    86.00, 1200, 1853280, 'user_mvp_seed', 'needs_permissions_review',
    'Main administrative complex',
    ST_MakeEnvelope(76.9349, 8.5234, 76.9371, 8.5256, 4326)
),
(
    'Medical College Hospital Trivandrum', 'Thiruvananthapuram', 'Kerala', 'India', 'institutional',
    'public_healthcare', 'Government Medical College, Thiruvananthapuram',
    18750, 15000, 1980, 0.50, 2.2, 4, 10.0, 0.76,
    82.20, 1500, 2316600, 'user_mvp_seed', 'needs_ai_validation',
    'Large hospital campus',
    ST_MakeEnvelope(76.9259, 8.5209, 76.9281, 8.5231, 4326)
),
(
    'University of Kerala Kariavattom Campus', 'Thiruvananthapuram', 'Kerala', 'India', 'institutional',
    'public_education', 'Kariavattom Campus, University of Kerala',
    27500, 22000, 1980, 0.35, 3.5, 5, 9.5, 0.78,
    83.25, 2200, 3397680, 'user_mvp_seed', 'needs_ai_validation',
    'University buildings + open areas',
    ST_MakeEnvelope(76.8789, 8.5669, 76.8811, 8.5691, 4326)
),
(
    'SCTIMST Hospital', 'Thiruvananthapuram', 'Kerala', 'India', 'institutional',
    'public_healthcare', 'SCTIMST, Thiruvananthapuram',
    12500, 10000, 1980, 0.40, 2.0, 4, 8.5, 0.80,
    84.50, 1000, 1544400, 'user_mvp_seed', 'needs_ai_validation',
    'Prestigious medical institute',
    ST_MakeEnvelope(76.9239, 8.5214, 76.9261, 8.5236, 4326)
),
(
    'Kinfra Film & Video Park', 'Thiruvananthapuram', 'Kerala', 'India', 'industrial',
    'public_industrial', 'Kinfra Film and Video Park, Kazhakootam',
    22500, 18000, 1980, 0.30, 4.0, 4, 7.0, 0.80,
    87.20, 1800, 2779920, 'user_mvp_seed', 'needs_ai_validation',
    'Industrial + studio rooftops',
    ST_MakeEnvelope(76.8689, 8.5789, 76.8711, 8.5811, 4326)
),
(
    'Technocity Pallippuram', 'Thiruvananthapuram', 'Kerala', 'India', 'commercial_rooftop',
    'private_commercial', 'Technocity, Pallippuram, Thiruvananthapuram',
    43750, 35000, 1980, 0.25, 5.0, 4, 6.5, 0.80,
    83.00, 3500, 5405400, 'user_mvp_seed', 'needs_ai_validation',
    'Emerging IT township',
    ST_MakeEnvelope(76.8589, 8.5889, 76.8611, 8.5911, 4326)
),
(
    'Lulu Hypermarket Attingal (nearby)', 'Thiruvananthapuram', 'Kerala', 'India', 'commercial_rooftop',
    'private_retail', 'Attingal, near Thiruvananthapuram',
    15000, 12000, 1980, 0.40, 12.0, 3, 8.5, 0.80,
    72.50, 1200, 1853280, 'user_mvp_seed', 'needs_ai_validation',
    'Large retail',
    ST_MakeEnvelope(76.8189, 8.6989, 76.8211, 8.7011, 4326)
)
ON CONFLICT (name, city) DO NOTHING;
