# Global Solar Atlas Integration

1. Create a free account and download country or regional rasters from https://globalsolaratlas.info/download.
2. Prioritize `GHI`, `DNI`, and `PVOUT` GeoTIFF layers for the target geography.
3. Upload raw GeoTIFFs to `gs://$SOLA_BUCKET/raw/global-solar-atlas/`.
4. Reproject only when needed; most rasters are WGS84 and can be sampled directly by site centroid.
5. Use Rasterio locally for small demos and RAPIDS/Spark RAPIDS plus tiled Cloud Storage reads for large batches.
6. Persist sampled values to BigQuery `site_enrichment` with a `data_sources` value including `global_solar_atlas`.
