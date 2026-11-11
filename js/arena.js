// Monta a arena a partir das imagens em assets/arena.
// Coordenadas num espaço de 360 x 620 (convertidas para %).
const Arena = (() => {
  const W = 360, H = 620;

  // [imagem, centro x, centro y, largura, altura]
  const camadas = [
    ['arena/rio', 180, 310, 320, 56],
    ['arena/ponte', 90, 310, 60, 92],
    ['arena/ponte', 270, 310, 60, 92],
  ];

  // Trilha de pedras por onde as tropas andam
  const trilha = [];
  for (const x of [90, 270]) {
    for (const y of [186, 210, 234, 258, 362, 386, 410]) {
      trilha.push(['arena/pedra', x, y, 22, 16]);
    }
  }

  // Objetos com profundidade (desenhados de cima para baixo)
  const objetos = [
    ['arena/barraca', 46, 56, 56, 40],
    ['arena/barraca', 314, 56, 56, 40],
    ['arena/torre_rei_vermelha', 180, 64, 88, 119, 'rei-vermelho'],
    ['arena/torre_vermelha', 90, 112, 62, 102, 'esq-vermelho'],
    ['arena/torre_vermelha', 270, 112, 62, 102, 'dir-vermelho'],
    ['arena/arvore', 38, 182, 56, 60],
    ['arena/arvore', 322, 182, 56, 60],
    ['arena/arvore', 180, 205, 56, 60],
    ['arena/varal_lanternas', 180, 252, 130, 46],
    ['arena/varal_lanternas', 180, 372, 130, 46],
    ['arena/arvore', 180, 412, 56, 60],
    ['arena/arvore', 38, 436, 56, 60],
    ['arena/arvore', 322, 436, 56, 60],
    ['arena/torre_azul', 90, 468, 62, 102, 'esq-azul'],
    ['arena/torre_azul', 270, 468, 62, 102, 'dir-azul'],
    ['arena/torre_rei_azul', 180, 540, 88, 119, 'rei-azul'],
    ['arena/barraca', 46, 574, 56, 40],
    ['arena/barraca', 314, 574, 56, 40],
  ];

  function peca([nome, x, y, w, h, id]) {
    const img = document.createElement('img');
    if (id) img.dataset.torre = id;
    img.className = 'arena-peca';
    img.alt = '';
    img.draggable = false;
    img.dataset.asset = nome;
    img.style.left = `${((x - w / 2) / W) * 100}%`;
    img.style.top = `${((y - h / 2) / H) * 100}%`;
    img.style.width = `${(w / W) * 100}%`;
    img.style.height = `${(h / H) * 100}%`;
    return img;
  }

  function render(el, { petalas = true } = {}) {
    el.innerHTML = '';
    el.classList.add('arena');

    const cerca = peca(['arena/cerca', 180, 310, 360, 620]);
    el.appendChild(cerca);

    const campo = document.createElement('div');
    campo.className = 'arena-campo';
    Assets.url('arena/chao').then((u) => (campo.style.backgroundImage = `url(${u})`));
    el.appendChild(campo);

    [...trilha, ...camadas, ...objetos].forEach((p) => el.appendChild(peca(p)));

    if (petalas) {
      for (let i = 0; i < 8; i++) {
        const p = document.createElement('span');
        p.className = 'petala';
        p.style.left = `${5 + Math.random() * 90}%`;
        p.style.animationDuration = `${8 + Math.random() * 6}s`;
        p.style.animationDelay = `${-Math.random() * 12}s`;
        el.appendChild(p);
      }
    }
    Assets.fill(el);
  }

  return { render };
})();
