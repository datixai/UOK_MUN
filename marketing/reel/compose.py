"""UOK MUN platform reel (1080x1920, 30 fps, about 53 s). Theme: the conference hall.
Navy and gold, a hemicycle of seats that glows behind every scene, gavel knocks, placard chips.
Scenes use real recordings of the demo site (fictional data). Run: python compose.py   (preview: python compose.py --preview 1 8 20)
Output: marketing/reel/UOKMUN-reel.mp4 (single file)."""
import functools, json, math, os, subprocess, sys, wave
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

import reelkit as rk
from reelkit import A, FFMPEG, FPS, H, W, Mixer, chip, clamp, datix_credit, ease, ease_out, font, ramp, rich_text, vignette

HERE = os.path.dirname(os.path.abspath(__file__))
CLIPS = os.path.join(HERE, 'work', 'clips')
FINAL = os.path.join(HERE, 'UOKMUN-reel.mp4')
LOGO = os.path.join(HERE, '..', '..', 'public', 'logo.png')
CLOGO = os.path.join(HERE, '..', '..', 'public', 'committees')

NAVY, NAVY2, GOLD, GOLD2, CREAM = (11, 22, 54), (24, 44, 100), (201, 167, 104), (236, 212, 156), (240, 232, 214)
TEXT, MUTED = (238, 238, 234), (150, 164, 192)
GEORGIA = r'C:\Windows\Fonts\georgiab.ttf'

# ------------------------------------------------------------------ storyboard
INTRO = 3.2
SCENES = [
    dict(key='explore', kind='phone', dur=7.0, clip='explore', step='01  EXPLORE', h=['Every *committee*,', 'agenda and logo'], sub='A fast public site for every visitor',
         chips=[(1.2, 'UNSC to Crisis Cell', 70, 640), (3.2, 'Real agendas', 790, 900)]),
    dict(key='schedule', kind='phone', dur=4.6, clip='schedule', step='02  SCHEDULE', h=['A clear *timeline*', 'for every day'], sub='Sessions, venues and ceremonies',
         chips=[(0.9, 'Day by day', 60, 700)]),
    dict(key='register', kind='phone', dur=6.2, clip='register', step='03  REGISTER', h=['Register in *one minute*', 'from any phone'], sub='Name, email and phone: that is all',
         chips=[(0.8, 'No account needed', 690, 700), (4.6, 'Instant confirmation', 60, 1000)]),
    dict(key='admin', kind='laptop', dur=10.4, clip='admin', step='04  ORGANISE', h=['Organisers *control*', 'every registration'], sub='Approve, assign and add delegates',
         chips=[(1.0, '14 delegates', 50, 1560), (3.4, 'One click approve', 340, 1560), (6.6, 'Photos, roles', 730, 1560)]),
    dict(key='content', kind='laptop', dur=6.0, clip='content', step='05  CONTROL', h=['Change what visitors', '*see* in one click'], sub='Show or hide any section instantly',
         chips=[(1.0, 'Live in seconds', 70, 1560), (3.0, 'No developer needed', 520, 1560)]),
    dict(key='delegate', kind='phone', dur=6.2, clip='delegate', step='06  DELEGATES', h=['Every delegate gets', 'a *private portal*'], sub='Profile, committee and fellow delegates',
         chips=[(0.9, 'Signs in with email', 60, 700), (3.6, 'Own committee only', 670, 1000)]),
    dict(key='private', kind='diagram', dur=4.4, step='07  PRIVATE BY DESIGN', h=['Delegates only see', 'their *own committee*'], sub='Visitors, delegates and admins each see only what is theirs'),
]
OUTRO = 4.6
t = INTRO
for s in SCENES:
    s['start'] = t
    t += s['dur']
OUTRO_START = t
TOTAL = t + OUTRO
# typing sounds (clip seconds), mirror record.mjs
TYPING = {'register': [(0.8, 10, 0.085), (2.3, 22, 0.06), (4.3, 12, 0.07)], 'admin': [(10.0, 11, 0.1)]}
SUCCESS_AT = {'register': 5.4 + 0.5}
COMM = [('oic', 'OIC'), ('pna', 'PNA'), ('uncsw', 'UNCSW'), ('unsc', 'UNSC'), ('unga', 'UNGA'), ('crisis', 'CRISIS'), ('unhrc', 'UNHRC')]

