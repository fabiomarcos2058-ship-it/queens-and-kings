# Gera as capas dos banners de Summon Zenkai (uma por dupla que recebe Zenkai).
# Uso: python3 tools/gerar_capas_zenkai.py [indice_da_dupla ...]
import json, math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

RAIZ = os.path.join(os.path.dirname(__file__), '..')
ORIG = os.path.join(RAIZ, 'assets', 'cartas', 'originais')
SAIDA = os.path.join(RAIZ, 'assets', 'summon')
ORDEM = ['bra', 'nami_old', 'chichi', 'pan_dbh', 'teto', 'hatsune_miku', 'isagi', 'goku_ssj3', 'rukia', 'gohan_ssj', 'gyro', 'riruka',
         'sonic', 'johnny', 'trunks_ssj', 'hinata', 'kurona', 'caulifla', 'goku_ssj2', 'vegeta_ssj', 'mark_prisioneiro', 'mark_flaxan', 'vegeta_base', 'roman_cyber']
W, H, PW = 1080, 900, 640
CARTAS = {c['id']: c for c in json.load(open(os.path.join(RAIZ, 'assets', 'cartas', 'cartas.json')))['cartas']}


def painel(cid):
    p = os.path.join(ORIG, cid + '.jpg')
    if os.path.exists(p):
        im = Image.open(p).convert('RGB')
        cx, cy, r = CARTAS[cid]['rosto']
    else:  # sem original: usa a arte da carta (360x480)
        im = Image.open(os.path.join(RAIZ, 'assets', 'cartas', cid + '.jpg')).convert('RGB')
        cx, cy, r = im.width / 2, im.height * 0.3, im.width * 0.22
    IW, IH = im.size
    esc = max(160 / r, PW / IW, H / IH)
    cw, ch = PW / esc, H / esc
    x0 = min(max(0, cx - cw / 2), IW - cw)
    y0 = min(max(0, cy - ch * 0.36), IH - ch)
    return im.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((PW, H), Image.LANCZOS)


def capa(k):
    a, b = ORDEM[2 * k], ORDEM[2 * k + 1]
    rng = random.Random(k * 7 + 3)
    can = Image.new('RGB', (W, H), (20, 2, 4))
    mL = Image.new('L', (W, H), 0); ImageDraw.Draw(mL).polygon([(0, 0), (610, 0), (470, H), (0, H)], fill=255)
    lb = Image.new('RGB', (W, H)); lb.paste(painel(a), (-40, 0)); can = Image.composite(lb, can, mL.filter(ImageFilter.GaussianBlur(2)))
    mR = Image.new('L', (W, H), 0); ImageDraw.Draw(mR).polygon([(610, 0), (W, 0), (W, H), (470, H)], fill=255)
    lr = Image.new('RGB', (W, H)); lr.paste(painel(b), (W - PW + 20, 0)); can = Image.composite(lr, can, mR.filter(ImageFilter.GaussianBlur(2)))
    can = Image.blend(can, Image.new('RGB', (W, H), (255, 70, 40)), 0.08)
    raios = Image.new('L', (W, H), 0); d = ImageDraw.Draw(raios); cx, cy = 540, 330
    for i in range(46):
        ang = i / 46 * math.tau + rng.uniform(-.03, .03); l = rng.uniform(700, 1200); w = rng.uniform(.012, .03)
        d.polygon([(cx, cy), (cx + math.cos(ang - w) * l, cy + math.sin(ang - w) * l), (cx + math.cos(ang + w) * l, cy + math.sin(ang + w) * l)], fill=rng.randint(40, 90))
    fora = Image.new('L', (W, H), 0); ImageDraw.Draw(fora).ellipse((cx - 520, cy - 420, cx + 520, cy + 420), fill=255)
    fora = Image.eval(fora.filter(ImageFilter.GaussianBlur(120)), lambda v: 255 - v)
    raios = Image.composite(raios, Image.new('L', (W, H), 0), fora).filter(ImageFilter.GaussianBlur(3))
    can = Image.composite(Image.new('RGB', (W, H), (255, 90, 40)), can, raios.point(lambda v: int(v * 0.9)))
    fio = Image.new('L', (W, H), 0); ImageDraw.Draw(fio).line([(612, -10), (468, H + 10)], fill=255, width=10)
    can = Image.composite(Image.new('RGB', (W, H), (255, 60, 30)), can, fio.filter(ImageFilter.GaussianBlur(26)).point(lambda v: min(255, int(v * 2.2))))
    can = Image.composite(Image.new('RGB', (W, H), (255, 236, 170)), can, fio.filter(ImageFilter.GaussianBlur(2)))
    borda = Image.new('L', (W, H), 0); ImageDraw.Draw(borda).rectangle((0, 0, W, H), outline=255, width=60)
    can = Image.composite(Image.new('RGB', (W, H), (200, 10, 20)), can, borda.filter(ImageFilter.GaussianBlur(50)).point(lambda v: int(v * 0.65)))
    sp = Image.new('L', (W, H), 0); ds = ImageDraw.Draw(sp)
    for _ in range(40):
        x = rng.choice([rng.uniform(0, 140), rng.uniform(940, W), rng.uniform(0, W)]); y = rng.uniform(0, H * 0.85)
        if 160 < x < 930 and 120 < y < 620:
            continue
        r = rng.uniform(1.5, 4.5)
        ds.ellipse((x - r, y - r, x + r, y + r), fill=255)
        if r > 3.6:
            ds.line((x - r * 4, y, x + r * 4, y), fill=200, width=2); ds.line((x, y - r * 4, x, y + r * 4), fill=200, width=2)
    can = Image.composite(Image.new('RGB', (W, H), (255, 225, 140)), can, sp.filter(ImageFilter.GaussianBlur(0.8)))
    can = Image.composite(Image.new('RGB', (W, H), (255, 120, 40)), can, sp.filter(ImageFilter.GaussianBlur(6)).point(lambda v: int(v * 0.6)))
    v = Image.new('L', (W, H), 0); dv = ImageDraw.Draw(v)
    for y in range(H):
        dv.line([(0, y), (W, y)], fill=int(max(0, (y - H * 0.58) / (H * 0.42)) * 235))
    can = Image.composite(Image.new('RGB', (W, H), (25, 2, 4)), can, v)
    can = ImageEnhance.Contrast(can).enhance(1.06)
    can.save(os.path.join(SAIDA, f'zenkai_{k}.jpg'), quality=88)
    can.crop((240, 40, 840, 540)).resize((360, 300), Image.LANCZOS).save(os.path.join(SAIDA, f'zenkai_{k}_mini.jpg'), quality=86)
    print('capa', k, a, b)


if __name__ == '__main__':
    for k in ([int(x) for x in sys.argv[1:]] or range(len(ORDEM) // 2)):
        capa(k)
