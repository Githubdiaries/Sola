from __future__ import annotations

import hashlib
import json
import logging
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Literal

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

NASA_POWER_BASE_URL = "https://power.larc.nasa.gov/api/temporal"
DEFAULT_PARAMETERS = (
    "ALLSKY_SFC_SW_DWN",  # GHI kWh/m^2/day for daily endpoint
    "ALLSKY_SFC_SW_DNI",  # DNI kWh/m^2/day
    "ALLSKY_SFC_SW_DIFF",  # DHI kWh/m^2/day
    "T2M",
    "WS2M",
    "PRECTOTCORR",
    "RH2M",
)


class NasaPowerRecord(BaseModel):
    timestamp: datetime | date
    ghi_kwh_m2: float | None = None
    dni_kwh_m2: float | None = None
    dhi_kwh_m2: float | None = None
    temperature_c: float | None = None
    wind_speed_m_s: float | None = None
    precipitation_mm: float | None = None
    relative_humidity_pct: float | None = None


class NasaPowerSummary(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    temporal: Literal["daily", "hourly"]
    start: date
    end: date
    annual_ghi_kwh_m2: float | None
    mean_temperature_c: float | None
    peak_daily_ghi_kwh_m2: float | None
    records: list[NasaPowerRecord]
    source_url: str
    cached: bool = False


class NasaPowerClient:
    """NASA POWER API client with deterministic file caching for site enrichment."""

    def __init__(self, cache_dir: str | Path = ".cache/nasa_power", timeout_seconds: float = 30.0) -> None:
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.timeout_seconds = timeout_seconds

    async def fetch_irradiance(
        self,
        *,
        latitude: float,
        longitude: float,
        start: date,
        end: date,
        temporal: Literal["daily", "hourly"] = "daily",
        parameters: tuple[str, ...] = DEFAULT_PARAMETERS,
        force_refresh: bool = False,
    ) -> NasaPowerSummary:
        self._validate_date_window(start, end, temporal)
        params: dict[str, Any] = {
            "parameters": ",".join(parameters),
            "community": "RE",
            "longitude": round(longitude, 5),
            "latitude": round(latitude, 5),
            "start": start.strftime("%Y%m%d"),
            "end": end.strftime("%Y%m%d"),
            "format": "JSON",
        }
        url = f"{NASA_POWER_BASE_URL}/{temporal}/point"
        cache_path = self._cache_path(url, params)
        if cache_path.exists() and not force_refresh:
            payload = json.loads(cache_path.read_text())
            return self._to_summary(payload, latitude, longitude, start, end, temporal, url, cached=True)

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()
        cache_path.write_text(json.dumps(payload))
        return self._to_summary(payload, latitude, longitude, start, end, temporal, str(response.url), cached=False)

    def _to_summary(self, payload: dict[str, Any], latitude: float, longitude: float, start: date, end: date, temporal: str, source_url: str, cached: bool) -> NasaPowerSummary:
        parameter_values = payload.get("properties", {}).get("parameter", {})
        dates = sorted(next(iter(parameter_values.values()), {}).keys()) if parameter_values else []
        records: list[NasaPowerRecord] = []
        for raw_key in dates:
            ts = datetime.strptime(raw_key, "%Y%m%d%H" if temporal == "hourly" else "%Y%m%d")
            records.append(
                NasaPowerRecord(
                    timestamp=ts if temporal == "hourly" else ts.date(),
                    ghi_kwh_m2=self._clean(parameter_values.get("ALLSKY_SFC_SW_DWN", {}).get(raw_key)),
                    dni_kwh_m2=self._clean(parameter_values.get("ALLSKY_SFC_SW_DNI", {}).get(raw_key)),
                    dhi_kwh_m2=self._clean(parameter_values.get("ALLSKY_SFC_SW_DIFF", {}).get(raw_key)),
                    temperature_c=self._clean(parameter_values.get("T2M", {}).get(raw_key)),
                    wind_speed_m_s=self._clean(parameter_values.get("WS2M", {}).get(raw_key)),
                    precipitation_mm=self._clean(parameter_values.get("PRECTOTCORR", {}).get(raw_key)),
                    relative_humidity_pct=self._clean(parameter_values.get("RH2M", {}).get(raw_key)),
                )
            )
        ghi_values = [r.ghi_kwh_m2 for r in records if r.ghi_kwh_m2 is not None]
        temp_values = [r.temperature_c for r in records if r.temperature_c is not None]
        annual_ghi = sum(ghi_values) if temporal == "daily" and ghi_values else None
        return NasaPowerSummary(latitude=latitude, longitude=longitude, temporal=temporal, start=start, end=end, annual_ghi_kwh_m2=round(annual_ghi, 2) if annual_ghi else None, mean_temperature_c=round(sum(temp_values) / len(temp_values), 2) if temp_values else None, peak_daily_ghi_kwh_m2=max(ghi_values) if ghi_values else None, records=records, source_url=source_url, cached=cached)

    def _cache_path(self, url: str, params: dict[str, Any]) -> Path:
        key = hashlib.sha256(json.dumps({"url": url, "params": params}, sort_keys=True).encode()).hexdigest()
        return self.cache_dir / f"{key}.json"

    @staticmethod
    def _clean(value: Any) -> float | None:
        if value in (None, -999, -999.0):
            return None
        return float(value)

    @staticmethod
    def _validate_date_window(start: date, end: date, temporal: str) -> None:
        if end < start:
            raise ValueError("end date must be on or after start date")
        if temporal == "hourly" and end - start > timedelta(days=31):
            raise ValueError("hourly NASA POWER requests are limited to 31 days per call")
