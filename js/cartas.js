// Visual das cartas e leitura de assets/cartas/cartas.json.
const Cartas = (() => {
  const NOMES_RARIDADE = { comum: 'Comum', rara: 'Rara', epica: 'Épica', lendaria: 'Lendária' };
  const arte = (c) => `assets/cartas/${c.imagem || c.id + '.jpg'}`;

  async function carregar() {
    try {
      return (await (await fetch('assets/cartas/cartas.json', { cache: 'no-store' })).json()).cartas;
    } catch (e) {
      return [];
    }
  }

  // mini = só a carta (mão e loja) | nivel = texto embaixo | extra = html dentro da carta
  function html(c, { mini = false, nivel = null, extra = '' } = {}) {
    const carta = `<div class="carta ${c.raridade}${mini ? ' mini' : ''}">
      <img src="${arte(c)}" alt="${c.nome}" draggable="false" />
      <span class="custo">${c.custo}</span>
      ${mini ? '' : `<span class="nome-3d">${c.nome}</span>`}
      ${c.habilidade ? '<span class="selo-hab" title="Tem habilidade especial">⚡</span>' : ''}
      ${c.passiva ? `<span class="selo-hab passiva" title="Tem habilidade passiva">${c.passiva.tipo === 'esquiva' ? '✨' : '🧩'}</span>` : ''}
      ${extra}
    </div>`;
    return mini ? carta : `<div class="slot-carta" data-id="${c.id}">${carta}<div class="carta-nivel">${nivel ?? '&nbsp;'}</div></div>`;
  }

  return { carregar, html, arte, NOMES_RARIDADE };
})();