CLIP_META = {}
for name in ['explore', 'schedule', 'register', 'admin', 'content', 'delegate']:
    CLIP_META[name] = json.load(open(os.path.join(CLIPS, name, 'meta.json')))
for s in SCENES:
    if 'clip' in s:
        s['speed'] = CLIP_META[s['clip']]['frames'] / FPS / s['dur']


def geo(kind):
    if kind == 'phone':
        return dict(sw=560, sh=1212, x=260 - 20 + 20, y=580)   # screen size and top-left of the screen
    return dict(sw=940, sh=666, x=70, y=770)


# ------------------------------------------------------------------ cached assets
@functools.lru_cache(maxsize=1)
def background_static():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    g = np.zeros((H, W, 3), np.float32)
    t_ = yy / H
    top, bot = np.array((9, 18, 46), np.float32), np.array((17, 36, 86), np.float32)
    g[:] = top * (1 - t_[..., None]) + bot * t_[..., None]
    for cx, cy, r, col, k in ((220, 330, 760, (60, 90, 190), 0.45), (900, 1500, 820, (201, 167, 104), 0.22), (540, 980, 1000, (30, 60, 140), 0.25)):
        d = np.hypot(xx - cx, yy - cy) / r
        g += np.clip(1 - d, 0, 1)[..., None] ** 2 * np.array(col, np.float32) * k
    return Image.fromarray(np.clip(g, 0, 255).astype(np.uint8))


@functools.lru_cache(maxsize=1)
def grid_lines():
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for x in range(0, W, 60):
        d.line([(x, 0), (x, H)], fill=(255, 255, 255, 7))
    for y in range(0, H, 60):
        d.line([(0, y), (W, y)], fill=(255, 255, 255, 7))
    return im


def seats(cx, cy, r0, r1, rows, spacing):
    out = []
    for i in range(rows):
        r = r0 + (r1 - r0) * i / max(1, rows - 1)
        n = max(6, int(math.pi * r / spacing))
        for k in range(n):
            a = math.pi * (k + 0.5) / n          # 0..pi, left to right
            out.append((cx - r * math.cos(a), cy - r * math.sin(a), a / math.pi, i))
    return out


SEATS_BG = seats(540, 1930, 230, 860, 9, 34)


def hemicycle(layer_d, t, strength=1.0, reveal=1.0):
    for x, y, u, row in SEATS_BG:
        if u > reveal:
            continue
        wave = 0.5 + 0.5 * math.sin(t * 1.6 - u * 7 + row * 0.5)
        a = (0.10 + 0.30 * wave) * strength
        r = 4.2 + 2.2 * wave
        layer_d.ellipse([x - r, y - r, x + r, y + r], fill=A(GOLD, a))


PARTS = [(np.random.default_rng(4).uniform(0, W), np.random.default_rng(i).uniform(0, H), 6 + (i * 7) % 18, 1.5 + (i % 4)) for i in range(46)]


def particles(layer_d, t):
    for i, (x, y, sp, r) in enumerate(PARTS):
        yy = (y - t * sp * 3) % H
        xx = x + math.sin(t * 0.5 + i) * 18
        a = 0.10 + 0.22 * (0.5 + 0.5 * math.sin(t * 1.3 + i))
        layer_d.ellipse([xx - r, yy - r, xx + r, yy + r], fill=A(GOLD2, a))


@functools.lru_cache(maxsize=1)
def logo_img():
    return Image.open(LOGO).convert('RGBA')


@functools.lru_cache(maxsize=16)
def comm_logo(cid, size):
    return Image.open(os.path.join(CLOGO, cid + '.png')).convert('RGBA').resize((size, size), Image.LANCZOS)


@functools.lru_cache(maxsize=40)
def clip_frame(clip, idx, size):
    im = Image.open(os.path.join(CLIPS, clip, f'f{idx:04d}.jpg')).convert('RGB')
    return im.resize(size, Image.LANCZOS)


@functools.lru_cache(maxsize=4)
def rounded_mask(size, radius):
    m = Image.new('L', (size[0] * 2, size[1] * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] * 2 - 1, size[1] * 2 - 1], radius * 2, fill=255)
    return m.resize(size, Image.LANCZOS)


