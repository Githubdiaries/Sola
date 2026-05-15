from pydantic import BaseModel, Field
from fastapi import APIRouter

from app.services.suitability_service import score_site_payload

router = APIRouter(prefix="/analysis", tags=["analysis"])


class SuitabilityRequest(BaseModel):
    usable_area_sqm: float = Field(gt=0)
    annual_ghi_kwh_m2: float = Field(gt=0)
    flood_risk_score: float = Field(ge=0, le=1)
    grid_distance_km: float = Field(ge=0)


class SuitabilityResponse(BaseModel):
    suitability_score: float
    estimated_capacity_kw: float
    estimated_annual_generation_kwh: float


@router.post("/suitability", response_model=SuitabilityResponse)
async def analyze_suitability(payload: SuitabilityRequest) -> SuitabilityResponse:
    return SuitabilityResponse(**score_site_payload(payload.model_dump()))
