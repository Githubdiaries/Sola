from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SolarSiteProperties(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    city: str
    state: str | None = None
    country: str
    asset_type: str
    owner_type: str | None = None
    address: str | None = None
    total_area_sqm: float
    usable_area_sqm: float
    annual_ghi_kwh_m2: float
    flood_risk_score: float = Field(ge=0, le=1)
    grid_distance_km: float
    roof_pitch_degrees: float | None = None
    shading_loss_pct: float | None = None
    structural_score: float | None = Field(default=None, ge=0, le=1)
    suitability_score: float = Field(ge=0, le=100)
    estimated_capacity_kw: float
    estimated_annual_generation_kwh: float
    data_source: str
    ai_detection_status: str
    notes: str | None = None


class SolarSiteFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: dict[str, Any]
    properties: SolarSiteProperties


class SolarSiteFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[SolarSiteFeature]


class SiteFilters(BaseModel):
    city: str | None = None
    min_area_sqm: float | None = Field(default=None, ge=0)
    min_score: float | None = Field(default=None, ge=0, le=100)
    limit: int = Field(default=100, ge=1, le=500)

    @field_validator("city")
    @classmethod
    def normalize_city(cls, value: str | None) -> str | None:
        return value.strip() if value else value