@functools.lru_cache(maxsize=2)
def device_body(kind):
    g = geo(kind)
    if kind == 'phone':
        pad = 22
        bw, bh = g['sw'] + 2 * pad, g['sh'] + 2 * pad
        ox, oy = g['x'] - pad, g['y'] - pad
        sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([ox, oy + 30, ox + bw, oy + bh + 30], 78, fill=(0, 0, 0, 150))
        sh = sh.filter(ImageFilter.GaussianBlur(34))
        d = ImageDraw.Draw(sh)
        d.rounded_rectangle([ox - 3, oy - 3, ox + bw + 3, oy + bh + 3], 80, fill=(70, 80, 110, 255))      # metal edge
        d.rounded_rectangle([ox, oy, ox + bw, oy + bh], 76, fill=(10, 13, 24, 255))
        d.rounded_rectangle([ox + bw - 1, oy + 250, ox + bw + 6, oy + 360], 3, fill=(70, 80, 110, 255))  # button
        d.rounded_rectangle([ox - 6, oy + 220, ox + 1, oy + 300], 3, fill=(70, 80, 110, 255))
        return sh
    # laptop with browser chrome and base
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    x0, y0, bw, bh = 40, g['y'] - 74, 1000, g['sh'] + 74 + 30
    ImageDraw.Draw(sh).rounded_rectangle([x0, y0 + 30, x0 + bw, y0 + bh + 30], 34, fill=(0, 0, 0, 140))
    sh = sh.filter(ImageFilter.GaussianBlur(30))
    d = ImageDraw.Draw(sh)
    d.rounded_rectangle([x0 - 3, y0 - 3, x0 + bw + 3, y0 + bh + 3], 36, fill=(70, 80, 110, 255))
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], 32, fill=(16, 22, 40, 255))
    for i, c in enumerate(((255, 96, 92), (255, 189, 68), (0, 202, 78))):                               # window dots
        d.ellipse([x0 + 28 + i * 30, y0 + 26, x0 + 46 + i * 30, y0 + 44], fill=c + (255,))
    d.rounded_rectangle([x0 + 150, y0 + 17, x0 + bw - 150, y0 + 53], 18, fill=(30, 40, 70, 255))
    d.text((x0 + bw / 2, y0 + 35), 'Organiser dashboard   |   private', font=font('semibold', 22), fill=(170, 184, 214, 255), anchor='mm')
    d.polygon([(x0 - 40, y0 + bh + 4), (x0 + bw + 40, y0 + bh + 4), (x0 + bw + 70, y0 + bh + 34), (x0 - 70, y0 + bh + 34)], fill=(52, 60, 86, 255))
    d.rounded_rectangle([x0 + bw / 2 - 90, y0 + bh + 4, x0 + bw / 2 + 90, y0 + bh + 14], 5, fill=(30, 36, 56, 255))
    return sh


# ------------------------------------------------------------------ drawing helpers
def tap_ripples(d, scene, t_local, g, dev_x, dev_y):
    meta = CLIP_META[scene['clip']]
    vw, vh = meta['vp']
    tc = t_local * scene['speed']
    for tp in meta['taps']:
        age = (tc - tp['t']) / scene['speed']
        if 0 <= age < 0.7:
            x = dev_x + tp['x'] * g['sw'] / vw
            y = dev_y + tp['y'] * g['sh'] / vh
            p = age / 0.7
            r = 14 + 52 * ease_out(p)
            d.ellipse([x - r, y - r, x + r, y + r], outline=A(GOLD2, 0.9 * (1 - p)), width=5)
            d.ellipse([x - 10, y - 10, x + 10, y + 10], fill=A(GOLD2, 0.8 * (1 - p)))


def chips_layer(d, scene, t_local):
    for (ta, text, x, y) in scene.get('chips', []):
        p = ease_out(ramp(t_local, ta, ta + 0.35))
        if p <= 0:
            continue
        out = 1 - ramp(t_local, scene['dur'] - 0.5, scene['dur'] - 0.2)
        a = p * out
        f = font('bold', 32)
        tw = d.textlength(text, font=f)
        yy = y + (1 - p) * 26 + math.sin(t_local * 1.7 + x) * 5
        d.rounded_rectangle([x - 4, yy - 4, x + tw + 62, yy + 64], 34, fill=(0, 0, 0, int(70 * a)))
        d.rounded_rectangle([x, yy, x + tw + 58, yy + 58], 29, fill=A((14, 28, 64), 0.94 * a), outline=A(GOLD, a), width=3)
        d.ellipse([x + 16, yy + 22, x + 30, yy + 36], fill=A(GOLD, a))
        d.text((x + 42, yy + 30), text, font=f, fill=A(TEXT, a), anchor='lm')


