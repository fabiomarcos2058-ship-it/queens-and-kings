// Visual das cartas e leitura de assets/cartas/cartas.json.
const Cartas = (() => {
  const NOMES_RARIDADE = { comum: 'Comum', rara: 'Rara', epica: 'Épica', lendaria: 'Lendária', ultra: 'Ultra' };
  const arte = (c) => `assets/cartas/${c.imagem || c.id + '.jpg'}`;

  // Tenta várias vezes. Se não der (sem internet), devolve null: o jogo NÃO pode seguir com a lista vazia,
  // senão ele achava que as cartas não existiam mais e apagava da coleção (bug que pegou o Enzo).
  async function carregar() {
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch('assets/cartas/cartas.json', { cache: i ? 'reload' : 'no-store' });
        if (r.ok) {
          const lista = (await r.json()).cartas;
          if (Array.isArray(lista) && lista.length >= 20) return lista;
        }
      } catch (e) { /* tenta de novo */ }
      await new Promise((ok) => setTimeout(ok, 700 * (i + 1)));
    }
    return null;
  }

  // mini = só a carta (mão e loja) | nivel = texto embaixo | extra = html dentro da carta
  function html(c, { mini = false, nivel = null, extra = '' } = {}) {
    const evo = !!c.evolucao;
    let zk = null;
    try { zk = typeof Estado !== 'undefined' && Estado.zenkai && Estado.d ? Estado.zenkai(c.id) : null; } catch (e) { zk = null; }
    const zkHtml = zk && zk.ativo ? `<i class="zenkai-borda"></i><span class="selo-zenkai">ZENKAI${zk.z ? `<b>${'★'.repeat(zk.z)}</b>` : ''}</span>` : '';
    const carta0 = `<div class="carta ${c.raridade}${zk && zk.ativo ? ' zenkai' : ''}${evo ? ' evo' : ''}${c.video ? ' com-video' : ''}${c.evento ? ' de-evento' : ''}${mini ? ' mini' : ''}">
      ${c.video ? `<video class="carta-video" src="assets/cartas/${c.video}" poster="${arte(c)}" autoplay muted loop playsinline preload="auto" disablepictureinpicture></video>` : `<img src="${arte(c)}" alt="${c.nome}" draggable="false" />`}
      <span class="custo">${c.custo}</span>
      ${mini ? '' : `<span class="nome-3d">${c.nome}</span>`}
      ${c.habilidade ? '<span class="selo-hab" title="Tem habilidade especial">⚡</span>' : ''}
      ${c.passiva ? `<span class="selo-hab passiva" title="Tem habilidade passiva">${c.passiva.tipo === 'esquiva' ? '✨' : '🧩'}</span>` : ''}
      ${evo ? '<i class="evo-borda"></i><span class="evo-selo">EVO</span>' : ''}${c.evento ? '<span class="selo-evento">EVENTO</span>' : ''}${c.raridade === 'ultra' ? '<video class="ultra-video" src="assets/ui/moldura_ultra.mp4" autoplay muted loop playsinline preload="auto" disablepictureinpicture></video><i class="ultra-holo"></i><i class="ultra-borda"></i><span class="selo-evento selo-ultra">ULTRA</span>' : c.summon ? '<span class="selo-evento selo-summon">SUMMON</span>' : ''}
      ${zkHtml}${extra}
    </div>`;
    // cartas de evolução: moldura especial + aura roxa animada em volta
    const carta = evo ? `<div class="evo-moldura${mini ? ' mini' : ''}"><img class="evo-aura" src="assets/evolucao/aura.webp" alt="" draggable="false" />${carta0}</div>` : carta0;
    return mini ? carta : `<div class="slot-carta" data-id="${c.id}">${carta}<div class="carta-nivel">${nivel ?? '&nbsp;'}</div></div>`;
  }

  return { carregar, html, arte, NOMES_RARIDADE };
})();
