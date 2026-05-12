"""Tests for app.data.sample_sites"""
import pandas as pd
import pytest

from app.data.sample_sites import REQUIRED_COLUMNS as _RC
from app.data.sample_sites import generate_sites
from app.scoring import REQUIRED_COLUMNS, score_sites


def test_generate_returns_dataframe():
    df = generate_sites(n=20)
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 20


def test_generate_has_required_scoring_columns():
    df = generate_sites(n=10)
    for col in REQUIRED_COLUMNS:
        assert col in df.columns, f"Missing column: {col}"


def test_latlon_within_city_bounds():
    df = generate_sites(n=50)
    # centre 51.5074 / -0.1278, radius ~0.12 deg
    assert df["lat"].between(51.3, 51.7).all()
    assert df["lon"].between(-0.35, 0.1).all()


def test_flood_risk_range():
    df = generate_sites(n=50)
    assert df["flood_risk_raw"].between(0, 1).all()


def test_structural_viability_range():
    df = generate_sites(n=50)
    assert df["structural_viability"].between(0, 1).all()


def test_reproducible_with_seed():
    df1 = generate_sites(n=30, seed=99)
    df2 = generate_sites(n=30, seed=99)
    pd.testing.assert_frame_equal(df1, df2)


def test_different_seeds_differ():
    df1 = generate_sites(n=30, seed=1)
    df2 = generate_sites(n=30, seed=2)
    assert not df1["lat"].equals(df2["lat"])


def test_pipeline_generate_then_score():
    """Full pipeline: generate → score should succeed."""
    df = generate_sites(n=40)
    scored = score_sites(df)
    assert "composite_score" in scored.columns
    assert scored["composite_score"].between(0, 1).all()