def caption(d, scene, t_local):
    a_in = ease_out(ramp(t_local, 0.0, 0.5))
    a_out = 1 - ramp(t_local, scene['dur'] - 0.32, scene['dur'] - 0.02)
    a = a_in * a_out
    if a <= 0:
        return
    dy = (1 - a_in) * 36
    chip(d, (W / 2, 120 + dy), scene['step'], font('bold', 30), GOLD2, (22, 38, 84), border=GOLD, alpha=a, pad=(28, 13), anchor_center=True)
    fh = font('extrabold', 78)
    for i, line in enumerate(scene['h']):
        rich_text(d, (W / 2, 262 + i * 92 + dy), line, fh, {'*': GOLD2}, base=TEXT, alpha=int(255 * a))
    d.text((W / 2, 452 + dy), scene['sub'], font=font('semibold', 34), fill=A(MUTED, a), anchor='ms')
    wlen = 240 * ease_out(ramp(t_local, 0.15, 0.8))
    d.rounded_rectangle([W / 2 - wlen / 2, 486 + dy, W / 2 + wlen / 2, 491 + dy], 3, fill=A(GOLD, a))


def draw_device(canvas, scene, t, t_local):
    kind, g = scene['kind'], geo(scene['kind'])
    slide = (1 - ease_out(ramp(t_local, 0.0, 0.55))) * 90
    bob = math.sin(t * 1.2) * 5
    dy = slide + bob
    layer = device_body(kind).copy()
    # screen content
    idx = int(clamp(t_local * scene['speed'], 0, CLIP_META[scene['clip']]['frames'] - 1) * 1.0)
    idx = min(CLIP_META[scene['clip']]['frames'] - 1, int(round(t_local * scene['speed'] * FPS)))
    fr = clip_frame(scene['clip'], idx, (g['sw'], g['sh']))
    mask = rounded_mask((g['sw'], g['sh']), 54 if kind == 'phone' else 12)
    layer.paste(fr, (g['x'], g['y']), mask)
    d = ImageDraw.Draw(layer)
    if kind == 'phone':
        d.rounded_rectangle([W / 2 - 70, g['y'] + 14, W / 2 + 70, g['y'] + 40], 13, fill=(6, 8, 14, 255))   # camera pill
        sheen = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sheen).polygon([(g['x'], g['y']), (g['x'] + 180, g['y']), (g['x'] - 40, g['y'] + 520), (g['x'], g['y'] + 520)], fill=(255, 255, 255, 12))
        layer.alpha_composite(sheen)
    tap_ripples(d, scene, t_local, g, g['x'], g['y'])
    if dy:
        layer = layer.transform(layer.size, Image.AFFINE, (1, 0, 0, 0, 1, -dy), resample=Image.BILINEAR)
    return layer


def scene_layer(scene, t):
    """RGBA layer for one scene at global time t, plus its alpha."""
    t_local = t - scene['start']
    a_in = ease(ramp(t, scene['start'] - 0.3, scene['start'] + 0.1))
    a_out = 1 - ease(ramp(t, scene['start'] + scene['dur'] - 0.02, scene['start'] + scene['dur'] + 0.3))
    a = a_in * a_out
    if a <= 0.001:
        return None, 0
    tl = max(0.0, t_local)
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if scene['kind'] == 'diagram':
        layer = diagram(scene, tl)
    else:
        layer = draw_device(None, scene, t, tl)
        d = ImageDraw.Draw(layer)
        chips_layer(d, scene, tl)
    d = ImageDraw.Draw(layer)
    caption(d, scene, tl)
    return layer, a


