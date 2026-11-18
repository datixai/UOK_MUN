"""Draws the Crisis Cell committee badge in the same style as the other committee logos
(cream disc, navy laurel wreath, navy emblem, bold label). Output: public/committees/crisis.png (176 px)."""
import math, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 'committees', 'crisis.png')
ref = Image.open(os.path.join(HERE, '..', 'public', 'committees', 'unhrc.png')).convert('RGBA')
CREAM = ref.getpixel((14, 88))[:3]          # disc colour sampled from an existing badge
NAVY = (36, 40, 92)
S = 4
N = 176 * S
cx = cy = N // 2

img = Image.new('RGBA', (N, N), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.ellipse((0, 0, N - 1, N - 1), fill=CREAM + (255,))


def leaf(x, y, ang, ln, wd):
    pts = []
    for t in range(0, 361, 15):
        a = math.radians(t)
        px, py = math.cos(a) * ln / 2, math.sin(a) * wd / 2
        pts.append((x + px * math.cos(ang) - py * math.sin(ang), y + px * math.sin(ang) + py * math.cos(ang)))
    d.polygon(pts, fill=NAVY)


# laurel wreath: two branches of leaves along a circle, tilted alternately inward and outward
R = 69 * S
for side in (-1, 1):
    for i in range(8):
        th = math.radians(56 + i * 13.5)                      # angle from the bottom, going up the side
        x = cx + side * R * math.sin(th)
        y = cy - 2 * S + R * math.cos(th)
        tang = math.atan2(-R * math.sin(th), side * R * math.cos(th))   # direction of travel along the branch
        for tilt in (-0.55, 0.55):
            off = tilt * 8 * S
            leaf(x + math.cos(tang + math.pi / 2) * off, y + math.sin(tang + math.pi / 2) * off, tang + tilt, 16 * S, 7 * S)

# emblem: shield with an exclamation mark, radiating alert lines and a star above
sx, sy, sw, sh = cx, cy - 12 * S, 27 * S, 36 * S
shield = [(sx - sw, sy - sh * .55), (sx + sw, sy - sh * .55), (sx + sw, sy + sh * .1), (sx, sy + sh * .75), (sx - sw, sy + sh * .1)]
d.polygon(shield, fill=NAVY)
inner = [(sx - sw + 5 * S, sy - sh * .55 + 5 * S), (sx + sw - 5 * S, sy - sh * .55 + 5 * S), (sx + sw - 5 * S, sy + sh * .06), (sx, sy + sh * .62), (sx - sw + 5 * S, sy + sh * .06)]
d.polygon(inner, fill=CREAM)
d.rounded_rectangle((sx - 4.5 * S, sy - 24 * S, sx + 4.5 * S, sy + 4 * S), radius=3 * S, fill=NAVY)
d.ellipse((sx - 5 * S, sy + 9 * S, sx + 5 * S, sy + 19 * S), fill=NAVY)
for a in (-58, -32, 32, 58):                              # alert rays above the shield
    r1, r2 = 40 * S, 47 * S
    x1, y1 = sx + math.sin(math.radians(a)) * r1, sy - 4 * S - math.cos(math.radians(a)) * r1
    x2, y2 = sx + math.sin(math.radians(a)) * r2, sy - 4 * S - math.cos(math.radians(a)) * r2
    d.line((x1, y1, x2, y2), fill=NAVY, width=int(3 * S))

# label
try:
    f = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', int(14 * S))
except Exception:
    f = ImageFont.load_default()
text = 'CRISIS CELL'
w = d.textlength(text, font=f)
d.text((cx - w / 2, cy + 47 * S), text, font=f, fill=NAVY)

img = img.resize((176, 176), Image.LANCZOS)
img.save(OUT, optimize=True)
print('saved', OUT, os.path.getsize(OUT) // 1024, 'KB', 'disc colour', CREAM)
