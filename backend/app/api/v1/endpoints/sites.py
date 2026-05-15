import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_session
from app.schemas.solar_site import SolarSiteFeatureCollection
from app.services.suitability_service import SuitabilityService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("", response_model=SolarSiteFeatureCollection)
async def list_sites(
    city: str | None = Query(default=None, description="Exact city name filter, case-insensitive."),
    min_area_sqm: float | None = Query(default=None, ge=0, description="Minimum usable area in square meters."),
    min_score: float | None = Query(default=None, ge=0, le=100, description="Minimum suitability score."),
    limit: int = Query(default=100, ge=1, description="Maximum number of returned sites."),
    session: AsyncSession = Depends(get_session),
) -> SolarSiteFeatureCollection:
    settings = get_settings()
    bounded_limit = min(limit, settings.max_page_size)
    service = SuitabilityService(settings)

    try:
        return await service.list_sites(
            session,
            city=city,
            min_area_sqm=min_area_sqm,
            min_score=min_score,
            limit=bounded_limit,
        )
    except SQLAlchemyError as exc:
        logger.exception("Failed to list solar sites")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Solar site data is temporarily unavailable.",
        ) from exc
