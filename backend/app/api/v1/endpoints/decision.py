from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models.solar_site import SolarSite
from app.services.ai.gemini_decision_agent import answer_site_question

router = APIRouter(prefix="/decision", tags=["decision-intelligence"])

class DecisionQuestion(BaseModel):
    question: str = Field(min_length=5, max_length=1000)
    limit: int = Field(default=25, ge=1, le=100)

@router.post("/ask")
async def ask_decision_agent(payload: DecisionQuestion, session: AsyncSession = Depends(get_session)) -> dict:
    rows = (await session.execute(select(SolarSite).order_by(SolarSite.suitability_score.desc()).limit(payload.limit))).scalars().all()
    context = [{"id": str(site.id), "name": site.name, "city": site.city, "asset_type": site.asset_type, "usable_area_sqm": site.usable_area_sqm, "annual_ghi_kwh_m2": site.annual_ghi_kwh_m2, "flood_risk_score": site.flood_risk_score, "grid_distance_km": site.grid_distance_km, "suitability_score": site.suitability_score} for site in rows]
    return await answer_site_question(payload.question, context)
