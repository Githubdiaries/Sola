from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Float, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SolarSite(Base):
    """Candidate rooftop or land parcel ranked for commercial solar viability."""

    __tablename__ = "solar_sites"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(80), nullable=False, default="India")
    asset_type: Mapped[str] = mapped_column(String(50), nullable=False, default="rooftop")
    owner_type: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    total_area_sqm: Mapped[float] = mapped_column(Float, nullable=False)
    usable_area_sqm: Mapped[float] = mapped_column(Float, nullable=False)
    annual_ghi_kwh_m2: Mapped[float] = mapped_column(Float, nullable=False)
    flood_risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    grid_distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    roof_pitch_degrees: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    shading_loss_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    structural_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    suitability_score: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    estimated_capacity_kw: Mapped[float] = mapped_column(Float, nullable=False)
    estimated_annual_generation_kwh: Mapped[float] = mapped_column(Float, nullable=False)

    data_source: Mapped[str] = mapped_column(String(120), nullable=False, default="sample")
    ai_detection_status: Mapped[str] = mapped_column(String(40), nullable=False, default="not_started")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    geom = mapped_column(Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


Index("ix_solar_sites_city_score", SolarSite.city, SolarSite.suitability_score.desc())
