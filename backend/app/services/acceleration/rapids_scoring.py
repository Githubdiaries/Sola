from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter
from typing import Any

import pandas as pd


@dataclass(frozen=True)
class BenchmarkResult:
    engine: str
    rows: int
    elapsed_seconds: float
    throughput_rows_per_second: float


def score_sites_pandas(frame: pd.DataFrame) -> pd.Series:
    area_score = (frame["usable_area_sqm"] / 10_000).clip(0, 1)
    irradiance_score = ((frame["annual_ghi_kwh_m2"] - 1_300) / 800).clip(0, 1)
    flood_score = 1 - frame["flood_risk_score"].clip(0, 1)
    grid_score = 1 - (frame["grid_distance_km"] / 10).clip(0, 1)
    return ((area_score * 0.35 + irradiance_score * 0.30 + flood_score * 0.20 + grid_score * 0.15).clip(0, 1) * 100).round(2)


def score_sites_rapids(frame: pd.DataFrame) -> Any:
    try:
        import cudf  # type: ignore
    except ImportError as exc:
        raise RuntimeError("RAPIDS cuDF is not installed. Use an NVIDIA RAPIDS container or install cudf.") from exc
    gpu_frame = cudf.from_pandas(frame)
    return score_sites_pandas(gpu_frame).to_pandas()


def benchmark_scoring(frame: pd.DataFrame, use_rapids: bool = False) -> BenchmarkResult:
    start = perf_counter()
    if use_rapids:
        score_sites_rapids(frame)
        engine = "rapids-cudf"
    else:
        score_sites_pandas(frame)
        engine = "pandas-cpu"
    elapsed = perf_counter() - start
    return BenchmarkResult(engine=engine, rows=len(frame), elapsed_seconds=round(elapsed, 6), throughput_rows_per_second=round(len(frame) / elapsed, 2) if elapsed else 0)
