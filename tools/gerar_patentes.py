#!/usr/bin/env python3
"""Gera os emblemas das patentes da ranqueada.

Materiais reais (CC0): ambientCG (papelão, metais) e Poly Haven (ferrugem, veludo, mármore).
Ornamentos (CC BY 3.0): game-icons.net (asas, louros, coroas, espadas) por Lorc e Delapouite.
Cada camada recebe relevo (bevel), o relevo da própria textura (normal map) e iluminação de estúdio
(reflexo de metal tipo "matcap"), depois tudo é empilhado com sombras e brilhos.

Saída: assets/patentes/<id>.png (384px) e <id>_mini.png (128px).
Uso: python3 tools/gerar_patentes.py [id ...]
"""
import os, sys, subprocess, tempfile, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTES = os.path.join(RAIZ, 'tools', 'recursos', 'fontes')
TEX = os.path.join(RAIZ, 'assets', 'texturas')
ORN = os.path.join(RAIZ, 'tools', 'recursos', 'ornamentos')
SAIDA = os.path.join(RAIZ, 'assets', 'patentes')
N = 768  # resolução de trabalho
rng = np.random.default_rng(7)

# ---------------- utilidades ----------------
def clamp(a, lo=0.0, hi=1.0):
    return np.clip(a, lo, hi)

def smooth(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)

def norm3(v):
    return v / (np.linalg.norm(v, axis=-1, keepdims=True) + 1e-9)

def poligono(pts, n=N, ss=3):
    im = Image.new('L', (n * ss, n * ss), 0)
    ImageDraw.Draw(im).polygon([(x * ss, y * ss) for x, y in pts], fill=255)
    return np.asarray(im.resize((n, n), Image.LANCZOS), dtype=np.float32) / 255

def elipse(cx, cy, rx, ry, n=N, ss=3):
    im = Image.new('L', (n * ss, n * ss), 0)
    ImageDraw.Draw(im).ellipse([(cx - rx) * ss, (cy - ry) * ss, (cx + rx) * ss, (cy + ry) * ss], fill=255)
    return np.asarray(im.resize((n, n), Image.LANCZOS), dtype=np.float32) / 255

def icone(nome, tam, cx, cy, rot=0, espelhar=False, n=N):
    """Desenha um ícone do game-icons (branco) como máscara, centrado em (cx, cy)."""
    svg = open(os.path.join(ORN, nome + '.svg')).read()
    svg = svg.replace('<path d="M0 0h512v512H0z"/>', '')  # tira o fundo preto
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, 'i.svg'); open(p, 'w').write(svg)
        o = os.path.join(d, 'i.png')
        subprocess.run(['rsvg-convert', '-w', str(int(tam)), '-h', str(int(tam)), p, '-o', o], check=True)
        im = Image.open(o).convert('RGBA')
    a = im.split()[3]
    if espelhar: a = a.transpose(Image.FLIP_LEFT_RIGHT)
    if rot: a = a.rotate(rot, resample=Image.BICUBIC, expand=True)
    tela = Image.new('L', (n, n), 0)
    tela.paste(a, (int(cx - a.width / 2), int(cy - a.height / 2)))
    return np.asarray(tela, dtype=np.float32) / 255

def textura(nome, escala=1.0, n=N, rot=0):
    for p in (os.path.join(FONTES, nome + '_Color.jpg'), os.path.join(TEX, nome + '.jpg')):
        if os.path.exists(p):
            im = Image.open(p).convert('RGB'); break
    else:
        raise FileNotFoundError(nome)
    lado = int(n * escala)
    im = im.resize((lado, lado), Image.LANCZOS)
    if rot: im = im.rotate(rot)
    reps = int(math.ceil(n / lado)) + 1
    tela = Image.new('RGB', (lado * reps, lado * reps))
    for i in range(reps):
        for j in range(reps):
            tela.paste(im, (i * lado, j * lado))
    return np.asarray(tela.crop((0, 0, n, n)), dtype=np.float32) / 255

def normal_tex(nome, escala=1.0, n=N, forca=1.0):
    p = os.path.join(FONTES, nome + '_Normal.jpg')
    if not os.path.exists(p):
        return np.dstack([np.zeros((n, n)), np.zeros((n, n)), np.ones((n, n))]).astype(np.float32)
    im = Image.open(p).convert('RGB')
    lado = int(n * escala)
    im = im.resize((lado, lado), Image.LANCZOS)
    reps = int(math.ceil(n / lado)) + 1
    tela = Image.new('RGB', (lado * reps, lado * reps))
    for i in range(reps):
        for j in range(reps):
            tela.paste(im, (i * lado, j * lado))
    a = np.asarray(tela.crop((0, 0, n, n)), dtype=np.float32) / 255 * 2 - 1
    a[..., 1] *= -1  # OpenGL (y pra cima) -> imagem (y pra baixo)
    a[..., :2] *= forca
    return norm3(a)

