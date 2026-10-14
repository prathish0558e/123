"""
Strip the flat white background from public/images/Logo.jpeg.

Result: public/images/Logo.png (RGBA, cropped to the artwork) so the emblem
can sit on any surface — navbar, chat avatar, storefront sign — without the
ugly white patch.

Rules:
  * a pixel is background only if it is near-white AND neutral (JPEG keeps the
    white flat at ~253-255, the artwork does not);
  * only background connected to the image border is removed, so white areas
    *inside* the emblem (the TCT disc) survive;
  * the mask then grows 2 rings through the light JPEG fringe around the
    artwork, and the alpha edge is feathered for clean anti-aliasing.

Run:  python scripts/logo-transparent.py
"""

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

SRC = Path("public/images/Logo.jpeg")
DST = Path("public/images/Logo.png")


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    px = im.load()

    def is_white(x: int, y: int, lo: int = 242, spread: int = 10) -> bool:
        r, g, b = px[x, y]
        return r >= lo and g >= lo and b >= lo and (max(r, g, b) - min(r, g, b)) <= spread

    bg = bytearray(w * h)  # 1 = background
    queue: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        i = y * w + x
        if not bg[i] and is_white(x, y):
            bg[i] = 1
            queue.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while queue:  # flood fill: only border-connected white dies
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx] and is_white(nx, ny):
                bg[ny * w + nx] = 1
                queue.append((nx, ny))

    # Eat the pale JPEG ringing around the artwork: 2 rings of merely-light
    # pixels that touch the background.
    for _ in range(2):
        grow = []
        for y in range(h):
            for x in range(w):
                i = y * w + x
                if bg[i]:
                    continue
                if any(
                    0 <= nx < w and 0 <= ny < h and bg[ny * w + nx]
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
                ) and is_white(x, y, lo=225, spread=22):
                    grow.append(i)
        for i in grow:
            bg[i] = 1

    alpha = Image.new("L", (w, h), 255)
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            if bg[y * w + x]:
                ap[x, y] = 0
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))  # feather the cut-out

    out = im.convert("RGBA")
    out.putalpha(alpha)

    # Crop to the artwork so the emblem fills its box instead of floating in
    # the old white margin.
    bbox = alpha.point(lambda a: 255 if a > 12 else 0).getbbox()
    if bbox:
        pad = 2
        bbox = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(w, bbox[2] + pad),
            min(h, bbox[3] + pad),
        )
        out = out.crop(bbox)

    DST.parent.mkdir(parents=True, exist_ok=True)
    out.save(DST, optimize=True)

    transparent = sum(1 for a in out.getchannel("A").getdata() if a < 8)
    print(
        f"{DST}: {out.size[0]}x{out.size[1]} "
        f"({transparent * 100 // (out.size[0] * out.size[1])}% transparent), "
        f"source {w}x{h}"
    )


if __name__ == "__main__":
    main()
