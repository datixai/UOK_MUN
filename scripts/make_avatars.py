"""Draws friendly profile pictures for the TEST members (illustrated, not real people).
Output: scripts/avatars/<slug>.jpg (240x240). Run: python scripts/make_avatars.py"""
import os, random, json
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'avatars')
os.makedirs(OUT, exist_ok=True)

PEOPLE = json.load(open(os.path.join(HERE, 'people.json'), encoding='utf-8'))
SKIN = [(236, 195, 160), (224, 172, 130), (198, 142, 102), (172, 116, 80), (240, 206, 178)]
HAIR = [(30, 24, 22), (52, 36, 28), (84, 58, 38), (20, 20, 24), (110, 80, 50)]
BG = [((18, 40, 92), (58, 96, 178)), ((24, 70, 90), (70, 150, 160)), ((70, 34, 90), (140, 90, 170)), ((90, 54, 24), (190, 140, 80)), ((22, 58, 52), (60, 140, 110)), ((60, 30, 40), (170, 80, 100))]
CLOTH = [(15, 30, 69), (28, 28, 34), (60, 70, 90), (120, 30, 40), (30, 80, 70), (90, 60, 30)]
S = 4  # supersample


def avatar(p, seed):
    rnd = random.Random(seed)
    W = 240 * S
    c1, c2 = rnd.choice(BG)
    img = Image.new('RGB', (W, W))
    px = ImageDraw.Draw(img)
    for y in range(W):  # vertical gradient
        t = y / W
        px.line([(0, y), (W, y)], fill=tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3)))
    d = ImageDraw.Draw(img)
    skin, hair, cloth = rnd.choice(SKIN), rnd.choice(HAIR), rnd.choice(CLOTH)
    female = p['gender'] == 'f'
    cx = W // 2
    # shoulders and jacket
    d.ellipse((cx - 105 * S, 170 * S, cx + 105 * S, 330 * S), fill=cloth)
    if not female:  # shirt collar and tie hint
        d.polygon([(cx - 22 * S, 172 * S), (cx + 22 * S, 172 * S), (cx, 215 * S)], fill=(238, 238, 242))
        d.polygon([(cx - 5 * S, 190 * S), (cx + 5 * S, 190 * S), (cx + 8 * S, 235 * S), (cx - 8 * S, 235 * S)], fill=(168, 132, 69))
    # neck
    d.rectangle((cx - 16 * S, 140 * S, cx + 16 * S, 182 * S), fill=tuple(int(v * 0.92) for v in skin))
    if female:  # long hair or scarf behind the head
        if p.get('scarf'):
            d.ellipse((cx - 62 * S, 36 * S, cx + 62 * S, 190 * S), fill=rnd.choice([(168, 132, 69), (240, 236, 226), (30, 60, 100)]))
        else:
            d.ellipse((cx - 58 * S, 38 * S, cx + 58 * S, 190 * S), fill=hair)
    # head
    d.ellipse((cx - 42 * S, 52 * S, cx + 42 * S, 150 * S), fill=skin)
    if not female:  # short hair on top
        d.pieslice((cx - 46 * S, 44 * S, cx + 46 * S, 126 * S), 180, 360, fill=hair)
        if p.get('beard'):
            d.pieslice((cx - 40 * S, 96 * S, cx + 40 * S, 152 * S), 0, 180, fill=hair)
            d.ellipse((cx - 22 * S, 106 * S, cx + 22 * S, 122 * S), fill=skin)
    elif p.get('scarf'):
        d.pieslice((cx - 46 * S, 46 * S, cx + 46 * S, 128 * S), 180, 360, fill=(240, 236, 226) if rnd.random() < .5 else (30, 60, 100))
    else:
        d.pieslice((cx - 46 * S, 46 * S, cx + 46 * S, 120 * S), 170, 370, fill=hair)
    # face
    for ex in (-16, 16):
        d.ellipse((cx + ex * S - 5 * S, 94 * S, cx + ex * S + 5 * S, 103 * S), fill=(255, 255, 255))
        d.ellipse((cx + ex * S - 2.5 * S, 96 * S, cx + ex * S + 2.5 * S, 102 * S), fill=(40, 30, 28))
        d.arc((cx + ex * S - 9 * S, 84 * S, cx + ex * S + 9 * S, 94 * S), 200, 340, fill=hair, width=2 * S)
    d.arc((cx - 14 * S, 108 * S, cx + 14 * S, 132 * S), 20, 160, fill=(150, 70, 70), width=2 * S)
    d.arc((cx - 5 * S, 104 * S, cx + 5 * S, 118 * S), 30, 150, fill=tuple(int(v * 0.75) for v in skin), width=S)
    img = img.resize((160, 160), Image.LANCZOS).filter(ImageFilter.SMOOTH_MORE)
    img.save(os.path.join(OUT, p['slug'] + '.jpg'), quality=72)


for i, p in enumerate(PEOPLE):
    avatar(p, 100 + i)
print(len(PEOPLE), 'avatars in', OUT)