def ruido(escala, n=N, seed=None):
    g = np.random.default_rng(seed).random((n // escala + 2, n // escala + 2)).astype(np.float32)
    im = Image.fromarray((g * 255).astype(np.uint8)).resize((n + escala * 2, n + escala * 2), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32)[:n, :n] / 255

def tingir(rgb, cor, quanto=1.0):
    lum = (rgb @ np.array([0.3, 0.59, 0.11], dtype=np.float32))[..., None]
    alvo = lum * np.array(cor, dtype=np.float32) * 1.25
    return rgb * (1 - quanto) + alvo * quanto

# ---------------- relevo e luz ----------------
LUZ = norm3(np.array([-0.45, -0.65, 0.62], dtype=np.float32))

def altura(mask, largura, cupula=0.0):
    """Bevel: sobe nas bordas e fica plano no meio (cupula > 0 arredonda o meio)."""
    m = mask > 0.5
    d = ndimage.distance_transform_edt(m).astype(np.float32)
    h = smooth(0, largura, d)
    if cupula:
        dm = d.max() + 1e-6
        h = h + cupula * np.sqrt(clamp(d / dm))
    return ndimage.gaussian_filter(h * np.minimum(1, mask * 2), 1.2)

def normais(h, forca, detalhe=None, mistura=1.0):
    gy, gx = np.gradient(h)
    n = norm3(np.dstack([-gx * forca, -gy * forca, np.ones_like(h)]))
    if detalhe is not None:
        # soma o relevo da textura (normal map) por cima do bevel
        n = norm3(np.dstack([n[..., 0] + detalhe[..., 0] * mistura, n[..., 1] + detalhe[..., 1] * mistura, n[..., 2]]))
    return n

def ambiente(r):
    """'Estúdio' para reflexos de metal: céu claro, faixa escura no horizonte, chão quente e 2 softboxes."""
    cima = -r[..., 1] + 0.32 * r[..., 2]
    e = 0.22 + 0.85 * smooth(-0.2, 0.8, cima)
    e -= 0.3 * np.exp(-((cima - 0.0) / 0.12) ** 2)
    e += 0.22 * smooth(0.0, -0.7, cima)
    e = np.maximum(e, 0.06)
    s1 = norm3(np.array([-0.55, -0.62, 0.56], dtype=np.float32))
    s2 = norm3(np.array([0.72, -0.25, 0.64], dtype=np.float32))
    caixa = 1.25 * np.exp(-np.sum((r - s1) ** 2, -1) / 0.055) + 0.55 * np.exp(-np.sum((r - s2) ** 2, -1) / 0.03)
    return e, caixa

def metal(base, n, brilho=1.0, aspereza=0.0):
    v = np.array([0, 0, 1], dtype=np.float32)
    r = 2 * n[..., 2:3] * n - v
    e, caixa = ambiente(r)
    if aspereza:
        e = ndimage.gaussian_filter(e, aspereza)
        caixa = ndimage.gaussian_filter(caixa, aspereza)
    spec = clamp(np.sum(n * norm3(LUZ + v), -1)) ** 60
    cor = base * (e[..., None] ** 1.15 * 1.3) + (caixa[..., None] * 0.6 + spec[..., None] * 0.9) * brilho * (0.45 + 0.55 * base)
    borda = (1 - n[..., 2]) ** 2
    return clamp(cor + borda[..., None] * 0.08)

def difuso(base, n, brilho=0.15, amb=0.42):
    lam = clamp(np.sum(n * LUZ, -1))
    spec = clamp(np.sum(n * norm3(LUZ + np.array([0, 0, 1], dtype=np.float32)), -1)) ** 18
    return clamp(base * (amb + 0.75 * lam[..., None]) + spec[..., None] * brilho)

# ---------------- gemas ----------------
def gema(cx, cy, rx, ry, cor, lados=8, n=N, arco_iris=False):
    """Pedra lapidada vista de cima: mesa + facetas, cada uma com uma inclinação."""
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    dx, dy = (xx - cx) / rx, (yy - cy) / ry
    rad = np.sqrt(dx ** 2 + dy ** 2)
    ang = np.arctan2(dy, dx)
    mask = clamp((1 - rad) * max(rx, ry) / 1.5)
    setor = np.floor((ang + math.pi) / (2 * math.pi) * lados)
    meio = (setor + 0.5) / lados * 2 * math.pi - math.pi
    anel = np.where(rad < 0.48, 0, np.where(rad < 0.78, 1, 2))
    inc = np.choose(anel, [0.0, 0.55, 1.05]).astype(np.float32)
    meio2 = meio + np.where(anel == 2, (np.mod(setor, 2) - 0.5) * 0.45, 0)
    nx, ny = np.cos(meio2) * np.sin(inc), np.sin(meio2) * np.sin(inc)
    nn = norm3(np.dstack([nx, ny, np.cos(inc) * np.ones_like(nx)]).astype(np.float32))
    v = np.array([0, 0, 1], dtype=np.float32)
    r = 2 * nn[..., 2:3] * nn - v
    e, caixa = ambiente(r)
    c = np.array(cor, dtype=np.float32)
    var = 0.75 + 0.5 * np.sin(setor * 2.3 + anel * 1.7)[..., None]
    corpo = c * (0.35 + 0.7 * var) * (0.55 + 0.6 * e[..., None])
    if arco_iris:
        h = (setor / lados + anel * 0.21) % 1
        arco = np.dstack([0.5 + 0.5 * np.cos(2 * np.pi * (h + 0)), 0.5 + 0.5 * np.cos(2 * np.pi * (h + 0.33)), 0.5 + 0.5 * np.cos(2 * np.pi * (h + 0.66))])
        corpo = corpo * 0.6 + arco * 0.45 * (0.6 + 0.6 * e[..., None])
    brilho = caixa[..., None] * 0.9 + clamp(np.sum(nn * norm3(LUZ + v), -1))[..., None] ** 40 * 1.2
    linhas = np.exp(-((np.mod((ang + math.pi) / (2 * math.pi) * lados, 1) - 0.0) ** 2) / 0.0008) + np.exp(-((rad - 0.48) ** 2) / 0.0004) + np.exp(-((rad - 0.78) ** 2) / 0.0004)
    cor_f = clamp(corpo + brilho - linhas[..., None] * 0.18 + 0.15 * (1 - rad)[..., None] * c)
    return cor_f, mask

def brilhinho(img, cx, cy, tam, cor=(1, 1, 1)):
    """Estrelinha de brilho (4 pontas) somada na imagem."""
    n = img.shape[0]
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    dx, dy = np.abs(xx - cx), np.abs(yy - cy)
    s = np.exp(-(dx * dy) / (tam * 0.9)) * np.exp(-(dx + dy) / (tam * 2.2)) + np.exp(-(dx ** 2 + dy ** 2) / (tam * 3))
    img[..., :3] = clamp(img[..., :3] + s[..., None] * np.array(cor) * img[..., 3:4].clip(0.0, 1.0) * 0 + s[..., None] * np.array(cor))
    img[..., 3] = clamp(img[..., 3] + s)

# ---------------- montagem ----------------
class Tela:
    def __init__(self, n=N):
        self.rgb = np.zeros((n, n, 3), np.float32)
        self.a = np.zeros((n, n), np.float32)

    def por(self, cor, mask, sombra=0.0, raio_sombra=10, dy=8):
        if sombra:
            s = ndimage.gaussian_filter(np.roll(mask, int(dy), axis=0), raio_sombra) * sombra
            self.rgb = self.rgb * (1 - s[..., None])
            self.a = self.a + s * (1 - self.a)
        m = mask[..., None]
        self.rgb = cor * m + self.rgb * (1 - m)
        self.a = mask + self.a * (1 - mask)

    def atras(self, cor, mask):
        """Põe uma camada ATRÁS do que já foi desenhado."""
        a = self.a[..., None]
        novo = self.a + mask * (1 - self.a)
        self.rgb = (self.rgb * a + cor * (mask * (1 - self.a))[..., None]) / (novo[..., None] + 1e-6)
        self.a = novo

    def brilho(self, mask, cor, raio, forca=1.0):
        g = ndimage.gaussian_filter(mask, raio) * forca
        g = clamp(g)
        # brilho por trás: soma cor onde está transparente
        self.rgb = self.rgb * self.a[..., None] + np.array(cor, np.float32) * g[..., None] * (1 - self.a[..., None])
        novo_a = self.a + g * (1 - self.a)
        self.rgb = self.rgb / (novo_a[..., None] + 1e-6) * (novo_a[..., None] > 0)
        self.a = novo_a

    def salvar(self, nome):
        os.makedirs(SAIDA, exist_ok=True)
        rgba = np.dstack([clamp(self.rgb), clamp(self.a)])
        im = Image.fromarray((rgba * 255).astype(np.uint8), 'RGBA')
        im.resize((384, 384), Image.LANCZOS).save(os.path.join(SAIDA, nome + '.png'), optimize=True)
        im.resize((128, 128), Image.LANCZOS).save(os.path.join(SAIDA, nome + '_mini.png'), optimize=True)
        return im

C = N / 2

def escudo(cx=C, topo=150, base=640, larg=430, curva=0.5):
    """Escudo clássico: topo com leve 'ombro', lados retos e ponta embaixo."""
    pts = []
    h = base - topo
    for i in range(60):
        t = i / 59
        y = topo + t * h
        if t < curva:
            hw = larg / 2
        else:
            u = (t - curva) / (1 - curva)
            hw = larg / 2 * (1 - u ** 1.8) ** 0.85
        pts.append((cx + hw, y))
    esq = [(2 * cx - x, y) for x, y in reversed(pts)]
    ombro = [(cx - larg / 2 + 20, topo - 6), (cx - larg * 0.22, topo + 4), (cx, topo - 16), (cx + larg * 0.22, topo + 4), (cx + larg / 2 - 20, topo - 6)]
    return poligono(esq + ombro + pts)

def encolher(mask, px):
    m = mask > 0.5
    d = ndimage.distance_transform_edt(m)
    return clamp((d - px) / 1.5)

def anel(mask, px):
    return clamp(mask - encolher(mask, px))

def camada_metal(mask, mat, tinta=None, quanto=0.0, bevel=18, forca=26, cupula=0.0, det=0.6, esc=1.0, brilho=1.0, aspereza=0.0, clarear=1.0):
    base = textura(mat, esc)
    if tinta is not None:
        base = tingir(base, tinta, quanto)
    base = clamp(base * clarear)
    h = altura(mask, bevel, cupula)
    n = normais(h, forca, normal_tex(mat, esc, forca=1.0), det)
    return metal(base, n, brilho, aspereza)

def rebites(tela, mask_ref, qtd, recuo, mat='Metal055A', raio=11, tinta=None, quanto=0.0):
    m = encolher(mask_ref, recuo) > 0.5
    borda = m & ~ndimage.binary_erosion(m, iterations=2)
    ys, xs = np.nonzero(borda)
    ang = np.arctan2(ys - C, xs - C)
    ordem = np.argsort(ang)
    idx = ordem[np.linspace(0, len(ordem) - 1, qtd, endpoint=False).astype(int)]
    for i in idx:
        mk = elipse(xs[i], ys[i], raio, raio)
        tela.por(camada_metal(mk, mat, tinta, quanto, bevel=raio, forca=10, cupula=1.2, det=0.2), mk, sombra=0.35, raio_sombra=3, dy=3)

# ---------------- patentes ----------------
def p_papelao():
    t = Tela()
    esc = escudo(topo=170, base=630, larg=400)
    # bordas rasgadas
    rasgo = ruido(14, seed=3) * 0.8 + ruido(5, seed=4) * 0.4
    d = ndimage.distance_transform_edt(esc > 0.5)
    esc = clamp((d - rasgo * 9) / 1.5)
    base = textura('Cardboard001', 1.1)
    base = clamp(tingir(base, (0.78, 0.56, 0.33), 0.35) * 1.05)
    h = altura(esc, 10)
    n = normais(h, 14, normal_tex('Cardboard001', 1.1), 1.0)
    t.por(difuso(base, n, 0.08), esc, sombra=0.5, raio_sombra=12, dy=12)
    # papelão de dentro (mais claro) + estrela desenhada "à mão"
    dentro = encolher(esc, 46)
    base2 = clamp(tingir(textura('Cardboard004', 0.9), (0.85, 0.66, 0.42), 0.3) * 1.08)
    h2 = altura(dentro, 6)
    t.por(difuso(base2, normais(h2, -10, normal_tex('Cardboard004', 0.9), 0.8), 0.05), dentro, sombra=0.25, raio_sombra=4, dy=4)
    est = icone('delapouite__round-star', 270, C, 395)
    contorno = clamp(ndimage.binary_dilation(est > 0.5, iterations=6).astype(np.float32) - (est > 0.5))
    contorno = ndimage.gaussian_filter(contorno, 1.0)
    t.rgb = t.rgb * (1 - contorno[..., None] * 0.85) + np.array([0.12, 0.09, 0.08]) * contorno[..., None] * 0.85
    pinta = ndimage.gaussian_filter((est > 0.5).astype(np.float32), 1.2) * (0.55 + 0.45 * ruido(6, seed=9))
    t.rgb = t.rgb * (1 - pinta[..., None] * 0.55) + np.array([0.95, 0.72, 0.2]) * pinta[..., None] * 0.55
    # fita adesiva torta no canto
    fita = poligono([(130, 205), (300, 120), (330, 175), (160, 262)])
    fb = clamp(tingir(textura('Paper005', 0.6), (0.98, 0.93, 0.78), 0.6) * 1.15)
    hf = altura(fita, 3)
    cf = difuso(fb, normais(hf, 6), 0.35, 0.6)
    t.rgb = t.rgb * (1 - fita[..., None] * 0.72) + cf * fita[..., None] * 0.72
    # grampo
    gr = poligono([(520, 520), (556, 492), (562, 500), (526, 528)])
    t.por(camada_metal(gr, 'Metal049A', bevel=3, forca=8), gr, sombra=0.4, raio_sombra=2, dy=2)
    return t

def p_ferrugem():
    t = Tela()
    esc = escudo(topo=150, base=640, larg=430)
    t.por(camada_metal(esc, 'rust_coarse_01', bevel=22, forca=24, det=0.0, brilho=0.35, aspereza=2.5, clarear=1.15), esc, sombra=0.55, raio_sombra=12, dy=12)
    dentro = encolher(esc, 52)
    t.por(camada_metal(dentro, 'rusty_metal_04', bevel=10, forca=-14, det=0.0, brilho=0.3, aspereza=2, clarear=1.2), dentro, sombra=0.3, raio_sombra=5, dy=5)
    # placa amassada com a engrenagem/espadas gastas
    esp = icone('lorc__crossed-swords', 300, C, 395)
    t.por(camada_metal(esp, 'Metal053C', bevel=8, forca=18, det=0.5, brilho=0.5, clarear=0.95), esp, sombra=0.5, raio_sombra=5, dy=6)
    rebites(t, esc, 12, 24, mat='Metal053C', raio=12)
    return t

def p_ferro():
    t = Tela()
    esc = escudo(topo=140, base=650, larg=450)
    t.por(camada_metal(esc, 'Metal063', bevel=24, forca=30, det=0.5, clarear=1.25), esc, sombra=0.55, raio_sombra=12, dy=12)
    dentro = encolher(esc, 40)
    t.por(camada_metal(dentro, 'Metal055A', tinta=(0.62, 0.66, 0.72), quanto=0.4, bevel=12, forca=-18, det=0.4, clarear=0.9), dentro, sombra=0.35, raio_sombra=5, dy=5)
    esp = icone('lorc__crossed-swords', 330, C, 390)
    t.por(camada_metal(esp, 'Metal041A', tinta=(0.75, 0.78, 0.85), quanto=0.3, bevel=9, forca=26, det=0.2), esp, sombra=0.55, raio_sombra=6, dy=7)
    rebites(t, esc, 14, 20, mat='Metal055A', raio=11)
    return t

def louros(cor_mat, tinta, quanto, cy=430, tam=600, clarear=1.0):
    l = icone('lorc__laurels', tam, C, cy)
    return l, camada_metal(l, cor_mat, tinta, quanto, bevel=6, forca=20, det=0.3, clarear=clarear)

def p_bronze():
    t = Tela()
    lm, lc = louros('Metal015', (0.85, 0.55, 0.28), 0.7, cy=420, tam=640, clarear=1.3)
    t.por(lc, lm, sombra=0.45, raio_sombra=8, dy=8)
    esc = escudo(topo=170, base=630, larg=380)
    t.por(camada_metal(esc, 'Metal017', (0.86, 0.55, 0.3), 0.75, bevel=22, forca=28, det=0.5, clarear=1.35), esc, sombra=0.5, raio_sombra=10, dy=10)
    dentro = encolher(esc, 36)
    t.por(camada_metal(dentro, 'Metal047A', (0.6, 0.33, 0.18), 0.6, bevel=10, forca=-18, det=0.3, clarear=0.75), dentro, sombra=0.3, raio_sombra=5, dy=5)
    est = icone('delapouite__round-star', 250, C, 385)
    t.por(camada_metal(est, 'Metal047A', (0.95, 0.66, 0.38), 0.6, bevel=10, forca=26, cupula=0.6, det=0.1, clarear=1.25), est, sombra=0.5, raio_sombra=5, dy=6)
    return t

def asas(mat, tinta, quanto, cy=360, tam=700, nome='lorc__angel-wings', clarear=1.0, forca=22, par=0):
    if par:
        # uma asa de cada lado (a da esquerda espelhada)
        w = np.maximum(icone(nome, tam, C + par, cy), icone(nome, tam, C - par, cy, espelhar=True))
    else:
        w = icone(nome, tam, C, cy)
    return w, camada_metal(w, mat, tinta, quanto, bevel=7, forca=forca, det=0.25, clarear=clarear)

def raios(t, cy, cor1, cor2, n_raios=18, r0=120, r1=380, forca=0.9, gira=0.0):
    """Explosão de raios de luz atrás do emblema."""
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    dx, dy = xx - C, yy - cy
    r = np.sqrt(dx ** 2 + dy ** 2); a = np.arctan2(dy, dx) + gira
    feixe = clamp(np.cos(a * n_raios) * 1.4 - 0.25) * (0.7 + 0.3 * np.cos(a * n_raios * 0.5 + 1))
    queda = (1 - 0.85 * smooth(r0, r1, r)) * smooth(r1 + 10, r1 - 60, r)
    m = clamp(feixe * queda * forca + smooth(r1 * 0.75, 0, r) * 0.55)
    m = ndimage.gaussian_filter(m, 2)
    cor = np.array(cor1, np.float32) * (1 - smooth(r0, r1, r))[..., None] + np.array(cor2, np.float32) * smooth(r0, r1, r)[..., None]
    t.atras(cor, m)

def p_prata():
    t = Tela()
    wm, wc = asas('Metal049A', (0.82, 0.86, 0.92), 0.35, cy=345, tam=700, clarear=0.95)
    t.por(wc, wm, sombra=0.4, raio_sombra=8, dy=8)
    esc = escudo(topo=170, base=640, larg=370)
    t.por(camada_metal(esc, 'Metal049A', (0.8, 0.84, 0.9), 0.4, bevel=22, forca=30, det=0.4, clarear=0.92), esc, sombra=0.5, raio_sombra=10, dy=10)
    dentro = encolher(esc, 34)
    t.por(camada_metal(dentro, 'Metal061B', (0.32, 0.45, 0.75), 0.75, bevel=10, forca=-16, det=0.3, clarear=0.9), dentro, sombra=0.3, raio_sombra=5, dy=5)
    est = icone('delapouite__round-star', 240, C, 390)
    t.por(camada_metal(est, 'Metal049A', (0.9, 0.93, 0.98), 0.2, bevel=10, forca=26, cupula=0.6, det=0.1), est, sombra=0.5, raio_sombra=5, dy=6)
    return t

def p_ouro():
    t = Tela()
    t.brilho(escudo(topo=150, base=650, larg=420), (1.0, 0.8, 0.3), 30, 0.9)
    wm, wc = asas('Metal048A', (1.0, 0.6, 0.16), 0.9, cy=330, tam=380, nome='delapouite__liberty-wing', par=175, clarear=1.0)
    t.por(wc, wm, sombra=0.4, raio_sombra=8, dy=8)
    esc = escudo(topo=170, base=640, larg=380)
    t.por(camada_metal(esc, 'Metal048C', (1.0, 0.58, 0.15), 0.9, bevel=22, forca=30, det=0.35), esc, sombra=0.5, raio_sombra=10, dy=10)
    dentro = encolher(esc, 34)
    t.por(camada_metal(dentro, 'velour_velvet', None, 0, bevel=10, forca=-10, det=0.0, brilho=0.25, aspereza=2, clarear=0.85), dentro, sombra=0.35, raio_sombra=6, dy=6)
    cor, mk = gema(C, 395, 92, 104, (0.95, 0.12, 0.22), lados=10)
    aro = clamp(elipse(C, 395, 112, 124) - 0)
    t.por(camada_metal(aro, 'Metal048A', (1.0, 0.6, 0.16), 0.9, bevel=12, forca=28, det=0.1), aro, sombra=0.5, raio_sombra=6, dy=6)
    t.por(cor, mk)
    coroa = icone('lorc__queen-crown', 200, C, 148)
    t.por(camada_metal(coroa, 'Metal048A', (1.0, 0.6, 0.16), 0.9, bevel=8, forca=26, det=0.1), coroa, sombra=0.5, raio_sombra=5, dy=6)
    return t

def hexagono(cx, cy, r, achatar=1.0):
    return poligono([(cx + r * math.cos(math.radians(a)), cy + r * achatar * math.sin(math.radians(a))) for a in range(-90, 270, 60)])

def p_platina():
    t = Tela()
    t.brilho(hexagono(C, 400, 250), (0.55, 0.95, 1.0), 34, 0.9)
    lm, lc = louros('Metal050A', (0.82, 0.95, 1.0), 0.35, cy=440, tam=660, clarear=0.95)
    t.por(lc, lm, sombra=0.4, raio_sombra=8, dy=8)
    wm, wc = asas('Metal050A', (0.8, 0.95, 1.0), 0.35, cy=300, tam=360, nome='delapouite__spiky-wing', par=185, clarear=0.95)
    t.por(wc, wm, sombra=0.35, raio_sombra=8, dy=8)
    hx = hexagono(C, 400, 230)
    t.por(camada_metal(hx, 'Metal050A', (0.86, 0.96, 1.0), 0.3, bevel=24, forca=32, det=0.35, clarear=0.95), hx, sombra=0.5, raio_sombra=10, dy=10)
    dentro = encolher(hx, 36)
    t.por(camada_metal(dentro, 'Metal061B', (0.25, 0.62, 0.72), 0.85, bevel=10, forca=-16, det=0.2, clarear=0.8), dentro, sombra=0.3, raio_sombra=5, dy=5)
    cor, mk = gema(C, 400, 110, 110, (0.3, 0.95, 1.0), lados=12)
    aro = elipse(C, 400, 130, 130)
    t.por(camada_metal(aro, 'Metal050A', (0.9, 0.98, 1), 0.25, bevel=12, forca=30, det=0.1), aro, sombra=0.5, raio_sombra=6, dy=6)
    t.por(cor, mk)
    for (x, y, s) in [(C, 175, 30), (C - 180, 285, 18), (C + 180, 285, 18), (C - 180, 520, 18), (C + 180, 520, 18), (C, 628, 26)]:
        c2, m2 = gema(x, y, s, s, (0.4, 0.95, 1.0), lados=8)
        t.por(c2, m2, sombra=0.3, raio_sombra=3, dy=3)
    return t

def p_diamante():
    t = Tela()
    # diamante grande lapidado (losango) com moldura de prata e asas
    t.brilho(elipse(C, 390, 250, 270), (0.6, 0.85, 1.0), 40, 1.0)
    wm, wc = asas('Metal049A', (0.85, 0.92, 1.0), 0.3, cy=310, tam=400, nome='delapouite__liberty-wing', par=190, clarear=0.95)
    t.por(wc, wm, sombra=0.4, raio_sombra=8, dy=8)
    los = poligono([(C, 115), (C + 225, 330), (C, 670), (C - 225, 330)])
    t.por(camada_metal(los, 'Metal049A', (0.88, 0.94, 1.0), 0.25, bevel=18, forca=30, det=0.3, clarear=0.95), los, sombra=0.55, raio_sombra=12, dy=12)
    inner = encolher(los, 26)
    # facetas do diamante (triângulos), cada uma com uma cor/brilho
    topo, dir_, base_, esq = (C, 140), (C + 195, 330), (C, 640), (C - 195, 330)
    meio = (C, 345)
    mesa = [(C - 70, 300), (C + 70, 300), (C + 95, 345), (C, 430), (C - 95, 345)]
    tris = [[topo, dir_, (C + 70, 300)], [topo, (C + 70, 300), (C - 70, 300)], [topo, (C - 70, 300), esq], [esq, (C - 70, 300), (C - 95, 345)],
            [dir_, (C + 70, 300), (C + 95, 345)], [esq, (C - 95, 345), base_], [dir_, (C + 95, 345), base_], [(C - 95, 345), (C, 430), base_], [(C + 95, 345), (C, 430), base_]]
    cores = [(0.75, 0.95, 1.0), (0.95, 1.0, 1.0), (0.55, 0.8, 1.0), (0.85, 0.75, 1.0), (0.65, 1.0, 0.95), (0.45, 0.65, 1.0), (0.6, 0.9, 1.0), (0.98, 0.85, 1.0), (0.5, 0.75, 1.0)]
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    for i, (tri, c) in enumerate(zip(tris, cores)):
        m = poligono(tri) * inner
        grad = clamp(1.15 - (yy - 140) / 700 + 0.15 * np.sin(xx / 37 + i))
        cor = np.array(c, np.float32) * grad[..., None]
        t.rgb = t.rgb * (1 - m[..., None]) + cor * m[..., None]
    mm = poligono(mesa) * inner
    t.rgb = t.rgb * (1 - mm[..., None]) + (np.array([0.92, 0.98, 1.0]) * clamp(1.2 - (yy - 300) / 260)[..., None]) * mm[..., None]
    # linhas das facetas
    linhas = np.zeros((N, N), np.float32)
    im = Image.new('L', (N, N)); dr = ImageDraw.Draw(im)
    for tri in tris:
        dr.polygon(tri, outline=255)
    linhas = ndimage.gaussian_filter(np.asarray(im, np.float32) / 255, 0.8) * inner
    t.rgb = clamp(t.rgb + linhas[..., None] * 0.6)
    for (x, y, s) in [(C - 60, 250, 9), (C + 120, 380, 6), (C - 20, 500, 5), (C + 40, 210, 4)]:
        brilhinho_rgb(t, x, y, s)
    raios(t, 380, (0.85, 0.97, 1.0), (0.35, 0.6, 1.0), n_raios=12, r0=60, r1=380, forca=0.7)
    return t

def brilhinho_rgb(t, cx, cy, s):
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    dx, dy = np.abs(xx - cx), np.abs(yy - cy)
    estrela = np.exp(-dx / (s * 0.35)) * np.exp(-dy / (s * 6)) + np.exp(-dy / (s * 0.35)) * np.exp(-dx / (s * 6)) + np.exp(-(dx ** 2 + dy ** 2) / (s * s * 2))
    estrela = clamp(estrela)
    t.rgb = clamp(t.rgb * (1 - estrela[..., None]) + estrela[..., None] * np.array([1, 1, 1]))
    t.a = clamp(t.a + estrela * (1 - t.a))

def p_mestre(pro=False):
    t = Tela()
    if pro:
        # aura de fogo atrás
        pass
    else:
        pass
    wm, wc = asas('Metal048A', (1.0, 0.6, 0.16), 0.9, cy=320, tam=430, nome='delapouite__liberty-wing', par=190)
    t.por(wc, wm, sombra=0.45, raio_sombra=8, dy=8)
    lm, lc = louros('Metal048A', (1.0, 0.6, 0.16), 0.9, cy=470, tam=640)
    t.por(lc, lm * (np.arange(N)[:, None] > 430).astype(np.float32), sombra=0.4, raio_sombra=8, dy=8)
    esc = escudo(topo=185, base=650, larg=380)
    t.por(camada_metal(esc, 'Metal048A', (1.0, 0.6, 0.16), 0.9, bevel=20, forca=32, det=0.2), esc, sombra=0.55, raio_sombra=12, dy=12)
    dentro = encolher(esc, 28)
    obs = 'Metal046A'
    t.por(camada_metal(dentro, obs, (0.25, 0.12, 0.38) if not pro else (0.35, 0.05, 0.12), 0.85, bevel=14, forca=-20, det=0.4, clarear=0.9), dentro, sombra=0.35, raio_sombra=6, dy=6)
    # filigrana dourada (anel interno)
    fil = anel(encolher(esc, 44), 6)
    t.por(camada_metal(fil, 'Metal048A', (1.0, 0.62, 0.18), 0.9, bevel=3, forca=14, det=0.0), fil, sombra=0.4, raio_sombra=3, dy=3)
    cor_g = (0.68, 0.25, 1.0) if not pro else (1.0, 0.3, 0.55)
    aro = elipse(C, 405, 118, 132)
    t.por(camada_metal(aro, 'Metal048A', (1.0, 0.6, 0.16), 0.9, bevel=12, forca=30, det=0.1), aro, sombra=0.5, raio_sombra=6, dy=6)
    cor, mk = gema(C, 405, 98, 112, cor_g, lados=12, arco_iris=pro)
    t.por(cor, mk)
    nome_coroa = 'delapouite__imperial-crown' if not pro else 'delapouite__jewel-crown'
    coroa = icone(nome_coroa, 250 if pro else 220, C, 155 if pro else 165)
    t.por(camada_metal(coroa, 'Metal048A', (1.0, 0.6, 0.16), 0.9, bevel=9, forca=28, det=0.1), coroa, sombra=0.55, raio_sombra=6, dy=7)
    if pro:
        # faixa de veludo vermelho com bordas douradas embaixo
        fx = poligono([(C - 250, 600), (C + 250, 600), (C + 225, 650), (C + 260, 700), (C - 260, 700), (C - 225, 650)])
        t.por(camada_metal(fx, 'velour_velvet', None, 0, bevel=10, forca=16, det=0.0, brilho=0.3, aspereza=2, clarear=0.95), fx, sombra=0.5, raio_sombra=8, dy=8)
        borda = anel(fx, 7)
        t.por(camada_metal(borda, 'Metal048A', (1.0, 0.6, 0.16), 0.9, bevel=3, forca=14, det=0.0), borda)
        for (x, y) in [(C - 150, 650), (C, 652), (C + 150, 650)]:
            c2, m2 = gema(x, y, 18, 18, (1.0, 0.85, 0.3), lados=8)
            t.por(c2, m2, sombra=0.3, raio_sombra=2, dy=2)
        for (x, y, s) in [(C - 140, 150, 8), (C + 160, 230, 6), (C + 40, 330, 7), (C - 210, 420, 5)]:
            brilhinho_rgb(t, x, y, s)
    else:
        for (x, y, s) in [(C - 120, 200, 7), (C + 150, 260, 5), (C + 30, 340, 6)]:
            brilhinho_rgb(t, x, y, s)
    if pro:
        raios(t, 390, (1.0, 0.95, 0.7), (0.75, 0.3, 1.0), n_raios=16, r0=40, r1=300, forca=0.7, gira=math.pi / 16)
        raios(t, 390, (1.0, 0.8, 0.4), (1.0, 0.2, 0.55), n_raios=16, r0=40, r1=384, forca=1.0)
    else:
        raios(t, 390, (0.9, 0.7, 1.0), (0.5, 0.25, 0.95), n_raios=12, r0=60, r1=370, forca=0.7)
    return t

PATENTES = {
    'papelao': p_papelao, 'ferrugem': p_ferrugem, 'ferro': p_ferro, 'bronze': p_bronze, 'prata': p_prata,
    'ouro': p_ouro, 'platina': p_platina, 'diamante': p_diamante, 'mestre': lambda: p_mestre(False), 'mestre_pro': lambda: p_mestre(True),
}

if __name__ == '__main__':
    quais = sys.argv[1:] or list(PATENTES)
    for k in quais:
        PATENTES[k]().salvar(k)
        print('ok', k)
