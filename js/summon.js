// Summon: banners de invocação (gacha) com a raridade Ultra.
// - Invocar 1x (50 💎) ou 10x (450 💎). Na de 10x vem pelo menos 1 Lendária ou melhor.
// - Garantia de Ultra: a chance sobe a partir da invocação 55 sem Ultra e na 70 vem com certeza.
// - Animação: a fenda do multiverso abre, as cartas atravessam e a Ultra quebra a realidade.
const Summon = (() => {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => UI.fmt(Math.round(n));
  const som = (n) => { try { typeof Som !== 'undefined' && Som.tocar(n); } catch (e) { /* nada */ } };
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

  const PRECO1 = 50, PRECO10 = 450;
  const PITY = 70, SUAVE = 55;
  const ORDEM = ['ultra', 'lendaria', 'epica', 'rara', 'comum'];
  const COR = { ultra: '#FF5CF4', lendaria: '#FFCF4A', epica: '#B46BFF', rara: '#4AA3FF', comum: '#9FB4C8' };
  const NOME_RAR = { ultra: 'Ultra', lendaria: 'Lendária', epica: 'Épica', rara: 'Rara', comum: 'Comum' };
  const COPIAS = { ultra: 1, lendaria: 1, epica: 2, rara: 4, comum: 6 };
  const OURO_MAX = { ultra: 2000, lendaria: 1000, epica: 400, rara: 150, comum: 80 };

  const BANNERS = [{
    id: 'ultras-blue-lock',
    nome: 'Fenda do Multiverso',
    sub: 'Ultras: Prodígios do Campo',
    fim: new Date(2026, 11, 31, 23, 59, 59), // 31/12/2026
    destaque: ['itoshi_sae', 'itoshi_rin', 'isagi_ultra'],
    pool: {
      ultra: ['itoshi_sae', 'itoshi_rin', 'isagi_ultra'],
      lendaria: ['shadow', 'anri_halloween'],
      epica: ['isagi', 'sonic', 'kurona'],
      rara: ['mbappe'],
    },
    chances: { ultra: 0.02, lendaria: 0.12, epica: 0.41, rara: 0.45 },
  }, {
    id: 'invencivel',
    nome: 'INVENCÍVEL',
    sub: 'A Guerra dos Marks',
    tema: 'invencivel',
    logo: true,
    fim: new Date(2027, 0, 15, 23, 59, 59), // 15/01/2027
    centro: 'mark_eve',
    destaque: ['omni_man', 'invencivel', 'mark_eve', 'eve_atomica', 'conquest'],
    lados: ['conquest'],
    pool: {
      ultra: ['mark_eve', 'omni_man', 'invencivel', 'eve_atomica', 'conquest'],
      lendaria: ['mark_azul', 'mark_cabelo_longo', 'mark_sem_lentes'],
      epica: ['mark_flaxan', 'mark_prisioneiro'],
    },
    // dentro das Ultras, Mark & Eve é bem mais difícil de vir
    pesos: { mark_eve: 1, omni_man: 2, invencivel: 3, eve_atomica: 3, conquest: 3 },
    chances: { ultra: 0.025, lendaria: 0.2, epica: 0.775 },
    // garantia do destaque: Mark & Eve vem com certeza na 180ª invocação sem ele neste banner
    pityDestaque: 180,
  }];
  let atualI = 1; // abre no banner mais novo
  const banner = () => BANNERS[Math.min(atualI, BANNERS.length - 1)];
  const diasRestantes = (b = banner()) => Math.max(0, Math.ceil((b.fim.getTime() - Date.now()) / 86400000));
  // só entra no sorteio quem existe na lista de cartas
  function pool(b = banner()) {
    const p = {};
    for (const r of ORDEM) p[r] = (b.pool[r] || []).filter((id) => Estado.carta(id));
    return p;
  }
  function chances(b = banner()) {
    const p = pool(b);
    const tiers = ORDEM.filter((r) => p[r] && p[r].length && b.chances[r]);
    const soma = tiers.reduce((a, r) => a + b.chances[r], 0) || 1;
    return Object.fromEntries(tiers.map((r) => [r, b.chances[r] / soma]));
  }

  function dados() {
    const d = Estado.d;
    if (!d.summon) d.summon = { total: 0, ultras: 0, hist: [] };
    const ds = d.summon;
    if (!ds.b) ds.b = {};
    // a garantia antiga (de antes de ter vários banners) era do primeiro banner
    if (ds.semUltra != null) { ds.b[BANNERS[0].id] = { semUltra: ds.semUltra, semDestaque: 0 }; delete ds.semUltra; }
    return ds;
  }
  // garantia de cada banner
  function pity(b = banner()) {
    const ds = dados();
    return ds.b[b.id] || (ds.b[b.id] = { semUltra: 0, semDestaque: 0 });
  }
  const faltaPity = (b = banner()) => Math.max(1, PITY - pity(b).semUltra);
  const faltaDestaque = (b = banner()) => (b.pityDestaque ? Math.max(1, b.pityDestaque - pity(b).semDestaque) : 0);
  const escolher = (lista, pesos) => {
    if (!pesos) return lista[Math.floor(Math.random() * lista.length)];
    const soma = lista.reduce((a, id) => a + (pesos[id] || 1), 0);
    let x = Math.random() * soma;
    for (const id of lista) { if ((x -= pesos[id] || 1) <= 0) return id; }
    return lista[lista.length - 1];
  };

  // ---------- sorteio ----------
  function sortearRaridade(garantirLendaria) {
    const ds = pity(), ch = chances();
    let pUltra = ch.ultra || 0;
    if (ds.semUltra + 1 >= PITY) pUltra = 1;
    else if (ds.semUltra + 1 >= SUAVE) pUltra = Math.min(1, pUltra + (ds.semUltra + 2 - SUAVE) * 0.05);
    if (Math.random() < pUltra) return 'ultra';
    const resto = Object.entries(ch).filter(([r]) => r !== 'ultra' && (!garantirLendaria || r === 'lendaria'));
    if (!resto.length) return 'ultra';
    const soma = resto.reduce((a, [, v]) => a + v, 0);
    let x = Math.random() * soma;
    for (const [r, v] of resto) { if ((x -= v) <= 0) return r; }
    return resto[0][0];
  }
  function sortear(n) {
    const ds = dados(), b = banner(), pb = pity(b), p = pool(), res = [];
    for (let i = 0; i < n; i++) {
      const ultimaDaDezena = n === 10 && i === 9 && !res.some((r) => r.raridade === 'ultra' || r.raridade === 'lendaria');
      let rar = sortearRaridade(ultimaDaDezena);
      let id;
      // garantia do destaque (Mark & Eve)
      if (b.centro && b.pityDestaque && pb.semDestaque + 1 >= b.pityDestaque && Estado.carta(b.centro)) { rar = 'ultra'; id = b.centro; }
      else id = escolher(p[rar], b.pesos);
      ds.total++;
      if (rar === 'ultra') { pb.semUltra = 0; ds.ultras = (ds.ultras || 0) + 1; } else pb.semUltra++;
      if (b.centro) { if (id === b.centro) pb.semDestaque = 0; else pb.semDestaque = (pb.semDestaque || 0) + 1; }
      res.push({ id, raridade: rar, ...receber(id) });
    }
    // as 10 aparecem misturadas, mas a garantida não fica sempre no fim
    for (let i = res.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [res[i], res[j]] = [res[j], res[i]]; }
    ds.hist = [...res.map((r) => ({ id: r.id, r: r.raridade, t: Date.now() })), ...(ds.hist || [])].slice(0, 40);
    Estado.salvar();
    return res;
  }
  const nivelMedio = () => {
    const d = Estado.d, dk = (d.deck || []).filter((id) => d.colecao[id]);
    return dk.length ? Math.round(dk.reduce((a, id) => a + (d.colecao[id].nivel || 1), 0) / dk.length) : 3;
  };
  // entrega a carta: nova (desbloqueia) ou repetida (cópias; se já está no máximo vira ouro)
  function receber(id) {
    const d = Estado.d, c = Estado.carta(id), col = d.colecao[id];
    if (!col || !col.tem) {
      if (c.exclusivo) d.cartasExtras = [...new Set([...(d.cartasExtras || []), id])];
      const forte = c.raridade === 'ultra' || c.raridade === 'lendaria';
      const nivel = Math.max(col && col.nivel || 1, Math.min(9, Math.max(forte ? 5 : 3, nivelMedio() - (forte ? 1 : 2))));
      d.colecao[id] = { nivel, copias: (col && col.copias) || 0, tem: true };
      Estado.recarregarCatalogo();
      return { novo: true, nivel };
    }
    const falta = Estado.faltaParaMax(id);
    if (falta <= 0) { const ouro = OURO_MAX[c.raridade] || 100; d.ouro += ouro; return { ouro }; }
    const q = Math.min(falta, COPIAS[c.raridade] || 1);
    col.copias += q;
    return { copias: q };
  }

  // ---------- tela do banner ----------
  let aoFechar = () => {};
  function abrir(cb) {
    if (cb) aoFechar = cb;
    fechar(true);
    const b = banner(), ds = dados();
    const el = document.createElement('div');
    el.className = 'summon-tela';
    el.id = 'summon-tela';
    const paineis = b.destaque.filter((id) => Estado.carta(id)).map((id, i) => {
      const c = Estado.carta(id);
      return `<div class="smb-painel${id === b.centro ? ' centro' : ''}" style="--i:${i}"><img src="${Cartas.arte(c)}" alt="" draggable="false" /><span>${esc(c.nome)}</span></div>`;
    }).join('');
    const pct = Math.round(((PITY - faltaPity()) / PITY) * 100);
    const abas = BANNERS.map((x, i) => `<button class="sm-aba${i === atualI ? ' ativa' : ''}${x.tema ? ` t-${x.tema}` : ''}" data-b="${i}"><img src="${Cartas.arte(Estado.carta(x.centro || x.destaque[0]) || {})}" alt="" /><span>${esc(x.nome)}</span></button>`).join('');
    const titulo = b.logo ? logoInvencivel(b) : `<div class="smb-titulo"><em>NOVA RARIDADE</em><b>${esc(b.nome)}</b><small>${esc(b.sub)}</small></div>`;
    el.innerHTML = `${fundoMultiverso()}
      <div class="sm-topo"><button class="tr-voltar" id="sm-voltar">‹</button><div><b>Summon</b><small>Termina em ${diasRestantes()} dia${diasRestantes() === 1 ? '' : 's'}</small></div>
        <span class="sm-gemas">💎 ${fmt(Estado.d.gemas)}</span></div>
      <div class="sm-rolagem">
        <div class="sm-abas">${abas}</div>
        <div class="sm-banner${b.tema ? ` t-${b.tema}` : ''}">
          <div class="smb-paineis">${paineis}</div>
          ${titulo}
          <div class="smb-chip">🌀 ULTRA</div>
        </div>
        <div class="sm-pity"><div><b>Ultra garantido em ${faltaPity()}</b><small>A chance sobe a partir da invocação ${SUAVE}</small></div><i><i style="width:${pct}%"></i></i></div>
        ${b.centro && Estado.carta(b.centro) ? `<div class="sm-pity destaque"><div><b>${esc(Estado.carta(b.centro).nome)} garantido em ${faltaDestaque()}</b><small>Super raro: só ${(chances().ultra * 100 * (b.pesos[b.centro] / Object.values(b.pesos).reduce((a, v) => a + v, 0))).toFixed(2).replace('.', ',')}% por invocação</small></div><i><i style="width:${Math.round(((b.pityDestaque - faltaDestaque()) / b.pityDestaque) * 100)}%"></i></i></div>` : ''}
        <p class="sm-regra">✨ Toda invocação de 10x tem <b>pelo menos 1 Lendária ou melhor</b>.</p>
        <button class="sm-info" id="sm-info">📜 Personagens e chances</button>
        <div class="sm-botoes">
          <button class="sm-btn um" id="sm-1"><b>Invocar 1x</b><span>💎 ${PRECO1}</span></button>
          <button class="sm-btn dez" id="sm-10"><em>1 Lendária+ garantida</em><b>Invocar 10x</b><span>💎 ${PRECO10}</span></button>
        </div>
        <p class="sm-total">Você já invocou ${fmt(ds.total || 0)} vez${ds.total === 1 ? '' : 'es'}${ds.ultras ? ` · ${ds.ultras} Ultra${ds.ultras > 1 ? 's' : ''}` : ''}</p>
      </div>`;
    $('app').appendChild(el);
    if (typeof Assets !== 'undefined') Assets.fill();
    el.querySelector('#sm-voltar').onclick = () => fechar();
    el.querySelectorAll('.sm-aba').forEach((x) => (x.onclick = () => { atualI = +x.dataset.b; abrir(); }));
    el.querySelector('#sm-info').onclick = () => info();
    el.querySelector('#sm-1').onclick = () => invocar(1);
    el.querySelector('#sm-10').onclick = () => invocar(10);
  }
  function fechar(silencioso) {
    const el = $('summon-tela');
    if (!el) return;
    if (silencioso) { el.remove(); return; }
    el.classList.add('sumir');
    setTimeout(() => el.remove(), 250);
    aoFechar();
  }
  // logo do banner do Invencível (desenho próprio do jogo)
  function logoInvencivel(b) {
    return `<div class="smb-logo-inv"><svg class="sli-emblema" viewBox="0 0 120 120" aria-hidden="true">
        <defs><linearGradient id="sliG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE45C"/><stop offset=".55" stop-color="#FFB100"/><stop offset="1" stop-color="#E07A00"/></linearGradient>
          <linearGradient id="sliA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FD3FF"/><stop offset="1" stop-color="#1E6BFF"/></linearGradient></defs>
        <circle cx="60" cy="60" r="52" fill="none" stroke="url(#sliA)" stroke-width="6" stroke-dasharray="230 97" transform="rotate(-30 60 60)"/>
        <path d="M60 14 L72 48 L108 50 L80 72 L90 106 L60 86 L30 106 L40 72 L12 50 L48 48 Z" fill="url(#sliG)" stroke="#5a2a00" stroke-width="3" stroke-linejoin="round"/>
        <path d="M52 46 L60 22 L68 46 Z" fill="#fff" opacity=".55"/></svg>
      <div class="sli-txt"><b>${esc(b.nome)}</b><small>${esc(b.sub)}</small></div></div>`;
  }
  function fundoMultiverso() {
    const estrelas = Array.from({ length: 3 }, (_, k) => `<i class="sm-estrelas e${k}"></i>`).join('');
    return `<div class="sm-fundo"><i class="sm-nebulosa"></i>${estrelas}<i class="sm-anel a1"></i><i class="sm-anel a2"></i><i class="sm-anel a3"></i><i class="sm-fenda f1"></i><i class="sm-fenda f2"></i></div>`;
  }

  // ---------- personagens e chances ----------
  function info() {
    const ch = chances(), p = pool();
    const blocos = ORDEM.filter((r) => ch[r]).map((r) => {
      const b = banner(), somaP = p[r].reduce((a, id) => a + ((b.pesos && b.pesos[id]) || 1), 0);
      const cada = (id) => (ch[r] * (((b.pesos && b.pesos[id]) || 1) / somaP)) * 100;
      return `<div class="smi-bloco" style="--cor:${COR[r]}"><div class="smi-cab"><b>${NOME_RAR[r]}</b><span>${(ch[r] * 100).toFixed(1).replace('.', ',')}%</span></div>
        <div class="smi-grade">${p[r].map((id) => { const c = Estado.carta(id); return `<button class="smi-carta" data-id="${id}">${Cartas.html(c, { mini: true })}<b>${esc(c.nome)}</b><small>${cada(id).toFixed(2).replace('.', ',')}%</small>${Estado.tem(id) ? '<i>✓ sua</i>' : ''}</button>`; }).join('')}</div></div>`;
    }).join('');
    const md = UI.modal({
      titulo: '📜 Personagens e chances',
      classe: 'modal-summon-info',
      html: `<p class="smi-txt">Cada invocação sorteia uma raridade e depois um personagem dela. <b>Ultra garantido na ${PITY}ª</b> invocação sem Ultra (a chance sobe a partir da ${SUAVE}ª). Repetida vira cópias; se a carta já estiver no máximo, vira ouro.</p>${blocos}`,
      botoes: [{ texto: 'Fechar', classe: 'principal' }],
    });
    md.el.querySelectorAll('.smi-carta').forEach((x) => (x.onclick = () => detalhe(Estado.carta(x.dataset.id))));
  }
  function detalhe(c) {
    UI.modal({
      titulo: c.nome,
      classe: 'modal-carta',
      html: `<div class="detalhe-carta">${Cartas.html(c, { mini: true })}<div><span class="raridade-tag ${c.raridade}">${NOME_RAR[c.raridade]}${c.summon ? ' · só no Summon' : ''}</span><p class="tipo">${esc(c.tipo)} · ${c.custo} de elixir</p><p>${esc(c.descricao)}</p>${c.passiva ? `<p><b>🧩 ${esc(c.passiva.nome)}:</b> ${esc(c.passiva.descricao)}</p>` : ''}${c.habilidade ? `<p><b>⚡ ${esc(c.habilidade.nome)}:</b> ${esc(c.habilidade.descricao)}</p>` : ''}</div></div>`,
      botoes: [{ texto: 'Fechar', classe: 'principal' }],
    });
  }

  // ---------- invocar ----------
  let animando = false;
  async function invocar(n) {
    if (animando) return;
    const preco = n === 10 ? PRECO10 : PRECO1;
    if (Estado.d.gemas < preco) { UI.toast(`Faltam ${preco - Estado.d.gemas} 💎 para invocar ${n}x`); return; }
    if (!pool().ultra.length) { UI.toast('Banner indisponível agora'); return; }
    animando = true;
    Estado.d.gemas -= preco;
    let res;
    try { res = sortear(n); } catch (e) {
      // se o sorteio falhar, as gemas voltam
      console.warn('Summon: sorteio', e);
      Estado.d.gemas += preco; Estado.salvar(); animando = false;
      UI.toast('Não deu pra invocar agora. Suas gemas voltaram 💎');
      return;
    }
    // vigia: se a animação não aparecer na tela (celular antigo, erro, etc.), mostra o resultado do jeito simples
    let resolvido = false;
    const vigia = setTimeout(() => {
      const a = document.querySelector('.sm-anim');
      const r = a && a.getBoundingClientRect();
      if (!resolvido && (!a || !r || r.height < 100 || r.width < 100)) {
        resolvido = true;
        if (a) a.remove();
        animando = false;
        resultadoSimples(res, n);
      }
    }, 2500);
    try { await animacao(res, n); } catch (e) {
      console.warn('Summon: animação', e);
      document.querySelectorAll('.sm-anim, .sm-ultra').forEach((x) => x.remove());
      if (!resolvido) { resolvido = true; resultadoSimples(res, n); }
    }
    resolvido = true;
    clearTimeout(vigia);
    animando = false;
  }
  // plano B: mostra o que veio numa janela simples (nunca deixa a pessoa sem ver o que ganhou)
  function resultadoSimples(res, n) {
    try { abrir(); } catch (e) { /* nada */ }
    UI.modal({
      titulo: `🌀 Invocação ${n}x`,
      classe: 'modal-summon-res',
      html: `<div class="smr-grade">${res.map((r) => { const c = Estado.carta(r.id); return `<div class="smr-item r-${r.raridade}" style="--cor:${COR[r.raridade]}">${Cartas.html(c, { mini: true })}<b>${esc(c.nome)}</b><small>${r.novo ? 'NOVO!' : r.copias ? `+${r.copias} cópia${r.copias > 1 ? 's' : ''}` : `+${fmt(r.ouro || 0)} 🪙`}</small></div>`; }).join('')}</div>`,
      botoes: [{ texto: 'Oba!', classe: 'principal' }],
    });
  }

  // ---------- animação ----------
  async function animacao(res, n) {
    const melhor = ORDEM.find((r) => res.some((x) => x.raridade === r)) || 'rara';
    const el = document.createElement('div');
    el.className = `sm-anim cor-${melhor}`;
    el.style.setProperty('--cor', COR[melhor]);
    el.innerHTML = `${fundoMultiverso()}
      <div class="sma-portal"><i class="sma-linha"></i><i class="sma-vortice"></i><i class="sma-vortice v2"></i><i class="sma-borda"></i>
        <svg class="sma-runas" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="78" class="tr" /><text><textPath href="#sma-c" startOffset="0">✦ MULTIVERSO ✦ QUEENS AND KINGS ✦ FENDA ✦ ULTRA ✦ MULTIVERSO ✦ QUEENS AND KINGS ✦</textPath></text><path id="sma-c" d="M100,15 a85,85 0 1,1 -0.1,0" fill="none" stroke="none" /></svg>
        ${Array.from({ length: 18 }, (_, k) => `<i class="sma-part" style="--a:${k * 20}deg;--d:${(0.4 + Math.random() * 0.8).toFixed(2)}s"></i>`).join('')}</div>
      <i class="sma-tunel"></i><i class="sma-flash"></i>
      <div class="sma-cartas n${n}"></div>
      <button class="sma-pular">Pular ⏭</button>`;
    $('app').appendChild(el);
    let pulou = false;
    el.querySelector('.sma-pular').onclick = () => { pulou = true; el.classList.add('pulando'); };

    // 1) a jogada: 3 jogadores tocam a bola e você chuta pro gol (variação conforme o melhor que veio)
    const variante = melhor === 'ultra' ? 'ultra' : melhor === 'lendaria' ? 'lendaria' : 'normal';
    if (typeof GolSummon !== 'undefined') {
      const cena = document.createElement('div');
      el.insertBefore(cena, el.querySelector('.sma-flash'));
      try { await GolSummon.jogar(cena, variante, { pulou: () => pulou, som }); } catch (e) { console.warn('GolSummon', e); }
      el.classList.add('flash');
      await espera(pulou ? 0 : 200);
      cena.remove();
    } else {
      // (reserva) a fenda abre
      el.classList.add('abrindo'); som('carga');
      await espera(pulou ? 0 : 1300);
      el.classList.add('flash');
    }
    // 2) o gol vira a fenda do multiverso e as cartas atravessam
    el.classList.add('tunel');
    som('portal');
    await espera(pulou ? 0 : 450);
    // 3) as cartas atravessam
    el.classList.add('cartas');
    const area = el.querySelector('.sma-cartas');
    area.innerHTML = res.map((r, i) => `<div class="sma-carta r-${r.raridade}" style="--i:${i};--cor:${COR[r.raridade]}" data-i="${i}">
        <div class="sma-giro"><div class="sma-costas"><i></i></div><div class="sma-frente">${Cartas.html(Estado.carta(r.id), { mini: true })}
          ${r.novo ? '<em class="sma-tag novo">NOVO!</em>' : r.copias ? `<em class="sma-tag">+${r.copias} cópia${r.copias > 1 ? 's' : ''}</em>` : `<em class="sma-tag ouro">+${fmt(r.ouro)} 🪙</em>`}</div></div></div>`).join('');
    await espera(pulou ? 100 : 500 + n * 70);
    // 4) revela uma por uma (Ultra tem cinemática própria)
    const cartas = [...area.querySelectorAll('.sma-carta')];
    for (let i = 0; i < res.length; i++) {
      const r = res[i], c = cartas[i];
      if (r.raridade === 'ultra') {
        await cinematicaUltra(Estado.carta(r.id), r);
        el.classList.remove('pulando');
      } else if (r.raridade === 'lendaria' && !pulou) {
        c.classList.add('suspense');
        await espera(650);
      }
      c.classList.add('virada');
      som(r.raridade === 'lendaria' || r.raridade === 'ultra' ? 'coroa' : 'carta');
      if (r.raridade === 'lendaria' || r.raridade === 'ultra') { c.classList.add('explode'); }
      await espera(pulou ? 40 : r.raridade === 'lendaria' ? 700 : n === 1 ? 500 : 230);
    }
    // 5) resumo
    el.classList.add('fim');
    const novos = res.filter((r) => r.novo).length;
    const rodape = document.createElement('div');
    rodape.className = 'sma-rodape';
    rodape.innerHTML = `<p>${novos ? `✨ ${novos} personage${novos > 1 ? 'ns novos' : 'm novo'}!` : 'Cópias guardadas na sua coleção.'}</p>
      <div><button class="btn-modal secundario" id="sma-ok">Voltar</button><button class="btn-modal principal" id="sma-de-novo">De novo · ${n}x 💎 ${n === 10 ? PRECO10 : PRECO1}</button></div>`;
    el.appendChild(rodape);
    if (typeof Assets !== 'undefined') Assets.fill();
    await new Promise((ok) => {
      rodape.querySelector('#sma-ok').onclick = () => ok('ok');
      rodape.querySelector('#sma-de-novo').onclick = () => ok('denovo');
    }).then((acao) => {
      el.classList.add('sumir');
      setTimeout(() => el.remove(), 250);
      abrir();
      if (acao === 'denovo') setTimeout(() => invocar(n), 280);
    });
  }

  // ---------- Ultra: a realidade quebra ----------
  async function cinematicaUltra(c, r) {
    const ov = document.createElement('div');
    ov.className = 'sm-ultra';
    const rachaduras = Array.from({ length: 9 }, (_, k) => {
      const ang = k * 40 + Math.random() * 20, len = 40 + Math.random() * 60;
      const x2 = 50 + Math.cos(ang * Math.PI / 180) * len, y2 = 50 + Math.sin(ang * Math.PI / 180) * len;
      const mx = 50 + (x2 - 50) * 0.5 + (Math.random() * 10 - 5), my = 50 + (y2 - 50) * 0.5 + (Math.random() * 10 - 5);
      return `<path d="M50 50 L${mx.toFixed(1)} ${my.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" style="--k:${k}" />`;
    }).join('');
    const cacos = Array.from({ length: 16 }, (_, k) => {
      const x = (k % 4) * 25, y = Math.floor(k / 4) * 25;
      return `<i class="smu-caco" style="--x:${x}%;--y:${y}%;--dx:${Math.round((x - 37) * 4 + Math.random() * 60 - 30)}px;--dy:${Math.round(200 + Math.random() * 400)}px;--r:${Math.round(Math.random() * 120 - 60)}deg;--d:${(Math.random() * 0.2).toFixed(2)}s"></i>`;
    }).join('');
    const letras = 'ULTRA'.split('').map((l, k) => `<span style="--k:${k}" data-l="${l}">${l}</span>`).join('');
    ov.innerHTML = `
      <div class="smu-glitch"><i></i><i></i><i></i><i></i><i></i></div>
      <svg class="smu-rachas" viewBox="0 0 100 100" preserveAspectRatio="none">${rachaduras}</svg>
      <div class="smu-cacos">${cacos}</div>
      <div class="smu-vazio"><i class="smu-singular"></i><i class="smu-raios"></i><i class="smu-onda o1"></i><i class="smu-onda o2"></i><i class="smu-onda o3"></i></div>
      <div class="smu-revela">
        <div class="smu-velocidade"></div>
        <div class="smu-arte"><img src="${Cartas.arte(c)}" alt="" draggable="false" /><i class="smu-holo"></i></div>
        <div class="smu-texto"><div class="smu-ultra">${letras}</div><b class="smu-nome">${esc(c.nome)}</b><small>${esc(c.tipo)}</small>
          <p>${banner().tema === 'invencivel' ? 'Atravessou o multiverso pra lutar do seu lado!' : 'Um prodígio atravessou o multiverso!'}</p>${r.novo ? '<em class="smu-novo">NOVO!</em>' : `<em class="smu-novo rep">${r.copias ? `+${r.copias} cópia` : `+${fmt(r.ouro)} 🪙`}</em>`}</div>
        ${Array.from({ length: 30 }, (_, k) => `<i class="smu-brilho" style="--x:${Math.round(Math.random() * 100)}%;--d:${(1.8 + Math.random() * 2).toFixed(2)}s;--a:${(Math.random() * 2).toFixed(2)}s;--h:${k * 37 % 360}"></i>`).join('')}
      </div>
      <small class="smu-toque">toque para continuar</small>`;
    $('app').appendChild(ov);
    // 1) glitch: a realidade treme
    som('carga');
    try { navigator.vibrate && navigator.vibrate([30, 30, 30, 30, 30, 30, 200]); } catch (e) { /* nada */ }
    await espera(60); ov.classList.add('f1');
    // 2) racha
    await espera(900); ov.classList.add('f2'); som('esquiva');
    // 3) estilhaça e cai no vazio
    await espera(800); ov.classList.add('f3'); som('explosao');
    // 4) singularidade implode e explode
    await espera(900); ov.classList.add('f4'); som('ultra');
    try { navigator.vibrate && navigator.vibrate([120, 60, 260]); } catch (e) { /* nada */ }
    // 5) o personagem entra
    await espera(700); ov.classList.add('f5');
    await espera(1800); ov.classList.add('pode');
    await new Promise((ok) => { ov.onclick = ok; setTimeout(ok, 9000); });
    ov.classList.add('sumir');
    await espera(300);
    ov.remove();
  }

  // ---------- botão do menu ----------
  function htmlBotao() {
    const b = BANNERS[BANNERS.length - 1];
    return `<span class="bsm-arte">${b.destaque.filter((id) => Estado.carta(id)).map((id) => `<img src="${Cartas.arte(Estado.carta(id))}" alt="" />`).join('')}</span>
      <span class="bsm-txt"><b>🌀 Summon</b><small>${esc(b.sub)} · ${diasRestantes()}d</small></span><em class="bsm-novo">ULTRA</em>`;
  }

  return { abrir, fechar, invocar, info, htmlBotao, dados, chances, pool, sortear, banner, PRECO1, PRECO10, PITY };
})();
