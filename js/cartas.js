// Cartas das personagens: lê assets/cartas/cartas.json e mostra no menu e na arena.
const Cartas = (() => {
  const NOMES_RARIDADE = { comum: 'Comum', rara: 'Rara', epica: 'Épica', lendaria: 'Lendária' };

  // Carta com legenda embaixo (deck e coleção) ou só a carta (mini: mão e loja)
  function html(c, { mini = false } = {}) {
    const carta = `<div class="carta ${c.raridade}${mini ? ' mini' : ''}">
      <img src="assets/cartas/${c.id}.jpg" alt="${c.nome}" draggable="false" />
      <span class="custo">${c.custo}</span>
      ${mini ? '' : `<span class="nome-3d">${c.nome}</span>`}
    </div>`;
    return mini ? carta : `<div class="slot-carta">${carta}<div class="carta-nivel">Nível 9</div></div>`;
  }

  const vazia = (r, custo, mini = false) => {
    const carta = `<div class="carta-vazia ${r}${mini ? ' mini' : ''}"><span class="custo">${custo}</span><span class="q">?</span></div>`;
    return mini ? carta : `<div class="slot-carta">${carta}<div class="carta-legenda bloqueada">Bloqueada</div><div class="carta-nivel">&nbsp;</div></div>`;
  };
  const slotVazio = '<div class="slot-carta"><div class="slot-deck">+</div><div class="carta-nivel">&nbsp;</div></div>';

  function tropa(arena, c, { time, x, y, vida = 1, nivel = 9 }) {
    const el = document.createElement('div');
    el.className = `tropa ${time}`;
    el.style.left = `${(x / 360) * 100}%`;
    el.style.top = `${(y / 620) * 100}%`;
    el.innerHTML = `
      <div class="tropa-vida"><span style="width:${vida * 100}%"></span></div>
      <div class="tropa-medalhao"><img src="assets/cartas/${c.id}_medalhao.png" alt="" /><b>${nivel}</b></div>
      <div class="tropa-sombra"></div>`;
    arena.appendChild(el);
  }

  async function iniciar() {
    let lista = [];
    try {
      lista = (await (await fetch('assets/cartas/cartas.json')).json()).cartas;
    } catch (e) {
      return; // sem cartas ainda
    }
    if (!lista.length) return;

    // Deck: personagens primeiro, o resto vazio
    document.getElementById('deck').innerHTML =
      lista.map((c) => html(c)).join('') + slotVazio.repeat(Math.max(0, 8 - lista.length));
    const media = lista.reduce((s, c) => s + c.custo, 0) / lista.length;
    document.querySelector('.elixir-medio b').textContent = media.toFixed(1).replace('.', ',');

    // Coleção: personagens + cartas ainda não liberadas
    const extras = ['comum', 'comum', 'rara', 'epica', 'comum'];
    document.getElementById('colecao').innerHTML =
      lista.map((c) => html(c)).join('') + extras.map((r, i) => vazia(r, [3, 2, 5, 6, 1][i])).join('');
    document.querySelector('[data-tela="cartas"] .aviso').textContent =
      `${lista.length} personagens liberadas. Mande mais imagens para completar a coleção!`;

    // Oferta do dia com a primeira personagem
    const oferta = document.querySelector('#ofertas .item-loja');
    if (oferta) {
      oferta.querySelector('.carta-vazia').outerHTML = html(lista[0], { mini: true });
      oferta.querySelector('.item-nome').textContent = `${lista[0].nome} · ${NOMES_RARIDADE[lista[0].raridade]}`;
    }

    // Mão na arena
    const mao = lista.slice(0, 4).map((c) => html(c, { mini: true }));
    while (mao.length < 4) mao.push(vazia('comum', 3, true));
    document.getElementById('mao').innerHTML = mao.join('');

    // Prévia de tropas na arena (só visual)
    const arena = document.getElementById('arena-grande');
    const pos = [
      { time: 'azul', x: 90, y: 395, vida: 0.8 },
      { time: 'vermelho', x: 270, y: 222, vida: 0.55 },
      { time: 'azul', x: 270, y: 420, vida: 1 },
    ];
    lista.slice(0, 3).forEach((c, i) => tropa(arena, c, pos[i]));
  }

  return { iniciar, html };
})();

Cartas.iniciar();
