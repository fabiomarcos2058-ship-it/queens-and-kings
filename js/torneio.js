// Torneio entre amigos: chave de 4 ou 8 jogadores, cada luta é um x1 (sala do X1).
// Tudo mora em torneios/<código> no Realtime Database. A chave é calculada em cada celular a partir de
// "ordem" (quem está em cada vaga) e "venc" (quem ganhou cada luta), então não precisa de servidor.
// O campeão ganha o título "Campeão do Torneio" e uma moldura exclusiva pro cartão de batalha.
const Torneio = (() => {
  const PREMIO_CAMPEAO = 300;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dd = () => Estado.d;
  let ctx = { iniciar: null, fimBatalha: null, tudo: null };

  // ---------- lógica da chave (pura, dá pra testar sem Firebase) ----------
  const rodadas = (tam) => (tam >= 8 ? 3 : 2);
  const chave = (r, i) => `${r}_${i}`;
  // quem joga a luta (r, i): uid | null (vaga vazia) | undefined (ainda não se sabe)
  function lados(t, r, i) {
    if (r === 0) return [(t.ordem && t.ordem[2 * i]) || null, (t.ordem && t.ordem[2 * i + 1]) || null];
    return [vencedor(t, r - 1, 2 * i), vencedor(t, r - 1, 2 * i + 1)];
  }
  function vencedor(t, r, i) {
    const [a, b] = lados(t, r, i);
    if (a === undefined || b === undefined) return undefined;
    if (!a && !b) return null;
    if (!b) return a;   // vaga vazia: passa direto (bye)
    if (!a) return b;
    const v = t.venc && t.venc[chave(r, i)];
    return v === a || v === b ? v : undefined;
  }
  const campeaoDe = (t) => (t.ordem ? vencedor(t, rodadas(t.tam) - 1, 0) : undefined);
  // próxima luta pendente em que eu jogo
  function minhaLuta(t, eu) {
    if (!t.ordem) return null;
    for (let r = 0; r < rodadas(t.tam); r++) {
      for (let i = 0; i < t.tam / 2 ** (r + 1); i++) {
        const [a, b] = lados(t, r, i);
        if (a && b && (a === eu || b === eu) && vencedor(t, r, i) === undefined) return { r, i, a, b };
      }
    }
    return null;
  }

  // ---------- nuvem ----------
  const nomeDe = (t, uid) => (uid && t.jogadores && t.jogadores[uid] ? t.jogadores[uid].nome : uid ? 'Jogador' : '—');
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const novoCod = () => Array.from({ length: 5 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
  const euSou = () => ({ nome: String(dd().nome || 'Jogador').slice(0, 20), avatar: dd().avatar || '' });
  const guardar = (cod) => { dd().torneio = { ...(dd().torneio || {}), cod, premios: (dd().torneio && dd().torneio.premios) || {} }; Estado.salvar(); };

  async function criar(tam) {
    if (!Conta.logado()) throw new Error('Entre numa conta para criar um torneio.');
    const { m, r } = await X1.rt();
    let cod = novoCod();
    for (let i = 0; i < 5 && (await m.get(r(`torneios/${cod}`))).exists(); i++) cod = novoCod();
    await m.set(r(`torneios/${cod}`), { tam, dono: Conta.uid(), status: 'inscricao', criado: m.serverTimestamp(), jogadores: { [Conta.uid()]: euSou() } });
    guardar(cod);
    return cod;
  }
  async function entrar(codigo) {
    if (!Conta.logado()) throw new Error('Entre numa conta para entrar num torneio.');
    const cod = String(codigo || '').toUpperCase().replace(/[^A-Z]/g, '');
    const { m, r } = await X1.rt();
    const snap = await m.get(r(`torneios/${cod}`));
    if (!snap.exists()) throw new Error('Torneio não encontrado. Confira o código.');
    const t = snap.val();
    const ja = t.jogadores && t.jogadores[Conta.uid()];
    if (!ja) {
      if (t.status !== 'inscricao') throw new Error('Esse torneio já começou.');
      if (Object.keys(t.jogadores || {}).length >= t.tam) throw new Error('Esse torneio já está cheio.');
      await m.set(r(`torneios/${cod}/jogadores/${Conta.uid()}`), euSou());
    }
    guardar(cod);
    return cod;
  }
  async function comecar(cod, t) {
    const { m, r } = await X1.rt();
    const ids = Object.keys(t.jogadores || {});
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    // espalha as vagas vazias pra ninguém ficar com duas folgas seguidas
    const ordem = {};
    const slots = Array.from({ length: t.tam }, () => null);
    const ordemSlots = t.tam === 8 ? [0, 4, 2, 6, 1, 5, 3, 7] : [0, 2, 1, 3];
    ids.forEach((id, n) => { slots[ordemSlots[n]] = id; });
    slots.forEach((id, n) => { if (id) ordem[n] = id; });
    await m.update(r(`torneios/${cod}`), { ordem, status: 'andando' });
  }
  const definir = async (cod, r_, i, uid) => { const { m, r } = await X1.rt(); await m.set(r(`torneios/${cod}/venc/${chave(r_, i)}`), uid); };

  // ---------- premiação ----------
  function premiar(cod) {
    const tn = dd().torneio || (dd().torneio = { premios: {} });
    tn.premios = tn.premios || {};
    if (tn.premios[cod]) return;
    tn.premios[cod] = true;
    Titulos.dar('campeao_torneio');
    dd().moldura = 'campeao';
    dd().gemas += PREMIO_CAMPEAO;
    Estado.salvar();
    UI.modal({ titulo: '🏆 CAMPEÃO!', classe: 'modal-campeao',
      html: `<div class="camp-cartao">${Titulos.meuCartao({ tam: 'grande' }).replace(/<video[^>]*poster="([^"]*)"[^>]*><\/video>/g, '<img src="$1" alt="" />').replace(/<video[^>]*><\/video>/g, '')}</div>
        <p class="ev-res">Você venceu o torneio <b>${esc(cod)}</b>!<br />+${PREMIO_CAMPEAO} 💎 · título <b>🏆 Campeão do Torneio</b><br />e a <b>moldura exclusiva de campeão</b> já está no seu cartão! 👑</p>`,
      botoes: [{ texto: 'Oba!', classe: 'principal', acao: () => ctx.tudo && ctx.tudo() }] });
  }

  // ---------- jogar uma luta ----------
  async function lutarComoHost(cod, L, corpoAtual) {
    if (dd().deck.length < 8) { UI.toast('Você precisa de 8 cartas no deck para o x1.'); return; }
    if (typeof Atualizacao !== 'undefined' && !(await Atualizacao.podeJogar())) return;
    const { m, r } = await X1.rt();
    let cancelado = false, espera = null;
    try {
      espera = UI.modal({ titulo: 'Criando a sala...', classe: 'modal-x1', html: '<div class="x1-carregando"></div>', botoes: [{ texto: 'Cancelar', classe: 'secundario', acao: () => { cancelado = true; X1.cancelar(); m.remove(r(`torneios/${cod}/partidas/${chave(L.r, L.i)}`)).catch(() => {}); } }] });
      const sala = await X1.criarSala({
        aoEntrarAmigo: (amigo) => {
          if (cancelado) return;
          if (amigo.uid !== L.b) { UI.toast('Entrou alguém que não é seu adversário do torneio!'); return; }
          espera.fechar();
          X1.comecar(amigo, async (res) => {
            try {
              if (res.resultado === 'vitoria') await definir(cod, L.r, L.i, L.a);
              else if (res.resultado === 'derrota') await definir(cod, L.r, L.i, L.b);
              else { await m.remove(r(`torneios/${cod}/partidas/${chave(L.r, L.i)}`)); UI.toast('Empate! Criem a sala de novo pra desempatar 🤝'); }
            } catch (e) { UI.toast('Não consegui avisar o torneio do resultado. Use o W.O. se precisar 💕'); }
            ctx.fimBatalha(res);
          });
        },
      });
      if (cancelado) { X1.cancelar(); return; }
      await m.set(r(`torneios/${cod}/partidas/${chave(L.r, L.i)}`), { sala, t: Date.now() });
      espera.el.querySelector('.modal-titulo').textContent = 'Sala criada!';
      espera.el.querySelector('.modal-corpo').innerHTML = `<p class="x1-esperando">Esperando <b>${esc(nomeDe(corpoAtual, L.b))}</b> entrar na luta<span>...</span></p><p class="aviso">Ele vê o botão <b>Entrar na luta</b> na tela do torneio.</p>`;
    } catch (e) {
      if (espera) espera.fechar();
      X1.cancelar();
      UI.toast(String(e && e.code).includes('ermission') ? 'A nuvem do torneio ainda não foi liberada (regras do Firebase).' : e.message || 'Não deu para criar a sala.');
    }
  }
  async function lutarComoConvidado(sala) {
    if (dd().deck.length < 8) { UI.toast('Você precisa de 8 cartas no deck para o x1.'); return; }
    if (typeof Atualizacao !== 'undefined' && !(await Atualizacao.podeJogar())) return;
    let espera = null;
    try {
      espera = UI.modal({ titulo: 'Entrando...', classe: 'modal-x1', html: '<div class="x1-carregando"></div>', botoes: [{ texto: 'Cancelar', classe: 'secundario', acao: () => { X1.cancelar(); } }] });
      const host = await X1.entrarSala(sala, { aoComecar: (h) => { espera.fechar(); X1.assistir(h, (res) => ctx.fimBatalha(res)); }, aoMudarVagas: () => {}, aoProcurando: () => {} });
      espera.el.querySelector('.modal-corpo').innerHTML = `<p class="x1-esperando">Esperando ${esc(host.nome)} começar<span>...</span></p>`;
    } catch (e) { if (espera) espera.fechar(); X1.cancelar(); UI.toast(e.message || 'Não consegui entrar na sala.'); }
  }

  // ---------- tela ----------
  function htmlChave(t, eu) {
    const R = rodadas(t.tam);
    const nomesR = R === 3 ? ['Quartas', 'Semifinal', 'Final'] : ['Semifinal', 'Final'];
    return `<div class="tn-chave">${Array.from({ length: R }, (_, r) => `<div class="tn-col"><h5>${nomesR[r]}</h5>${Array.from({ length: t.tam / 2 ** (r + 1) }, (_, i) => {
      const [a, b] = lados(t, r, i);
      const v = vencedor(t, r, i);
      const lin = (u) => `<div class="tn-j${u && u === v ? ' venceu' : ''}${u && u === eu ? ' eu' : ''}${u === undefined ? ' espera' : ''}">${u === undefined ? '?' : u === null ? 'folga' : esc(nomeDe(t, u))}</div>`;
      return `<div class="tn-luta">${lin(a)}${lin(b)}</div>`;
    }).join('')}</div>`).join('')}</div>`;
  }

  function desenhar(corpo, cod, t) {
    const eu = Conta.uid();
    const donoSou = t.dono === eu;
    const jog = Object.entries(t.jogadores || {});
    let h = `<div class="sala-codigo"><small>Código do torneio</small><b>${esc(cod)}</b><button class="btn-peq" id="tn-copiar">📋 Copiar</button></div>`;
    if (t.status === 'inscricao') {
      h += `<p class="aviso">Torneio de <b>${t.tam}</b> jogadores · mande o código pros amigos entrarem!</p>
        <div class="tn-lista">${jog.map(([, j]) => `<span class="tn-nome">${esc(j.nome)}</span>`).join('')}${Array.from({ length: Math.max(0, t.tam - jog.length) }, () => '<span class="tn-nome vazio">vaga livre</span>').join('')}</div>
        ${donoSou ? `<button class="btn-modal principal${jog.length >= 2 ? '' : ' desativado'}" id="tn-comecar">${jog.length >= 2 ? `Começar com ${jog.length} jogadores ⚔️` : 'Precisa de pelo menos 2 jogadores'}</button><p class="aviso">Vaga sem jogador vira folga (quem pega folga passa direto).</p>`
          : `<p class="x1-esperando">Esperando ${esc(nomeDe(t, t.dono))} começar<span>...</span></p>`}`;
    } else {
      const camp = campeaoDe(t);
      h += htmlChave(t, eu);
      if (camp) {
        h += `<div class="tn-campeao">🏆 Campeão: <b>${esc(nomeDe(t, camp))}</b></div>`;
        if (camp === eu && !(dd().torneio && dd().torneio.premios && dd().torneio.premios[cod])) setTimeout(() => premiar(cod), 400);
      } else {
        const L = minhaLuta(t, eu);
        const part = L && t.partidas && t.partidas[chave(L.r, L.i)];
        if (L) {
          const rival = L.a === eu ? L.b : L.a;
          h += `<div class="tn-minha"><b>Sua luta:</b> você × ${esc(nomeDe(t, rival))}`;
          if (L.a === eu) h += `<button class="btn-modal principal" id="tn-host">${part ? '⚔️ Criar a sala de novo' : '⚔️ Criar a sala e lutar'}</button>`;
          else h += part ? `<button class="btn-modal principal" id="tn-entrar">⚔️ Entrar na luta</button>` : `<p class="aviso">Esperando ${esc(nomeDe(t, L.a))} criar a sala…</p>`;
          h += '<button class="btn-peq" id="tn-wo">Meu adversário sumiu (W.O.)</button></div>';
        } else h += '<p class="aviso">Você já está fora, ou esperando as outras lutas acabarem. Dá pra torcer! 🎉</p>';
        if (donoSou) {
          const pend = [];
          for (let r = 0; r < rodadas(t.tam); r++) for (let i = 0; i < t.tam / 2 ** (r + 1); i++) { const [a, b] = lados(t, r, i); if (a && b && vencedor(t, r, i) === undefined) pend.push({ r, i, a, b }); }
          if (pend.length) h += `<details class="tn-dono"><summary>👑 Ajuda do organizador</summary>${pend.map((p) => `<div>${esc(nomeDe(t, p.a))} × ${esc(nomeDe(t, p.b))} <button class="btn-peq" data-venc="${p.r}_${p.i}_${p.a}">${esc(nomeDe(t, p.a))} venceu</button> <button class="btn-peq" data-venc="${p.r}_${p.i}_${p.b}">${esc(nomeDe(t, p.b))} venceu</button></div>`).join('')}</details>`;
        }
      }
    }
    corpo.innerHTML = h;
    const q = (s) => corpo.querySelector(s);
    if (q('#tn-copiar')) q('#tn-copiar').onclick = () => navigator.clipboard?.writeText(cod).then(() => UI.toast('Código copiado!'), () => {});
    if (q('#tn-comecar')) q('#tn-comecar').onclick = () => { if (jog.length >= 2) comecar(cod, t).catch((e) => UI.toast(e.message || 'Erro ao começar')); };
    const L = minhaLuta(t, eu);
    if (L && q('#tn-host')) q('#tn-host').onclick = () => lutarComoHost(cod, L, t);
    if (L && q('#tn-entrar')) q('#tn-entrar').onclick = () => lutarComoConvidado(t.partidas[chave(L.r, L.i)].sala);
    if (L && q('#tn-wo')) q('#tn-wo').onclick = () => UI.modal({ titulo: 'W.O.?', html: '<p>Só use se seu adversário sumiu mesmo. Você vai passar de fase na hora, tá? 💕</p>', botoes: [{ texto: 'Voltar', classe: 'secundario' }, { texto: 'Sim, W.O.', classe: 'principal', acao: () => { definir(cod, L.r, L.i, eu).catch(() => UI.toast('Não consegui avisar o torneio')); } }] });
    corpo.querySelectorAll('[data-venc]').forEach((b) => (b.onclick = () => { const [r_, i, ...u] = b.dataset.venc.split('_'); definir(cod, +r_, +i, u.join('_')).catch(() => {}); }));
  }

  async function abrirTela(cod) {
    const md = UI.modal({ titulo: '🏆 Torneio entre amigos', classe: 'modal-torneio', html: '<p class="aviso">Carregando… 🌀</p>', botoes: [{ texto: 'Fechar' }, { texto: 'Sair do torneio', classe: 'secundario', acao: () => { dd().torneio = { ...(dd().torneio || {}), cod: null }; Estado.salvar(); if (ctx.tudo) ctx.tudo(); } }] });
    const corpo = md.el.querySelector('.modal-corpo');
    try {
      const { m, r } = await X1.rt();
      const off = m.onValue(r(`torneios/${cod}`), (snap) => {
        if (!md.el.isConnected) { off(); return; }
        if (!snap.exists()) { corpo.innerHTML = '<p class="aviso">Esse torneio não existe mais.</p>'; return; }
        desenhar(corpo, cod, snap.val());
      }, (e) => { corpo.innerHTML = `<p class="aviso">${String(e && e.code).includes('ermission') ? 'A nuvem do torneio ainda não foi liberada (a criadora precisa publicar as regras do Firebase).' : 'Não consegui falar com a nuvem.'}</p>`; });
    } catch (e) { corpo.innerHTML = `<p class="aviso">${esc(e.message)}</p>`; }
  }

  function menu() {
    const atual = dd().torneio && dd().torneio.cod;
    const md = UI.modal({ titulo: '🏆 Torneio entre amigos', classe: 'modal-torneio',
      html: `<p class="tt-txt">Monte uma chave de <b>4 ou 8 amigos</b>. Cada luta é um x1 e quem vencer tudo vira <b>Campeão</b>: ganha o título <b>🏆 Campeão do Torneio</b> e uma <b>moldura exclusiva</b> no cartão de batalha!</p>
        ${atual ? `<button class="btn-modal principal" id="tn-cont">▶ Continuar torneio ${esc(atual)}</button>` : ''}
        <button class="btn-modal ${atual ? 'secundario' : 'principal'}" id="tn-c4">Criar torneio de 4</button>
        <button class="btn-modal secundario" id="tn-c8">Criar torneio de 8</button>
        <div class="tn-entrar"><input id="tn-cod" maxlength="6" placeholder="Código" autocomplete="off" /><button class="btn-modal principal" id="tn-ent">Entrar</button></div>`,
      botoes: [{ texto: 'Fechar' }] });
    const q = (s) => md.el.querySelector(s);
    const ir = async (fn) => { try { const cod = await fn(); md.fechar(); abrirTela(cod); } catch (e) { UI.toast(String(e && e.code).includes('ermission') ? 'A nuvem do torneio ainda não foi liberada (regras do Firebase).' : e.message || 'Erro'); } };
    if (q('#tn-cont')) q('#tn-cont').onclick = () => { md.fechar(); abrirTela(atual); };
    q('#tn-c4').onclick = () => ir(() => criar(4));
    q('#tn-c8').onclick = () => ir(() => criar(8));
    q('#tn-ent').onclick = () => ir(() => entrar(q('#tn-cod').value));
  }

  function cartaoHtml() {
    const atual = dd().torneio && dd().torneio.cod;
    return `<button class="cartao-chefe cartao-torneio" id="abrir-torneio"><div class="ch-img tn-ic">🏆</div>
      <div class="ch-txt"><b>Torneio entre amigos</b><small>Chave de 4 ou 8 · vale título e moldura de campeão</small><span>${atual ? `Em andamento: ${esc(atual)}` : 'Crie ou entre com um código'}</span></div></button>`;
  }
  function ligar(c) { ctx = { ...ctx, ...c }; }

  return { cartaoHtml, menu, ligar, abrirTela, lados, vencedor, campeaoDe, minhaLuta, rodadas, chave, comecar, criar, entrar };
})();
