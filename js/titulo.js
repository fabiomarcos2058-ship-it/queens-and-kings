// Tela de título: faixas com as personagens mais raras e "Toque para começar".
const Titulo = (() => {
  function mostrar() {
    return new Promise((ok) => {
      const pers = Estado.catalogo().filter((c) => !c.feitico);
      const ordem = { lendaria: 0, epica: 1, rara: 2, comum: 3 };
      const faixas = [...pers].sort((a, b) => ordem[a.raridade] - ordem[b.raridade] || b.trofeus - a.trofeus).slice(0, 7);

      const el = document.createElement('div');
      el.className = 'titulo';
      el.innerHTML = `
        <div class="titulo-faixas">${faixas.map((c, i) => `
          <div class="titulo-faixa ${i % 2 ? 'dir' : 'esq'} ${c.raridade}" style="--i:${i}">
            <img src="assets/cartas/${c.id}_faixa.jpg" alt="" draggable="false" />
          </div>`).join('')}</div>
        <div class="titulo-escuro"></div>
        <div class="titulo-logo">
          <img class="titulo-coroa" src="assets/avatares/coroa.svg" alt="" />
          <div class="logo-texto grande"><span>Queens</span><small>and</small><span>Kings</span></div>
        </div>
        <div class="titulo-toque">Toque para começar</div>
        <div class="titulo-rodape">Fangame sem fins lucrativos · personagens pertencem aos seus autores</div>
        ${Array.from({ length: 14 }, (_, i) => `<i class="titulo-brilho" style="--x:${(i * 37) % 100}%;--d:${(i * 0.4) % 5}s"></i>`).join('')}`;
      document.getElementById('app').appendChild(el);
      el.onclick = () => {
        if (el.classList.contains('saindo')) return;
        el.classList.add('saindo');
        setTimeout(() => { el.remove(); ok(); }, 550);
      };
    });
  }
  return { mostrar };
})();
