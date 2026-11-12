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
            <span class="chip-epica">💥 Vitória Épica (3x0): +${Ranque.BONUS_EPICA} PR${r.epicas ? ` · ${r.epicas} nesta temporada` : ''}</span>
            <span class="chip-xp">⚡ XP turbinado na ranqueada</span>
            ${f.i >= 6 ? '<span class="chip-dificil">☠️ Do Platina pra cima os rivais não aliviam</span>' : ''}
            ${r.escudo ? `<span class="chip-escudo">🛡️ Proteção: ${r.escudo} derrota${r.escudo > 1 ? 's' : ''} sem cair de patente</span>` : ''}
          </div>
        </div>
        <div class="tr-jogar">
          <button class="tr-btn um" id="tr-1v1"><span>⚔️</span><b>Ranqueada 1v1</b><small>Vitória +${pv1.ganho} · derrota -${pv1.perda}</small></button>
          <button class="tr-btn dois" id="tr-2v2"><span>🤝</span><b>Ranqueada 2v2</b><small>Vale mais! Vitória +${pv2.ganho} · derrota -${pv2.perda}</small></button>
        </div>
        <p class="tr-dica">Você pode cair contra rivais de <b>patente mais alta</b>: cada patente acima vale <b>+12 PR</b> e cada divisão acima <b>+3 PR</b>, e a derrota pra eles tira menos.</p>
        <button class="tr-passe${r.pro ? ' pro' : ''}" id="tr-passe">
          <div class="trp-topo"><b>${r.pro ? '💠 Pro Pass' : '🎫 Passe da Ranqueada'}</b><small>${nv}/${Ranque.PASSE_NIVEIS}</small></div>
          <div class="trp-barra"><i style="width:${nv >= Ranque.PASSE_NIVEIS ? 100 : ((r.xp % Ranque.PASSE_XP) / Ranque.PASSE_XP) * 100}%"></i></div>
          <div class="trp-final"><span class="trp-evo">🧬</span><span>Nível ${Ranque.PASSE_NIVEIS} do <b>Pro Pass</b>: <b>Gojo Satoru</b>, carta de Evolução exclusiva</span></div>
          ${Ranque.pendentes() ? `<span class="trp-pend">${Ranque.pendentes()} prêmio${Ranque.pendentes() > 1 ? 's' : ''} para pegar!</span>` : ''}
        </button>
        <div class="tr-linha"><button class="tr-mini" id="tr-patentes">🏅 Patentes</button><button class="tr-mini" id="tr-historico">📜 Histórico</button><button class="tr-mini" id="tr-top">🌍 Top global</button></div>
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
    tela.querySelector('#tr-2v2').onclick = escolher2v2;
    tela.querySelector('#tr-passe').onclick = passe;
    tela.querySelector('#tr-patentes').onclick = patentes;
    tela.querySelector('#tr-historico').onclick = () => historico();
    tela.querySelector('#tr-top').onclick = () => { if (window.MenuAPI) MenuAPI.topGlobal('ranque'); };
  }
  function fechar() {
    document.querySelectorAll('.tela-ranque').forEach((t) => { t.classList.remove('aberta'); setTimeout(() => t.remove(), 250); });
    atualizarBotao();
  }

  // ---------- procurando partida ----------
  // tela de VS (serve pra quem procura e pro amigo que está na dupla)
  function telaVS(el, pt) {
    const d = Estado.d, f = Ranque.info(Ranque.dados().pts);
    // cartões de batalha: o seu contra o do rival (no 2v2, os dois de cada lado ficam menores)
    const tam = pt.dupla ? 'mini' : 'medio';
    const time = [Titulos.meuCartao({ tam, lado: 'eu' })].concat(pt.parceiro ? [pt.parceiro.humano ? Titulos.cartao({ nome: pt.parceiro.nome, estilo: pt.parceiro.estiloNome, avatar: pt.parceiro.avatar, pts: pt.parceiro.pts, favorita: pt.parceiro.favorita || null, titulo: pt.parceiro.titulo, raroTitulo: pt.parceiro.raroTitulo, trofeus: pt.parceiro.trofeus, nivel: pt.parceiro.nivel, cla: pt.parceiro.cla }, { tam }) : Titulos.cartaoBot(pt.parceiro, { tam })] : []);
    const rivais = pt.rivais.map((b) => Titulos.cartaoBot(b, { tam, lado: 'rival' }));
    const meuI = f.i;
    const pv = Ranque.previsao(pt.dupla, pt.rivalI, pt.rivalPts);
    el.classList.add('achou');
    el.innerHTML = `<div class="pr-raios"></div><div class="vs-tela vs-cartoes${pt.dupla ? ' dupla' : ''}">
        <div class="vs-time rival">${rivais.join('')}</div>
        <div class="vs-meio"><span>VS</span>${pt.rivalI > meuI ? `<em class="vs-alta">⬆ Rival mais forte! Vitória vale +${pv.ganho} PR</em>` : pv.bonusRival ? `<em class="vs-alta">⬆ Rival acima de você: +${pv.ganho} PR</em>` : `<em>Vitória +${pv.ganho} PR · derrota -${pv.perda}</em>`}</div>
        <div class="vs-time meu">${time.join('')}</div></div>`;
    try { navigator.vibrate && navigator.vibrate(80); } catch (e) { /* nada */ }
  }
  function telaProcurando(dupla) {
    const el = document.createElement('div');
    el.className = 'procurando';
    el.innerHTML = `<div class="pr-raios"></div>
      <div class="pr-busca"><div class="pr-roleta">${Ranque.PATENTES.map((_, i) => `<img src="${Ranque.img(i, true)}" alt="" style="--i:${i}" />`).join('')}</div>
        <b>Procurando ${dupla ? 'adversários' : 'adversário'}<span class="pontinhos"><i>.</i><i>.</i><i>.</i></span></b><small>${dupla ? 'Ranqueada 2v2' : 'Ranqueada 1v1'}</small>
        <button class="btn-modal secundario" id="pr-cancelar">Cancelar</button></div>`;
    $('app').appendChild(el);
    return el;
  }

  // amigo = perfil do amigo que está na sua dupla (ranqueada 2v2 online)
  async function procurar(dupla, amigo = null) {
    const d = Estado.d;
    if (d.deck.length < 8) { UI.toast('Você precisa de 8 cartas no deck para a ranqueada.'); return; }
    if (!amigo && typeof Atualizacao !== 'undefined' && !(await Atualizacao.podeJogar())) return;
    const pt = Ranque.partida(dupla, amigo);
    if (amigo) {
      // o amigo vê a mesma partida (pra ele, o parceiro sou eu)
      X1.anunciarPartida({ ...pt, parceiro: { nome: d.nome, avatar: d.avatar, estiloNome: Passe.estiloNome(), ...X1.cartaoPublico(), pts: Ranque.dados().pts, humano: true } }).catch(() => {});
    }
    const r = Ranque.dados(), f = Ranque.info(r.pts);
    const el = document.createElement('div');
    el.className = 'procurando';
    el.innerHTML = `<div class="pr-raios"></div>
      <div class="pr-busca"><div class="pr-roleta">${Ranque.PATENTES.map((_, i) => `<img src="${Ranque.img(i, true)}" alt="" style="--i:${i}" />`).join('')}</div>
        <b>Procurando ${dupla ? 'adversários' : 'adversário'}<span class="pontinhos"><i>.</i><i>.</i><i>.</i></span></b><small>${dupla ? 'Ranqueada 2v2' : 'Ranqueada 1v1'}</small>
        <button class="btn-modal secundario" id="pr-cancelar">Cancelar</button></div>`;
    $('app').appendChild(el);
    let cancelou = false;
    el.querySelector('#pr-cancelar').onclick = () => { cancelou = true; el.remove(); if (amigo) X1.cancelar(); };
    if (amigo) el.querySelector('#pr-cancelar').remove(); // com amigo a partida já foi anunciada
    await new Promise((ok) => setTimeout(ok, 1600 + Math.random() * 1600));
    if (cancelou) return;
    telaVS(el, pt);
    await new Promise((ok) => setTimeout(ok, 3300)); // tempo pra ver os cartões de batalha
    el.classList.add('sumir');
    setTimeout(() => el.remove(), 300);
    fechar();
    if (amigo) X1.comecar2v2(M.fimDeBatalha, { ranque: pt });
    else Batalha.iniciar({ modo: dupla ? '2v2' : 'ranq', ranque: pt, fim: M.fimDeBatalha });
  }

  // o amigo da dupla: vê a procura e o VS ao mesmo tempo que quem chamou
  function procurandoConvidado(rq) {
    if (!rq) return;
    const el = telaProcurando(true);
    el.querySelector('#pr-cancelar').remove();
    const pt = { ...rq, meuI: Ranque.info(Ranque.dados().pts).i };
    setTimeout(() => telaVS(el, pt), 1500);
    // some quando a batalha começar
    const fimVS = setInterval(() => { if (document.body.classList.contains('em-batalha') || !document.body.contains(el)) { clearInterval(fimVS); el.classList.add('sumir'); setTimeout(() => el.remove(), 300); } }, 200);
    setTimeout(() => { clearInterval(fimVS); el.remove(); }, 15000);
  }

  // ---------- ranqueada 2v2: com parceiro IA ou com um amigo ----------
  function escolher2v2() {
    const m = UI.modal({
      titulo: '🤝 Ranqueada 2v2',
      classe: 'modal-ranq modal-escolher2v2',
      html: `<p>Com quem você quer jogar? Os dois ganham (ou perdem) pontos na própria patente.</p>
        <button class="tr-btn dois e2-btn" id="e2-amigo"><span>👥</span><b>Com um amigo</b><small>Vocês dois contra uma dupla de bots com patente</small></button>
        <button class="tr-btn um e2-btn" id="e2-ia"><span>🤖</span><b>Com parceiro IA</b><small>Um bot com patente parecida com a sua</small></button>`,
      botoes: [{ texto: 'Voltar', classe: 'secundario' }],
    });
    m.el.querySelector('#e2-ia').onclick = () => { m.fechar(); procurar(true); };
    m.el.querySelector('#e2-amigo').onclick = () => { m.fechar(); salaRanq(); };
  }

  async function salaRanq() {
    if (!Conta.logado()) { UI.toast('Entre numa conta para jogar com amigos!'); return; }
    if (Estado.d.deck.length < 8) { UI.toast('Você precisa de 8 cartas no deck para a ranqueada.'); return; }
    if (typeof Atualizacao !== 'undefined' && !(await Atualizacao.podeJogar())) return;
    let parceiro = null, fechada = false;
    const chamados = new Set();
    const m = UI.modal({ titulo: '👥 Dupla da ranqueada', classe: 'modal-x1 modal-sala2v2', html: '<div class="x1-carregando"></div>',
      botoes: [{ texto: 'Cancelar', classe: 'secundario', acao: () => { fechada = true; X1.cancelar(); } }] });
    m.el.addEventListener('click', (e) => { if (e.target === m.el) e.stopPropagation(); }, true);
    const corpo = m.el.querySelector('.modal-corpo');
    const f = Ranque.info(Ranque.dados().pts);
    const desenhar = () => {
      const caixa = corpo.querySelector('#rq-dupla');
      if (!caixa) return;
      const fp = parceiro ? Ranque.info(parceiro.ranque || 0) : null;
      caixa.innerHTML = `<div class="rq-dupla-linha">
          <div class="vaga azul eu">${emblema(f.i, 46, { raios: false, animado: false })}<div><b>${esc(Estado.d.nome)}</b><small>${f.nome}</small></div></div>
          <span class="rq-mais">+</span>
          <div class="vaga azul${parceiro ? '' : ' vazia'}">${parceiro ? `${emblema(fp.i, 46, { raios: false, animado: false })}<div><b>${esc(parceiro.nome)}</b><small>${fp.nome}</small></div>` : '<span class="vaga-ia">❔</span><div><b>Esperando…</b><small>chame um amigo</small></div>'}</div>
        </div>`;
      const b = corpo.querySelector('#rq-procurar');
      b.classList.toggle('desativado', !parceiro);
      b.textContent = parceiro ? '🏅 Procurar partida' : 'Esperando o amigo entrar…';
    };
    try {
      const cod = await X1.criarSala({
        modo: '2v2', ranq: true,
        aoMudarVagas: (v) => {
          const antes = parceiro;
          parceiro = v.azul2 || null;
          if (parceiro && !antes) UI.toast(`${esc(parceiro.nome)} entrou na dupla! 🤝`);
          desenhar();
        },
        aoResposta: (r) => { if (r && r.nome) UI.toast(`${esc(r.nome)} ${r.r === 'ocupado' ? 'está numa batalha agora' : 'não pode agora'}.`); },
      });
      if (fechada) { X1.cancelar(); return; }
      corpo.innerHTML = `<div id="rq-dupla"></div>
        <div class="sala-codigo"><small>Código</small><b>${cod}</b><button class="btn-peq" id="rq-copiar">📋 Copiar</button></div>
        <div class="titulo-conquistas">Chamar um amigo</div>
        <div id="rq-amigos" class="x1-amigos"><div class="x1-carregando"></div></div>
        <button class="btn-modal principal sala-comecar desativado" id="rq-procurar">Esperando o amigo entrar…</button>`;
      desenhar();
      corpo.querySelector('#rq-copiar').onclick = () => navigator.clipboard?.writeText(cod).then(() => UI.toast('Código copiado!'), () => {});
      Amigos.listar().then((lista) => {
        const caixa = corpo.querySelector('#rq-amigos');
        if (!caixa) return;
        caixa.innerHTML = lista.length ? `<div class="lista-jogadores">${lista.map((p) => `<div class="linha-jogador"><div class="lj-avatar"><img src="${avatar(p.avatar || 'coroa')}" alt="" /></div><div class="lj-nome"><b>${esc(p.nome || 'Jogador')}</b><small>${Amigos.online(p) ? '<span class="txt-on">online</span> · ' : ''}${p.ranque ? `🏅 ${Ranque.info(p.ranque.pts).nome}` : 'Sem patente ainda'}</small></div><button class="btn-modal principal btn-chamar" data-chamar="${p.uid}">🤝 Chamar</button></div>`).join('')}</div>`
          : '<p class="aviso">Adicione amigos em <b>👥 Amigos</b> ou mande o código.</p>';
        caixa.querySelectorAll('[data-chamar]').forEach((b) => (b.onclick = async (e) => {
          e.stopPropagation();
          const p = lista.find((x) => x.uid === b.dataset.chamar);
          if (chamados.has(p.uid)) return;
          try { await Amigos.convidar(p.uid, cod, 'ranq2v2'); chamados.add(p.uid); b.textContent = 'Chamado ✓'; b.classList.add('desativado'); UI.toast(`Convite enviado pra ${esc(p.nome || 'seu amigo')}!`); } catch (er) { UI.toast('Não deu pra mandar o convite.'); }
        }));
      }).catch(() => {});
      corpo.querySelector('#rq-procurar').onclick = () => {
        if (!parceiro) return UI.toast('Espere seu amigo entrar na dupla!');
        if (typeof Atualizacao !== 'undefined' && Atualizacao.versaoDoAmigo(parceiro.versao) !== 'igual') return UI.toast(`${esc(parceiro.nome)} precisa atualizar o jogo antes!`);
        fechada = true; m.fechar();
        procurar(true, parceiro);
      };
    } catch (e) {
      m.fechar(); X1.cancelar();
      UI.toast(e.message || 'Não deu para criar a dupla.');
      console.error(e);
    }
  }

  // ---------- fim da partida ranqueada ----------
  function fim(r) {
    const rq = r.ranque;
    const rivalPts = rq.rivalPts != null ? rq.rivalPts : Math.max(...(rq.rivais || []).map((b) => b.pts || 0), 0);
    const res = Ranque.aplicar(r.resultado, { dupla: rq.dupla, rivalI: rq.rivalI, coroas: r.coroas, coroasInimigo: r.coroasInimigo, rivalPts });
    const ouro = Math.round((r.resultado === 'vitoria' ? 20 + r.coroas * 5 + (rq.dupla ? 10 : 0) : 5) * (res.epica ? 1.5 : 1));
    Estado.d.ouro += ouro;
    // XP turbinado na ranqueada (bem mais que na batalha normal)
    const xpConta = Math.round((r.resultado === 'vitoria' ? 60 + r.coroas * 8 : r.resultado === 'empate' ? 28 : 20) * (res.epica ? 1.5 : 1));
    const niveis = Estado.ganharXp(xpConta);
    const passe = Passe.ganharPontos(r.resultado, r.coroas);
    Ranque.registrar({ modo: rq.dupla ? 'ranq2v2' : 'ranq', res: r.resultado, cz: [r.coroas, r.coroasInimigo], deck: r.deck, deckRival: r.deckRival, deckParceiro: r.deckParceiro,
      rival: { nome: rq.rivais.map((b) => b.nome).join(' e '), pat: rq.rivalI }, parceiro: rq.parceiro ? rq.parceiro.nome : null, pts: res.delta, pat: res.depois.i, seq: res.seq, dur: r.duracao });
    Estado.salvar();
    const f = res.depois, a = res.antes;
    const titulo = { vitoria: 'Vitória ranqueada! 👑', derrota: 'Derrota ranqueada', empate: 'Empate' }[r.resultado];
    const larguraAntes = a.i === f.i && a.base === f.base ? Math.round(a.prog * 100) : r.resultado === 'vitoria' ? 0 : 100;
    UI.modal({
      titulo,
      classe: `modal-resultado modal-ranq ${r.resultado}${res.epica ? ' epica' : ''}`,
      html: `${res.epica ? '<div class="rr-epica"><b>VITÓRIA ÉPICA</b><small>3 coroas sem perder nenhuma torre!</small></div>' : ''}<div class="placar-final"><span class="coroa azul">${r.coroas}</span><small>x</small><span class="coroa vermelha">${r.coroasInimigo}</span></div>
        <div class="rr-emblema" style="--cor:${f.p.cor}">${emblema(f.i, 120)}<b>${f.nome}</b></div>
        <div class="rr-pontos ${res.delta >= 0 ? 'mais' : 'menos'}"><span id="rr-num">${res.delta >= 0 ? '+' : ''}0</span> PR</div>
        <div class="rr-detalhes">${[
          res.bonusRival ? `<span>⬆ Patente alta +${res.bonusRival}</span>` : '',
          res.bonusSeq ? `<span>🔥 Sequência x${res.seq} +${res.bonusSeq}</span>` : '',
          res.bonusEpica ? `<span class="rr-ep">💥 Vitória Épica +${res.bonusEpica}</span>` : '',
          res.bonus3 ? '<span>👑 3 coroas +4</span>' : '',
          res.escudoUsado ? '<span>🛡️ A proteção segurou sua patente!</span>' : '',
          rq.dupla ? '<span>🤝 2v2 vale mais</span>' : '',
        ].join('')}</div>
        ${f.prox ? `<div class="tr-barra rr-barra"><i id="rr-barra" style="width:${larguraAntes}%"></i><span>${fmt(Ranque.dados().pts - f.base)} / ${fmt(f.prox - f.base)}</span></div>` : ''}
        <div class="ganhos"><span><img class="ic-img" data-asset="ui/moeda" alt="" /> +${ouro}</span><span>⚡ +${xpConta} XP</span><span>🎫 +${res.xp.ganho} passe da ranqueada</span></div>
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
  // Inspirada nas promoções de rank dos jogos de celular: o emblema antigo treme, racha e explode,
  // o novo desce com impacto, raios e onda de choque, e a faixa com o nome entra deslizando.
  function promocao(res, depois) {
    const f = res.depois, a = res.antes, grande = res.subiuPatente;
    const el = document.createElement('div');
    el.className = `promocao nova${grande ? ' grande' : ''}`;
    el.style.setProperty('--cor', f.p.cor);
    el.style.setProperty('--escura', f.p.escura);
    el.style.setProperty('--cor-velha', a.p.cor);
    const cacos = Array.from({ length: 14 }, (_, k) => {
      const ang = (k / 14) * Math.PI * 2 + Math.random() * 0.4, dist = 110 + Math.random() * 120;
      return `<i class="pm-caco" style="--dx:${Math.round(Math.cos(ang) * dist)}px;--dy:${Math.round(Math.sin(ang) * dist)}px;--rot:${Math.round(Math.random() * 540 - 270)}deg;--tam:${14 + Math.round(Math.random() * 18)}px"></i>`;
    }).join('');
    const brilhos = Array.from({ length: 22 }, () => `<i class="pm-brilho" style="--x:${Math.round(Math.random() * 100)}%;--d:${(2.2 + Math.random() * 2.5).toFixed(2)}s;--a:${(Math.random() * 3).toFixed(2)}s;--s:${(0.5 + Math.random()).toFixed(2)}"></i>`).join('');
    const letras = (grande ? 'NOVA PATENTE!' : 'NOVA DIVISÃO!').split('').map((c, k) => `<span style="--k:${k}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    el.innerHTML = `<div class="pm-fundo"></div><div class="pm-raios"></div><div class="pm-raios dois"></div>${brilhos}
      <div class="pm-palco">
        <div class="pm-velho">${emblema(a.i, grande ? 190 : 160, { raios: false })}<i class="pm-rachaduras"></i></div>
        <div class="pm-cacos">${cacos}</div>
        <i class="pm-flash"></i><i class="pm-onda"></i><i class="pm-onda dois"></i>
        <div class="pm-novo">${emblema(f.i, grande ? 230 : 180)}</div>
      </div>
      <div class="pm-textos">
        <small class="pm-titulo">${letras}</small>
        <div class="pm-faixa"><b>${f.nome}</b></div>
        ${grande ? `<p class="pm-de">${esc(a.nome)} ➜ ${esc(f.nome)}</p><p class="pm-premio">🛡️ +3 derrotas de proteção nesta patente</p>` : `<p class="pm-de">${esc(a.nome)} ➜ ${esc(f.nome)}</p>`}
        <button class="btn-modal principal">Incrível! ✨</button>
      </div>
      ${Array.from({ length: grande ? 34 : 18 }, (_, k) => `<i class="pm-confete" style="--x:${Math.random() * 100}%;--d:${(2.4 + Math.random() * 1.6).toFixed(2)}s;--r:${Math.round(Math.random() * 360)}deg;--c:${k % 3 === 0 ? f.p.cor : k % 3 === 1 ? '#fff' : '#FFD25E'}"></i>`).join('')}`;
    $('app').appendChild(el);
    const T = grande ? 1 : 0.75; // a de divisão é mais curtinha
    el.style.setProperty('--t', T);
    const som = (n) => { try { typeof Som !== 'undefined' && Som.tocar(n); } catch (e) { /* nada */ } };
    som('carga');
    setTimeout(() => { el.classList.add('explodiu'); som('explosao'); }, 1150 * T);
    setTimeout(() => { el.classList.add('impacto'); som('patente'); try { navigator.vibrate && navigator.vibrate([90, 40, 160]); } catch (e) { /* nada */ } }, 1500 * T);
    setTimeout(() => el.classList.add('textos'), 1900 * T);
    // tocar na tela pula direto pro final
    el.addEventListener('pointerdown', (ev) => { if (!el.classList.contains('textos') && !ev.target.closest('button')) { el.classList.add('explodiu', 'impacto', 'textos', 'pulou'); } });
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
      return `<button class="premio ${t} ${Premios.classe(rc)}${pego ? ' pego' : ''}${pode ? ' pode' : ''}${tranc ? ' trancado' : ''}${rc.tipo === 'evolucao' ? ' evolucao' : ''}${n % 5 === 0 ? ' grande' : ''}" data-t="${t}" data-n="${n}">
        <span class="premio-ic">${Ranque.icone(rc)}</span><small>${Ranque.texto(rc)}</small>${tranc ? '<i>🔒</i>' : ''}${pego ? '<em class="premio-ok">✔</em>' : ''}</button>`;
    }).join('')}</div>`;
    const m = UI.modal({
      titulo: '💠 Pro Pass da Ranqueada',
      classe: 'modal-passe modal-propass passe-novo',
      html: `<div class="passe-topo"><div class="pt-nivel"><small>NÍVEL</small><b>${nv}</b></div>
          <div class="pt-barra"><div><i style="width:${nv >= Ranque.PASSE_NIVEIS ? 100 : ((r.xp || 0) % Ranque.PASSE_XP) / Ranque.PASSE_XP * 100}%"></i></div><small>${nv >= Ranque.PASSE_NIVEIS ? 'Pro Pass completo! 🎉' : `${(r.xp || 0) % Ranque.PASSE_XP}/${Ranque.PASSE_XP} XP para o nível ${nv + 1}`}</small></div>
          <div class="pt-dias">⏳ ${Ranque.diasRestantes()}d</div></div>
        <div class="pp-destaque"><div class="pp-carta"><div class="pp-carta-verso">🧬</div></div>
          <div><b>🧬 Gojo Satoru · Evolução</b><small>Prêmio final do Pro Pass desta temporada. Infinito, Azul, Vermelho, Vazio Púrpura e, evoluído, a Expansão de Domínio: Vazio Infinito. Só dá pra ganhar aqui!</small></div></div>
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
      b.classList.add('pego', 'pegando'); b.classList.remove('pode'); b.insertAdjacentHTML('beforeend', '<em class="premio-ok">✔</em>');
      M.topo();
      if (res.extra && res.extra.bau) M.mostrarBau(res.extra.bau, res.extra.abertura);
      else if (res.extra && res.extra.evolucao) revelarEvolucao(res.extra.carta);
      else Premios.avisar(res.r, res.extra);
    }));
    el.querySelector('#pp-comprar').onclick = () => {
      if (Ranque.dados().pro) return UI.toast('Você já tem o Pro Pass');
      UI.modal({
        titulo: 'Comprar o Pro Pass?',
        html: `<p>Libera a trilha <b>Pro</b> da ranqueada desta temporada: muito ouro, gemas, baús de ouro, cartas épicas e lendárias e, no nível ${Ranque.PASSE_NIVEIS}, o <b>Gojo Satoru</b>, carta de Evolução exclusiva 🧬.</p><p><b>💎 ${Ranque.PRECO_PRO} gemas</b></p>`,
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
  const MODOS = { normal: '⚔️ Batalha', elixir2x: '⚡ Elixir em dobro', x1: '🤺 X1', '2v2': '🤝 2v2', ranq: '🏅 Ranqueada', ranq2v2: '🏅 Ranqueada 2v2', evento: '🎪 Evento', tutorial: '🎓 Tutorial' };
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

  // tela de "Evolução desbloqueada"
  function revelarEvolucao(c) {
    if (!c) return;
    if (M.tudo) M.tudo();
    const el = document.createElement('div');
    el.className = 'revela-evo';
    el.innerHTML = `<div class="re-raios"></div><div class="re-conteudo">
        <small>CARTA DE EVOLUÇÃO EXCLUSIVA</small>
        <div class="evo-palco grande"><video class="evo-video" src="assets/evolucao/raios.mp4" autoplay muted loop playsinline></video>${Cartas.html(c, { mini: true })}</div>
        <b>${esc(c.nome)}</b>
        <p>${esc(c.evolucao ? c.evolucao.descricao : '')}</p>
        <button class="btn-modal principal">Incrível! 🧬</button></div>`;
    $('app').appendChild(el);
    try { navigator.vibrate && navigator.vibrate([80, 50, 160]); } catch (e) { /* nada */ }
    el.querySelector('button').onclick = () => { el.classList.add('sumir'); setTimeout(() => el.remove(), 300); };
  }

  function init(ganchos) {
    M = ganchos;
    // quem pegou o prêmio do Pro Pass antes da carta existir recebe ela agora
    const dd = Estado.d;
    if ((dd.evolucoesGuardadas || []).length && !Estado.tem(Ranque.CARTA_EVOLUCAO)) setTimeout(() => revelarEvolucao(Ranque.darEvolucao(Ranque.CARTA_EVOLUCAO)), 1200);
    const b = $('btn-ranq');
    if (b) b.onclick = abrir;
    atualizarBotao();
  }

  return { init, abrir, fechar, fim, atualizarBotao, historico, patentes, passe, emblema, promocao, procurandoConvidado, revelarEvolucao };
})();
