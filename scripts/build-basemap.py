"""Cuts the app's own zoomed-in map of the Bradano basin from Sentinel-2 true-colour scenes.

Written with AI assistance (Claude, Anthropic).

Input: Sentinel-2 L2A true-colour images (TCI.tif, 10 m) of one clear day, downloaded from the public
"sentinel-cogs" archive (no login). The four scenes used are listed in SCENES below.
Output: public/tiles/s2/{z}/{x}/{y}.jpg, standard web-map tiles for zooms 10 to 14, only where they touch the basin.

Run (needs Python with rasterio, numpy, pillow, mercantile, shapely):
    python scripts/build-basemap.py <folder holding the TCI_*.tif files>

Credit line the app must show: "Contains modified Copernicus Sentinel data 2026".
"""
import json
import sys
from pathlib import Path

import mercantile
import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT
from rasterio.transform import from_bounds as transform_from_bounds
from rasterio.warp import transform_bounds
from shapely.geometry import box, shape
from shapely.ops import unary_union

# The day and the four scenes (MGRS squares) that cover the basin, each under 1% cloud.
DAY = "2026-05-30"
SCENES = ["S2A_33TXF_20260530_0_L2A", "S2A_33TXE_20260530_0_L2A", "S2A_33TWF_20260530_0_L2A", "S2A_33TWE_20260530_0_L2A"]
SOURCE = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/33/T/{square}/2026/5/{scene}/TCI.tif"

MIN_ZOOM, MAX_ZOOM = 10, 14  # a 10 m pixel is about one screen pixel between zoom 13 and 14 at this latitude
MARGIN_DEG = 0.02           # about 2 km around the basin, so fields on its edge are not cut off
TILE = 256
QUALITY = 82
# 1 keeps the scene's own true-colour rendering, which is bright enough over farmland in late May.
GAMMA = 1.0

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "tiles" / "s2"


def basin():
    doc = json.loads((ROOT / "data" / "area.geojson").read_text(encoding="utf-8"))
    return unary_union([shape(f["geometry"]) for f in doc["features"]]).buffer(MARGIN_DEG)


def main(folder: Path):
    area = basin()
    west, south, east, north = area.bounds
    paths = sorted(folder.glob("TCI_*.tif"))
    if not paths:
        sys.exit(f"no TCI_*.tif in {folder}")
    lut = (255 * (np.arange(256) / 255) ** GAMMA).round().astype("uint8")
    lut[0] = 0  # 0 stays "no data"
    sources = [rasterio.open(p) for p in paths]
    # Each scene's outline in web-map metres, to skip scenes a tile does not touch.
    extents = [transform_bounds(s.crs, "EPSG:3857", *s.bounds) for s in sources]
    written = skipped = size = 0
    for z in range(MIN_ZOOM, MAX_ZOOM + 1):
        for t in mercantile.tiles(west, south, east, north, zooms=z):
            if not area.intersects(box(*mercantile.bounds(t))):
                continue
            b = mercantile.xy_bounds(t)
            rgb = np.zeros((3, TILE, TILE), dtype="uint8")
            for src, (left, bottom, right, top) in zip(sources, extents):
                if b.right <= left or b.left >= right or b.top <= bottom or b.bottom >= top:
                    continue
                # A view of the scene on exactly this tile's grid; outside the scene it reads as 0.
                with WarpedVRT(
                    src,
                    crs="EPSG:3857",
                    transform=transform_from_bounds(b.left, b.bottom, b.right, b.top, TILE, TILE),
                    width=TILE,
                    height=TILE,
                    resampling=Resampling.average if z < MAX_ZOOM - 1 else Resampling.cubic,
                ) as vrt:
                    part = vrt.read(indexes=[1, 2, 3])
                empty = rgb.max(axis=0) == 0
                rgb[:, empty] = part[:, empty]
                if rgb.min(axis=0).all():
                    break
            if (rgb.max(axis=0) == 0).mean() > 0.5:  # mostly outside every scene
                skipped += 1
                continue
            out = OUT / str(z) / str(t.x)
            out.mkdir(parents=True, exist_ok=True)
            file = out / f"{t.y}.jpg"
            Image.fromarray(np.moveaxis(lut[rgb], 0, -1)).save(file, quality=QUALITY, optimize=True)
            written += 1
            size += file.stat().st_size
        print(f"zoom {z}: {written} tiles so far, {size / 1e6:.1f} MB", flush=True)
    meta = {
        "day": DAY,
        "scenes": SCENES,
        "source": SOURCE,
        "credit": "Contains modified Copernicus Sentinel data 2026",
        "minzoom": MIN_ZOOM,
        "maxzoom": MAX_ZOOM,
        "bounds": [round(v, 4) for v in (west, south, east, north)],
        "tiles": written,
    }
    (OUT / "about.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"done: {written} tiles, {size / 1e6:.1f} MB, {skipped} skipped (no image)")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("."))
