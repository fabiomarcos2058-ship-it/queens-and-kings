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
  // Logo original "Queens & Kings": coroa em SVG + letras douradas em camadas
  function logoReal() {
    const coroa = `<svg class="qk-coroa" viewBox="0 0 160 110" aria-hidden="true">
      <defs>
        <linearGradient id="qkOuro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFF4C2"/><stop offset=".35" stop-color="#FFD54F"/>
          <stop offset=".6" stop-color="#E8A317"/><stop offset=".8" stop-color="#FFE38A"/><stop offset="1" stop-color="#A86400"/>
        </linearGradient>
        <linearGradient id="qkRubi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF9BB0"/><stop offset=".5" stop-color="#E0245E"/><stop offset="1" stop-color="#7A0A2E"/></linearGradient>
        <linearGradient id="qkSafira" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B8E4FF"/><stop offset=".5" stop-color="#3B8BEB"/><stop offset="1" stop-color="#1A2C8C"/></linearGradient>
      </defs>
      <g stroke="#3A1E00" stroke-width="4" stroke-linejoin="round">
        <path d="M22 86 L12 34 L48 60 L80 14 L112 60 L148 34 L138 86 Z" fill="url(#qkOuro)"/>
        <rect x="20" y="84" width="120" height="18" rx="6" fill="url(#qkOuro)"/>
        <circle cx="12" cy="30" r="7" fill="url(#qkOuro)"/><circle cx="148" cy="30" r="7" fill="url(#qkOuro)"/>
        <path d="M80 2 l7 9 -7 9 -7 -9 z" fill="url(#qkRubi)"/>
      </g>
      <g stroke="#3A1E00" stroke-width="2.5">
        <path d="M80 48 l9 12 -9 12 -9 -12 z" fill="url(#qkRubi)"/>
        <circle cx="45" cy="74" r="5.5" fill="url(#qkSafira)"/><circle cx="115" cy="74" r="5.5" fill="url(#qkSafira)"/>
        <circle cx="50" cy="93" r="3.6" fill="url(#qkRubi)"/><circle cx="80" cy="93" r="4.2" fill="url(#qkSafira)"/><circle cx="110" cy="93" r="3.6" fill="url(#qkRubi)"/>
      </g>
      <path d="M30 80 L24 46 M58 60 L80 28" stroke="#FFFBE6" stroke-width="3" stroke-linecap="round" opacity=".7" fill="none"/>
    </svg>`;
    const faisca = (x, y, d) => `<i class="qk-faisca" style="left:${x}%;top:${y}%;--d:${d}s"></i>`;
    return `${coroa}
      <div class="qk-nome">
        <span class="qk-palavra qk-queens" data-t="Queens">Queens</span>
        <div class="qk-meio"><i class="qk-fio"></i><span class="qk-and">and</span><i class="qk-fio dir"></i></div>
        <span class="qk-palavra qk-kings" data-t="Kings">Kings</span>
      </div>
      <div class="qk-sub"><i></i><span>Batalha dos Multiversos</span><i></i></div>
      ${faisca(8, 30, 0)}${faisca(90, 24, 0.8)}${faisca(84, 78, 1.6)}${faisca(14, 82, 2.3)}${faisca(50, 4, 1.2)}`;
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
        <div class="titulo-logo qk-logo">${logoReal()}</div>
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
