# Gera as imagens das arenas (1080x1860) a partir das texturas reais do Poly Haven (CC0).
# Uso: python3 tools/gerar_arenas.py [id_da_arena]
# Coordenadas do jogo: 360 x 620 (multiplicadas por S = 3 aqui).
import math, random, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

S = 3
W, H = 360 * S, 620 * S
RAIZ = os.path.join(os.path.dirname(__file__), '..')
TEX = os.path.join(RAIZ, 'assets', 'texturas')
SAIDA = os.path.join(RAIZ, 'assets', 'arenas')
os.makedirs(SAIDA, exist_ok=True)

PRINCESAS = [(90, 112), (270, 112), (90, 468), (270, 468)]
REIS = [(180, 64), (180, 540)]
RIO = (282, 338)
PONTES = [90, 270]


# ---------------------------------------------------------------- utilidades
def u(v):
    return int(round(v * S))


def ruido(w, h, escala, oitavas=4, semente=0, esticar=(1, 1)):
    """Ruído suave (0..1) somando várias escalas."""
    rng = np.random.default_rng(semente)
    tot = np.zeros((h, w), np.float32)
    amp, soma = 1.0, 0.0
    for o in range(oitavas):
        sx = max(2, int(w / (escala * esticar[0]) * (2 ** o)))
        sy = max(2, int(h / (escala * esticar[1]) * (2 ** o)))
        r = rng.random((sy, sx)).astype(np.float32)
        img = Image.fromarray((r * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        tot += np.asarray(img, np.float32) / 255 * amp
        soma += amp
        amp *= 0.5
    tot /= soma
    return (tot - tot.min()) / (tot.max() - tot.min() + 1e-6)


def textura(nome, ladrilho, semente=0, rot=0):
    """Textura repetida pelo mapa todo, misturando duas posições para não aparecer repetição."""
    im = Image.open(os.path.join(TEX, nome + '.jpg')).convert('RGB')
    if rot:
        im = im.rotate(rot, expand=True)
    im = im.resize((ladrilho, ladrilho), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255
    ny, nx = H // ladrilho + 2, W // ladrilho + 2
    grande = np.tile(a, (ny, nx, 1))
    rng = random.Random(semente)
    ox, oy = rng.randrange(ladrilho), rng.randrange(ladrilho)
    t1 = grande[oy:oy + H, ox:ox + W]
    ox2, oy2 = rng.randrange(ladrilho), rng.randrange(ladrilho)
    g2 = np.flip(grande, axis=1)
    t2 = g2[oy2:oy2 + H, ox2:ox2 + W]
    m = ruido(W, H, ladrilho * 1.2, 3, semente + 7)[..., None]
    m = np.clip((m - 0.35) * 3, 0, 1)
    return t1 * (1 - m) + t2 * m


def ajustar(img, brilho=1.0, contraste=1.0, saturacao=1.0, tom=(1, 1, 1), gama=1.0):
    img = np.clip(img, 0, 1) ** gama
    cinza = img.mean(axis=2, keepdims=True)
    img = cinza + (img - cinza) * saturacao
    img = (img - 0.5) * contraste + 0.5
    img = img * brilho * np.array(tom, np.float32)
    return np.clip(img, 0, 1)


def mascara(desenhar, borrar=0):
    m = Image.new('L', (W, H), 0)
    desenhar(ImageDraw.Draw(m))
    if borrar:
        m = m.filter(ImageFilter.GaussianBlur(borrar))
    return np.asarray(m, np.float32) / 255


def misturar(base, cima, m):
    if np.isscalar(m):
        return base * (1 - m) + cima * m
    m = m[..., None] if m.ndim == 2 else m
    return base * (1 - m) + cima * m


def sombra(base, m, dx=6, dy=9, borrar=10, forca=0.45):
    sm = ndimage.shift(m, (dy, dx), order=1, mode='constant')
    sm = ndimage.gaussian_filter(sm, borrar)
    return base * (1 - sm[..., None] * forca)


def brilho_aditivo(base, m, cor, forca=1.0):
    return np.clip(base + m[..., None] * np.array(cor, np.float32) * forca, 0, 1)


def borda(m, largura):
    """Faixa nas bordas de uma máscara (0..1)."""
    dentro = ndimage.binary_erosion(m > 0.5, iterations=largura)
    return np.clip((m > 0.5).astype(np.float32) - dentro.astype(np.float32), 0, 1)


def blob(dr, cx, cy, r, semente, pontas=11, irregular=0.18, fill=255):
    rng = random.Random(semente)
    pts = []
    for i in range(pontas * 3):
        a = i / (pontas * 3) * math.tau
        rr = r * (1 + irregular * math.sin(a * pontas / 2 + rng.random() * 6) * rng.random())
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    dr.polygon(pts, fill=fill)


# ---------------------------------------------------------------- peças
def caminho_mask(largura=26):
    """Trilhas: rei -> princesas -> pontes (em cima e em baixo)."""
    def d(dr):
        L = u(largura)
        for x in PONTES:
            dr.rounded_rectangle([u(x) - L // 2, u(112), u(x) + L // 2, u(RIO[0]) + 4], radius=L // 3, fill=255)
            dr.rounded_rectangle([u(x) - L // 2, u(RIO[1]) - 4, u(x) + L // 2, u(468)], radius=L // 3, fill=255)
        for (kx, ky), py in (((180, 64), 112), ((180, 540), 468)):
            # curva do rei até as duas princesas
            for lado in (-1, 1):
                pts = []
                for i in range(41):
                    t = i / 40
                    x = kx + lado * 90 * t
                    y = ky + (py - ky) * (t ** 1.6)
                    pts.append((u(x), u(y)))
                dr.line(pts, fill=255, width=L, joint='curve')
                for p in pts[::4]:
                    dr.ellipse([p[0] - L // 2, p[1] - L // 2, p[0] + L // 2, p[1] + L // 2], fill=255)
    return mascara(d, borrar=2)


def bases_torres_mask():
    def d(dr):
        for x, y in PRINCESAS:
            dr.ellipse([u(x - 34), u(y - 30), u(x + 34), u(y + 34)], fill=255)
        for x, y in REIS:
            dr.rounded_rectangle([u(x - 50), u(y - 44), u(x + 50), u(y + 46)], radius=u(18), fill=255)
    return mascara(d, borrar=2)


def rio_mask(curva=6):
    """Rio com margens levemente onduladas."""
    def d(dr):
        topo, base = [], []
        for i in range(0, W + 1, 12):
            t = i / W * math.tau
            topo.append((i, u(RIO[0]) + math.sin(t * 2.0) * curva + math.sin(t * 5.3) * curva * 0.4))
            base.append((i, u(RIO[1]) + math.sin(t * 1.7 + 1) * curva + math.sin(t * 4.1) * curva * 0.4))
        dr.polygon(topo + base[::-1], fill=255)
    return mascara(d, borrar=1)


def ponte_mask(margem=0):
    def d(dr):
        for x in PONTES:
            dr.rectangle([u(x - 30) - margem, u(264) - margem, u(x + 30) + margem, u(356) + margem], fill=255)
    return mascara(d)


def quadriculado(forca=0.035):
    yy, xx = np.mgrid[0:H, 0:W]
    q = ((xx // u(20) + yy // u(20)) % 2).astype(np.float32)
    return 1 + (q - 0.5) * 2 * forca


def agua(semente, cores):
    """Água: gradiente + ondulação esticada + reflexos de luz."""
    raso, fundo = np.array(cores[0], np.float32), np.array(cores[1], np.float32)
    yy = np.linspace(0, 1, H)[:, None]
    centro = np.clip(1 - np.abs((yy * H - u(310)) / u(28)), 0, 1)
    base = raso * (1 - centro[..., None]) + fundo * centro[..., None]
    base = np.broadcast_to(base, (H, W, 3)).copy()
    ond = ruido(W, H, 60, 4, semente, esticar=(4, 1))
    ond2 = ruido(W, H, 22, 3, semente + 3, esticar=(5, 1))
    base *= (0.86 + ond[..., None] * 0.26)
    luz = np.clip((ond2 - 0.72) * 6, 0, 1) ** 2
    base = brilho_aditivo(base, luz, (0.9, 0.97, 1.0), 0.55)
    return base


def lava(semente):
    n = ruido(W, H, 90, 5, semente, esticar=(3, 1))
    veia = np.clip(1 - np.abs(ruido(W, H, 40, 4, semente + 5, esticar=(2, 1)) - 0.5) * 7, 0, 1)
    quente = np.clip(n * 0.7 + veia * 0.6, 0, 1)
    c1, c2, c3 = np.array([0.35, 0.03, 0.0]), np.array([0.95, 0.32, 0.02]), np.array([1.0, 0.86, 0.35])
    q = quente[..., None]
    img = np.where(q < 0.5, c1 + (c2 - c1) * (q / 0.5), c2 + (c3 - c2) * ((q - 0.5) / 0.5))
    crosta = np.clip((ruido(W, H, 50, 4, semente + 9) - 0.62) * 5, 0, 1)
    rocha = np.array([0.12, 0.08, 0.07])
    return misturar(img, np.broadcast_to(rocha, img.shape), crosta * 0.85)


def gelo(semente):
    neve = ajustar(textura('snow_02', u(120), semente), brilho=1.0, saturacao=0.3, tom=(0.82, 0.93, 1.05))
    yy = np.linspace(0, 1, H)[:, None]
    centro = np.clip(1 - np.abs((yy * H - u(310)) / u(30)), 0, 1)[..., None]
    azul = np.array([0.45, 0.68, 0.86], np.float32)
    img = neve * 0.45 + azul * 0.55
    img = img * (1 - centro * 0.25) + np.array([0.3, 0.52, 0.75]) * centro * 0.25
    # rachaduras
    rng = random.Random(semente)
    rach = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(rach)
    for _ in range(22):
        x, y = rng.uniform(0, W), rng.uniform(u(285), u(335))
        pts = [(x, y)]
        for _ in range(rng.randint(3, 7)):
            x += rng.uniform(-60, 60); y += rng.uniform(-20, 20)
            pts.append((x, y))
        dr.line(pts, fill=255, width=rng.choice([2, 3, 4]))
    r = np.asarray(rach, np.float32) / 255
    img = brilho_aditivo(img, ndimage.gaussian_filter(r, 2), (0.6, 0.7, 0.8), 0.6)
    img = img * (1 - r[..., None] * 0.35)
    brilho = np.clip((ruido(W, H, 40, 3, semente + 4, esticar=(3, 1)) - 0.7) * 5, 0, 1)
    return brilho_aditivo(img, brilho, (1, 1, 1), 0.35)


def arvore(base, cx, cy, r, folhas, semente, tom=(1, 1, 1), sat=1.2, neve=False, flores=None):
    m = mascara(lambda dr: [blob(dr, u(cx) + dx, u(cy) + dy, u(r) * k, semente + i, 9, 0.22)
                            for i, (dx, dy, k) in enumerate([(0, 0, 1.0), (-u(r) * 0.45, u(r) * 0.2, 0.7), (u(r) * 0.45, u(r) * 0.15, 0.72), (0, -u(r) * 0.4, 0.7)])], borrar=2)
    base = sombra(base, m, dx=u(5), dy=u(7), borrar=u(4), forca=0.55)
    if flores:
        n1 = ruido(W, H, 6, 3, semente + 1)[..., None]
        tex = np.array(flores[0], np.float32) * (0.62 + n1 * 0.55)
        pontos = np.clip((ruido(W, H, 2.2, 2, semente + 2) - 0.62) * 5, 0, 1)[..., None]
        tex = tex * (1 - pontos) + np.array(flores[1], np.float32) * pontos
    else:
        tex = ajustar(folhas, saturacao=sat, tom=tom, contraste=1.45, brilho=1.1)
        tex = tex * (0.75 + ruido(W, H, 7, 3, semente + 1)[..., None] * 0.5)
    # luz vinda de cima à esquerda
    yy, xx = np.mgrid[0:H, 0:W]
    dist = np.hypot(xx - (u(cx) - u(r) * 0.35), yy - (u(cy) - u(r) * 0.35)) / (u(r) * 1.6)
    luz = np.clip(1.25 - dist, 0.45, 1.25)[..., None]
    copa = tex * luz
    if neve:
        n = np.clip((ruido(W, H, 18, 3, semente) - 0.45) * 3, 0, 1) * np.clip(1.1 - dist, 0, 1)
        copa = misturar(copa, np.broadcast_to(np.array([0.93, 0.96, 1.0]), copa.shape), n * 0.85)
    aro = borda(m, u(2)) * 0.4
    copa = copa * (1 - aro[..., None])
    return misturar(base, copa, m)


def pinheiro(base, cx, cy, r, semente):
    def d(dr):
        for k, rot in ((1.0, 0), (0.75, 0.3), (0.5, 0.6)):
            pts = []
            for i in range(16):
                a = i / 16 * math.tau + rot
                rr = u(r) * k * (1.0 if i % 2 == 0 else 0.55)
                pts.append((u(cx) + math.cos(a) * rr, u(cy) + math.sin(a) * rr))
            dr.polygon(pts, fill=255)
    m = mascara(d, borrar=1.5)
    base = sombra(base, m, dx=u(6), dy=u(8), borrar=u(4), forca=0.5)
    verde = np.broadcast_to(np.array([0.10, 0.25, 0.16], np.float32), base.shape)
    n = ruido(W, H, 10, 3, semente)[..., None]
    copa = verde * (0.7 + n * 0.6)
    yy, xx = np.mgrid[0:H, 0:W]
    ang = np.arctan2(yy - u(cy), xx - u(cx))
    dist = np.hypot(xx - u(cx), yy - u(cy)) / u(r)
    neve = np.clip((np.cos(ang + 2.4) * 0.5 + 0.5) * (1 - dist * 0.6) + n[..., 0] * 0.3 - 0.35, 0, 1)
    copa = misturar(copa, np.broadcast_to(np.array([0.92, 0.95, 1.0]), copa.shape), np.clip(neve * 1.6, 0, 0.9))
    return misturar(base, copa, m)


def pedra(base, cx, cy, r, semente, tex, neve=False, cor=(1, 1, 1)):
    m = mascara(lambda dr: blob(dr, u(cx), u(cy), u(r), semente, 6, 0.3), borrar=1.5)
    base = sombra(base, m, dx=u(3), dy=u(5), borrar=u(2.5), forca=0.55)
    t = ajustar(tex, contraste=1.3, tom=cor)
    yy, xx = np.mgrid[0:H, 0:W]
    luz = np.clip(1.3 - np.hypot(xx - (u(cx) - u(r) * 0.4), yy - (u(cy) - u(r) * 0.4)) / (u(r) * 1.7), 0.35, 1.3)[..., None]
    p = t * luz
    if neve:
        n = np.clip(1.0 - np.hypot(xx - (u(cx) - u(r) * 0.2), yy - (u(cy) - u(r) * 0.3)) / (u(r) * 0.9), 0, 1)
        p = misturar(p, np.broadcast_to(np.array([0.95, 0.97, 1.0]), p.shape), np.clip(n * 1.5, 0, 0.95))
    return misturar(base, p, m)


def lanterna(base, cx, cy, cor=(1.0, 0.35, 0.25), r=5):
    gl = mascara(lambda dr: dr.ellipse([u(cx - r * 3), u(cy - r * 3), u(cx + r * 3), u(cy + r * 3)], fill=255), borrar=u(4))
    base = brilho_aditivo(base, gl, (1.0, 0.75, 0.4), 0.35)
    m = mascara(lambda dr: dr.ellipse([u(cx - r), u(cy - r * 1.2), u(cx + r), u(cy + r * 1.2)], fill=255), borrar=1)
    base = sombra(base, m, dx=u(2), dy=u(5), borrar=u(2), forca=0.5)
    corpo = np.broadcast_to(np.array(cor, np.float32), base.shape)
    yy, xx = np.mgrid[0:H, 0:W]
    luz = np.clip(1.35 - np.hypot(xx - u(cx - r * 0.3), yy - u(cy - r * 0.4)) / u(r * 1.6), 0.55, 1.35)[..., None]
    base = misturar(base, np.clip(corpo * luz, 0, 1), m)
    faixa = mascara(lambda dr: [dr.line([u(cx - r), u(cy + dy), u(cx + r), u(cy + dy)], fill=255, width=2) for dy in (-r * 0.5, 0, r * 0.5)])
    return base * (1 - (faixa * m)[..., None] * 0.35)


def varal(base, y, x0, x1, cores, semente):
    rng = random.Random(semente)
    fio = mascara(lambda dr: dr.line([(u(x0) + i * (u(x1) - u(x0)) / 60, u(y) + math.sin(i / 60 * math.pi) * u(8)) for i in range(61)], fill=255, width=3))
    base = base * (1 - fio[..., None] * 0.6)
    n = int((x1 - x0) / 22)
    for i in range(n + 1):
        t = i / max(1, n)
        x = x0 + (x1 - x0) * t
        yy = y + math.sin(t * math.pi) * 8 + 6
        base = lanterna(base, x, yy, rng.choice(cores), 4.2)
    return base


def telhado(base, x0, y0, x1, y1, tex, neve=False, tom=(1, 1, 1)):
    m = mascara(lambda dr: dr.rectangle([u(x0), u(y0), u(x1), u(y1)], fill=255), borrar=1)
    base = sombra(base, m, dx=u(4), dy=u(7), borrar=u(3), forca=0.55)
    t = ajustar(tex, tom=tom, contraste=1.2)
    meio = (u(y0) + u(y1)) / 2
    yy = np.arange(H)[:, None]
    luz = np.where(yy < meio, 1.15, 0.75)[..., None] * np.ones((1, W, 1))
    t = t * luz
    if neve:
        n = np.clip((ruido(W, H, 14, 3, int(x0)) - 0.3) * 2.5, 0, 1)
        t = misturar(t, np.broadcast_to(np.array([0.94, 0.96, 1.0]), t.shape), n * 0.9)
    cume = mascara(lambda dr: dr.line([u(x0), meio, u(x1), meio], fill=255, width=u(1.6)))
    t = t * (1 - cume[..., None] * 0.5)
    return misturar(base, t, m)


def barraca(base, x0, y0, x1, y1, cores):
    m = mascara(lambda dr: dr.rectangle([u(x0), u(y0), u(x1), u(y1)], fill=255), borrar=1)
    base = sombra(base, m, dx=u(4), dy=u(8), borrar=u(3), forca=0.55)
    xx = np.arange(W)[None, :]
    listra = ((xx - u(x0)) // u(5)) % 2
    c1, c2 = np.array(cores[0], np.float32), np.array(cores[1], np.float32)
    lona = np.where(listra[..., None] == 0, c1, c2) * np.ones((H, 1, 1), np.float32)
    meio = (u(y0) + u(y1)) / 2
    yy = np.arange(H)[:, None]
    dobra = np.clip(1.15 - np.abs(yy - meio) / (u(y1 - y0) / 2) * 0.45, 0.6, 1.15)
    lona = lona * dobra[..., None] * (0.92 + ruido(W, H, 10, 2, int(x0))[..., None] * 0.12)
    base = misturar(base, lona, m)
    # franja da frente
    fr = mascara(lambda dr: [dr.pieslice([u(x0) + i, u(y1) - u(3), u(x0) + i + u(5), u(y1) + u(3)], 0, 180, fill=255) for i in range(0, u(x1 - x0), u(5))])
    return misturar(base, np.broadcast_to(c1 * 0.85, base.shape), fr)


def braseiro(base, cx, cy, tex):
    gl = mascara(lambda dr: dr.ellipse([u(cx - 26), u(cy - 26), u(cx + 26), u(cy + 26)], fill=255), borrar=u(9))
    base = brilho_aditivo(base, gl, (1.0, 0.5, 0.15), 0.55)
    base = pedra(base, cx, cy, 7, int(cx * cy), tex, cor=(0.8, 0.75, 0.7))
    fogo = mascara(lambda dr: dr.ellipse([u(cx - 4), u(cy - 4), u(cx + 4), u(cy + 4)], fill=255), borrar=u(1.5))
    return brilho_aditivo(base, fogo, (1.0, 0.75, 0.3), 1.2)


def pilar(base, cx, cy, r, tex):
    m = mascara(lambda dr: dr.ellipse([u(cx - r), u(cy - r), u(cx + r), u(cy + r)], fill=255), borrar=1)
    base = sombra(base, m, dx=u(7), dy=u(10), borrar=u(4), forca=0.6)
    t = ajustar(tex, contraste=1.1, brilho=1.05)
    yy, xx = np.mgrid[0:H, 0:W]
    luz = np.clip(1.35 - np.hypot(xx - u(cx - r * 0.35), yy - u(cy - r * 0.35)) / u(r * 1.5), 0.45, 1.35)[..., None]
    base = misturar(base, t * luz, m)
    anel = mascara(lambda dr: dr.ellipse([u(cx - r * 0.7), u(cy - r * 0.7), u(cx + r * 0.7), u(cy + r * 0.7)], outline=255, width=u(1)))
    return base * (1 - anel[..., None] * 0.3)


def ponte(base, tex_tabua, cor_corrimao, tom=(1, 1, 1), neve=False, pedra_tex=None):
    m = ponte_mask()
    base = sombra(base, m, dx=u(4), dy=u(8), borrar=u(4), forca=0.6)
    if pedra_tex is not None:
        tab = ajustar(pedra_tex, contraste=1.15, tom=tom)
    else:
        tab = ajustar(textura(tex_tabua, u(70), 11, rot=90), contraste=1.15, tom=tom)
        # junta das tábuas
        yy = np.arange(H)[:, None]
        juntas = ((yy % u(9)) < 2).astype(np.float32)
        tab = tab * (1 - juntas[..., None] * 0.35)
    base = misturar(base, tab, m)
    # corrimãos
    def d(dr):
        for x in PONTES:
            for lado in (-1, 1):
                xx = u(x + lado * 27)
                dr.rectangle([xx - u(3), u(262), xx + u(3), u(358)], fill=255)
    cm = mascara(d, borrar=1)
    base = sombra(base, cm, dx=u(2), dy=u(3), borrar=u(1.5), forca=0.5)
    cor = np.broadcast_to(np.array(cor_corrimao, np.float32), base.shape)
    n = ruido(W, H, 8, 3, 21)[..., None]
    cor = cor * (0.8 + n * 0.35)
    if neve:
        cor = misturar(cor, np.broadcast_to(np.array([0.95, 0.97, 1.0]), cor.shape), 0.65)
    base = misturar(base, cor, cm)
    # postes nas pontas
    def d2(dr):
        for x in PONTES:
            for lado in (-1, 1):
                for y in (262, 358):
                    dr.rectangle([u(x + lado * 27) - u(4.5), u(y) - u(4.5), u(x + lado * 27) + u(4.5), u(y) + u(4.5)], fill=255)
    pm = mascara(d2, borrar=1)
    base = sombra(base, pm, dx=u(2), dy=u(3), borrar=u(1.5), forca=0.55)
    return misturar(base, np.clip(cor * 0.8, 0, 1), pm)


def vinheta(base, forca=0.35):
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2))
    v = np.clip(d - 0.55, 0, 1) * forca
    return base * (1 - v[..., None])


def luz_global(base):
    """Luz de fim de tarde vindo de cima à esquerda."""
    yy, xx = np.mgrid[0:H, 0:W]
    g = 1.06 - (xx / W) * 0.06 - (yy / H) * 0.05
    return np.clip(base * g[..., None], 0, 1)


# ---------------------------------------------------------------- montagem comum
def montar(tema):
    rng = random.Random(tema['semente'])
    chao = ajustar(textura(tema['chao'], u(tema.get('ladrilho_chao', 110)), 1), **tema['ajuste_chao'])
    if tema.get('chao2'):
        c2 = ajustar(textura(tema['chao2'], u(120), 2), **tema['ajuste_chao'])
        m = np.clip((ruido(W, H, 260, 4, 3) - 0.45) * 3, 0, 1)
        chao = misturar(chao, c2, m * 0.6)
    chao = chao * quadriculado(tema.get('quadriculado', 0.03))[..., None]
    img = chao

    # trilhas e bases das torres
    trilha_tex = ajustar(textura(tema['trilha'], u(tema.get('ladrilho_trilha', 46)), 4), **tema['ajuste_trilha'])
    cm = np.clip(caminho_mask() + bases_torres_mask(), 0, 1)
    img = sombra(img, cm, dx=0, dy=u(1.5), borrar=u(2), forca=0.35)
    aro = ndimage.gaussian_filter(borda(cm, u(2.5)), 1.5)
    t = trilha_tex * (1 - aro[..., None] * 0.35)
    if tema.get('neve_trilha'):
        nv = np.clip((ruido(W, H, 16, 4, 77) - 0.45) * 2.2, 0, 0.75)
        t = misturar(t, np.broadcast_to(np.array([0.93, 0.96, 1.0], np.float32), t.shape), nv)
    img = misturar(img, t, cm)
    if tema.get('borda_trilha'):
        bm = np.clip(ndimage.binary_dilation(cm > 0.5, iterations=u(2.2)).astype(np.float32) - (cm > 0.5), 0, 1)
        img = misturar(img, np.broadcast_to(np.array(tema['borda_trilha'], np.float32), img.shape) * (0.85 + ruido(W, H, 6, 2, 9)[..., None] * 0.3), ndimage.gaussian_filter(bm, 1) * 0.9)

    # rio + margens
    rm = rio_mask()
    margem = np.clip(ndimage.binary_dilation(rm > 0.5, iterations=u(5)).astype(np.float32), 0, 1)
    margem = ndimage.gaussian_filter(margem, u(1.2))
    mt = ajustar(textura(tema['margem'], u(60), 5), **tema.get('ajuste_margem', {}))
    img = misturar(img, mt, margem)
    fluido = tema['fluido']()
    profundo = ndimage.gaussian_filter(rm, u(4))
    fluido = fluido * (0.75 + profundo[..., None] * 0.25) if tema.get('escurecer_borda', True) else fluido
    img = misturar(img, fluido, rm)
    if tema.get('espuma'):
        esp = borda(rm, u(1.6)) * np.clip(ruido(W, H, 8, 3, 6) * 1.6 - 0.3, 0, 1)
        img = brilho_aditivo(img, ndimage.gaussian_filter(esp, 1.5), (1, 1, 1), 0.7)
    if tema.get('brilho_rio'):
        g = ndimage.gaussian_filter(rm, u(12))
        img = brilho_aditivo(img, np.clip(g - rm * 0.6, 0, 1), tema['brilho_rio'], 0.9)

    img = ponte(img, tema['tabua'], tema['corrimao'], tom=tema.get('tom_ponte', (1, 1, 1)), neve=tema.get('neve', False),
                pedra_tex=ajustar(textura(tema['ponte_pedra'], u(40), 8), contraste=1.2) if tema.get('ponte_pedra') else None)

    img = tema['enfeitar'](img, rng)
    img = luz_global(img)
    img = vinheta(img, 0.32)
    return img


def salvar(img, nome):
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
    im.save(os.path.join(SAIDA, f'{nome}.jpg'), quality=86, optimize=True, progressive=True)
    im.resize((360, 620), Image.LANCZOS).save(os.path.join(SAIDA, f'{nome}_mini.jpg'), quality=82, optimize=True)
    print('salvo', nome)


# ---------------------------------------------------------------- arenas
def enfeites_festival(img, rng):
    folhas = textura('forest_leaves_02', u(50), 31)
    telha = textura('clay_roof_tiles', u(26), 32)
    pedra_t = textura('seaside_rock', u(40), 33)
    for (x, y, r) in [(14, 186, 24), (346, 200, 25), (12, 424, 23), (348, 410, 26), (40, 248, 15), (322, 374, 15), (178, 214, 15), (182, 404, 15), (14, 96, 18), (346, 524, 18)]:
        img = arvore(img, x, y, r, folhas, int(x * 7 + y), tom=(0.55, 1.25, 0.35), sat=2.0)
    for (x0, y0, x1, y1), cores in zip([(6, 8, 62, 46), (298, 8, 354, 46), (6, 574, 62, 612), (298, 574, 354, 612)],
                                       [((0.9, 0.15, 0.15), (1, 0.97, 0.92)), ((0.15, 0.4, 0.85), (1, 0.97, 0.92)), ((0.95, 0.6, 0.1), (1, 0.97, 0.92)), ((0.85, 0.2, 0.55), (1, 0.97, 0.92))]):
        img = barraca(img, x0, y0, x1, y1, cores)
    img = varal(img, 160, 4, 356, [(0.95, 0.25, 0.22), (1.0, 0.92, 0.85), (0.98, 0.55, 0.15)], 5)
    img = varal(img, 452, 4, 356, [(0.95, 0.25, 0.22), (1.0, 0.92, 0.85), (0.98, 0.55, 0.15)], 6)
    for (x, y, r) in [(60, 300, 6), (300, 318, 5), (140, 296, 4), (226, 324, 5)]:
        img = pedra(img, x, y, r, int(x + y), pedra_t)
    # canteiros de flores
    for (x, y) in [(28, 240), (332, 380), (150, 240), (210, 380), (44, 524), (316, 96), (130, 520), (230, 96)]:
        for k in range(14):
            fx, fy = x + rng.uniform(-10, 10), y + rng.uniform(-8, 8)
            cor = rng.choice([(1, 0.85, 0.2), (1, 0.4, 0.6), (1, 1, 1), (0.6, 0.5, 1)])
            fm = mascara(lambda dr: dr.ellipse([u(fx) - 4, u(fy) - 4, u(fx) + 4, u(fy) + 4], fill=255), borrar=1)
            img = misturar(img, np.broadcast_to(np.array(cor, np.float32), img.shape), fm * 0.9)
    return img


def enfeites_sakura(img, rng):
    folhas = textura('forest_leaves_02', u(46), 41)
    pedra_t = textura('seaside_rock', u(40), 42)
    for (x, y, r) in [(18, 180, 24), (342, 200, 25), (16, 430, 23), (344, 420, 24), (176, 210, 16), (184, 402, 16), (40, 40, 22), (320, 34, 20), (36, 590, 21), (324, 586, 22)]:
        img = arvore(img, x, y, r, folhas, int(x * 5 + y), flores=((1.0, 0.70, 0.80), (1.0, 0.93, 0.96)))
    # lanternas de pedra
    for (x, y) in [(62, 250), (298, 250), (62, 370), (298, 370)]:
        img = pedra(img, x, y, 6.5, int(x + y * 3), pedra_t, cor=(0.95, 0.95, 0.9))
        img = lanterna(img, x, y, (1.0, 0.85, 0.5), 2.6)
    # pétalas pelo chão
    pet = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(pet)
    for _ in range(1600):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        a = rng.uniform(0, 180)
        dr.ellipse([x - 4, y - 2.5, x + 4, y + 2.5], fill=rng.randint(150, 255))
    pm = np.asarray(pet.filter(ImageFilter.GaussianBlur(0.8)), np.float32) / 255
    img = misturar(img, np.broadcast_to(np.array([1.0, 0.76, 0.86], np.float32), img.shape), pm * 0.95)
    # carpas no rio
    for (x, y, cor) in [(40, 306, (1.0, 0.55, 0.15)), (150, 318, (1, 1, 1)), (222, 300, (1.0, 0.45, 0.2)), (330, 314, (1, 0.95, 0.9))]:
        km = mascara(lambda dr: dr.ellipse([u(x - 7), u(y - 2.5), u(x + 7), u(y + 2.5)], fill=255), borrar=1.5)
        img = misturar(img, np.broadcast_to(np.array(cor, np.float32), img.shape), km * 0.75)
    return img


def enfeites_gelo(img, rng):
    pedra_t = textura('seaside_rock', u(40), 52)
    telha = textura('dark_wooden_planks', u(30), 53, rot=90)
    for (x, y, r) in [(14, 176, 27), (346, 192, 28), (12, 434, 27), (348, 424, 28), (38, 238, 18), (324, 382, 18), (178, 214, 17), (182, 404, 17), (330, 252, 15), (30, 370, 15), (16, 96, 20), (344, 520, 20)]:
        img = pinheiro(img, x, y, r, int(x * 3 + y))
    for (x0, y0, x1, y1) in [(6, 8, 62, 46), (298, 8, 354, 46), (6, 574, 62, 612), (298, 574, 354, 612)]:
        img = telhado(img, x0, y0, x1, y1, telha, neve=True, tom=(0.8, 0.7, 0.65))
    for (x, y, r) in [(64, 300, 7), (296, 318, 6), (140, 330, 4), (226, 294, 5), (150, 150, 6), (210, 470, 6)]:
        img = pedra(img, x, y, r, int(x * y), pedra_t, neve=True)
    # pegadas e brilho da neve
    br = np.clip((ruido(W, H, 3, 2, 55) - 0.86) * 9, 0, 1)
    return brilho_aditivo(img, br, (1, 1, 1), 0.35)


def enfeites_vulcao(img, rng):
    pedra_t = ajustar(textura('volcanic_rock_tiles', u(40), 61), brilho=0.55)
    marmore = textura('large_sandstone_blocks_01', u(30), 62)
    for (x, y, r) in [(18, 190, 15), (342, 186, 16), (16, 426, 15), (344, 432, 16), (40, 250, 9), (322, 372, 9)]:
        img = pedra(img, x, y, r, int(x * 9 + y), pedra_t, cor=(0.6, 0.55, 0.55))
    for (x, y) in [(22, 24), (338, 24), (22, 596), (338, 596)]:
        img = pilar(img, x, y, 13, marmore)
    for (x, y) in [(56, 160), (304, 160), (56, 460), (304, 460), (180, 230), (180, 390)]:
        img = braseiro(img, x, y, pedra_t)
    # rachaduras com lava no chão
    rach = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(rach)
    for _ in range(9):
        x, y = rng.uniform(u(20), W - u(20)), rng.choice([rng.uniform(u(150), u(260)), rng.uniform(u(360), u(470))])
        ang = rng.uniform(0, math.tau)
        pts = [(x, y)]
        for _ in range(rng.randint(6, 10)):
            ang += rng.uniform(-0.7, 0.7)
            x += math.cos(ang) * rng.uniform(10, 22); y += math.sin(ang) * rng.uniform(10, 22)
            pts.append((x, y))
        dr.line(pts, fill=255, width=rng.choice([3, 4, 5]), joint='curve')
    r = np.asarray(rach.filter(ImageFilter.GaussianBlur(1)), np.float32) / 255
    img = img * (1 - r[..., None] * 0.6)
    img = brilho_aditivo(img, ndimage.gaussian_filter(r, 7), (1.0, 0.35, 0.03), 0.9)
    img = brilho_aditivo(img, np.clip(r * 1.3 - 0.4, 0, 1), (1.0, 0.65, 0.15), 1.0)
    return img


def nebulosa(semente):
    """Abismo de estrelas: nebulosa roxa/azul/rosa com estrelas e poeira brilhante."""
    n1 = ruido(W, H, 120, 5, semente, esticar=(2.5, 1))
    n2 = ruido(W, H, 60, 4, semente + 3, esticar=(3, 1))
    base = np.zeros((H, W, 3), np.float32) + np.array([0.04, 0.02, 0.10], np.float32)
    roxo, azul, rosa = np.array([0.42, 0.16, 0.78]), np.array([0.12, 0.30, 0.85]), np.array([0.95, 0.32, 0.72])
    base = brilho_aditivo(base, np.clip((n1 - 0.4) * 2.2, 0, 1), roxo, 0.9)
    base = brilho_aditivo(base, np.clip((n2 - 0.5) * 2.5, 0, 1), azul, 0.7)
    base = brilho_aditivo(base, np.clip((n1 * n2 - 0.32) * 4, 0, 1), rosa, 0.6)
    rng = np.random.default_rng(semente)
    est = (rng.random((H, W)) > 0.9965).astype(np.float32)
    est = ndimage.gaussian_filter(est, 0.8) * 4
    grandes = (rng.random((H, W)) > 0.99975).astype(np.float32)
    grandes = ndimage.gaussian_filter(grandes, 2.2) * 30
    base = brilho_aditivo(base, np.clip(est, 0, 1), (1, 1, 1), 0.9)
    base = brilho_aditivo(base, np.clip(grandes, 0, 1), (0.85, 0.9, 1.0), 1.0)
    return np.clip(base, 0, 1)


def orbe(base, cx, cy, cor=(0.55, 0.85, 1.0), r=6):
    gl = mascara(lambda dr: dr.ellipse([u(cx - r * 4), u(cy - r * 4), u(cx + r * 4), u(cy + r * 4)], fill=255), borrar=u(6))
    base = brilho_aditivo(base, gl, cor, 0.45)
    m = mascara(lambda dr: dr.ellipse([u(cx - r), u(cy - r), u(cx + r), u(cy + r)], fill=255), borrar=u(0.8))
    base = sombra(base, m, dx=u(3), dy=u(8), borrar=u(3), forca=0.35)
    yy, xx = np.mgrid[0:H, 0:W]
    luz = np.clip(1.5 - np.hypot(xx - u(cx - r * 0.35), yy - u(cy - r * 0.35)) / u(r * 1.3), 0.5, 1.6)[..., None]
    return misturar(base, np.clip(np.array(cor, np.float32) * luz, 0, 1), m)


def enfeites_celestial(img, rng):
    marmore = ajustar(textura('marble_01', u(30), 71), brilho=1.15, saturacao=0.4, tom=(1.02, 0.98, 1.08))
    ouro = ajustar(textura('marble_01', u(24), 72), brilho=1.25, saturacao=0.2, tom=(1.25, 0.98, 0.5), contraste=1.1)
    for (x, y) in [(22, 24), (338, 24), (22, 596), (338, 596), (18, 200), (342, 200), (18, 420), (342, 420)]:
        img = pilar(img, x, y, 12, marmore)
        img = pilar(img, x, y, 5, ouro)
    for (x, y, c) in [(56, 160, (0.55, 0.85, 1.0)), (304, 160, (1.0, 0.6, 0.9)), (56, 460, (1.0, 0.6, 0.9)), (304, 460, (0.55, 0.85, 1.0)), (180, 236, (1.0, 0.9, 0.55)), (180, 384, (1.0, 0.9, 0.55))]:
        img = orbe(img, x, y, c, 5.5)
    # anéis dourados no chão em volta das torres do rei
    for (x, y) in [(180, 64), (180, 540)]:
        an = mascara(lambda dr: dr.ellipse([u(x - 58), u(y - 40), u(x + 58), u(y + 40)], outline=255, width=u(2)), borrar=1)
        img = brilho_aditivo(img * (1 - an[..., None] * 0.15), ndimage.gaussian_filter(an, 3), (1.0, 0.82, 0.4), 0.6)
    # runas de luz espalhadas
    rm = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(rm)
    for _ in range(26):
        x, y = rng.uniform(u(30), W - u(30)), rng.choice([rng.uniform(u(150), u(262)), rng.uniform(u(362), u(470))])
        r = rng.uniform(u(3), u(6))
        dr.line([(x - r, y), (x + r, y)], fill=200, width=2)
        dr.line([(x, y - r), (x, y + r)], fill=200, width=2)
    r = np.asarray(rm.filter(ImageFilter.GaussianBlur(1)), np.float32) / 255
    img = brilho_aditivo(img, ndimage.gaussian_filter(r, 3), (0.7, 0.6, 1.0), 0.6)
    return img


# ---------------------------------------------------------------- arenas de artes marciais (cenários originais)
def cratera(base, cx, cy, r, semente):
    """Marca de impacto no chão: buraco escuro com a borda levantada e rachaduras."""
    m = mascara(lambda dr: blob(dr, u(cx), u(cy), u(r), semente, 10, 0.2), borrar=u(1.2))
    aro = ndimage.gaussian_filter(borda(m, u(2.2)), 1.5)
    base = base * (1 - m[..., None] * 0.34)
    base = brilho_aditivo(base, aro * (1 - m), (1.0, 0.9, 0.75), 0.28)
    rng = random.Random(semente)
    rach = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(rach)
    for _ in range(6):
        a = rng.uniform(0, math.tau)
        x, y = u(cx) + math.cos(a) * u(r) * 0.8, u(cy) + math.sin(a) * u(r) * 0.8
        pts = [(x, y)]
        for _k in range(3):
            a += rng.uniform(-0.5, 0.5)
            x += math.cos(a) * u(r) * rng.uniform(0.25, 0.45); y += math.sin(a) * u(r) * rng.uniform(0.25, 0.45)
            pts.append((x, y))
        dr.line(pts, fill=255, width=3)
    rc = np.asarray(rach.filter(ImageFilter.GaussianBlur(1)), np.float32) / 255
    return base * (1 - rc[..., None] * 0.5)


def palmeira(base, cx, cy, r, semente):
    """Palmeira vista de cima: folhas compridas em estrela e um coco no meio."""
    rng = random.Random(semente)
    folhas = []
    n = 8
    for i in range(n):
        a = i / n * math.tau + rng.uniform(-0.2, 0.2)
        comp = u(r) * rng.uniform(0.85, 1.1)
        larg = u(r) * 0.2
        px, py = math.cos(a), math.sin(a)
        nx, ny = -py, px
        folhas.append([(u(cx) + nx * larg * 0.3, u(cy) + ny * larg * 0.3),
                       (u(cx) + px * comp * 0.5 + nx * larg, u(cy) + py * comp * 0.5 + ny * larg),
                       (u(cx) + px * comp, u(cy) + py * comp),
                       (u(cx) + px * comp * 0.5 - nx * larg, u(cy) + py * comp * 0.5 - ny * larg),
                       (u(cx) - nx * larg * 0.3, u(cy) - ny * larg * 0.3)])
    m = mascara(lambda dr: [dr.polygon(f, fill=255) for f in folhas], borrar=1.2)
    base = sombra(base, m, dx=u(6), dy=u(9), borrar=u(3), forca=0.5)
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.hypot(xx - u(cx), yy - u(cy)) / u(r)
    verde = np.array([0.16, 0.5, 0.2], np.float32) * (0.75 + ruido(W, H, 5, 2, semente)[..., None] * 0.5)
    verde = verde * np.clip(1.25 - d * 0.5, 0.6, 1.25)[..., None]
    veio = mascara(lambda dr: [dr.line([f[0], f[2]], fill=255, width=2) for f in folhas])
    verde = verde * (1 - veio[..., None] * 0.35)
    base = misturar(base, np.clip(verde, 0, 1), m)
    coco = mascara(lambda dr: dr.ellipse([u(cx) - u(r) * 0.16, u(cy) - u(r) * 0.16, u(cx) + u(r) * 0.16, u(cy) + u(r) * 0.16], fill=255), borrar=1)
    return misturar(base, np.broadcast_to(np.array([0.36, 0.24, 0.12], np.float32), base.shape), coco)


def enfeites_torneio(img, rng):
    telha = textura('clay_roof_tiles', u(26), 81)
    marmore = ajustar(textura('marble_01', u(30), 82), brilho=1.1, saturacao=0.5)
    # arquibancadas nos quatro cantos (telhados de templo)
    for (x0, y0, x1, y1) in [(4, 6, 70, 40), (290, 6, 356, 40), (4, 580, 70, 614), (290, 580, 356, 614)]:
        img = telhado(img, x0, y0, x1, y1, telha, tom=(1.25, 0.72, 0.42))
    # muretas dos lados e pilares
    for (x, y) in [(14, 150), (346, 150), (14, 250), (346, 250), (14, 370), (346, 370), (14, 470), (346, 470)]:
        img = pilar(img, x, y, 9, marmore)
    # anel do ringue pintado no chão
    for (x, y) in [(180, 190), (180, 430)]:
        an = mascara(lambda dr: dr.ellipse([u(x - 62), u(y - 44), u(x + 62), u(y + 44)], outline=255, width=u(2.4)), borrar=1)
        img = misturar(img, np.broadcast_to(np.array([0.78, 0.2, 0.16], np.float32), img.shape), an * 0.7)
    img = varal(img, 140, 30, 330, [(0.95, 0.75, 0.2), (0.9, 0.25, 0.2), (1.0, 0.95, 0.9)], 15)
    img = varal(img, 476, 30, 330, [(0.95, 0.75, 0.2), (0.9, 0.25, 0.2), (1.0, 0.95, 0.9)], 16)
    for (x, y) in [(40, 270), (320, 270), (40, 350), (320, 350)]:
        img = lanterna(img, x, y, (1.0, 0.8, 0.3), 5)
    return img


def enfeites_canion(img, rng):
    rocha = textura('seaside_rock', u(44), 91)
    for (x, y, r) in [(18, 30, 26), (342, 36, 24), (16, 590, 24), (344, 584, 27), (12, 200, 20), (348, 214, 21), (14, 410, 21), (346, 420, 20),
                      (46, 256, 11), (318, 366, 12), (178, 222, 10), (184, 398, 10), (60, 150, 8), (300, 470, 8)]:
        img = pedra(img, x, y, r, int(x * 5 + y), rocha, cor=(2.3, 1.45, 0.95))
    for (x, y, r) in [(130, 200, 15), (236, 240, 11), (120, 420, 12), (238, 392, 16), (52, 500, 10), (310, 120, 10)]:
        img = cratera(img, x, y, r, int(x * 3 + y))
    return img


def enfeites_ilha(img, rng):
    rocha = textura('seaside_rock', u(40), 101)
    for (x, y, r) in [(20, 34, 24), (340, 30, 22), (18, 586, 23), (342, 590, 25), (14, 196, 20), (346, 206, 21), (16, 416, 21), (344, 424, 20),
                      (176, 224, 14), (184, 396, 14), (50, 250, 13), (312, 372, 13)]:
        img = palmeira(img, x, y, r, int(x * 7 + y))
    for (x, y, r) in [(62, 300, 6), (296, 320, 6), (150, 296, 4), (220, 326, 5), (40, 130, 6), (322, 496, 6)]:
        img = pedra(img, x, y, r, int(x + y), rocha, cor=(2.2, 2.05, 1.85))
    # conchas e estrelas-do-mar na areia
    for (x, y) in [(36, 160), (326, 150), (140, 250), (224, 372), (44, 470), (318, 460), (128, 518), (236, 100)]:
        for _k in range(5):
            fx, fy = x + rng.uniform(-9, 9), y + rng.uniform(-7, 7)
            cor = rng.choice([(1, 0.93, 0.85), (1, 0.62, 0.5), (0.98, 0.8, 0.55)])
            fm = mascara(lambda dr: dr.ellipse([u(fx) - 4, u(fy) - 3, u(fx) + 4, u(fy) + 3], fill=255), borrar=1)
            img = misturar(img, np.broadcast_to(np.array(cor, np.float32), img.shape), fm * 0.9)
    return img


ARENAS = {
    'festival': dict(
        semente=1, chao='rocky_terrain_02', chao2='leafy_grass', ladrilho_chao=95,
        ajuste_chao=dict(saturacao=1.9, brilho=1.08, tom=(0.62, 1.12, 0.42), contraste=1.08),
        trilha='cobblestone_floor_08', ajuste_trilha=dict(brilho=1.05, saturacao=0.9, contraste=1.1), borda_trilha=(0.36, 0.30, 0.22),
        margem='aerial_beach_01', ajuste_margem=dict(brilho=1.0, tom=(1.05, 1.0, 0.88)),
        fluido=lambda: agua(11, [(0.28, 0.66, 0.78), (0.10, 0.36, 0.58)]), espuma=True,
        tabua='oak_wood_planks', corrimao=(0.42, 0.26, 0.14), enfeitar=enfeites_festival),
    'sakura': dict(
        semente=2, chao='rocky_terrain_02', chao2='leafy_grass', ladrilho_chao=100,
        ajuste_chao=dict(saturacao=1.6, brilho=1.05, tom=(0.7, 1.08, 0.55), contraste=1.05),
        trilha='stone_tiles_03', ajuste_trilha=dict(brilho=1.25, saturacao=0.7, contraste=1.1, tom=(1.05, 1.0, 0.95)), ladrilho_trilha=40, borda_trilha=(0.22, 0.30, 0.16),
        margem='clean_pebbles', ajuste_margem=dict(brilho=1.0),
        fluido=lambda: agua(21, [(0.30, 0.62, 0.62), (0.08, 0.30, 0.40)]), espuma=True,
        tabua='hinoki_planks', corrimao=(0.78, 0.13, 0.10), tom_ponte=(1.0, 0.92, 0.85), enfeitar=enfeites_sakura),
    'gelo': dict(
        semente=3, chao='snow_02', chao2='snow_field_aerial', ladrilho_chao=120, quadriculado=0.022,
        ajuste_chao=dict(saturacao=0.5, brilho=1.02, tom=(0.92, 0.97, 1.06)),
        trilha='cobblestone_floor_04', ajuste_trilha=dict(brilho=1.15, saturacao=0.3, tom=(0.92, 0.97, 1.06), contraste=1.05), neve_trilha=True,
        margem='asphalt_snow', ajuste_margem=dict(saturacao=0.4, tom=(0.9, 0.95, 1.05)),
        fluido=lambda: gelo(31), escurecer_borda=False, neve=True,
        tabua='dark_wooden_planks', corrimao=(0.30, 0.20, 0.14), enfeitar=enfeites_gelo),
    'vulcao': dict(
        semente=4, chao='volcanic_rock_tiles', chao2='burned_ground_01', ladrilho_chao=90, quadriculado=0.02,
        ajuste_chao=dict(brilho=0.78, saturacao=0.9, tom=(1.05, 0.95, 0.9), contraste=1.1),
        trilha='large_sandstone_blocks_01', ajuste_trilha=dict(brilho=0.62, tom=(1.12, 0.92, 0.78), contraste=1.25), ladrilho_trilha=60, borda_trilha=(0.10, 0.07, 0.06),
        margem='rocky_gravel', ajuste_margem=dict(brilho=0.55, saturacao=0.6),
        fluido=lambda: lava(41), escurecer_borda=False, brilho_rio=(1.0, 0.45, 0.08),
        tabua='castle_brick_02_white', ponte_pedra='castle_brick_02_white', corrimao=(0.35, 0.32, 0.30), enfeitar=enfeites_vulcao),
    'celestial': dict(
        semente=5, chao='marble_tiles', chao2='marble_01', ladrilho_chao=100, quadriculado=0.02,
        ajuste_chao=dict(brilho=1.16, saturacao=0.55, tom=(0.94, 0.9, 1.12), contraste=1.0),
        trilha='marble_tiles', ajuste_trilha=dict(brilho=1.22, saturacao=0.45, tom=(1.1, 1.02, 0.86), contraste=1.0), ladrilho_trilha=70, borda_trilha=(0.85, 0.66, 0.26),
        margem='snow_field_aerial', ajuste_margem=dict(brilho=1.15, saturacao=0.3, tom=(0.98, 0.96, 1.08)),
        fluido=lambda: nebulosa(51), escurecer_borda=False, brilho_rio=(0.55, 0.35, 1.0),
        tabua='castle_brick_02_white', ponte_pedra='marble_01', corrimao=(0.9, 0.72, 0.32), tom_ponte=(1.08, 1.04, 1.14), enfeitar=enfeites_celestial),
    'torneio': dict(
        semente=6, chao='aerial_beach_01', chao2='coast_sand_rocks_02', ladrilho_chao=110, quadriculado=0.02,
        ajuste_chao=dict(brilho=1.02, saturacao=1.05, tom=(1.08, 0.98, 0.8), contraste=1.05),
        trilha='stone_tiles_03', ajuste_trilha=dict(brilho=1.3, saturacao=0.5, contraste=1.1, tom=(1.04, 1.0, 0.94)), ladrilho_trilha=44, borda_trilha=(0.62, 0.2, 0.14),
        margem='stone_tiles_03', ajuste_margem=dict(brilho=1.1, saturacao=0.5),
        fluido=lambda: agua(61, [(0.36, 0.74, 0.86), (0.12, 0.44, 0.68)]), espuma=True,
        tabua='hinoki_planks', corrimao=(0.72, 0.16, 0.12), tom_ponte=(1.0, 0.94, 0.86), enfeitar=enfeites_torneio),
    'canion': dict(
        semente=7, chao='coast_sand_rocks_02', chao2='rocky_terrain_02', ladrilho_chao=100, quadriculado=0.022,
        ajuste_chao=dict(brilho=1.5, saturacao=0.95, tom=(1.28, 0.95, 0.66), contraste=1.05),
        trilha='large_sandstone_blocks_01', ajuste_trilha=dict(brilho=1.02, tom=(1.18, 0.96, 0.74), contraste=1.15), ladrilho_trilha=58, borda_trilha=(0.42, 0.22, 0.12),
        margem='rocky_gravel', ajuste_margem=dict(brilho=0.8, saturacao=0.9, tom=(1.25, 0.9, 0.66)),
        fluido=lambda: agua(71, [(0.22, 0.6, 0.62), (0.06, 0.3, 0.38)]), espuma=True,
        tabua='brown_planks_03', corrimao=(0.36, 0.2, 0.1), enfeitar=enfeites_canion),
    'ilha': dict(
        semente=8, chao='aerial_beach_01', chao2='leafy_grass', ladrilho_chao=115, quadriculado=0.02,
        ajuste_chao=dict(brilho=1.1, saturacao=1.15, tom=(1.06, 1.0, 0.82), contraste=1.02),
        trilha='oak_wood_planks', ajuste_trilha=dict(brilho=1.05, saturacao=0.9, contraste=1.1, tom=(1.05, 0.95, 0.8)), ladrilho_trilha=50, borda_trilha=(0.4, 0.26, 0.14),
        margem='aerial_beach_01', ajuste_margem=dict(brilho=1.2, tom=(1.05, 1.02, 0.9)),
        fluido=lambda: agua(81, [(0.3, 0.86, 0.84), (0.06, 0.52, 0.7)]), espuma=True,
        tabua='oak_wood_planks', corrimao=(0.5, 0.32, 0.16), enfeitar=enfeites_ilha),
}

if __name__ == '__main__':
    quais = sys.argv[1:] or list(ARENAS)
    for nome in quais:
        salvar(montar(ARENAS[nome]), nome)