# ------------------------------------------------------------------ the private-by-design diagram
def diagram(scene, tl):
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = 540, 1150
    r0, r1 = 200, 410
    n = len(COMM)
    focus = 3                                    # UNSC is the delegate's committee
    appear = ease_out(ramp(tl, 0.2, 1.2))
    lock_t = ramp(tl, 1.4, 2.2)
    for i, (cid, label) in enumerate(COMM):
        a0 = math.pi + math.pi * i / n
        a1 = math.pi + math.pi * (i + 1) / n
        mid = (a0 + a1) / 2
        on = (i == focus)
        glow = 1.0 if on else 1 - 0.55 * lock_t
        for row in range(6):
            r = r0 + (r1 - r0) * row / 5
            cnt = max(3, int((a1 - a0) * r / 34))
            for k in range(cnt):
                ang = a0 + (a1 - a0) * (k + 0.5) / cnt
                x, y = cx + r * math.cos(ang), cy + r * math.sin(ang)
                rr = 9.5 * appear * (1.0 + (0.25 * math.sin(tl * 3 + k + row) if on and lock_t > 0.5 else 0))
                col = GOLD2 if on else (120, 138, 190)
                d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=A(col, (0.95 if on else 0.8) * glow * appear))
        lx, ly = cx + (r1 + 66) * math.cos(mid), cy + (r1 + 66) * math.sin(mid)
        sz = 100
        lg = comm_logo(cid, sz).copy()
        al = lg.getchannel('A').point(lambda v, g_=glow * appear: int(v * g_))
        lg.putalpha(al)
        if not on and lock_t > 0.3:
            lg = Image.blend(lg.convert('RGBA'), Image.new('RGBA', lg.size, (40, 50, 90, 0)), 0.0)
        layer.alpha_composite(lg, (int(lx - sz / 2), int(ly - sz / 2)))
        if not on:                                                       # lock badge
            la = ramp(tl, 1.6 + i * 0.06, 2.2 + i * 0.06)
            if la > 0:
                bx, by = lx + 30, ly + 30
                d.ellipse([bx - 20, by - 20, bx + 20, by + 20], fill=A((14, 28, 64), la), outline=A(GOLD, la), width=3)
                d.rounded_rectangle([bx - 9, by - 3, bx + 9, by + 11], 3, fill=A(GOLD2, la))
                d.arc([bx - 7, by - 15, bx + 7, by + 3], 180, 360, fill=A(GOLD2, la), width=3)
    # the delegate avatar in the middle
    av = Image.open(os.path.join(HERE, '..', '..', 'scripts', 'avatars', 'hamza-rauf.jpg')).convert('RGB').resize((180, 180), Image.LANCZOS)
    pa = ease_out(ramp(tl, 0.9, 1.6))
    m = Image.new('L', (180, 180), 0)
    ImageDraw.Draw(m).ellipse([0, 0, 179, 179], fill=int(255 * pa))
    d.ellipse([cx - 102, cy - 40 - 102 + 60, cx + 102, cy - 40 + 102 + 60], outline=A(GOLD, pa), width=6)
    layer.paste(av, (cx - 90, cy - 40 - 90 + 60), m)
    d.text((cx, cy + 190), 'Hamza Rauf', font=font('extrabold', 40), fill=A(TEXT, pa), anchor='mm')
    d.text((cx, cy + 236), 'Delegate, France, UNSC', font=font('semibold', 28), fill=A(MUTED, pa), anchor='mm')
    # who sees what
    rows = [('Visitor', 'public pages only'), ('Delegate', 'own committee'), ('Admin', 'everything')]
    for i, (who, what) in enumerate(rows):
        p = ease_out(ramp(tl, 2.2 + i * 0.35, 2.8 + i * 0.35))
        y = 1580 + i * 96 + (1 - p) * 30
        d.rounded_rectangle([140, y, 940, y + 78], 39, fill=A((14, 28, 64), 0.92 * p), outline=A(GOLD, 0.8 * p), width=3)
        d.text((190, y + 39), who, font=font('extrabold', 34), fill=A(GOLD2, p), anchor='lm')
        d.text((880, y + 39), what, font=font('semibold', 32), fill=A(TEXT, p), anchor='rm')
    return layer


