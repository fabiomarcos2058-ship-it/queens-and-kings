"""Bot de imagens do Queens and Kings.

Baixa pacotes CC0 (só de sites permitidos em fontes.json), tira "fotos" dos
modelos 3D com o Blender e salva PNGs com os nomes que o jogo usa.

Uso:
  python bot/baixar.py            baixa e gera as imagens
  python bot/baixar.py --listar   só lista os modelos de cada pacote em bot/catalogo.txt
"""
import json, re, sys, zipfile, shutil, subprocess, tempfile, urllib.request, http.cookiejar
from pathlib import Path
from urllib.parse import urljoin, urlparse
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
CFG = json.loads((RAIZ / 'bot' / 'fontes.json').read_text(encoding='utf-8'))
CACHE = RAIZ / 'bot' / '.cache'
FORMATOS = ('.glb', '.gltf', '.obj')
ESCALA = 4  # PNG com 4x o tamanho usado na arena, para ficar nítido
CORES_TIME = {'azul': (55, 138, 221), 'vermelho': (226, 75, 74)}
UA = {'User-Agent': 'Mozilla/5.0 (queens-and-kings asset bot)'}


def permitido(url):
    host = urlparse(url).hostname or ''
    return any(host == s or host.endswith('.' + s) for s in CFG['sites_permitidos'])


NAVEGADOR = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def abrir(url, referer=None):
    cab = dict(UA, **({'Referer': referer} if referer else {}))
    return NAVEGADOR.open(urllib.request.Request(url, headers=cab), timeout=180)


def link_assinado(pagina, html):
    # A Kenney gera um link novo a cada download (botão "Continue without donating")
    ids = re.findall(r"data-download-id=['\"]([0-9a-fA-F]+)['\"]", html)
    if not ids:
        return None
    r = abrir(urljoin(pagina, '/download-link/' + ids[0]), referer=pagina)
    if 'zip' in (r.headers.get('Content-Type') or '') or r.geturl().lower().endswith('.zip'):
        return r  # já é o arquivo
    texto = r.read().decode('utf-8', 'ignore').replace('\\/', '/')
    urls = re.findall(r'https?://[^"\'\s<>]+', texto)
    zips = [u for u in urls if '.zip' in u.lower()] or urls
    print('  resposta do link:', texto[:150].replace('\n', ' '))
    return zips[0] if zips else None


def pasta_do_pacote(nome):
    info = CFG['pacotes'][nome]
    if info.get('licenca') != 'CC0' or not permitido(info['pagina']):
        raise RuntimeError(f'{nome}: pacote recusado (precisa ser CC0 e de site permitido)')
    destino = CACHE / nome
    if destino.exists():
        return destino
    html = abrir(info['pagina']).read().decode('utf-8', 'ignore')
    assinado = link_assinado(info['pagina'], html)
    achados = re.findall(r'''["'(=]([^"'()\s<>]+?\.zip)''', html)
    zips = [z for z in dict.fromkeys(urljoin(info['pagina'], h.replace('\\/', '/')) for h in achados) if permitido(z)]
    if assinado is not None:
        zips = [assinado]
    if not zips:
        pistas = [l.strip()[:200] for l in html.splitlines() if 'download' in l.lower()][:15]
        print('  pistas na página:', *pistas, sep='\n    ')
        raise RuntimeError(f'{nome}: não achei o link de download na página')
    destino.mkdir(parents=True)
    arq = destino / 'pacote.zip'
    fonte = zips[0] if isinstance(zips[0], str) else None
    print(f'  baixando {fonte or "(link direto)"}')
    with (abrir(fonte, referer=info['pagina']) if fonte else zips[0]) as r, open(arq, 'wb') as f:
        shutil.copyfileobj(r, f)
    with zipfile.ZipFile(arq) as z:
        z.extractall(destino)
    arq.unlink()
    return destino


def modelos(pasta):
    todos = [p for p in pasta.rglob('*') if p.suffix.lower() in FORMATOS]
    # um arquivo por nome, preferindo .glb
    por_nome = {}
    for p in sorted(todos, key=lambda p: FORMATOS.index(p.suffix.lower())):
        por_nome.setdefault(p.stem.lower(), p)
    return por_nome


