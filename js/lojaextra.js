// Extras da loja: Pacotes especiais, Loja de Troca (fichas), atalho do Passe e Emotes.
// Estado em Estado.d.lx = { fichas, pacotes:{dia,comprados:[]}, troca:{dia,compradas:[]}, emotes:[] }
const LojaExtra = (() => {
  const d = () => Estado.d;
  const fmt = (n) => UI.fmt(n);
  const hoje = () => { const a = new Date(); return `${a.getFullYear()}-${a.getMonth() + 1}-${a.getDate()}`; };
  function lx() {
    const x = d().lx || (d().lx = {});
    if (typeof x.fichas !== 'number') x.fichas = 0;
    if (!x.pacotes) x.pacotes = { dia: hoje(), comprados: [], once: [] };
    if (!Array.isArray(x.pacotes.once)) x.pacotes.once = [];
    if (x.pacotes.dia !== hoje()) { x.pacotes.dia = hoje(); x.pacotes.comprados = []; }
    if (!x.troca || x.troca.dia !== hoje()) x.troca = { dia: hoje(), compradas: [] };
    if (!Array.isArray(x.emotes)) x.emotes = [];
    if (!Array.isArray(x.skins)) x.skins = [];
    return x;
  }

  // ---------- fichas de troca ----------
  const darFichas = (n) => { lx().fichas += n; Estado.salvar(); };
  const fichas = () => lx().fichas;

  // ---------- emotes da loja ----------
  const EMOTES_LOJA = [
    { id: 'x_fogo', ic: '🔥', txt: 'Pegando fogo!', preco: 60 },
    { id: 'x_coracao', ic: '💖', txt: 'Fofa demais!', preco: 60 },
    { id: 'x_gelo', ic: '🥶', txt: 'Ficou gelado...', preco: 80 },
    { id: 'x_oculos', ic: '😎', txt: 'Tá fácil.', preco: 100 },
    { id: 'x_coroa', ic: '👑', txt: 'Salve a rainha!', preco: 150 },
    { id: 'x_trevo', ic: '🍀', txt: 'Foi sorte!', preco: 80 },
    { id: 'x_caveira', ic: '💀', txt: 'Acabou pra você.', preco: 120 },
    { id: 'x_estrela', ic: '🌟', txt: 'Brilhei!', preco: 100 },
  ];
  const meusEmotes = () => EMOTES_LOJA.filter((e) => lx().emotes.includes(e.id));

  // ---------- skins de torre (só as suas torres, de baixo) ----------
  const SKINS = [
    { id: 'ouro', ic: '🏆', nome: 'Torre Dourada', preco: 150 },
    { id: 'rubi', ic: '❤️', nome: 'Torre Rubi', preco: 100 },
    { id: 'esmeralda', ic: '💚', nome: 'Torre Esmeralda', preco: 100 },
    { id: 'gelo', ic: '❄️', nome: 'Torre de Gelo', preco: 120 },
    { id: 'sakura', ic: '🌸', nome: 'Torre Sakura', preco: 120 },
    { id: 'sombria', ic: '🌑', nome: 'Torre Sombria', preco: 200 },
    { id: 'arcoiris', ic: '🌈', nome: 'Torre Arco-íris', preco: 350 },
  ];
  const skinAtiva = () => lx().skin || null;

  // ---------- pacotes especiais (1 vez por dia cada, com contagem regressiva) ----------
  const PACOTES = [
    { id: 'p_iniciante', nome: 'Pacote Brilhante', ic: '✨', gemas: 0, ouro: 2500, preco: 40, bau: 'prata', txt: '2.500 🪙 + Baú de prata' },
    { id: 'p_realeza', nome: 'Pacote Realeza', ic: '👑', ouro: 8000, preco: 120, bau: 'ouro', ficha: 40, txt: '8.000 🪙 + Baú de ouro + 40 🔁' },
    { id: 'p_lenda', nome: 'Pacote Lendário', ic: '🌈', ouro: 20000, preco: 380, bau: 'lendario', ficha: 120, txt: '20.000 🪙 + 10 lendárias + 120 🔁', unico: true },
  ];
  const pacoteComprado = (p) => (p.unico ? lx().pacotes.once.includes(p.id) : lx().pacotes.comprados.includes(p.id));

  function tempoPacotes() {
    const a = new Date(), f = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1);
    const s = Math.max(0, Math.floor((f - a) / 1000));
    return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  // ---------- loja de troca: 6 cartas do dia por fichas ----------
  const PRECO_TROCA = { comum: [50, 20], rara: [20, 40], epica: [6, 80], lendaria: [2, 160] }; // [cópias, fichas]
  function itensTroca() {
    const dia = hoje();
    let sem = [...(dia + (d().id || 'x') + 'troca')].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 11);
    const rnd = () => ((sem = (sem * 1103515245 + 12345) >>> 0) % 1000) / 1000;
    const pool = Estado.disponiveis().filter((c) => PRECO_TROCA[c.raridade] && Estado.tem(c.id) && !Estado.maxada(c.id));
    const lista = [], usados = new Set();
    for (let i = 0; i < 6 && pool.length; i++) {
      let c = pool[Math.floor(rnd() * pool.length)];
      for (let k = 0; k < 8 && usados.has(c.id) && pool.length > usados.size; k++) c = pool[Math.floor(rnd() * pool.length)];
      usados.add(c.id);
      const [copias, preco] = PRECO_TROCA[c.raridade];
      lista.push({ i, id: c.id, copias, preco });
    }
    return lista;
  }

  // ---------- desenho ----------
  const esc = (t) => String(t).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

  function htmlPacotes() {
    return `<div class="lx-grade">${PACOTES.map((p) => {
      const ok = pacoteComprado(p);
      return `<button class="lx-pacote${ok ? ' comprado' : ''}" data-p="${p.id}"><span class="lx-ic">${p.ic}</span><div><b>${p.nome}</b><small>${p.txt}</small></div><span class="lx-preco">${ok ? 'Comprado' : `<i class="ic-gema"></i>${p.preco}`}</span></button>`;
    }).join('')}</div>`;
  }
  function htmlTroca() {
    const itens = itensTroca();
    if (!itens.length) return '<p class="aviso">Ganhe cartas nos baús para liberar a Loja de Troca!</p>';
    return `<div class="lx-fichas">🔁 Suas fichas: <b>${fmt(fichas())}</b><small>Ganhe 3 fichas por vitória e 1 por derrota</small></div><div class="grade-3 ofertas">${itens.map((o) => {
      const c = Estado.carta(o.id), ok = lx().troca.compradas.includes(o.i);
      return `<button class="oferta${ok ? ' comprado' : ''}" style="--rar:${(window.COR_RAR || {})[c.raridade] || '#999'}" data-t="${o.i}">
        <div class="oferta-carta">${Cartas.html(c, { mini: true })}<span class="qtd">x${o.copias}</span></div>
        <div class="item-nome">${esc(c.nome)}</div><div class="preco">${ok ? 'Trocado' : `🔁 ${o.preco}`}</div></button>`;
    }).join('')}</div>`;
  }
  function htmlEmotes() {
    return `<div class="lx-grade">${EMOTES_LOJA.map((e) => {
      const tem = lx().emotes.includes(e.id);
      return `<button class="lx-emote${tem ? ' comprado' : ''}" data-e="${e.id}"><span class="lx-ic">${e.ic}</span><div><b>${e.txt}</b></div><span class="lx-preco">${tem ? '✓' : `<i class="ic-gema"></i>${e.preco}`}</span></button>`;
    }).join('')}</div>`;
  }
  function htmlSkins() {
    const at = skinAtiva(), tem = (k) => lx().skins.includes(k);
    return `<div class="lx-grade lx-skins"><button class="lx-skin${!at ? ' ativa' : ''}" data-s=""><span class="lx-ic">🏰</span><div><b>Torre clássica</b></div><span class="lx-preco">${!at ? 'Em uso' : 'Usar'}</span></button>${SKINS.map((k) => `<button class="lx-skin${at === k.id ? ' ativa' : ''}${tem(k.id) ? '' : ' bloq'}" data-s="${k.id}"><span class="lx-ic lx-sk-${k.id}">${k.ic}</span><div><b>${k.nome}</b></div><span class="lx-preco">${at === k.id ? 'Em uso' : tem(k.id) ? 'Usar' : `<i class="ic-gema"></i>${k.preco}`}</span></button>`).join('')}</div>`;
  }
  function htmlPasse() {
    const p = Passe.dados(), nv = Passe.nivel();
    return `<button class="lx-passe" id="lx-abrir-passe"><span class="lx-ic">🎟️</span><div><b>Passe da Temporada</b><small>Nível ${nv} · ⏳ ${Passe.tempoRestante()}</small></div><span class="lx-preco">Abrir</span></button>`;
  }

  function desenhar(ctx) {
    // ctx = { mostrarBau, tudo, abrirPasse }
    const set = (id, h) => { const el = document.getElementById(id); if (el) el.innerHTML = h; return el; };
    set('lx-passe', htmlPasse());
    set('lx-pacotes', htmlPacotes());
    set('lx-troca', htmlTroca());
    set('lx-emotes', htmlEmotes());
    set('lx-skins', htmlSkins());
    const t = document.getElementById('lx-tempo'); if (t) t.textContent = tempoPacotes();
    const bp = document.getElementById('lx-abrir-passe'); if (bp) bp.onclick = () => ctx.abrirPasse && ctx.abrirPasse();

    document.querySelectorAll('#lx-pacotes [data-p]').forEach((el) => (el.onclick = () => {
      const p = PACOTES.find((x) => x.id === el.dataset.p);
      if (pacoteComprado(p)) return UI.toast('Você já pegou esse pacote' + (p.unico ? '!' : ' hoje!'));
      UI.modal({ titulo: p.nome, html: `<p style="font-size:2.4rem;margin:.2rem">${p.ic}</p><p>${p.txt}</p>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: `Comprar · ${p.preco} 💎`, classe: 'principal', desativado: d().gemas < p.preco, motivo: 'Gemas insuficientes',
          acao: () => {
            d().gemas -= p.preco; d().ouro += p.ouro;
            if (p.ficha) lx().fichas += p.ficha;
            if (p.unico) lx().pacotes.once.push(p.id); else lx().pacotes.comprados.push(p.id);
            Estado.salvar();
            UI.toast(`${p.ic} ${p.nome} comprado!`);
            if (p.bau) ctx.mostrarBau(p.bau, Estado.abrirBau(p.bau)); else ctx.tudo();
          } }] });
    }));
    document.querySelectorAll('#lx-troca [data-t]').forEach((el) => (el.onclick = () => {
      const o = itensTroca()[+el.dataset.t];
      if (!o) return;
      if (lx().troca.compradas.includes(o.i)) return UI.toast('Você já trocou essa hoje');
      const c = Estado.carta(o.id);
      UI.modal({ titulo: 'Trocar fichas?', html: `<div class="compra">${Cartas.html(c, { mini: true })}<p><b>${o.copias} cópias</b> de ${esc(c.nome)} por ${o.preco} 🔁</p></div>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: 'Trocar', classe: 'principal', desativado: fichas() < o.preco, motivo: 'Fichas insuficientes',
          acao: () => { lx().fichas -= o.preco; d().colecao[o.id].copias += o.copias; lx().troca.compradas.push(o.i); Estado.salvar(); UI.toast(`+${o.copias} ${c.nome}!`); ctx.tudo(); } }] });
    }));
    document.querySelectorAll('#lx-skins [data-s]').forEach((el) => (el.onclick = () => {
      const k = SKINS.find((x) => x.id === el.dataset.s);
      const usar = () => { lx().skin = k ? k.id : null; Estado.salvar(); document.querySelectorAll('.arena').forEach((a) => { a.className = a.className.replace(/\bskin-\S+/g, '').trim(); if (k) a.classList.add(`skin-${k.id}`); }); UI.toast(k ? `${k.ic} ${k.nome} equipada!` : 'Torre clássica equipada'); ctx.tudo(); };
      if (!k || lx().skins.includes(k.id)) return usar();
      UI.modal({ titulo: k.nome, html: `<p style="font-size:2.4rem;margin:.2rem">${k.ic}</p><p>Muda o visual das <b>suas</b> torres na batalha.</p>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: `Comprar · ${k.preco} 💎`, classe: 'principal', desativado: d().gemas < k.preco, motivo: 'Gemas insuficientes',
          acao: () => { d().gemas -= k.preco; lx().skins.push(k.id); usar(); } }] });
    }));
    document.querySelectorAll('#lx-emotes [data-e]').forEach((el) => (el.onclick = () => {
      const e = EMOTES_LOJA.find((x) => x.id === el.dataset.e);
      if (lx().emotes.includes(e.id)) return UI.toast('Você já tem esse emote! Use na batalha 💬');
      UI.modal({ titulo: 'Comprar emote?', html: `<p style="font-size:2.4rem;margin:.2rem">${e.ic}</p><p>“${e.txt}”<br><small>Aparece no painel 💬 durante as batalhas.</small></p>`,
        botoes: [{ texto: 'Cancelar', classe: 'secundario' }, { texto: `Comprar · ${e.preco} 💎`, classe: 'principal', desativado: d().gemas < e.preco, motivo: 'Gemas insuficientes',
          acao: () => { d().gemas -= e.preco; lx().emotes.push(e.id); Estado.salvar(); UI.toast(`${e.ic} Emote liberado!`); ctx.tudo(); } }] });
    }));
  }
  setInterval(() => { const t = document.getElementById('lx-tempo'); if (t) t.textContent = tempoPacotes(); }, 1000);

  return { desenhar, darFichas, fichas, meusEmotes, EMOTES_LOJA, SKINS };
})();
