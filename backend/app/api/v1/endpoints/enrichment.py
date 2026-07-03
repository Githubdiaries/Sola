from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query, status

from app.services.data_sources.nasa_power import NasaPowerClient, NasaPowerSummary

router = APIRouter(prefix="/enrichment", tags=["enrichment"])


@router.get("/nasa-power", response_model=NasaPowerSummary)
async def nasa_power_enrichment(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    start: date | None = None,
    end: date | None = None,
    temporal: str = Query(default="daily", pattern="^(daily|hourly)$"),
) -> NasaPowerSummary:
    end_date = end or date.today() - timedelta(days=1)
    start_date = start or end_date - timedelta(days=30)
    try:
        return await NasaPowerClient().fetch_irradiance(latitude=latitude, longitude=longitude, start=start_date, end=end_date, temporal=temporal)  # type: ignore[arg-type]
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
