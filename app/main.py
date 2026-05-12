"""
Sola — B2B Geospatial Solar Site Discovery Platform
Streamlit MVP entry point.
"""
from __future__ import annotations
import io
import json

import pandas as pd
import streamlit as st
from streamlit_folium import st_folium

from app.data.sample_sites import generate_sites
from app.map_view import build_map
from app.scoring import DEFAULT_WEIGHTS, REQUIRED_COLUMNS, estimate_annual_kwh, estimate_kwp, score_sites

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Sola – Solar Site Discovery",
    page_icon="☀️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Session state ──────────────────────────────────────────────────────────────
if "sites_df" not in st.session_state:
    raw = generate_sites()
    st.session_state["sites_df"] = score_sites(raw)

df: pd.DataFrame = st.session_state["sites_df"]

# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.image("https://img.icons8.com/fluency/96/solar-panel.png", width=64)
    st.title("Sola ☀️")
    st.caption("Solar site discovery for data-center energy teams")
    st.divider()

    page = st.radio(
        "Navigation",
        ["🗺️ City Map", "📊 Site Dashboard", "⚖️ Scoring Weights", "📤 Export Data"],
        index=0,
    )
    st.divider()

    st.subheader("Filters")
    site_types = sorted(df["site_type"].unique())
    selected_types = st.multiselect("Site type", site_types, default=site_types)
    score_min = st.slider("Minimum composite score", 0.0, 1.0, 0.0, 0.01)
    area_min = st.number_input("Min usable area (m²)", min_value=0, value=0, step=100)

    # Apply filters
    view_df = df[
        df["site_type"].isin(selected_types)
        & (df["composite_score"] >= score_min)
        & (df["usable_area_m2"] >= area_min)
    ].copy()

    st.caption(f"{len(view_df)} of {len(df)} sites shown")

# ── Helpers ────────────────────────────────────────────────────────────────────
SCORE_COLS = [
    "usable_area_score",
    "irradiance_score",
    "flood_risk_score",
    "grid_proximity_score",
    "structural_score",
    "composite_score",
]

# ── Pages ──────────────────────────────────────────────────────────────────────
if page == "🗺️ City Map":
    st.header("🗺️ City-Wide Solar Potential Map")
    st.markdown(
        "Each marker represents a candidate solar installation site. "
        "Colour reflects the **composite suitability score**. "
        "Click a marker for details."
    )

    col_map, col_stats = st.columns([3, 1])

    with col_map:
        fmap = build_map(view_df)
        st_folium(fmap, width=None, height=600, returned_objects=[])

    with col_stats:
        st.metric("Sites shown", len(view_df))
        total_area = view_df["usable_area_m2"].sum()
        st.metric("Total usable area", f"{total_area/1e6:.2f} km²")
        avg_score = view_df["composite_score"].mean()
        st.metric("Avg composite score", f"{avg_score:.3f}")
        top5_area = view_df.nsmallest(5, "rank")["usable_area_m2"].sum()
        st.metric("Top-5 sites area", f"{top5_area:,.0f} m²")

        st.divider()
        st.subheader("Score legend")
        st.markdown(
            "🟢 **≥ 0.75** Excellent  \n"
            "🟡 **0.55–0.74** Good  \n"
            "🟠 **0.35–0.54** Moderate  \n"
            "🔴 **< 0.35** Poor"
        )

elif page == "📊 Site Dashboard":
    st.header("📊 B2B Site Dashboard")

    # KPI row
    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    kpi1.metric("Total sites", len(view_df))
    total_kwp = sum(
        estimate_kwp(row["usable_area_m2"]) for _, row in view_df.iterrows()
    )
    kpi2.metric("Aggregate capacity", f"{total_kwp/1_000:.1f} MWp")
    total_kwh = sum(
        estimate_annual_kwh(
            estimate_kwp(row["usable_area_m2"]),
            row["irradiance_kwh_m2_yr"],
        )
        for _, row in view_df.iterrows()
    )
    kpi3.metric("Est. annual yield", f"{total_kwh/1e6:.1f} GWh/yr")
    top_score = view_df["composite_score"].max() if not view_df.empty else 0
    kpi4.metric("Top site score", f"{top_score:.3f}")

    st.divider()

    # Site table
    display_cols = [
        "rank", "site_id", "name", "site_type", "borough",
        "usable_area_m2", "irradiance_kwh_m2_yr", "composite_score",
        "flood_risk_raw", "grid_distance_km",
    ]
    st.dataframe(
        view_df[display_cols].sort_values("rank"),
        use_container_width=True,
        hide_index=True,
    )

    st.divider()

    # Score breakdown bar chart (top 15)
    st.subheader("Score breakdown — Top 15 sites")
    top15 = view_df.nsmallest(15, "rank")[["name"] + SCORE_COLS[:-1]].set_index("name")
    st.bar_chart(top15)

elif page == "⚖️ Scoring Weights":
    st.header("⚖️ Adjust Scoring Weights")
    st.markdown(
        "Modify the importance of each criterion. "
        "Weights are automatically re-normalised to sum to 1."
    )

    w_area = st.slider("Usable area weight", 0.0, 1.0, DEFAULT_WEIGHTS["usable_area"], 0.05)
    w_irr = st.slider("Irradiance weight", 0.0, 1.0, DEFAULT_WEIGHTS["irradiance"], 0.05)
    w_flood = st.slider("Flood-risk weight", 0.0, 1.0, DEFAULT_WEIGHTS["flood_risk"], 0.05)
    w_grid = st.slider("Grid proximity weight", 0.0, 1.0, DEFAULT_WEIGHTS["grid_proximity"], 0.05)
    w_struct = st.slider("Structural viability weight", 0.0, 1.0, DEFAULT_WEIGHTS["structural"], 0.05)

    if st.button("Apply weights & re-score"):
        new_weights = {
            "usable_area": w_area,
            "irradiance": w_irr,
            "flood_risk": w_flood,
            "grid_proximity": w_grid,
            "structural": w_struct,
        }
        raw = generate_sites()
        st.session_state["sites_df"] = score_sites(raw, weights=new_weights)
        st.success("Scores updated. Navigate to the map or dashboard to see results.")
        st.rerun()

    st.divider()
    st.subheader("Current effective weights")
    st.json(DEFAULT_WEIGHTS)

elif page == "📤 Export Data":
    st.header("📤 Export Data")
    st.markdown("Download the current filtered site dataset for use in GIS tools or policy reporting.")

    # CSV
    csv_buf = io.StringIO()
    view_df.to_csv(csv_buf, index=False)
    st.download_button(
        label="⬇️ Download CSV",
        data=csv_buf.getvalue(),
        file_name="sola_sites.csv",
        mime="text/csv",
    )

    # GeoJSON
    features = []
    for _, row in view_df.iterrows():
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [row["lon"], row["lat"]]},
                "properties": {
                    k: (float(v) if hasattr(v, "item") else v)
                    for k, v in row.items()
                    if k not in ("lat", "lon")
                },
            }
        )
    geojson = {"type": "FeatureCollection", "features": features}
    st.download_button(
        label="⬇️ Download GeoJSON",
        data=json.dumps(geojson, indent=2),
        file_name="sola_sites.geojson",
        mime="application/geo+json",
    )

    st.divider()
    st.subheader("Data preview")
    st.dataframe(view_df.head(20), use_container_width=True, hide_index=True)
