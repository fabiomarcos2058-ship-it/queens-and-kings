"""Gera as 4 texturas das cartas Ultra (assets/texturas/ultra_*.jpg), 360x480.
Uso: python tools/gerar_texturas_ultra.py
"""
import numpy as np
from pathlib import Path
from PIL import Image, ImageFilter
from scipy.ndimage import gaussian_filter, zoom

W, H = 360, 480
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'texturas'
rng = np.random.default_rng(2026)


def fbm(oitavas=5, base=4):
    r = np.zeros((H, W))
    amp = 1.0
    for o in range(oitavas):
        n = base * 2 ** o
        g = rng.random((n * H // W + 2, n + 2))
        r += amp * zoom(g, (H / (g.shape[0] - 1), W / (g.shape[1] - 1)), order=3)[:H, :W]
        amp *= 0.5
    r -= r.min(); r /= r.max()
    return r


def hsv(h, s, v):
    h = (h % 1.0) * 6; i = h.astype(int) % 6; f = h - np.floor(h)
    p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    R = np.choose(i, [v, q, p, p, t, v]); G = np.choose(i, [t, v, v, q, p, p]); B = np.choose(i, [p, p, t, v, v, q])
    return np.stack([R, G, B], -1)


def salvar(a, nome):
    Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(OUT / nome, quality=86)


yy, xx = np.mgrid[0:H, 0:W]

# 1) PRISMA: cacos de vidro com arco-íris
pts = np.stack([rng.random(46) * W, rng.random(46) * H], 1)
d = np.stack([(xx - px) ** 2 + (yy - py) ** 2 for px, py in pts])
idx = d.argmin(0); ds = np.sort(d, 0)
borda = np.clip(1 - (np.sqrt(ds[1]) - np.sqrt(ds[0])) / 5, 0, 1)
hue = (rng.random(len(pts))[idx] * 0.35 + (xx + yy) / (W + H) * 0.9)
lum = 0.45 + 0.4 * rng.random(len(pts))[idx]
img = hsv(hue, 0.55, lum)
img = img * (1 - borda[..., None] * 0.7) + borda[..., None] * 0.95
salvar(img, 'ultra_prisma.jpg')

# 2) GALÁXIA: nebulosa + estrelas
n1, n2 = fbm(6, 3), fbm(5, 5)
neb = np.stack([0.25 + 0.7 * n1, 0.05 + 0.35 * n2, 0.35 + 0.65 * (1 - n1) * n2 + 0.3 * n1], -1)
est = (rng.random((H, W)) > 0.9988).astype(float)
est = gaussian_filter(est, 0.9) * 14
brilhos = (rng.random((H, W)) > 0.99975).astype(float)
cruz = gaussian_filter(brilhos, (0.6, 5)) + gaussian_filter(brilhos, (5, 0.6))
img = np.clip(neb + est[..., None] + cruz[..., None] * 28, 0, 1)
salvar(img, 'ultra_galaxia.jpg')

# 3) CRISTAL: losangos com degradê gelado
u = (xx / 36.0 + yy / 48.0); v = (xx / 36.0 - yy / 48.0)
fu, fv = np.abs(u - np.round(u)), np.abs(v - np.round(v))
linha = np.clip(1 - np.minimum(fu, fv) * 22, 0, 1)
faceta = (np.floor(u) * 7 + np.floor(v) * 13) % 5 / 5.0
base = hsv(0.5 + faceta * 0.22 + yy / H * 0.1, 0.45, 0.4 + faceta * 0.45)
brilho = np.clip(1 - np.abs((xx + yy * 0.6) % 120 - 60) / 14, 0, 1) * 0.35
img = base + linha[..., None] * 0.55 + brilho[..., None]
salvar(img, 'ultra_cristal.jpg')

# 4) ENERGIA: correntes douradas e azuis, com faíscas
f = fbm(5, 3); g = fbm(4, 6)
fluxo = np.sin((yy / 26.0) + f * 14 + np.sin(xx / 60.0) * 2) * 0.5 + 0.5
fluxo = fluxo ** 3
cor = np.stack([0.9 * fluxo + 0.1 * g, 0.65 * fluxo + 0.25 * g, 0.2 * fluxo + 0.7 * (1 - fluxo) * g], -1)
fa = gaussian_filter((rng.random((H, W)) > 0.998).astype(float), 1.2) * 30
img = np.clip(cor * 1.15 + fa[..., None] * np.array([1, 0.9, 0.5]), 0, 1)
salvar(img, 'ultra_energia.jpg')
print('ok')