# ------------------------------------------------------------------ intro and outro
def intro_layer(t):
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    a_out = 1 - ease(ramp(t, INTRO - 0.35, INTRO + 0.1))
    if a_out <= 0:
        return None
    pop = ease_out(ramp(t, 0.55, 1.15))
    size = int(470 * (0.7 + 0.3 * pop))
    lg = logo_img().resize((size, size), Image.LANCZOS)
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([W / 2 - 330, 640 - 330, W / 2 + 330, 640 + 330], fill=A(GOLD, 0.30 * pop))
    layer.alpha_composite(glow.filter(ImageFilter.GaussianBlur(70)))
    al = lg.getchannel('A').point(lambda v: int(v * pop))
    lg.putalpha(al)
    layer.alpha_composite(lg, (W // 2 - size // 2, 640 - size // 2))
    # light sweep over the logo
    sw = ramp(t, 1.0, 1.9)
    if 0 < sw < 1:
        x = W / 2 - 360 + 720 * sw
        sweep = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sweep).polygon([(x - 40, 380), (x + 10, 380), (x - 60, 900), (x - 110, 900)], fill=(255, 245, 210, 120))
        mask = layer.getchannel('A').filter(ImageFilter.GaussianBlur(1))
        sweep.putalpha(Image.fromarray((np.array(sweep.getchannel('A')).astype(np.float32) * np.array(mask).astype(np.float32) / 255).astype(np.uint8)))
        layer.alpha_composite(sweep)
    f = ImageFont.truetype(GEORGIA, 150)
    pt = ease_out(ramp(t, 1.0, 1.7))
    tw1, tw2 = d.textlength('UOK ', font=f), d.textlength('MUN', font=f)
    x0 = W / 2 - (tw1 + tw2) / 2
    d.text((x0, 1110 + (1 - pt) * 30), 'UOK ', font=f, fill=A(TEXT, pt), anchor='ls')
    d.text((x0 + tw1, 1110 + (1 - pt) * 30), 'MUN', font=f, fill=A(GOLD, pt), anchor='ls')
    ps = ease_out(ramp(t, 1.5, 2.2))
    d.text((W / 2, 1190), 'THE CONFERENCE PLATFORM', font=font('bold', 40), fill=A(GOLD2, ps), anchor='ms')
    d.text((W / 2, 1262), 'One place for delegates, chairs and organisers', font=font('semibold', 32), fill=A(MUTED, ps), anchor='ms')
    wl = 380 * ease_out(ramp(t, 1.3, 2.1))
    d.rounded_rectangle([W / 2 - wl / 2, 1292, W / 2 + wl / 2, 1297], 3, fill=A(GOLD, ps))
    if t < 0.95:                                                          # gavel flash (separate layer so it blends instead of replacing pixels)
        fl = 0.32 * (1 - abs(t - 0.58) / 0.4) if 0.18 < t < 0.98 else 0
        if fl > 0:
            layer.alpha_composite(Image.new('RGBA', (W, H), (255, 240, 200, int(255 * clamp(fl)))))
    a = Image.new('L', layer.size, int(255 * a_out))
    layer.putalpha(Image.fromarray((np.array(layer.getchannel('A')).astype(np.float32) * a_out).astype(np.uint8)))
    return layer


def outro_layer(t):
    tl = t - OUTRO_START
    a_in = ease(ramp(t, OUTRO_START - 0.3, OUTRO_START + 0.25))
    if a_in <= 0:
        return None
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pop = ease_out(ramp(tl, 0.0, 0.7))
    size = int(300 * (0.8 + 0.2 * pop))
    lg = logo_img().resize((size, size), Image.LANCZOS)
    lg.putalpha(lg.getchannel('A').point(lambda v: int(v * pop)))
    layer.alpha_composite(lg, (W // 2 - size // 2, 190))
    f = ImageFont.truetype(GEORGIA, 118)
    tw1, tw2 = d.textlength('UOK ', font=f), d.textlength('MUN', font=f)
    x0 = W / 2 - (tw1 + tw2) / 2
    d.text((x0, 640), 'UOK ', font=f, fill=A(TEXT, pop), anchor='ls')
    d.text((x0 + tw1, 640), 'MUN', font=f, fill=A(GOLD, pop), anchor='ls')
    d.text((W / 2, 705), 'CONFERENCE PLATFORM', font=font('bold', 38), fill=A(GOLD2, pop), anchor='ms')
    feats = ['Public site', 'Timeline', 'Registration', 'Delegate portal', 'Admin control', 'Private by design']
    x, y = 120, 790
    for i, ft in enumerate(feats):
        p = ease_out(ramp(tl, 0.5 + i * 0.12, 0.9 + i * 0.12))
        fnt = font('semibold', 32)
        w_ = d.textlength(ft, font=fnt) + 56
        if x + w_ > W - 100:
            x, y = 120, y + 84
        d.rounded_rectangle([x, y + (1 - p) * 20, x + w_, y + 64 + (1 - p) * 20], 32, fill=A((20, 36, 84), 0.95 * p), outline=A(GOLD, 0.9 * p), width=3)
        d.text((x + 28, y + 33 + (1 - p) * 20), ft, font=fnt, fill=A(TEXT, p), anchor='lm')
        x += w_ + 18
    c = ease_out(ramp(tl, 1.4, 2.4))
    datix_credit(layer, d, 1180, c, GOLD2, GOLD)
    d.text((W / 2, 1640), 'Demo data shown. All names are fictional.', font=font('regular', 26), fill=A(MUTED, 0.8 * c), anchor='ms')
    layer.putalpha(Image.fromarray((np.array(layer.getchannel('A')).astype(np.float32) * a_in).astype(np.uint8)))
    return layer


# ------------------------------------------------------------------ frame
def render(t):
    base = background_static().copy().convert('RGBA')
    base.alpha_composite(grid_lines())
    fx = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fx)
    reveal = ease_out(ramp(t, 0.0, 2.2)) * 1.02
    hemicycle(fd, t, strength=1.0 if t > INTRO else 1.25, reveal=reveal)
    particles(fd, t)
    base.alpha_composite(fx)
    if t < INTRO + 0.1:
        il = intro_layer(t)
        if il is not None:
            base.alpha_composite(il)
    for s in SCENES:
        lay, a = scene_layer(s, t) if (s['start'] - 0.3 <= t <= s['start'] + s['dur'] + 0.3) else (None, 0)
        if lay is not None:
            comp = base.copy()
            comp.alpha_composite(lay)
            base = Image.blend(base, comp, 1.0 if a > 0.999 else a) if a < 1 else comp
    if t > OUTRO_START - 0.35:
        ol = outro_layer(t)
        if ol is not None:
            base.alpha_composite(ol)
    # transition light streak at each scene start
    for s in SCENES + [dict(start=OUTRO_START)]:
        p = ramp(t, s['start'] - 0.25, s['start'] + 0.25)
        if 0 < p < 1:
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            y = int(-200 + (H + 400) * p)
            ImageDraw.Draw(ov).rectangle([0, y - 6, W, y + 6], fill=(255, 235, 180, int(90 * math.sin(math.pi * p))))
            base.alpha_composite(ov.filter(ImageFilter.GaussianBlur(10)))
    img = base.convert('RGB')
    vg = vignette()
    img = Image.composite(Image.new('RGB', (W, H), (3, 6, 16)), img, vg)
    return img


# ------------------------------------------------------------------ audio
def synth(path):
    m = Mixer(TOTAL)
    # warm pad: Dm9 then Bb maj7, slow
    m.pad([(73.4, 1.0), (110.0, 0.8), (146.8, 0.9), (174.6, 0.6), (220.0, 0.5), (261.6, 0.3)], gain=0.085, wobble=11)
    m.pad([(116.5, 0.7), (174.6, 0.6), (233.1, 0.4), (293.7, 0.3)], gain=0.05, wobble=7)

    def gavel(at, g=1.0):
        tt = np.arange(int(0.35 * SR_)) / SR_
        hit = (np.sin(2 * math.pi * 170 * tt) * np.exp(-tt * 26) + 0.6 * np.sin(2 * math.pi * 340 * tt) * np.exp(-tt * 38)) * 0.9
        nz = m.rng.normal(0, 1, len(tt)) * np.exp(-tt * 140) * 0.8
        m.add(hit + nz, at, g)
        m.add(m.boom() * 0.45, at, g)

    gavel(0.58, 1.0)
    m.add(m.riser(0.55), 0.0, 0.5)
    for k, f in enumerate((587.3, 740, 880, 1174.7)):                 # intro sparkle
        m.add(m.bell(f) * 0.12, 1.2 + k * 0.17, 1.0, pan=-0.3 + 0.2 * k)
    # steady pulse (soft kick on beats of 100 bpm) under the scenes
    beat = 60 / 100
    k = 0
    tt_ = INTRO
    while tt_ < OUTRO_START:
        kt = np.arange(int(0.3 * SR_)) / SR_
        kick = np.sin(2 * math.pi * (48 + 70 * np.exp(-kt * 22)) * kt) * np.exp(-kt * 9)
        m.add(kick, tt_, 0.20 if k % 4 == 0 else 0.11)
        if k % 2 == 1:
            hat = m.noise(0.06) * np.exp(-np.arange(int(0.06 * SR_)) / SR_ * 70)
            m.add(hat - Mixer.smooth(hat, 5), tt_, 0.06)
        tt_ += beat
        k += 1
    for s in SCENES + [dict(start=OUTRO_START)]:
        m.add(m.riser(0.45), s['start'] - 0.45, 0.35)                 # swoosh into each scene
        m.add(m.bell(1568) * 0.08, s['start'], 1.0, pan=0.2)
    for s in SCENES:
        if 'clip' not in s:
            continue
        meta = CLIP_META[s['clip']]
        for tp in meta['taps']:
            at = s['start'] + tp['t'] / s['speed']
            m.add(m.click(1500) * 0.5, at, 1.0, pan=0.1)
            m.add(m.relay() * 0.25, at, 1.0)
        for (c0, n, gap) in TYPING.get(s['clip'], []):
            for j in range(n):
                m.add(m.click(2200 + 200 * ((j * 7) % 5)) * 0.28, s['start'] + (c0 + j * gap) / s['speed'], 1.0, pan=-0.1)
    # registration success chime, approve ding, delegate welcome bell
    reg = next(s for s in SCENES if s['key'] == 'register')
    for j, f in enumerate((659.3, 830.6, 987.8, 1318.5)):
        m.add(m.bell(f) * 0.16, reg['start'] + (SUCCESS_AT['register']) / reg['speed'] + 0.4 + j * 0.1, 1.0, pan=-0.2 + 0.15 * j)
    adm = next(s for s in SCENES if s['key'] == 'admin')
    m.add(m.bell(987.8) * 0.2, adm['start'] + 5.3 / adm['speed'] + 0.15, 1.0)
    dl = next(s for s in SCENES if s['key'] == 'delegate')
    m.add(m.bell(784) * 0.16, dl['start'] + 0.35, 1.0)
    pr = next(s for s in SCENES if s['key'] == 'private')
    for j in range(3):
        m.add(m.relay() * 0.5, pr['start'] + 1.6 + j * 0.12, 1.0)
    m.add(m.bell(523.3) * 0.2, pr['start'] + 1.6, 1.0)
    # outro: riser, gavel, resolve chord
    m.add(m.riser(1.0), OUTRO_START - 0.9, 0.5)
    gavel(OUTRO_START + 0.1, 1.0)
    for j, f in enumerate((293.7, 440, 587.3, 740)):
        m.add(m.bell(f) * 0.18, OUTRO_START + 0.25 + j * 0.09, 1.0, pan=-0.3 + 0.2 * j)
    m.write(path)


SR_ = rk.SR

# ------------------------------------------------------------------ main
def _render_bytes(i):
    return render(i / FPS).tobytes()


def main():
    if '--preview' in sys.argv:
        pdir = os.path.join(HERE, 'work', 'preview')
        os.makedirs(pdir, exist_ok=True)
        ts = [float(x) for x in sys.argv[sys.argv.index('--preview') + 1:]] or [1.0, 6.0, 16.0, 22.0, 30.0, 40.0, 50.0, 55.0]
        for x in ts:
            render(x).save(os.path.join(pdir, f't{x:05.1f}.jpg'), quality=88)
        print('preview ->', pdir)
        return
    os.makedirs(os.path.join(HERE, 'work'), exist_ok=True)
    wav = os.path.join(HERE, 'work', 'uokmun_reel.wav')
    synth(wav)
    cmd = [FFMPEG, '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', wav,
           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
           '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', FINAL]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    total = int(TOTAL * FPS)
    with Pool(4) as pool:
        for i, b in enumerate(pool.imap(_render_bytes, range(total), chunksize=6)):
            proc.stdin.write(b)
            if i % 90 == 0:
                print(f'frame {i}/{total}', flush=True)
    proc.stdin.close()
    proc.wait()
    print('wrote', FINAL, 'duration', round(TOTAL, 1))


if __name__ == '__main__':
    main()
