// Telas da ranqueada: botão do menu, tela da ranqueada, procura de partida, resultado, promoção,
// Pro Pass, lista de patentes e histórico de batalhas.
const RanqueUI = (() => {
  let M = {}; // ganchos do menu: { tudo, topo, irPara, mostrarBau, fimDeBatalha, subiuNivel, cartasEsgotadas }
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => UI.fmt(Math.round(n));
  const avatar = (a) => (['coroa', 'estrela', 'coracao', 'espadas', 'lanterna', 'flor'].includes(a) ? `assets/avatares/${a}.svg` : `assets/cartas/${a}_medalhao.png`);

  // emblema com brilho animado atrás (raios girando na cor da patente)
  function emblema(i, tam = 120, opc = {}) {
    const p = Ranque.PATENTES[i];
    return `<div class="emblema t${i}${opc.animado === false ? '' : ' animado'}" style="--tam:${tam}px;--cor:${p.cor};--escura:${p.escura}">
      ${i >= 5 && opc.raios !== false ? '<i class="emb-raios"></i>' : ''}<i class="emb-brilho"></i>
      <img src="${Ranque.img(i, tam <= 64)}" alt="${p.nome}" draggable="false" /></div>`;
  }

  // ---------- botão na tela de batalha ----------
  function atualizarBotao() {
    const b = $('btn-ranq');
    if (!b) return;
    const r = Ranque.dados(), f = Ranque.info(r.pts);
    const pend = Ranque.pendentes() + (r.premioTemporada ? 1 : 0);
    b.style.setProperty('--cor', f.p.cor);
    b.style.setProperty('--escura', f.p.escura);
    b.innerHTML = `<img src="${Ranque.img(f.i, true)}" alt="" /><span class="br-txt"><b>Ranqueada</b><small>${f.nome}${f.prox ? ` · ${fmt(r.pts - f.base)}/${fmt(f.prox - f.base)}` : ` · ${fmt(r.pts)} PR`}</small>
      <i class="br-barra"><i style="width:${Math.round(f.prog * 100)}%"></i></i></span>${r.seq >= 2 ? `<em class="br-seq">🔥${r.seq}</em>` : ''}${pend ? `<em class="br-pend">${pend}</em>` : ''}`;
  }

  // ---------- tela da ranqueada ----------
  function abrir() {
    const r = Ranque.dados(), f = Ranque.info(r.pts);
    if (r.premioTemporada) return premioTemporada(() => abrir());
    fechar();
    const tela = document.createElement('div');
    tela.className = 'tela-ranque';
    tela.style.setProperty('--cor', f.p.cor);
    tela.style.setProperty('--escura', f.p.escura);
    const total = r.v + r.d + (r.e || 0);
    const pv1 = Ranque.previsao(false, f.i), pv2 = Ranque.previsao(true, f.i);
    const nv = Ranque.nivelPasse();
    tela.innerHTML = `
      <div class="tr-fundo"></div>
      <div class="tr-topo"><button class="tr-voltar" id="tr-voltar">‹</button><div><b>Ranqueada</b><small>Temporada de ${Ranque.nomeTemporada()} · termina em ${Ranque.diasRestantes()} dia${Ranque.diasRestantes() > 1 ? 's' : ''}</small></div></div>
      <div class="tr-rolagem">
        <div class="tr-heroi">
          ${emblema(f.i, 190)}
          <div class="tr-nome">${f.nome}</div>
          <div class="tr-pontos">${fmt(r.pts)} <small>PR</small></div>
          ${f.prox ? `<div class="tr-barra"><i style="width:${Math.round(f.prog * 100)}%"></i><span>${fmt(r.pts - f.base)} / ${fmt(f.prox - f.base)} para ${Ranque.info(f.prox).nome}</span></div>` : '<div class="tr-topo-mundo">👑 Topo do ranque! Cada vitória soma PR.</div>'}
          <div class="tr-chips">
            ${r.seq >= 1 ? `<span class="chip-fogo">🔥 ${r.seq} vitória${r.seq > 1 ? 's' : ''} seguida${r.seq > 1 ? 's' : ''}${r.seq >= 1 ? ` · próxima +${Math.min(16, r.seq * 4)} bônus` : ''}</span>` : '<span>🔥 Vença seguidas para ganhar bônus</span>'}
            ${r.escudo ? `<span class="chip-escudo">🛡️ Proteção: ${r.escudo} derrota${r.escudo > 1 ? 's' : ''} sem cair de patente</span>` : ''}
          </div>
        </div>
        <div class="tr-jogar">
          <button class="tr-btn um" id="tr-1v1"><span>⚔️</span><b>Ranqueada 1v1</b><small>Vitória +${pv1.ganho} · derrota -${pv1.perda}</small></button>
          <button class="tr-btn dois" id="tr-2v2"><span>🤝</span><b>Ranqueada 2v2</b><small>Vale mais! Vitória +${pv2.ganho} · derrota -${pv2.perda}</small></button>
        </div>
        <p class="tr-dica">Você pode cair contra bots de <b>patente mais alta</b>: vencer deles vale bônus.</p>
        <button class="tr-passe${r.pro ? ' pro' : ''}" id="tr-passe">
          <div class="trp-topo"><b>${r.pro ? '💠 Pro Pass' : '🎫 Passe da Ranqueada'}</b><small>${nv}/${Ranque.PASSE_NIVEIS}</small></div>
          <div class="trp-barra"><i style="width:${nv >= Ranque.PASSE_NIVEIS ? 100 : ((r.xp % Ranque.PASSE_XP) / Ranque.PASSE_XP) * 100}%"></i></div>
          <div class="trp-final"><span class="trp-evo">🧬</span><span>Nível ${Ranque.PASSE_NIVEIS} do <b>Pro Pass</b>: <b>Carta de Evolução exclusiva</b></span></div>
          ${Ranque.pendentes() ? `<span class="trp-pend">${Ranque.pendentes()} prêmio${Ranque.pendentes() > 1 ? 's' : ''} para pegar!</span>` : ''}
        </button>
        <div class="tr-linha"><button class="tr-mini" id="tr-patentes">🏅 Patentes</button><button class="tr-mini" id="tr-historico">📜 Histórico</button></div>
        <div class="tr-stats">
          <div><b>${r.v}</b><span>Vitórias</span></div><div><b>${r.d}</b><span>Derrotas</span></div>
          <div><b>${total ? Math.round((r.v / total) * 100) : 0}%</b><span>Aproveitamento</span></div><div><b>${r.maiorSeq || 0}</b><span>Maior sequência</span></div>
          <div class="tr-melhor"><img src="${Ranque.img(Ranque.info(r.melhor).i, true)}" alt="" /><b>${Ranque.info(r.melhor).nome}</b><span>Melhor da temporada</span></div>
        </div>
      </div>`;
    $('app').appendChild(tela);
    requestAnimationFrame(() => tela.classList.add('aberta'));
    tela.querySelector('#tr-voltar').onclick = fechar;
    tela.querySelector('#tr-1v1').onclick = () => procurar(false);
    tela.querySelector('#tr-2v2').onclick = () => procurar(true);
    tela.querySelector('#tr-passe').onclick = passe;
    tela.querySelector('#tr-patentes').onclick = patentes;
    tela.querySelector('#tr-historico').onclick = () => historico();
  }
  function fechar() {
    document.querySelectorAll('.tela-ranque').forEach((t) => { t.classList.remove('aberta'); setTimeout(() => t.remove(), 250); });
    atualizarBotao();
  }

  // ---------- procurando partida ----------
  async function procurar(dupla) {
    const d = Estado.d;
    if (d.deck.length < 8) { UI.toast('Você precisa de 8 cartas no deck para a ranqueada.'); return; }
    if (typeof Atualizacao !== 'undefined' && !(await Atualizacao.podeJogar())) return;
    const pt = Ranque.partida(dupla);
    const r = Ranque.dados(), f = Ranque.info(r.pts);
    const el = document.createElement('div');
    el.className = 'procurando';
    el.innerHTML = `<div class="pr-raios"></div>
      <div class="pr-busca"><div class="pr-roleta">${Ranque.PATENTES.map((_, i) => `<img src="${Ranque.img(i, true)}" alt="" style="--i:${i}" />`).join('')}</div>
        <b>Procurando ${dupla ? 'adversários' : 'adversário'}<span class="pontinhos"><i>.</i><i>.</i><i>.</i></span></b><small>${dupla ? 'Ranqueada 2v2' : 'Ranqueada 1v1'}</small>
        <button class="btn-modal secundario" id="pr-cancelar">Cancelar</button></div>`;
    $('app').appendChild(el);
    let cancelou = false;
    el.querySelector('#pr-cancelar').onclick = () => { cancelou = true; el.remove(); };
    await new Promise((ok) => setTimeout(ok, 1600 + Math.random() * 1600));
    if (cancelou) return;
    const lado = (nome, av, info, eu = false) => `<div class="vs-jogador${eu ? ' eu' : ''}">${emblema(info.i, 92, { raios: false })}<img class="vs-av" src="${avatar(av)}" alt="" /><b>${esc(nome)}</b><small>${info.nome}</small></div>`;
    const meuNome = d.nome || 'Você';
    const time = [lado(meuNome, d.avatar, f, true)].concat(pt.parceiro ? [lado(pt.parceiro.nome, pt.parceiro.avatar, pt.parceiro.info)] : []);
    const rivais = pt.rivais.map((b) => lado(b.nome, b.avatar, b.info));
    const pv = Ranque.previsao(dupla, pt.rivalI);
    el.classList.add('achou');
    el.innerHTML = `<div class="pr-raios"></div><div class="vs-tela">
        <div class="vs-time rival">${rivais.join('')}</div>
        <div class="vs-meio"><span>VS</span>${pt.rivalI > pt.meuI ? `<em class="vs-alta">⬆ Patente mais alta! Vitória vale +${pv.ganho} PR</em>` : `<em>Vitória +${pv.ganho} PR · derrota -${pv.perda}</em>`}</div>
        <div class="vs-time meu">${time.join('')}</div></div>`;
    try { navigator.vibrate && navigator.vibrate(80); } catch (e) { /* nada */ }
    await new Promise((ok) => setTimeout(ok, 2300));
    el.classList.add('sumir');
    setTimeout(() => el.remove(), 300);
    fechar();
    Batalha.iniciar({ modo: dupla ? '2v2' : 'ranq', ranque: pt, fim: M.fimDeBatalha });
  }

  // ---------- fim da partida ranqueada ----------
  function fim(r) {
    const rq = r.ranque;
    const res = Ranque.aplicar(r.resultado, { dupla: rq.dupla, rivalI: rq.rivalI, coroas: r.coroas });
    const ouro = r.resultado === 'vitoria' ? 20 + r.coroas * 5 + (rq.dupla ? 10 : 0) : 5;
    Estado.d.ouro += ouro;
    const niveis = Estado.ganharXp(r.resultado === 'vitoria' ? 34 + r.coroas * 5 : r.resultado === 'empate' ? 16 : 12);
    const passe = Passe.ganharPontos(r.resultado, r.coroas);
    Ranque.registrar({ modo: rq.dupla ? 'ranq2v2' : 'ranq', res: r.resultado, cz: [r.coroas, r.coroasInimigo], deck: r.deck, deckRival: r.deckRival, deckParceiro: r.deckParceiro,
      rival: { nome: rq.rivais.map((b) => b.nome).join(' e '), pat: rq.rivalI }, parceiro: rq.parceiro ? rq.parceiro.nome : null, pts: res.delta, pat: res.depois.i, seq: res.seq, dur: r.duracao });
    Estado.salvar();
    const f = res.depois, a = res.antes;
    const titulo = { vitoria: 'Vitória ranqueada! 👑', derrota: 'Derrota ranqueada', empate: 'Empate' }[r.resultado];
    const larguraAntes = a.i === f.i && a.base === f.base ? Math.round(a.prog * 100) : r.resultado === 'vitoria' ? 0 : 100;
    UI.modal({
      titulo,
      classe: `modal-resultado modal-ranq ${r.resultado}`,
      html: `<div class="placar-final"><span class="coroa azul">${r.coroas}</span><small>x</small><span class="coroa vermelha">${r.coroasInimigo}</span></div>
        <div class="rr-emblema" style="--cor:${f.p.cor}">${emblema(f.i, 120)}<b>${f.nome}</b></div>
        <div class="rr-pontos ${res.delta >= 0 ? 'mais' : 'menos'}"><span id="rr-num">${res.delta >= 0 ? '+' : ''}0</span> PR</div>
        <div class="rr-detalhes">${[
          res.bonusRival ? `<span>⬆ Patente alta +${res.bonusRival}</span>` : '',
          res.bonusSeq ? `<span>🔥 Sequência x${res.seq} +${res.bonusSeq}</span>` : '',
          res.bonus3 ? '<span>👑 3 coroas +4</span>' : '',
          res.escudoUsado ? '<span>🛡️ A proteção segurou sua patente!</span>' : '',
          rq.dupla ? '<span>🤝 2v2 vale mais</span>' : '',
        ].join('')}</div>
        ${f.prox ? `<div class="tr-barra rr-barra"><i id="rr-barra" style="width:${larguraAntes}%"></i><span>${fmt(Ranque.dados().pts - f.base)} / ${fmt(f.prox - f.base)}</span></div>` : ''}
        <div class="ganhos"><span><img class="ic-img" data-asset="ui/moeda" alt="" /> +${ouro}</span><span>🎫 +${res.xp.ganho} passe da ranqueada</span></div>
        ${res.caiu ? `<p class="aviso">Você caiu para ${f.nome}. Bora recuperar! 💪</p>` : ''}`,
      botoes: [{ texto: 'Continuar', classe: 'principal', acao: () => {
        Batalha.fechar(); M.tudo(); M.irPara('batalha');
        const depois = () => M.subiuNivel(niveis, () => { M.cartasEsgotadas(); abrir(); });
        if (res.subiuPatente || res.subiuDivisao) promocao(res, depois); else depois();
      } }],
    });
    Assets.fill();
    // contador e barra animados
    const alvo = res.delta, t0 = performance.now();
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / 900), el = $('rr-num');
      if (!el) return;
      el.textContent = `${alvo >= 0 ? '+' : ''}${Math.round(alvo * (1 - (1 - k) ** 3))}`;
      if (k < 1) requestAnimationFrame(passo);
    };
    setTimeout(() => requestAnimationFrame(passo), 300);
    setTimeout(() => { const b = $('rr-barra'); if (b) b.style.width = `${Math.round(f.prog * 100)}%`; }, 450);
    void passe;
  }

  // ---------- subiu de patente / divisão ----------
  function promocao(res, depois) {
    const f = res.depois;
    const el = document.createElement('div');
    el.className = `promocao${res.subiuPatente ? ' grande' : ''}`;
    el.style.setProperty('--cor', f.p.cor);
    el.style.setProperty('--escura', f.p.escura);
    el.innerHTML = `<div class="pm-raios"></div><div class="pm-conteudo">
        <small>${res.subiuPatente ? 'NOVA PATENTE!' : 'SUBIU DE DIVISÃO!'}</small>
        ${emblema(f.i, res.subiuPatente ? 230 : 180)}
        <b>${f.nome}</b>
        ${res.subiuPatente ? '<p>🛡️ Você ganhou 3 derrotas de proteção nesta patente.</p>' : ''}
        <button class="btn-modal principal">Incrível! ✨</button></div>
      ${Array.from({ length: 26 }, (_, i) => `<i class="pm-confete" style="--x:${Math.random() * 100}%;--d:${(Math.random() * 1.6).toFixed(2)}s;--r:${Math.round(Math.random() * 360)}deg;--c:${i % 3 === 0 ? f.p.cor : i % 3 === 1 ? '#fff' : '#FFD25E'}"></i>`).join('')}`;
    $('app').appendChild(el);
    try { navigator.vibrate && navigator.vibrate([60, 60, 120]); } catch (e) { /* nada */ }
    el.querySelector('button').onclick = () => { el.classList.add('sumir'); setTimeout(() => { el.remove(); depois && depois(); }, 300); };
  }

  function premioTemporada(depois) {
    const p = Ranque.dados().premioTemporada;
    if (!p) return depois && depois();
    UI.modal({
      titulo: `🏁 Fim da temporada de ${Ranque.nomeTemporada(p.temporada)}`,
      classe: 'modal-ranq',
      html: `<div class="rr-emblema">${emblema(p.patente, 130)}<b>Sua melhor patente: ${Ranque.PATENTES[p.patente].nome}</b></div>
        <div class="ganhos"><span>💎 +${p.gemas}</span><span><img class="ic-img" data-asset="ui/moeda" alt="" /> +${fmt(p.ouro)}</span></div>
        <p class="aviso">Começou uma nova temporada! Seus pontos foram ajustados e o Passe da Ranqueada recomeçou.</p>`,
      botoes: [{ texto: 'Pegar prêmio', classe: 'principal', acao: () => { Ranque.pegarPremioTemporada(); M.topo(); atualizarBotao(); setTimeout(() => depois && depois(), 250); } }],
    });
    Assets.fill();
  }

  // ---------- Pro Pass ----------
  function passe() {
    const r = Ranque.dados(), nv = Ranque.nivelPasse();
    const trilhas = [['free', 'Grátis'], ['pro', 'Pro']];
    const linha = (n) => `<div class="passe-nv rp-nv${n <= nv ? ' alcancado' : ''}${n === Ranque.PASSE_NIVEIS ? ' final' : ''}"><span class="passe-num">${n}</span>${trilhas.map(([t]) => {
      const rc = Ranque.recompensa(t, n);
      const pego = r.pegos[t].includes(n), pode = Ranque.podePegar(t, n), tranc = !Ranque.temTrilha(t);
      return `<button class="premio ${t}${pego ? ' pego' : ''}${pode ? ' pode' : ''}${tranc ? ' trancado' : ''}${rc.tipo === 'evolucao' ? ' evolucao' : ''}" data-t="${t}" data-n="${n}">
        <span class="premio-ic">${pego ? '✔' : Ranque.icone(rc)}</span><small>${Ranque.texto(rc)}</small>${tranc ? '<i>🔒</i>' : ''}</button>`;
    }).join('')}</div>`;
    const m = UI.modal({
      titulo: '💠 Pro Pass da Ranqueada',
      classe: 'modal-passe modal-propass',
      html: `<div class="pp-destaque"><div class="pp-carta"><div class="pp-carta-verso">🧬</div></div>
          <div><b>Carta de Evolução exclusiva</b><small>Prêmio final do Pro Pass desta temporada. É uma carta nova que ainda está sendo criada: quem pegar recebe ela na atualização em que ela chegar!</small></div></div>
        <p class="aviso">Ganhe XP do passe jogando ranqueadas: vitória 60 (+sequência), derrota 25, 2v2 +10. Termina em ${Ranque.diasRestantes()} dias.</p>
        <button class="comprar-passe pro${r.pro ? ' tem' : ''}" id="pp-comprar"><b>PRO PASS</b><small>${r.pro ? 'Ativo ✔' : `💎 ${Ranque.PRECO_PRO}`}</small></button>
        <div class="passe-cab rp-cab"><span>Nv</span><span>Grátis</span><span>Pro</span></div>
        <div class="passe-trilhas">${Array.from({ length: Ranque.PASSE_NIVEIS }, (_, i) => linha(i + 1)).join('')}</div>`,
      botoes: [{ texto: 'Fechar', classe: 'principal', acao: () => { if (document.querySelector('.tela-ranque')) abrir(); } }],
    });
    const el = m.el;
    const alvo = el.querySelectorAll('.passe-nv')[Math.max(0, nv - 2)];
    if (alvo) setTimeout(() => alvo.scrollIntoView({ block: 'center' }), 50);
    el.querySelectorAll('.premio').forEach((b) => (b.onclick = () => {
      const t = b.dataset.t, n = +b.dataset.n;
      if (!Ranque.temTrilha(t)) return UI.toast('Compre o Pro Pass para pegar');
      if (n > Ranque.nivelPasse()) return UI.toast(`Chegue ao nível ${n} do passe`);
      const res = Ranque.pegar(t, n);
      if (!res) return;
      b.classList.add('pego'); b.classList.remove('pode'); b.querySelector('.premio-ic').textContent = '✔';
      M.topo();
      if (res.extra && res.extra.bau) M.mostrarBau(res.extra.bau, res.extra.abertura);
      else if (res.extra && res.extra.evolucao) UI.modal({ titulo: '🧬 Carta de Evolução garantida!', html: '<p>Você garantiu a <b>Carta de Evolução exclusiva</b> desta temporada! Ela ainda está sendo criada e vai aparecer na sua coleção na atualização em que chegar. 💜</p>' });
      else if (res.extra && res.extra.carta) UI.toast(`🃏 +${res.extra.qtd} ${res.extra.carta.nome}!`);
      else UI.toast(`+ ${Ranque.texto(res.r)}!`);
    }));
    el.querySelector('#pp-comprar').onclick = () => {
      if (Ranque.dados().pro) return UI.toast('Você já tem o Pro Pass');
      UI.modal({
        titulo: 'Comprar o Pro Pass?',
        html: `<p>Libera a trilha <b>Pro</b> da ranqueada desta temporada: muito ouro, gemas, baús de ouro, cartas épicas e lendárias e, no nível ${Ranque.PASSE_NIVEIS}, a <b>Carta de Evolução exclusiva</b> 🧬.</p><p><b>💎 ${Ranque.PRECO_PRO} gemas</b></p>`,
        botoes: [{ texto: 'Agora não', classe: 'secundario' }, { texto: 'Comprar', classe: 'principal', desativado: Estado.d.gemas < Ranque.PRECO_PRO, motivo: `Faltam ${Ranque.PRECO_PRO - Estado.d.gemas} gemas`,
          acao: () => { const c = Ranque.comprarPro(); if (c.ok) { UI.toast('Pro Pass ativado! 💠'); m.fechar(); M.topo(); setTimeout(passe, 250); } } }],
      });
    };
  }

  // ---------- todas as patentes ----------
  function patentes() {
    const r = Ranque.dados(), meu = Ranque.info(r.pts).i;
    const faixa = (i) => i < 8 ? `${fmt(i * 300)} – ${fmt(i * 300 + 299)} PR · III, II, I` : i === 8 ? `${fmt(Ranque.INICIO_MESTRE)} – ${fmt(Ranque.INICIO_PRO - 1)} PR` : `${fmt(Ranque.INICIO_PRO)}+ PR`;
    UI.modal({
      titulo: '🏅 Patentes',
      classe: 'modal-patentes',
      html: `<div class="lista-patentes">${Ranque.PATENTES.map((p, i) => i).reverse().map((i) => `<div class="lp-item${i === meu ? ' atual' : ''}${i > meu ? ' falta' : ''}" style="--cor:${Ranque.PATENTES[i].cor}">
          ${emblema(i, 76, { raios: false, animado: i === meu })}<div><b>${Ranque.PATENTES[i].nome}</b><small>${faixa(i)}</small></div>${i === meu ? '<em>Você está aqui</em>' : ''}</div>`).join('')}</div>`,
      botoes: [{ texto: 'Fechar', classe: 'principal' }],
    });
  }

  // ---------- histórico de batalhas ----------
  const MODOS = { normal: '⚔️ Batalha', elixir2x: '⚡ Elixir em dobro', x1: '🤺 X1', '2v2': '🤝 2v2', ranq: '🏅 Ranqueada', ranq2v2: '🏅 Ranqueada 2v2' };
  function quando(t) {
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'agora';
    if (s < 3600) return `há ${Math.floor(s / 60)} min`;
    if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
    return `há ${Math.floor(s / 86400)} dia${s >= 172800 ? 's' : ''}`;
  }
  // feitiços e o barril não têm medalhão: usam a arte da carta
  const medalhao = (id) => { const c = Estado.carta(id); return c && (c.feitico || c.barril) ? Cartas.arte(c) : `assets/cartas/${id}_medalhao.png`; };
  const meds = (ids) => (ids || []).slice(0, 8).map((id) => `<img src="${medalhao(id)}" alt="" loading="lazy" />`).join('');
  function historico() {
    const h = Ranque.historico();
    const item = (e) => {
      const ganhou = e.res === 'vitoria', perdeu = e.res === 'derrota';
      return `<div class="hist ${e.res}">
        <div class="hist-topo"><span class="hist-modo">${MODOS[e.modo] || e.modo}</span><b>${ganhou ? 'Vitória' : perdeu ? 'Derrota' : 'Empate'} ${e.cz ? `${e.cz[0]}-${e.cz[1]}` : ''}</b><small>${quando(e.t)}</small></div>
        <div class="hist-chips">${e.trof !== undefined && e.trof !== null ? `<span>🏆 ${e.trof >= 0 ? '+' : ''}${e.trof}</span>` : ''}${e.pts !== undefined && e.pts !== null ? `<span class="pr">PR ${e.pts >= 0 ? '+' : ''}${e.pts}</span>` : ''}${e.seq >= 2 ? `<span>🔥${e.seq}</span>` : ''}${e.pat !== undefined && e.pat !== null ? `<span class="hist-pat"><img src="${Ranque.img(e.pat, true)}" alt="" />${Ranque.PATENTES[e.pat].nome}</span>` : ''}${e.dur ? `<span>⏱ ${Math.floor(e.dur / 60)}:${String(e.dur % 60).padStart(2, '0')}</span>` : ''}</div>
        <div class="hist-decks">
          <div><small>Você${e.parceiro ? ` + ${esc(e.parceiro)}` : ''}</small><div class="hist-meds">${meds(e.deck)}</div></div>
          ${e.deckRival && e.deckRival.length ? `<div><small>vs ${e.rival && e.rival.nome ? esc(e.rival.nome) : 'Adversário'}${e.rival && e.rival.pat !== undefined && e.rival.pat !== null ? ` <img class="hist-pat-mini" src="${Ranque.img(e.rival.pat, true)}" alt="" />` : ''}</small><div class="hist-meds rival">${meds(e.deckRival)}</div></div>` : ''}
        </div></div>`;
    };
    const v = h.filter((e) => e.res === 'vitoria').length;
    UI.modal({
      titulo: '📜 Histórico de batalhas',
      classe: 'modal-historico',
      html: h.length ? `<p class="hist-resumo">Últimas ${h.length} batalhas · <b>${v}</b> vitórias · <b>${h.length - v}</b> outras</p><div class="lista-hist">${h.map(item).join('')}</div>`
        : '<p class="aviso">Você ainda não tem batalhas no histórico. Jogue uma partida! ⚔️</p>',
      botoes: [{ texto: 'Fechar', classe: 'principal' }],
    });
  }

  function init(ganchos) {
    M = ganchos;
    const b = $('btn-ranq');
    if (b) b.onclick = abrir;
    atualizarBotao();
  }

  return { init, abrir, fechar, fim, atualizarBotao, historico, patentes, passe, emblema, promocao };
})();
