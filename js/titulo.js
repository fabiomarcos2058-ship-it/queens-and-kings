// Tela de título: arte grande do banner principal (estilo vitrine) ou, sem banner, as faixas das personagens raras.
const Titulo = (() => {
  function principal() {
    try { return typeof Summon !== 'undefined' && Summon.tituloAtual ? Summon.tituloAtual() : null; } catch (e) { return null; }
  }
  function fundoFaixas() {
    const pers = Estado.catalogo().filter((c) => !c.feitico);
    const ordem = { ultra: 0, lendaria: 1, epica: 2, rara: 3, comum: 4 };
    const faixas = [...pers].sort((a, b) => ordem[a.raridade] - ordem[b.raridade] || b.trofeus - a.trofeus).slice(0, 7);
    return `<div class="titulo-faixas">${faixas.map((c, i) => `
      <div class="titulo-faixa ${i % 2 ? 'dir' : 'esq'} ${c.raridade}" style="--i:${i}">
        <img src="assets/cartas/${c.id}_faixa.jpg" alt="" draggable="false" />
      </div>`).join('')}</div><div class="titulo-escuro"></div>`;
  }
  function mostrar() {
    return new Promise((ok) => {
      const b = principal();
      const el = document.createElement('div');
      el.className = `titulo${b ? ' com-arte' : ''}`;
      const versao = String(window.VERSAO_JOGO || '').slice(-8);
      el.innerHTML = `
        ${b ? `<div class="tt-arte"><img src="${b.arte}" alt="" draggable="false" /></div>
          <div class="tt-raios"></div><div class="tt-sombra"></div>` : fundoFaixas()}
        <div class="titulo-logo">
          <img class="titulo-coroa" src="assets/avatares/coroa.svg" alt="" />
          <div class="logo-texto grande"><span>Queens</span><small>and</small><span>Kings</span></div>
        </div>
        ${b ? `<div class="tt-banner"><small>✦ BANNER EM DESTAQUE ✦</small><b>${b.nome}</b><span>${b.sub} · ⏳ ${b.tempo}</span></div>` : ''}
        <div class="titulo-toque"><i></i><span>TOQUE PARA COMEÇAR</span><i></i></div>
        <div class="titulo-rodape"><span>Fangame sem fins lucrativos · personagens pertencem aos seus autores</span>${versao ? `<em>v.${versao}</em>` : ''}</div>
        ${Array.from({ length: 22 }, (_, i) => `<i class="titulo-brilho" style="--x:${(i * 37) % 100}%;--d:${((i * 0.37) % 6).toFixed(2)}s;--t:${(0.6 + (i % 4) * 0.25).toFixed(2)}"></i>`).join('')}
        <div class="tt-flash"></div>`;
      document.getElementById('app').appendChild(el);
      el.onclick = () => {
        if (el.classList.contains('saindo')) return;
        el.classList.add('saindo');
        setTimeout(() => { el.remove(); ok(); }, 700);
      };
    });
  }
  return { mostrar };
})();
