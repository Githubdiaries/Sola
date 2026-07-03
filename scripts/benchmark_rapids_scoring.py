import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
import numpy as np

from backend.app.services.acceleration.rapids_scoring import benchmark_scoring

parser = argparse.ArgumentParser()
parser.add_argument('--rows', type=int, default=1000000)
parser.add_argument('--rapids', action='store_true')
args = parser.parse_args()

rng = np.random.default_rng(42)
frame = pd.DataFrame({
    'usable_area_sqm': rng.uniform(250, 50000, args.rows),
    'annual_ghi_kwh_m2': rng.uniform(1200, 2200, args.rows),
    'flood_risk_score': rng.uniform(0, 1, args.rows),
    'grid_distance_km': rng.uniform(0, 25, args.rows),
})
print(benchmark_scoring(frame, use_rapids=args.rapids))