def escolher(por_nome, termos):
    for termo in termos:
        achados = [n for n in por_nome if termo.lower() in n]
        if achados:
            return por_nome[min(achados, key=lambda n: (len(n), n))]
    return None


def renderizar(modelo, saida, girar=0):
    subprocess.run(
        ['blender', '-b', '--factory-startup', '-P', str(RAIZ / 'bot' / 'render_blender.py'),
         '--', str(modelo), str(saida), '768', str(girar)],
        check=True, stdout=subprocess.DEVNULL)


def montar(foto, destino, tamanho, time=None):
    w, h = tamanho[0] * ESCALA, tamanho[1] * ESCALA
    img = Image.open(foto).convert('RGBA')
    img = img.crop(img.getchannel('A').getbbox())
    img.thumbnail((w, int(h * (0.86 if time else 1))), Image.LANCZOS)
    tela = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    if time:  # base colorida do time embaixo da torre
        d = ImageDraw.Draw(tela)
        cor = CORES_TIME[time]
        d.ellipse([w * 0.08, h * 0.84, w * 0.92, h * 0.99], fill=cor + (230,), outline=(20, 20, 40, 255), width=ESCALA)
    tela.alpha_composite(img, ((w - img.width) // 2, h - img.height - (int(h * 0.06) if time else 0)))
    destino.parent.mkdir(parents=True, exist_ok=True)
    tela.save(destino)


def listar():
    linhas = []
    for nome in CFG['pacotes']:
        try:
            nomes = sorted(modelos(pasta_do_pacote(nome)))
        except Exception as e:
            linhas += [f'## {nome}: erro ({e})', '']
            continue
        linhas += [f'## {nome} ({len(nomes)} modelos)', *nomes, '']
    (RAIZ / 'bot' / 'catalogo.txt').write_text('\n'.join(linhas), encoding='utf-8')
    print('Catálogo salvo em bot/catalogo.txt')


def gerar():
    creditos, falhas = [], []
    tmp = Path(tempfile.mkdtemp())
    for alvo, cfg in CFG['imagens'].items():
        print(f'- {alvo}')
        try:
            pacote = cfg['pacote']
            por_nome = modelos(pasta_do_pacote(pacote))
            if 'pecas' in cfg:  # modelo montado com várias peças empilhadas
                faltando = [n for n in cfg['pecas'] if n.lower() not in por_nome]
                if faltando:
                    raise RuntimeError(f'peças não encontradas: {faltando}')
                partes = [por_nome[n.lower()] for n in cfg['pecas']]
                modelo = Path('|'.join(str(p) for p in partes))
                nome_modelo = ' + '.join(p.name for p in partes)
            else:
                modelo = escolher(por_nome, cfg['procurar'])
                if not modelo:
                    raise RuntimeError('nenhum modelo com esses nomes')
                nome_modelo = modelo.name
            foto = tmp / (alvo.replace('/', '_') + '.png')
            renderizar(modelo, foto, cfg.get('girar', 0))
            montar(foto, RAIZ / 'assets' / f'{alvo}.png', cfg['tamanho'], cfg.get('time'))
            info = CFG['pacotes'][pacote]
            creditos.append(f'| `assets/{alvo}.png` | {nome_modelo} | {pacote} | {info["autor"]} | {info["licenca"]} |')
            print(f'  ok: {nome_modelo}')
        except Exception as e:  # uma imagem com problema não para o resto
            falhas.append(f'{alvo}: {e}')
            print(f'  pulei: {e}')

    texto = ['# Créditos', '',
             'Os desenhos em `assets/**/*.svg` foram criados do zero para este jogo.', '',
             'Imagens geradas pelo bot a partir de modelos 3D com licença CC0:', '',
             '| Imagem | Modelo | Pacote | Autor | Licença |', '| --- | --- | --- | --- | --- |', *creditos, '']
    (RAIZ / 'CREDITOS.md').write_text('\n'.join(texto), encoding='utf-8')
    print(f'\n{len(creditos)} imagens geradas, {len(falhas)} puladas')
    for f in falhas:
        print('  ', f)
    listar()


if __name__ == '__main__':
    listar() if '--listar' in sys.argv else gerar()
