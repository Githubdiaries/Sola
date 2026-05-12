"""
Sola map view — builds a Folium map of scored solar candidate sites.
"""
from __future__ import annotations
import folium
import pandas as pd

# Colour thresholds for composite_score
def _score_colour(score: float) -> str:
    if score >= 0.75:
        return "#27ae60"   # green – excellent
    if score >= 0.55:
        return "#f39c12"   # amber – good
    if score >= 0.35:
        return "#e67e22"   # orange – moderate
    return "#e74c3c"       # red – poor


def build_map(df: pd.DataFrame, centre_lat: float = 51.5074, centre_lon: float = -0.1278) -> folium.Map:
    """
    Create a Folium map with circle markers for each site in *df*.

    Requires columns: lat, lon, composite_score, rank, name, site_type,
    usable_area_m2, irradiance_kwh_m2_yr.
    """
    m = folium.Map(location=[centre_lat, centre_lon], zoom_start=12, tiles="CartoDB positron")

    for _, row in df.iterrows():
        colour = _score_colour(row["composite_score"])
        radius = max(6, min(20, row["usable_area_m2"] / 500))  # scale with area

        popup_html = (
            f"<b>{row['name']}</b><br>"
            f"<b>Rank:</b> #{row['rank']}<br>"
            f"<b>Score:</b> {row['composite_score']:.3f}<br>"
            f"<b>Type:</b> {row['site_type']}<br>"
            f"<b>Usable area:</b> {row['usable_area_m2']:,.0f} m²<br>"
            f"<b>Irradiance:</b> {row['irradiance_kwh_m2_yr']:.0f} kWh/m²/yr<br>"
            f"<b>Grid dist:</b> {row['grid_distance_km']:.1f} km<br>"
            f"<b>Borough:</b> {row.get('borough', '–')}"
        )

        folium.CircleMarker(
            location=[row["lat"], row["lon"]],
            radius=radius,
            color=colour,
            fill=True,
            fill_color=colour,
            fill_opacity=0.75,
            popup=folium.Popup(popup_html, max_width=260),
            tooltip=f"#{row['rank']} {row['name']} — {row['composite_score']:.3f}",
        ).add_to(m)

    # Legend
    legend_html = """
    <div style="position:fixed;bottom:30px;left:30px;z-index:9999;background:white;
                padding:12px 16px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.3);
                font-size:13px;line-height:1.8">
      <b>Sola Score</b><br>
      <span style="color:#27ae60">●</span> ≥ 0.75 Excellent<br>
      <span style="color:#f39c12">●</span> 0.55–0.74 Good<br>
      <span style="color:#e67e22">●</span> 0.35–0.54 Moderate<br>
      <span style="color:#e74c3c">●</span> &lt; 0.35 Poor
    </div>"""
    m.get_root().html.add_child(folium.Element(legend_html))

    return m
