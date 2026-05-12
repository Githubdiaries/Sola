"""
Synthetic sample-site generator for the Sola MVP demo.

Generates a realistic-looking set of solar PV candidate sites for a
fictional city centred at a configurable lat/lon.
"""
from __future__ import annotations
import numpy as np
import pandas as pd

# Default city centre: London, UK
DEFAULT_LAT = 51.5074
DEFAULT_LON = -0.1278
CITY_RADIUS_DEG = 0.12        # ~13 km radius
N_SITES = 120
RNG_SEED = 42


REQUIRED_COLUMNS = [
    "usable_area_m2",
    "irradiance_kwh_m2_yr",
    "flood_risk_raw",
    "grid_distance_km",
    "structural_viability",
]

SITE_TYPES = [
    "Rooftop – Industrial",
    "Rooftop – Commercial",
    "Parking Canopy",
    "Brownfield",
    "Open Space",
]

SITE_TYPE_WEIGHTS = [0.30, 0.25, 0.20, 0.15, 0.10]


def generate_sites(
    n: int = N_SITES,
    centre_lat: float = DEFAULT_LAT,
    centre_lon: float = DEFAULT_LON,
    seed: int = RNG_SEED,
) -> pd.DataFrame:
    """
    Return a DataFrame of synthetic solar candidate sites.

    Columns
    -------
    site_id, name, site_type, lat, lon,
    usable_area_m2, irradiance_kwh_m2_yr, flood_risk_raw,
    grid_distance_km, structural_viability, borough
    """
    rng = np.random.default_rng(seed)

    # Polar scatter within city radius
    angles = rng.uniform(0, 2 * np.pi, n)
    radii = np.sqrt(rng.uniform(0, CITY_RADIUS_DEG ** 2, n))  # uniform disk sampling
    lats = centre_lat + radii * np.cos(angles)
    lons = centre_lon + radii * np.sin(angles)

    site_types = rng.choice(SITE_TYPES, size=n, p=SITE_TYPE_WEIGHTS)

    # Usable area varies by site type
    area_map = {
        "Rooftop – Industrial": (500, 8_000),
        "Rooftop – Commercial": (200, 3_000),
        "Parking Canopy": (300, 5_000),
        "Brownfield": (1_000, 20_000),
        "Open Space": (2_000, 15_000),
    }
    areas = np.array([
        rng.uniform(*area_map[t]) for t in site_types
    ])

    boroughs = [f"Borough {chr(65 + i % 12)}" for i in range(n)]

    df = pd.DataFrame(
        {
            "site_id": [f"SOLA-{i+1:04d}" for i in range(n)],
            "name": [f"{t} – Site {i+1}" for i, t in enumerate(site_types)],
            "site_type": site_types,
            "lat": lats,
            "lon": lons,
            "borough": boroughs,
            "usable_area_m2": areas.round(1),
            # London GHI ~1 000–1 200 kWh/m²/yr; randomise around 1 100
            "irradiance_kwh_m2_yr": rng.normal(1_100, 80, n).clip(900, 1_400).round(1),
            "flood_risk_raw": rng.beta(1.5, 5, n).round(4),   # right-skewed, most sites low risk
            "grid_distance_km": rng.exponential(2.5, n).clip(0.1, 15).round(3),
            "structural_viability": rng.beta(5, 2, n).round(4), # left-skewed, most sites viable
        }
    )
    return df
