from dataclasses import dataclass
from typing import Any

from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.solar_site import SolarSite
from app.schemas.solar_site import SolarSiteFeature, SolarSiteFeatureCollection, SolarSiteProperties


@dataclass(frozen=True)
class SuitabilityInputs:
    usable_area_sqm: float
    annual_ghi_kwh_m2: float
    flood_risk_score: float
    grid_distance_km: float


class SuitabilityService:
    """Solar viability scoring and GeoJSON projection for candidate sites.

    The score intentionally separates geospatial evidence from the ranking formula
    so future AI roof detection can update geometry, usable area, and shading inputs
    without rewriting API or database contracts.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def score(self, inputs: SuitabilityInputs) -> float:
        area_score = self._clamp(inputs.usable_area_sqm / 10_000)
        irradiance_score = self._clamp((inputs.annual_ghi_kwh_m2 - 1_300) / 800)
        flood_score = 1 - self._clamp(inputs.flood_risk_score)
        grid_score = 1 - self._clamp(inputs.grid_distance_km / 10)

        weighted_score = (
            area_score * self.settings.score_usable_area_weight
            + irradiance_score * self.settings.score_irradiance_weight
            + flood_score * self.settings.score_flood_risk_weight
            + grid_score * self.settings.score_grid_proximity_weight
        )
        return round(self._clamp(weighted_score) * 100, 2)

    def estimate_capacity_kw(self, usable_area_sqm: float) -> float:
        # Commercial rooftop planning rule of thumb: 1 kW DC per roughly 10 sqm.
        return round(max(usable_area_sqm, 0) / 10, 2)

    def estimate_annual_generation_kwh(self, capacity_kw: float, annual_ghi_kwh_m2: float) -> float:
        performance_ratio = 0.78
        normalized_ghi = annual_ghi_kwh_m2 / 1_000
        return round(capacity_kw * normalized_ghi * 1_000 * performance_ratio, 2)

    async def list_sites(
        self,
        session: AsyncSession,
        *,
        city: str | None = None,
        min_area_sqm: float | None = None,
        min_score: float | None = None,
        limit: int = 100,
    ) -> SolarSiteFeatureCollection:
        query = self._filtered_query(city=city, min_area_sqm=min_area_sqm, min_score=min_score, limit=limit)
        rows = (await session.execute(query)).scalars().all()
        return SolarSiteFeatureCollection(features=[self.to_feature(site) for site in rows])

    def to_feature(self, site: SolarSite) -> SolarSiteFeature:
        geometry = mapping(to_shape(site.geom))
        properties = SolarSiteProperties.model_validate(site)
        return SolarSiteFeature(geometry=dict(geometry), properties=properties)

    def _filtered_query(
        self,
        *,
        city: str | None,
        min_area_sqm: float | None,
        min_score: float | None,
        limit: int,
    ) -> Select[tuple[SolarSite]]:
        query = select(SolarSite)
        if city:
            query = query.where(func.lower(SolarSite.city) == city.lower())
        if min_area_sqm is not None:
            query = query.where(SolarSite.usable_area_sqm >= min_area_sqm)
        if min_score is not None:
            query = query.where(SolarSite.suitability_score >= min_score)
        return query.order_by(SolarSite.suitability_score.desc(), SolarSite.usable_area_sqm.desc()).limit(limit)

    @staticmethod
    def _clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
        return max(lower, min(upper, value))


def score_site_payload(payload: dict[str, Any]) -> dict[str, float]:
    service = SuitabilityService()
    inputs = SuitabilityInputs(
        usable_area_sqm=float(payload["usable_area_sqm"]),
        annual_ghi_kwh_m2=float(payload["annual_ghi_kwh_m2"]),
        flood_risk_score=float(payload["flood_risk_score"]),
        grid_distance_km=float(payload["grid_distance_km"]),
    )
    capacity_kw = service.estimate_capacity_kw(inputs.usable_area_sqm)
    return {
        "suitability_score": service.score(inputs),
        "estimated_capacity_kw": capacity_kw,
        "estimated_annual_generation_kwh": service.estimate_annual_generation_kwh(
            capacity_kw,
            inputs.annual_ghi_kwh_m2,
        ),
    }
