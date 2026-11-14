# Data sources

All data in `data/` comes from the datasets below, processed by the notebooks in `notebooks/` (last checked 2026-11-14T16:51Z).
Every dataset is free and openly licensed. Rain and temperature published for the trial at the demo field (Denora et al. 2025) are quoted, with the citation, only to check results: see Ground check below and `weather.ground_check` in `field.json`.

| Dataset | Used for | Earth Engine ID or service | Resolution | Licence | Citation |
|---|---|---|---|---|---|
| CHIRPS daily rainfall v2.0 (Climate Hazards Center, UCSB) | rain | `UCSB-CHG/CHIRPS/DAILY` | 5,566 m | Public domain (CC0) | Funk, C. et al. (2015). Scientific Data 2: 150066. doi:10.1038/sdata.2015.66 |
| CORINE Land Cover 2018 | non-irrigated arable mask | `COPERNICUS/CORINE/V20/100m/2018` | 100 m | Copernicus Land Monitoring Service: free, full and open access, with attribution | European Union, Copernicus Land Monitoring Service 2018, European Environment Agency (EEA) |
| ERA5-Land daily and monthly aggregates (ECMWF, Copernicus Climate Change Service) | temperature, rain, ET0, soil water (check) | `ECMWF/ERA5_LAND/DAILY_AGGR, ECMWF/ERA5_LAND/MONTHLY_AGGR` | 11,132 m | Copernicus licence (free, with attribution) | Muñoz Sabater, J. (2019). ERA5-Land hourly data from 1950 to present. C3S Climate Data Store. doi:10.24381/cds.e2161bac |
| ESA WorldCover 10 m 2021 v200 | cropland mask | `ESA/WorldCover/v200` | 10 m | CC BY 4.0 | Zanaga, D. et al. (2022). ESA WorldCover 10 m 2021 v200. doi:10.5281/zenodo.7254221 |
| EU crop map 2018 and 2022 (JRC) | durum wheat share, demo-field check | `JRC/D5/EUCROPMAP/V1` | 10 m | CC BY 4.0 | d'Andrimont, R. et al. (2021). Remote Sensing of Environment 266: 112708; Ghassemi, B. et al. (2024). Scientific Data 11: 1048 |
| FAO-56 crop evapotranspiration guidelines (Penman-Monteith ET0, crop factors) | ET0 formula, crop factors | `-` | - | FAO, cite the source | Allen, R. G., Pereira, L. S., Raes, D., Smith, M. (1998). FAO Irrigation and Drainage Paper 56 |
| Harmonized Landsat Sentinel-2 (HLSL30 and HLSS30 v2.0) | 30 m greenness at the demo field | `NASA/HLS/HLSL30/v002, NASA/HLS/HLSS30/v002` | 30 m | NASA data: no restrictions on use | Masek, J. et al. (2021). HLS Operational Land Surface Reflectance and TOA Brightness Daily Global 30m v2.0. NASA LP DAAC. doi:10.5067/HLS/HLSL30.002, doi:10.5067/HLS/HLSS30.002 |
| HydroSHEDS HydroBASINS level 8 | basin outline | `WWF/HydroSHEDS/v1/Basins/hybas_8` | 500 m | HydroSHEDS licence: free for non-commercial and commercial use, with attribution | Lehner, B. & Grill, G. (2013). Hydrological Processes 27(15): 2171-2186. www.hydrosheds.org |
| JAXA GSMaP operational v8 (gauge-adjusted) | rain at the demo field (comparison) | `JAXA/GPM_L3/GSMaP/v8/operational` | 11,132 m | JAXA terms of use (free, with credit) | GSMaP data were provided by JAXA (Kubota, T. et al. 2020, Adv. Global Change Res. 67) |
| MODIS Terra Vegetation Indices 16-day 250 m (MOD13Q1 v6.1) | greenness calendar and season dates | `MODIS/061/MOD13Q1` | 250 m | NASA data: no restrictions on use | Didan, K. (2021). MOD13Q1 MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061. NASA LP DAAC. doi:10.5067/MODIS/MOD13Q1.061 |
| MODIS Terra evapotranspiration 8-day 500 m (MOD16A2GF gap-filled; MOD16A2 for the latest months) | water used by crops | `MODIS/061/MOD16A2GF, MODIS/061/MOD16A2` | 500 m | NASA data: no restrictions on use | Running, S., Mu, Q., Zhao, M., Moreno, A. (2021). MOD16A2GF MODIS/Terra Net Evapotranspiration Gap-Filled 8-Day L4 Global 500 m SIN Grid V061. NASA LP DAAC. doi:10.5067/MODIS/MOD16A2GF.061 |
| NASA GPM IMERG Final monthly V07 | rain | `NASA/GPM_L3/IMERG_MONTHLY_V07` | 11,132 m | NASA data: no restrictions on use | Huffman, G. J. et al. (2023). GPM IMERG Final Precipitation L3 1 month 0.1 degree V07. NASA GES DISC. doi:10.5067/GPM/IMERG/3B-MONTH/07 |
| NASA NEX-GDDP-CMIP6 daily downscaled climate projections | climate change by 2041-2060 | `NASA/GDDP-CMIP6` | 27,830 m | CC0 1.0 (blanket licence for all NEX-GDDP-CMIP6 outputs since September 2022) | Thrasher, B. et al. (2022). NASA Global Daily Downscaled Projections, CMIP6. Scientific Data 9: 262. doi:10.1038/s41597-022-01393-4 |
| NASA POWER daily (MERRA-2 based): rain, temperature and soil wetness, for checks at the demo field only | checks at the demo field | `API: power.larc.nasa.gov` | 55,000 m | NASA data: no restrictions on use | NASA Langley Research Center POWER Project, https://power.larc.nasa.gov |
| NASA SMAP L4 surface and root-zone soil moisture, 3-hourly 9 km (SPL4SMGP v8) | soil moisture | `NASA/SMAP/SPL4SMGP/008` | 9,000 m | Public domain (NASA Earth Science Data and Information Policy) | Reichle, R. et al. (2025). SMAP L4 Global 3-hourly 9 km EASE-Grid Surface and Root Zone Soil Moisture Geophysical Data, Version 8. NASA NSIDC DAAC. doi:10.5067/T5RUATAQREF8 |
| NASADEM elevation | height and slope | `NASA/NASADEM_HGT/001` | 30 m | NASA data: no restrictions on use | NASA JPL (2020). NASADEM Merged DEM Global 1 arc second V001. doi:10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001 |
| Sentinel-2 surface reflectance (harmonised) with Cloud Score+ | 10 m greenness and red-edge at the demo field | `COPERNICUS/S2_SR_HARMONIZED, GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED` | 10 m | Copernicus Sentinel data: free, full and open; Cloud Score+ CC BY 4.0 | Contains modified Copernicus Sentinel data (ESA). Pasquarella, V. J. et al. (2023). Cloud Score+. CVPR Workshops |
| SoilGrids 2.0 (ISRIC), 250 m soil property predictions | soil properties | `projects/soilgrids-isric/*_mean` | 250 m | CC BY 4.0 | Poggio, L. et al. (2021). SoilGrids 2.0. SOIL 7: 217-240. doi:10.5194/soil-7-217-2021 |
| SoilGrids 2.0 volumetric water content at 33 and 1500 kPa | water-holding capacity | `ISRIC/SoilGrids250m/v2_0` | 250 m | CC BY 4.0 | Turek, M. E. et al. (2023). International Soil and Water Conservation Research 11(2): 225-239 |
| TerraClimate monthly reference evapotranspiration (check only) | ET0 check | `IDAHO_EPSCOR/TERRACLIMATE` | 4,638 m | Public domain (CC0) | Abatzoglou, J. T. et al. (2018). Scientific Data 5: 170191. doi:10.1038/sdata.2017.191 |

