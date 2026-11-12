// Inventário: coringas (viram cópias de cartas) e tokens (trocados por gemas nos Eventos).
const Inventario = (() => {
  const ORDEM = ['universal', 'comum', 'rara', 'epica', 'lendaria'];
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  let aoMudar = () => {};

  function abrir(cb) {
    if (cb) aoMudar = cb;
    const md = UI.modal({ titulo: '🎒 Inventário', classe: 'modal-inventario', html: '<div id="inv-corpo"></div>', botoes: [{ texto: 'Fechar', classe: 'principal' }] });
    const corpo = md.el.querySelector('#inv-corpo');
    const desenhar = () => {
      const d = Estado.d, cg = d.coringas || {};
      corpo.innerHTML = `
        <div class="inv-sec"><b>🃏 Coringas</b><small>Cada coringa vira <b>1 cópia</b> de uma carta sua da mesma raridade. O <b>Universal</b> serve em qualquer carta!</small></div>
        <div class="inv-grade">${ORDEM.map((t) => `<button class="inv-item r-${t}${cg[t] ? '' : ' vazio'}" data-c="${t}">
            <img src="assets/ui/coringa_${t}.svg" alt="" /><b>${UI.fmt(cg[t] || 0)}</b><small>${Estado.CORINGAS[t].nome}</small></button>`).join('')}</div>
        <div class="inv-sec"><b>🪙 Tokens</b><small>Ganhe no evento Caça aos Tokens e nos passes. Troque por gemas!</small></div>
        <div class="inv-tokens"><img src="assets/ui/token.svg" alt="" /><b>${UI.fmt(d.tokens || 0)}</b><button class="btn-modal principal" id="inv-trocar">Trocar por 💎</button></div>`;
      corpo.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
        const t = b.dataset.c;
        if (!(cg[t] > 0)) { UI.toast('Você não tem esse coringa ainda. Ganhe nos passes! 🎟️'); return; }
        escolherCarta(t, desenhar);
      }));
      corpo.querySelector('#inv-trocar').onclick = () => Eventos.trocarTokens(() => { desenhar(); aoMudar(); });
    };
    desenhar();
  }

  // escolhe em qual carta usar o coringa
  function escolherCarta(tipo, depois) {
    const lista = Estado.catalogo()
      .filter((c) => !c.token && Estado.tem(c.id) && !Estado.maxada(c.id) && (tipo === 'universal' || c.raridade === tipo))
      .sort((a, b) => (Estado.d.colecao[b.id].nivel - Estado.d.colecao[a.id].nivel) || a.nome.localeCompare(b.nome));
    if (!lista.length) { UI.toast(tipo === 'universal' ? 'Todas as suas cartas já estão no máximo! 👑' : 'Nenhuma carta dessa raridade precisa de cópias agora'); return; }
    const md = UI.modal({
      titulo: `Usar ${Estado.CORINGAS[tipo].nome}`,
      classe: 'modal-inv-cartas',
      html: `<p class="aviso">Você tem <b>${Estado.d.coringas[tipo]}</b>. Toque na carta que vai receber as cópias.</p>
        <div class="inv-cartas">${lista.map((c) => {
          const col = Estado.d.colecao[c.id], prec = Estado.copiasNivel(c, col.nivel) || 1;
          return `<button class="inv-carta" data-id="${c.id}">${Cartas.html(c, { mini: true })}
            <div class="inv-barra${col.copias >= prec ? ' cheia' : ''}"><i style="width:${Math.min(100, (col.copias / prec) * 100)}%"></i><small>${col.copias}/${prec}</small></div></button>`;
        }).join('')}</div>`,
      botoes: [{ texto: 'Voltar', classe: 'secundario' }],
    });
    md.el.querySelectorAll('.inv-carta').forEach((b) => (b.onclick = () => quantidade(tipo, Estado.carta(b.dataset.id), () => { md.fechar(); depois(); aoMudar(); })));
  }

  function quantidade(tipo, c, depois) {
    const col = Estado.d.colecao[c.id];
    const max = Math.min(Estado.d.coringas[tipo] || 0, Estado.faltaParaMax(c.id));
    const prec = Estado.copiasNivel(c, col.nivel) || 1;
    const sugerido = Math.max(1, Math.min(max, prec - col.copias > 0 ? prec - col.copias : 1));
    const md = UI.modal({
      titulo: esc(c.nome),
      classe: 'modal-inv-qtd',
      html: `<div class="compra">${Cartas.html(c, { mini: true })}<div>
          <p>Nível ${col.nivel} · ${col.copias}/${prec} cópias</p>
          <div class="inv-qtd"><button data-d="-10">−10</button><button data-d="-1">−</button><b id="inv-n">${sugerido}</b><button data-d="1">+</button><button data-d="10">+10</button></div>
          <input type="range" id="inv-r" min="1" max="${max}" value="${sugerido}" />
          <small class="aviso">${sugerido >= prec - col.copias && prec - col.copias > 0 ? `${prec - col.copias} já dá pra subir de nível!` : `Até ${max} (o que falta pro nível máximo)`}</small></div></div>`,
      botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: 'Usar coringas', classe: 'principal', acao: () => {
        const n = +md.el.querySelector('#inv-r').value;
        const q = Estado.usarCoringa(tipo, c.id, n);
        if (q) UI.toast(`🃏 +${q} cópias de ${c.nome}!`);
        depois();
      } }],
    });
    const r = md.el.querySelector('#inv-r'), nEl = md.el.querySelector('#inv-n');
    const por = (v) => { r.value = Math.max(1, Math.min(max, v)); nEl.textContent = r.value; };
    r.oninput = () => por(+r.value);
    md.el.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => por(+r.value + +b.dataset.d)));
  }

  const total = () => Object.values(Estado.d.coringas || {}).reduce((a, b) => a + (b || 0), 0);
  return { abrir, total };
})();
