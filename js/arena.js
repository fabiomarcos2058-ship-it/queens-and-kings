// Arenas: cada uma é uma imagem pronta (feita com texturas reais pelo tools/gerar_arenas.py).
// Só as torres ficam por cima, porque elas levam dano e caem.
// Coordenadas num espaço de 360 x 620 (convertidas para %).
const Arena = (() => {
  const W = 360, H = 620;

  // Troféus para chegar em cada arena. Ninguém volta para a arena anterior (os troféus não caem abaixo do portão).
  const ARENAS = [
    { n: 1, id: 'festival', nome: 'Festival da Escola', trofeus: 0, ambiente: 'confete', cor: '#5DCAA5', desc: 'Barracas, lanternas e o rio da escola em dia de festa.' },
    { n: 2, id: 'sakura', nome: 'Bosque das Cerejeiras', trofeus: 400, ambiente: 'petala', cor: '#F4A6C6', desc: 'Pétalas caindo, pontes vermelhas e carpas no rio.' },
    { n: 3, id: 'gelo', nome: 'Vila Congelada', trofeus: 1000, ambiente: 'neve', cor: '#9ED4F5', desc: 'Neve fofa, pinheiros e um rio completamente congelado.' },
    { n: 4, id: 'vulcao', nome: 'Templo Vulcânico', trofeus: 1800, ambiente: 'brasa', cor: '#F07A2A', desc: 'Um templo antigo cortado por um rio de lava.' },
    { n: 5, id: 'torneio', nome: 'Grande Torneio', trofeus: 2400, ambiente: 'confete', cor: '#E8C46A', desc: 'O ringue de pedra do torneio de artes marciais, com a plateia em volta.' },
    { n: 6, id: 'canion', nome: 'Cânion dos Guerreiros', trofeus: 3000, ambiente: 'poeira', cor: '#D98A4A', desc: 'Um deserto de rochas marcado pelas crateras de lutas antigas.' },
    { n: 7, id: 'ilha', nome: 'Ilha do Velho Mestre', trofeus: 3600, ambiente: 'brisa', cor: '#4FD0C8', desc: 'Uma ilhota de areia e palmeiras no meio do mar, perfeita pra treinar.' },
  ];
  const daQtd = (trofeus) => [...ARENAS].reverse().find((a) => (trofeus || 0) >= a.trofeus) || ARENAS[0];
  // arenas só de evento (não entram no caminho de troféus)
  const ESPECIAIS = [
    { id: 'celestial', nome: 'Santuário Celestial', ambiente: 'estrela', cor: '#B89BFF', desc: 'Um templo de mármore flutuando acima das nuvens, cortado por um abismo de estrelas.' },
  ];
  const porId = (id) => ARENAS.find((a) => a.id === id) || ESPECIAIS.find((a) => a.id === id) || ARENAS[0];

  const torres = [
    ['arena/torre_rei_vermelha', 180, 64, 88, 119, 'rei-vermelho'],
    ['arena/torre_vermelha', 90, 112, 62, 102, 'esq-vermelho'],
    ['arena/torre_vermelha', 270, 112, 62, 102, 'dir-vermelho'],
    ['arena/torre_azul', 90, 468, 62, 102, 'esq-azul'],
    ['arena/torre_azul', 270, 468, 62, 102, 'dir-azul'],
    ['arena/torre_rei_azul', 180, 540, 88, 119, 'rei-azul'],
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

  // el: onde desenhar; arena: id ou objeto; mini: usa a imagem pequena; ambiente: partículas do tema
  function render(el, { arena = null, mini = false, ambiente = true } = {}) {
    const a = typeof arena === 'string' ? porId(arena) : arena || ARENAS[0];
    el.innerHTML = '';
    el.classList.add('arena');
    el.dataset.arena = a.id;
    const fundo = document.createElement('div');
    fundo.className = 'arena-fundo';
    fundo.style.backgroundImage = `url(assets/arenas/${a.id}${mini ? '_mini' : ''}.jpg?v=${window.VERSAO_JOGO || 1})`;
    el.appendChild(fundo);
    torres.forEach((p) => el.appendChild(peca(p)));
    if (ambiente) {
      const camada = document.createElement('div');
      camada.className = `ambiente amb-${a.ambiente}`;
      for (let i = 0; i < (mini ? 5 : 9); i++) {
        const p = document.createElement('i');
        p.style.left = `${4 + Math.random() * 92}%`;
        p.style.animationDuration = `${7 + Math.random() * 7}s`;
        p.style.animationDelay = `${-Math.random() * 14}s`;
        p.style.setProperty('--d', `${(Math.random() * 60 - 30).toFixed(0)}px`);
        camada.appendChild(p);
      }
      el.appendChild(camada);
    }
    Assets.fill(el);
    return a;
  }

  return { render, ARENAS, daQtd, porId };
})();