The 1 km grid follows the EEA reference grid (ETRS89-LAEA, EPSG:3035).

## Ground check

Rain and temperature at the demo field were checked against the weather station of the vetch trial at that field. The paper gives season totals without saying which months they cover, so three windows are shown. The station values are copied by hand from the paper and labelled as such in `field.json`. They are used only for this check: no data was changed to match them.

| Season | Months | Station rain (mm) | Satellite rain, median of CHIRPS, IMERG, ERA5-Land (mm) | Difference |
|---|---|---|---|---|
| 2022-23 | Oct-May | 673.6 | 656 | -3% |
| 2022-23 | Nov-Jun | 673.6 | 678 | +1% |
| 2022-23 | sowing to harvest | 673.6 | 498 | -26% |
| 2023-24 | Oct-May | 314.6 | 412 | +31% |
| 2023-24 | Nov-Jun | 314.6 | 392 | +25% |
| 2023-24 | sowing to harvest | 314.6 | 308 | -2% |

| Season | Station mean temperature (°C) | ERA5-Land, sowing to harvest (°C) | Difference (°C) |
|---|---|---|---|
| 2022-23 | 13.58 | 12.4 | -1.2 |
| 2023-24 | 15.47 | 13.0 | -2.5 |

Station: Denora M. et al. (2025). Durum wheat-vetch intercropping in Mediterranean agroecological systems: effects on yield, nitrogen balance, and farm profitability. Italian Journal of Agronomy 20, 100045. https://doi.org/10.1016/j.ijagro.2025.100045

## AI assistance

Produced by notebooks written with AI assistance (Claude, Anthropic) and run by the Field Shift team in Google Colab with Google Earth Engine. Data values come from the cited datasets and were not written by the AI, except a few published values from the trial at the demo field (its station's rain and temperature, and its soil description), which were copied by hand from Denora et al. (2025) and are labelled as such.
