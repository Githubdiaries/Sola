"""
Sola scoring engine — multi-criteria solar PV site suitability.

Scoring dimensions (each 0–1, then weighted):
  - usable_area_score      : normalised usable surface area (rooftops / parking / brownfield)
  - irradiance_score       : annual GHI (kWh/m²/yr) normalised to city range
  - flood_risk_score       : 1 - normalised flood/damp risk (lower risk = higher score)
  - grid_proximity_score   : 1 - normalised distance to HV substation (km)
  - structural_score       : structural/land-use viability (0–1)

Default weights (sum to 1.0):
    irradiance       0.40
    usable_area      0.30
    flood_risk       0.15
    grid_proximity   0.10
    structural       0.10
"""
from __future__ import annotations
import numpy as np
import pandas as pd

DEFAULT_WEIGHTS = {
    "irradiance": 0.40,
    "usable_area": 0.30,
    "flood_risk": 0.15,
    "grid_proximity": 0.10,
    "structural": 0.10,
}

REQUIRED_COLUMNS = [
    "usable_area_m2",
    "irradiance_kwh_m2_yr",
    "flood_risk_raw",       # 0 = no risk, 1 = high risk
    "grid_distance_km",
    "structural_viability", # 0–1 directly
]


def _minmax(series: pd.Series) -> pd.Series:
    """Normalise a series to [0, 1]; returns 0.5 for constant series."""
    lo, hi = series.min(), series.max()
    if hi == lo:
        return pd.Series(np.full(len(series), 0.5), index=series.index)
    return (series - lo) / (hi - lo)


def score_sites(df: pd.DataFrame, weights: dict | None = None) -> pd.DataFrame:
    """
    Compute a composite suitability score for every row in *df*.

    Parameters
    ----------
    df : pd.DataFrame
        Must contain the columns listed in REQUIRED_COLUMNS.
    weights : dict | None
        Override DEFAULT_WEIGHTS.  Missing keys fall back to defaults.

    Returns
    -------
    pd.DataFrame
        Original frame with added columns:
        usable_area_score, irradiance_score, flood_risk_score,
        grid_proximity_score, structural_score, composite_score, rank
    """
    if df.empty:
        return df.copy()

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    w = {**DEFAULT_WEIGHTS, **(weights or {})}
    total_w = sum(w.values())
    w = {k: v / total_w for k, v in w.items()}  # normalise weights

    out = df.copy()
    out["usable_area_score"] = _minmax(out["usable_area_m2"])
    out["irradiance_score"] = _minmax(out["irradiance_kwh_m2_yr"])
    out["flood_risk_score"] = 1 - _minmax(out["flood_risk_raw"])
    out["grid_proximity_score"] = 1 - _minmax(out["grid_distance_km"])
    out["structural_score"] = out["structural_viability"].clip(0, 1)

    out["composite_score"] = (
        w["usable_area"] * out["usable_area_score"]
        + w["irradiance"] * out["irradiance_score"]
        + w["flood_risk"] * out["flood_risk_score"]
        + w["grid_proximity"] * out["grid_proximity_score"]
        + w["structural"] * out["structural_score"]
    ).round(4)

    out["rank"] = out["composite_score"].rank(ascending=False, method="min").astype(int)
    return out


def estimate_kwp(usable_area_m2: float, panel_efficiency: float = 0.20, packing_factor: float = 0.80) -> float:
    """Estimate installed kWp from usable area."""
    return usable_area_m2 * panel_efficiency * packing_factor


def estimate_annual_kwh(kwp: float, irradiance_kwh_m2_yr: float, performance_ratio: float = 0.80) -> float:
    """Estimate annual energy yield (kWh)."""
    return kwp * (irradiance_kwh_m2_yr / 1_000) * performance_ratio * 1_000
