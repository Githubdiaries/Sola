"""Tests for app.scoring"""
import numpy as np
import pandas as pd
import pytest

from app.scoring import (
    DEFAULT_WEIGHTS,
    REQUIRED_COLUMNS,
    _minmax,
    estimate_annual_kwh,
    estimate_kwp,
    score_sites,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _make_df(n: int = 10, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    return pd.DataFrame(
        {
            "usable_area_m2": rng.uniform(200, 10_000, n),
            "irradiance_kwh_m2_yr": rng.uniform(900, 1_400, n),
            "flood_risk_raw": rng.uniform(0, 1, n),
            "grid_distance_km": rng.uniform(0.1, 15, n),
            "structural_viability": rng.uniform(0, 1, n),
        }
    )


# ── _minmax ───────────────────────────────────────────────────────────────────

def test_minmax_range():
    s = pd.Series([1.0, 2.0, 3.0, 4.0, 5.0])
    out = _minmax(s)
    assert out.min() == pytest.approx(0.0)
    assert out.max() == pytest.approx(1.0)


def test_minmax_constant():
    s = pd.Series([3.0, 3.0, 3.0])
    out = _minmax(s)
    assert (out == 0.5).all()


# ── score_sites ───────────────────────────────────────────────────────────────

def test_score_sites_returns_new_columns():
    df = _make_df(20)
    result = score_sites(df)
    for col in ["usable_area_score", "irradiance_score", "flood_risk_score",
                "grid_proximity_score", "structural_score", "composite_score", "rank"]:
        assert col in result.columns


def test_composite_score_range():
    df = _make_df(50)
    result = score_sites(df)
    assert result["composite_score"].between(0, 1).all()


def test_rank_is_integer_and_unique():
    df = _make_df(20)
    result = score_sites(df)
    assert result["rank"].dtype in (int, "int64", "int32")
    # rank 1 should be the highest composite_score
    top = result.loc[result["rank"] == 1, "composite_score"].iloc[0]
    assert top == result["composite_score"].max()


def test_flood_risk_inverted():
    """Higher flood risk => lower flood_risk_score."""
    df = pd.DataFrame(
        {
            "usable_area_m2": [1000, 1000],
            "irradiance_kwh_m2_yr": [1100, 1100],
            "flood_risk_raw": [0.0, 1.0],   # first site safer
            "grid_distance_km": [1.0, 1.0],
            "structural_viability": [0.5, 0.5],
        }
    )
    result = score_sites(df)
    assert result.loc[0, "flood_risk_score"] > result.loc[1, "flood_risk_score"]


def test_missing_columns_raises():
    df = pd.DataFrame({"usable_area_m2": [100]})
    with pytest.raises(ValueError, match="Missing columns"):
        score_sites(df)


def test_empty_dataframe_returns_empty():
    df = pd.DataFrame(columns=REQUIRED_COLUMNS)
    result = score_sites(df)
    assert result.empty


def test_custom_weights_applied():
    df = _make_df(30)
    # Flip dominance: area weight 0 vs irradiance weight 1
    r1 = score_sites(df, weights={"usable_area": 1.0, "irradiance": 0.0,
                                   "flood_risk": 0.0, "grid_proximity": 0.0, "structural": 0.0})
    r2 = score_sites(df, weights={"usable_area": 0.0, "irradiance": 1.0,
                                   "flood_risk": 0.0, "grid_proximity": 0.0, "structural": 0.0})
    # Scores must differ when dominant criterion differs
    assert not r1["composite_score"].equals(r2["composite_score"])


def test_weights_normalised():
    """Weights that don't sum to 1 should still produce valid 0–1 scores."""
    df = _make_df(10)
    result = score_sites(df, weights={"usable_area": 2.0, "irradiance": 3.0,
                                       "flood_risk": 1.0, "grid_proximity": 1.0, "structural": 1.0})
    assert result["composite_score"].between(0, 1).all()


# ── estimate_kwp ──────────────────────────────────────────────────────────────

def test_estimate_kwp_basic():
    # 1 000 m² * 0.20 efficiency * 0.80 packing = 160 kWp
    assert estimate_kwp(1_000) == pytest.approx(160.0)


def test_estimate_kwp_custom():
    assert estimate_kwp(500, panel_efficiency=0.22, packing_factor=0.90) == pytest.approx(99.0)


# ── estimate_annual_kwh ───────────────────────────────────────────────────────

def test_estimate_annual_kwh_basic():
    # 100 kWp * (1000/1000) * 0.80 * 1000 = 80 000 kWh
    assert estimate_annual_kwh(100, 1_000) == pytest.approx(80_000.0)
