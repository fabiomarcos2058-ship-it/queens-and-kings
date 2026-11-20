// Chefão Mundial: um chefe gigante que fica vários dias. O dano de TODOS os jogadores soma numa barra de vida
// compartilhada (Realtime Database: chefe/<id>/jogadores/<uid>). Quando a barra zera, todo mundo que bateu leva prêmio.
const Chefe = (() => {
  const ID = 'chefe1';
  const NOME = 'Vorak, o Devorador de Mundos';
  const HP = 600000;                       // vida total (soma de todos os jogadores)
  const FIM = Date.UTC(2026, 10, 26, 2, 59); // 25/11/2026 23:59 (Brasília)
  const TENT_DIA = 5;                      // lutas por dia
  const MULT = 12;                         // as torres do chefe aguentam 12x
  const PREMIO = { gemas: 800, bau: 'lendario' };
  const TOP = [1500, 1000, 600];           // bônus pro top 1, 2 e 3
  const CONSOLO = 200;                     // se o tempo acabar e o chefe não cair
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');
  const hoje = () => { const t = new Date(); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; };

  function dados() {
    const d = Estado.d;
    if (!d.chefe || d.chefe.id !== ID) d.chefe = { id: ID, dia: '', tent: 0, meu: 0, lutas: 0, pego: false, enviado: 0 };
    if (d.chefe.dia !== hoje()) { d.chefe.dia = hoje(); d.chefe.tent = 0; }
    return d.chefe;
  }
  const ativo = () => Date.now() < FIM;
  const restam = () => Math.max(0, TENT_DIA - dados().tent);
  function tempoRestante() {
    const ms = FIM - Date.now();
    if (ms <= 0) return 'encerrado';
    const dias = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5);
    return dias ? `${dias}d ${h}h` : `${h}h`;
  }

  // ---------- nuvem ----------
  async function lerTodos() {
    const { m, r } = await X1.rt();
    const snap = await m.get(r(`chefe/${ID}/jogadores`));
    const v = snap.exists() ? snap.val() : {};
    const lista = Object.entries(v).map(([uid, j]) => ({ uid, nome: j.nome || 'Jogador', dano: Math.max(0, Number(j.dano) || 0), lutas: j.lutas || 0 }))
      .sort((a, b) => b.dano - a.dano);
    return { lista, total: lista.reduce((a, j) => a + j.dano, 0) };
  }
  async function enviar() {
    const c = dados();
    if (!c.meu) return true;
    try {
      const { m, r } = await X1.rt();
      await m.set(r(`chefe/${ID}/jogadores/${Conta.uid()}`), { nome: String(Estado.d.nome || 'Jogador').slice(0, 20), dano: Math.round(c.meu), lutas: c.lutas || 0 });
      c.enviado = c.meu; Estado.salvar();
      return true;
    } catch (e) { return false; } // sem regras publicadas / sem rede: tenta de novo na próxima
  }
  const erro = (e) => String(e && (e.code || e.message)).includes('ermission') ? 'A nuvem do Chefão ainda não foi liberada (a criadora precisa publicar as regras do Firebase).' : (e && e.message) || 'Não consegui falar com a nuvem agora.';

  // ---------- cartão do hub ----------
  function cartaoHtml() {
    const c = dados();
    return `<button class="cartao-chefe${ativo() ? '' : ' fim'}" id="abrir-chefe">
      <img class="ch-img" src="assets/summon/luta/vorak_ultra.png" alt="" />
      <div class="ch-txt"><b>👹 Chefão Mundial</b><small>${esc(NOME)}</small>
      <span>${ativo() ? `Todos batem juntos! Faltam ${tempoRestante()} · ${restam()} luta${restam() === 1 ? '' : 's'} hoje` : 'Encerrado'}${c.meu ? ` · seu dano: ${fmt(c.meu)}` : ''}</span></div></button>`;
  }

  // ---------- tela do chefão ----------
  async function abrir(ctx) {
    const md = UI.modal({ titulo: '👹 Chefão Mundial', classe: 'modal-chefe', html: '<p class="aviso">Carregando o chefão… 🌀</p>', botoes: [{ texto: 'Fechar' }] });
    const corpo = md.el.querySelector('.modal-corpo');
    let info = null, falha = null;
    if (!Conta.logado()) falha = 'Entre numa conta para enfrentar o Chefão com todo mundo! 💕';
    else {
      await enviar(); // reenvia o que ficou pendente
      try { info = await lerTodos(); } catch (e) { falha = erro(e); }
    }
    if (!md.el.isConnected) return;
    const c = dados();
    const total = info ? info.total : 0;
    const caiu = total >= HP;
    const pct = Math.max(0, 100 - (total / HP) * 100);
    const minhaPos = info ? info.lista.findIndex((j) => j.uid === Conta.uid()) : -1;
    const podePremio = !c.pego && c.meu > 0 && info && (caiu || !ativo());
    const rank = info ? info.lista.slice(0, 10).map((j, i) => `<div class="ch-lin${j.uid === Conta.uid() ? ' eu' : ''}"><span>${['🥇', '🥈', '🥉'][i] || `${i + 1}º`}</span><b>${esc(j.nome)}</b><em>${fmt(j.dano)}</em></div>`).join('') : '';
    corpo.innerHTML = `<div class="ch-palco"><img src="assets/summon/luta/vorak_ultra.png" alt="" class="${caiu ? 'caido' : ''}" /></div>
      <b class="ch-nome">${esc(NOME)}</b>
      ${falha ? `<p class="aviso">${esc(falha)}</p>` : `<div class="ch-vida"><i style="width:${pct}%"></i><small>${caiu ? 'DERROTADO! 🎉' : `${fmt(Math.max(0, HP - total))} / ${fmt(HP)}`}</small></div>`}
      <p class="ch-dica">Cada luta dura uns 3 minutos. Todo o dano que você causar nas torres dele <b>soma na vida do chefão</b> pra todo mundo! Prêmio: <b>${PREMIO.gemas} 💎 + baú lendário + título</b>, e bônus pro top 3 (${TOP.join(' / ')} 💎).</p>
      <div class="ch-meu">Seu dano: <b>${fmt(c.meu)}</b>${minhaPos >= 0 ? ` · você é o <b>${minhaPos + 1}º</b>` : ''} · lutas hoje: <b>${c.tent}/${TENT_DIA}</b></div>
      ${rank ? `<div class="ch-rank"><h4>🏆 Quem mais bateu</h4>${rank}</div>` : ''}
      <div class="ch-botoes">
        ${podePremio ? '<button class="btn-modal principal" id="ch-premio">🎁 Pegar prêmio</button>' : ''}
        ${ativo() && !caiu ? `<button class="btn-modal principal${restam() ? '' : ' desativado'}" id="ch-lutar">⚔️ Lutar (${restam()} hoje)</button>` : ''}
        ${c.pego ? '<div class="selo">Prêmio pego ✓</div>' : ''}
      </div>`;
    const lutar = corpo.querySelector('#ch-lutar');
    if (lutar) lutar.onclick = () => {
      if (!Conta.logado()) { UI.toast('Entre numa conta primeiro 💕'); return; }
      if (!restam()) { UI.toast('Acabaram as lutas de hoje! Volte amanhã 🌙'); return; }
      if (falha) { UI.toast(falha); return; }
      md.fechar();
      const cc = dados(); cc.tent++; Estado.salvar();
      ctx.iniciar({ id: 'chefe', nome: `Chefão Mundial · ${NOME}`, chefe: { mult: MULT }, dif: 4 });
    };
    const pr = corpo.querySelector('#ch-premio');
    if (pr) pr.onclick = () => { md.fechar(); resgatar(info, caiu, ctx); };
  }

  function resgatar(info, caiu, ctx) {
    const c = dados();
    if (c.pego) return;
    c.pego = true;
    const pos = info.lista.findIndex((j) => j.uid === Conta.uid());
    let gemas = 0, extra = '';
    if (caiu) {
      gemas += PREMIO.gemas;
      if (pos >= 0 && pos < 3) { gemas += TOP[pos]; extra = `<p>E ainda ficou em <b>${pos + 1}º lugar</b>: +${TOP[pos]} 💎!</p>`; }
      try { Titulos.dar('cacador_chefao'); } catch (e) { /* nada */ }
    } else gemas += CONSOLO;
    Estado.d.gemas += gemas;
    Estado.salvar();
    UI.modal({ titulo: caiu ? '🎉 O Chefão caiu!' : '💝 Obrigada por tentar!', html: `<p class="ev-res">${caiu ? `Todo mundo junto derrubou o <b>${esc(NOME)}</b>!` : 'O chefão sobreviveu dessa vez…'}<br />+${fmt(gemas)} 💎${caiu ? ' + baú lendário + título <b>Caçador do Chefão</b>' : ''}</p>${extra}`,
      botoes: [{ texto: 'Oba!', classe: 'principal', acao: () => { if (caiu && ctx.mostrarBau) ctx.mostrarBau(PREMIO.bau, Estado.abrirBau(PREMIO.bau)); else if (caiu) Estado.abrirBau(PREMIO.bau); if (ctx.tudo) ctx.tudo(); } }] });
  }

  // ---------- fim da luta ----------
  async function fimLuta(r, ctx) {
    const c = dados();
    const dano = Math.max(0, Math.min(1000000, Math.round(r.danoChefe || 0)));
    c.meu += dano; c.lutas++;
    Estado.salvar();
    const ok = await enviar();
    let info = null;
    if (ok) { try { info = await lerTodos(); } catch (e) { /* nada */ } }
    const resta = info ? Math.max(0, HP - info.total) : null;
    UI.modal({ titulo: '👹 Fim da luta!',
      html: `<p class="ev-res">Você causou <b>${fmt(dano)}</b> de dano ao chefão!<br />Seu total: <b>${fmt(c.meu)}</b>${resta != null ? `<br />Vida que falta do chefão: <b>${fmt(resta)}</b>` : ''}</p>${ok ? '' : '<p class="aviso">Não consegui avisar a nuvem agora. Seu dano está guardado e vai ser enviado na próxima vez 💕</p>'}`,
      botoes: [{ texto: 'OK', classe: 'principal', acao: () => ctx.tudo() }] });
  }

  return { ID, NOME, HP, ativo, cartaoHtml, abrir, fimLuta, dados, enviar };
})();
