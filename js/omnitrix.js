// Omnitrix: Missão Galáctica. Um evento "mapa-relógio": 9 planetas em volta do Omnitrix. Cada missão é uma luta com uma regra maluca
// e dá o DNA de um alien. Com os 9 DNAs, o Omnitrix abre a missão final contra o Vilgax, e o prêmio é o Ben 10 (que vira os 9 aliens).
const Omnitrix = (() => {
  const ID = 'omni1';
  const FIM = Date.UTC(2026, 11, 5, 2, 59); // 04/12/2026 23:59 (Brasília)
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MISSOES = [
    { id: 'ben_chama', alien: 'Chama', planeta: 'Planeta Magma', cor: '#FF6A1A', regra: '🔥 Elixir 2× mais rápido e luta acelerada!', ev: { turbo: true, elixirMult: 2 }, ouro: 300, gemas: 15 },
    { id: 'ben_diamante', alien: 'Diamante', planeta: 'Cristalônia', cor: '#7FFFEA', regra: '💎 A IA é dura como cristal (mais esperta).', ev: { dif: 3, nivelIAMais: 1 }, ouro: 300, gemas: 15 },
    { id: 'ben_xlr8', alien: 'XLR8', planeta: 'Pista Estelar', cor: '#38BDF8', regra: '⚡ Tudo em velocidade máxima e IA esperta!', ev: { turbo: true, dif: 3 }, ouro: 300, gemas: 15 },
    { id: 'ben_enormossauro', alien: 'Enormossauro', planeta: 'Selva Gigante', cor: '#D9A25F', regra: '🦖 Os inimigos são 2 níveis mais fortes.', ev: { nivelIAMais: 2 }, ouro: 350, gemas: 20 },
    { id: 'ben_contratempo', alien: 'Contra-Tempo', planeta: 'Relógio Eterno', cor: '#FFD93B', regra: '⏳ Morte súbita: só 2 minutos, a primeira torre decide!', ev: { subita: true }, ouro: 350, gemas: 20 },
    { id: 'ben_ecoeco', alien: 'Eco Eco', planeta: 'Vale dos Ecos', cor: '#E8F0FF', regra: '🔊 As cartas inimigas chegam viradas (surpresa)!', ev: { cartasViradas: true }, ouro: 350, gemas: 20 },
    { id: 'ben_cromatico', alien: 'Cromático', planeta: 'Nebulosa Prisma', cor: '#FF5CF0', regra: '🌈 Todo mundo começa com 10 de elixir!', ev: { elixirInicial: 10 }, ouro: 400, gemas: 20 },
    { id: 'ben_gravatack', alien: 'Gravatack', planeta: 'Lua Pesada', cor: '#9D8CFF', regra: '🪐 Gravidade alta: elixir mais lento.', ev: { elixirMult: 0.75 }, ouro: 400, gemas: 25 },
    { id: 'ben_waybig', alien: 'Way Big', planeta: 'Fim do Universo', cor: '#FF4A4A', regra: '🌌 A IA mais esperta, 1 nível acima.', ev: { dif: 4, nivelIAMais: 1 }, ouro: 500, gemas: 30 },
  ];
  const FINAL = { id: 'final', alien: 'Vilgax', planeta: 'Nave do Vilgax', cor: '#6BFF4A', regra: '👾 O chefe final: IA mais esperta e 2 níveis acima!', ev: { dif: 4, nivelIAMais: 2 }, ouro: 1000, gemas: 150 };

  function dados() {
    const d = Estado.d;
    if (!d.omni || d.omni.id !== ID) d.omni = { id: ID, dna: [], final: false };
    return d.omni;
  }
  const ativo = () => Date.now() < FIM;
  function tempoRestante() {
    const ms = FIM - Date.now();
    if (ms <= 0) return 'encerrado';
    const dias = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5);
    return dias ? `${dias}d ${h}h` : `${h}h`;
  }
  const medalhao = (id) => `assets/cartas/${id}_medalhao.png`;

  function cartaoHtml() {
    const o = dados();
    return `<button class="cartao-omni${ativo() || o.final ? '' : ' fim'}" id="abrir-omni">
      <img class="om-img" src="assets/cartas/ben10_medalhao.png" alt="" />
      <div class="om-txt"><b>🟢 Omnitrix: Missão Galáctica</b><small>Colete 9 DNAs e ganhe o Ben 10!</small>
      <span>${o.final ? 'Completo! Ben 10 conquistado ✓' : `${o.dna.length}/9 aliens · ${ativo() ? `faltam ${tempoRestante()}` : 'encerrado'}`}</span></div></button>`;
  }

  function mostrarDial(ctx) {
    const o = dados();
    const liberada = o.dna.length >= 9;
    const nos = MISSOES.map((m, i) => {
      const ang = (i / MISSOES.length) * Math.PI * 2 - Math.PI / 2;
      const x = 50 + Math.cos(ang) * 38, y = 50 + Math.sin(ang) * 38;
      const tem = o.dna.includes(m.id);
      return `<button class="om-no${tem ? ' tem' : ''}" data-m="${m.id}" style="left:${x}%;top:${y}%;--cor:${m.cor}"><img src="${medalhao(m.id)}" alt="" /></button>`;
    }).join('');
    const md = UI.modal({
      titulo: '🟢 Missão Galáctica', classe: 'modal-omni',
      html: `<div class="om-dial"><div class="om-anel"></div>${nos}
        <button class="om-centro${liberada ? ' pronto' : ''}${o.final ? ' feito' : ''}" data-m="final"><img src="assets/cartas/ben10_medalhao.png" alt="" /><small>${o.final ? '✓' : liberada ? 'FINAL' : `${o.dna.length}/9`}</small></button></div>
        <div class="om-info" id="om-info"><p>Toque num planeta para ver a missão. Vença para trazer o <b>DNA</b> do alien! Com os 9, a missão final abre e o <b>Ben 10</b> é seu.</p></div>`,
      botoes: [{ texto: 'Fechar' }],
    });
    const info = md.el.querySelector('#om-info');
    md.el.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.m;
      const m = id === 'final' ? FINAL : MISSOES.find((x) => x.id === id);
      const tem = id === 'final' ? o.final : o.dna.includes(id);
      const travada = id === 'final' && !liberada;
      info.innerHTML = `<b style="color:${m.cor}">${esc(m.planeta)}</b><small>${id === 'final' ? 'Chefe: ' : 'Alien: '}${esc(m.alien)}</small>
        <p>${m.regra}</p><p class="om-pr">${tem ? 'DNA já coletado ✓ (pode jogar de novo por diversão)' : `Prêmio: ${id === 'final' ? 'Ben 10 + baú lendário + ' : 'DNA + '}${m.ouro} 🪙 + ${m.gemas} 💎`}</p>
        <button class="btn-modal principal${travada || !ativo() && !tem ? ' desativado' : ''}" id="om-lutar">${travada ? `Faltam ${9 - o.dna.length} DNAs` : '⚔️ Lutar!'}</button>`;
      info.querySelector('#om-lutar').onclick = () => {
        if (travada) { UI.toast('Colete os 9 DNAs primeiro! 🧬'); return; }
        if (!ativo()) { UI.toast('O evento acabou 💤'); return; }
        md.fechar();
        ctx.iniciar({ id: 'omni_' + m.id, nome: `Missão Galáctica · ${m.planeta}`, omni: { id: m.id }, ...m.ev });
      };
    }));
  }
  function abrir(ctx) { mostrarDial(ctx); }

  // ---------- fim da missão ----------
  function fimMissao(r, ctx) {
    const o = dados();
    const id = (r.evento && r.evento.omni && r.evento.omni.id) || '';
    const m = id === 'final' ? FINAL : MISSOES.find((x) => x.id === id);
    const voltar = () => { if (ctx.tudo) ctx.tudo(); };
    if (!m) { voltar(); return; }
    if (r.resultado !== 'vitoria') {
      UI.modal({ titulo: '💥 Missão falhou…', html: `<p class="ev-res">O Omnitrix ficou vermelho… Tente de novo em <b>${esc(m.planeta)}</b>!<br /><small>${m.regra}</small></p>`, botoes: [{ texto: 'Tentar depois', classe: 'principal', acao: voltar }] });
      return;
    }
    const d = Estado.d;
    const primeira = id === 'final' ? !o.final : !o.dna.includes(id);
    if (!primeira) {
      d.ouro += 50; Estado.salvar();
      UI.modal({ titulo: '🏆 Vitória!', html: '<p class="ev-res">Você já tinha esse prêmio, mas ganhou <b>+50 🪙</b> pela diversão!</p>', botoes: [{ texto: 'OK', classe: 'principal', acao: voltar }] });
      return;
    }
    d.ouro += m.ouro; d.gemas += m.gemas;
    if (id === 'final') {
      o.final = true; Estado.salvar();
      const carta = Ranque.darEvolucao('ben10');
      UI.modal({ titulo: '🟢 Vilgax derrotado!', html: `<p class="ev-res">O universo está salvo! +${m.ouro} 🪙 +${m.gemas} 💎</p>`,
        botoes: [{ texto: 'Pegar o Ben 10!', classe: 'principal', acao: () => {
          if (ctx.mostrarBau) ctx.mostrarBau('lendario', Estado.abrirBau('lendario')); else Estado.abrirBau('lendario');
          voltar();
          setTimeout(() => { try { Eventos.revelar(carta, 'LENDÁRIA EXCLUSIVA DE EVENTO', '"É hora de ação! Dez formas, um herói. Pode contar comigo!"'); } catch (e) { /* nada */ } }, 500);
        } }] });
      return;
    }
    o.dna.push(id); Estado.salvar();
    const falta = 9 - o.dna.length;
    UI.modal({ titulo: '🧬 DNA coletado!', html: `<div class="om-dna"><img src="${medalhao(id)}" alt="" style="--cor:${m.cor}" /></div>
      <p class="ev-res">Você escaneou o DNA do <b>${esc(m.alien)}</b>!<br />+${m.ouro} 🪙 +${m.gemas} 💎<br />${falta ? `Faltam <b>${falta}</b> DNA${falta > 1 ? 's' : ''} pro Ben 10.` : '<b>Os 9 DNAs! A missão final abriu!</b> 👾'}</p>`,
      botoes: [{ texto: 'Oba!', classe: 'principal', acao: voltar }] });
  }

  return { ID, ativo, cartaoHtml, abrir, fimMissao, dados };
})();
