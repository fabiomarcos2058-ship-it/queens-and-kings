// Contrato da Makima: evento com CLÁUSULAS. Antes de cada luta você assina uma cláusula de risco (ou não) pra ganhar mais prêmio,
// e a Makima inimiga TOMA a sua tropa mais forte de tempos em tempos. Vença os 6 contratos e o Mestre Marionetista pra levar a Makima.
const Contrato = (() => {
  const ID = 'mk1';
  const FIM = Date.UTC(2026, 11, 16, 2, 59); // 15/12/2026 23:59 (Brasília)
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hoje = () => { const t = new Date(); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; };
  const CLAUSULAS = [
    { id: '0', ic: '📄', nome: 'Sem cláusula', desc: 'Luta do jeito que ela é. Prêmio normal.', ev: {}, x: 1 },
    { id: 'a', ic: '🩸', nome: 'Cláusula do Sangue', desc: 'Suas torres começam com 30% menos de vida.', ev: { torresFracas: 0.7 }, x: 1.5 },
    { id: 'b', ic: '🍽️', nome: 'Cláusula da Fome', desc: 'Seu elixir enche 25% mais devagar.', ev: { meuElixirMult: 0.75 }, x: 1.5 },
    { id: 'c', ic: '👁️', nome: 'Cláusula da Obediência', desc: 'A Makima toma suas tropas com o DOBRO da frequência.', ev: { controleX: 2 }, x: 2 },
  ];
  const FASES = [
    { n: 1, nome: 'Contrato de Admissão', cor: '#FF6B7A', regra: '👁️ A Makima toma sua tropa mais forte por 4s, a cada 22s.', ev: { controleIA: { cada: 22, dur: 4 } }, rw: { ouro: 400, gemas: 40 } },
    { n: 2, nome: 'Cão de Caça', cor: '#FF5C8A', regra: '🐕 Controle a cada 18s (5s) e IA esperta.', ev: { controleIA: { cada: 18, dur: 5 }, dif: 3 }, rw: { gemas: 50, bau: 'prata' } },
    { n: 3, nome: 'Os Quatro Cavaleiros', cor: '#E8324A', regra: '⏳ Morte súbita (2 min) com controle a cada 16s!', ev: { controleIA: { cada: 16, dur: 5 }, subita: true }, rw: { ouro: 700, gemas: 70 } },
    { n: 4, nome: 'Mente Vazia', cor: '#C04BFF', regra: '🙈 As cartas inimigas chegam viradas e o controle vem a cada 14s.', ev: { controleIA: { cada: 14, dur: 5 }, cartasViradas: true }, rw: { gemas: 100, bau: 'ouro' } },
    { n: 5, nome: 'Reflexo do Controle', cor: '#FF8A3A', regra: '🧠 IA mais esperta, 1 nível acima, controle a cada 12s.', ev: { controleIA: { cada: 12, dur: 5 }, dif: 4, nivelIAMais: 1 }, rw: { ouro: 1200, gemas: 150 } },
    { n: 6, nome: 'Fome de Poder', cor: '#FFD93B', regra: '⚡ Todo mundo começa com 10 de elixir, IA 1 nível acima e controle de 6s.', ev: { controleIA: { cada: 12, dur: 6 }, elixirInicial: 10, nivelIAMais: 1 }, rw: { gemas: 200, bau: 'ouro' } },
  ];
  const FINAL = { n: 7, nome: 'O Mestre Marionetista', cor: '#E8324A', regra: '👑 A luta final: IA mais esperta, 2 níveis acima, elixir 1.3× e controle a cada 10s (6s)!', ev: { controleIA: { cada: 10, dur: 6 }, dif: 4, nivelIAMais: 2, elixirMult: 1.3 }, rw: { ouro: 1500, gemas: 300, bau: 'lendario' } };
  const MARCOS = [
    { an: 50, rw: { gemas: 60 } }, { an: 150, rw: { bau: 'ouro' } }, { an: 300, rw: { ouro: 800, gemas: 120 } },
    { an: 500, rw: { bau: 'lendario' } }, { an: 800, rw: { gemas: 250, bau: 'lendario' } },
  ];
  const NOMEBAU = { prata: 'Baú de prata', ouro: 'Baú de ouro', lendario: 'Baú Lendário' };

  function dados() {
    const d = Estado.d;
    if (!d.mk || d.mk.id !== ID) d.mk = { id: ID, fase: 0, final: false, pts: 0, marcos: [], dia: '' };
    return d.mk;
  }
  const ativo = () => Date.now() < FIM;
  function tempoRestante() {
    const ms = FIM - Date.now();
    if (ms <= 0) return 'encerrado';
    const dias = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5);
    return dias ? `${dias}d ${h}h` : `${h}h`;
  }
  const escala = (rw, x) => ({ ...rw, ouro: rw.ouro && Math.round(rw.ouro * x), gemas: rw.gemas && Math.round(rw.gemas * x) });
  const textoRw = (rw) => [rw.ouro && `${rw.ouro} 🪙`, rw.gemas && `${rw.gemas} 💎`, rw.bau && `${NOMEBAU[rw.bau]}`].filter(Boolean).join(' + ');
  function darRw(rw, baus) {
    const d = Estado.d;
    if (rw.ouro) d.ouro += rw.ouro;
    if (rw.gemas) d.gemas += rw.gemas;
    if (rw.bau) baus.push(rw.bau);
  }
  function abrirBaus(baus, ctx) {
    baus.forEach((b, i) => setTimeout(() => { if (ctx.mostrarBau) ctx.mostrarBau(b, Estado.abrirBau(b)); else Estado.abrirBau(b); }, i * 700));
  }

  function cartaoHtml() {
    const e = dados();
    return `<button class="cartao-mk${ativo() || e.final ? '' : ' fim'}" id="abrir-mk">
      <video class="es-img" src="assets/cartas/videos/makima_rosto.mp4" poster="assets/cartas/makima_medalhao.png" autoplay muted loop playsinline></video>
      <div class="es-txt"><b>👁️ Contrato da Makima</b><small>Assine cláusulas e fuja do controle!</small>
      <span>${e.final ? 'Completo! Makima conquistada ✓' : `${e.fase}/6 contratos · 🐕 ${e.pts} · ${ativo() ? `faltam ${tempoRestante()}` : 'encerrado'}`}</span></div></button>`;
  }

  // escolher a cláusula antes da luta
  function escolherClausula(f, ctx, voltar) {
    const md = UI.modal({
      titulo: '📜 Assine o contrato', classe: 'modal-esm modal-mk',
      html: `<p class="mk-intro"><b>${esc(f.nome)}</b><br /><small>Uma cláusula deixa a luta mais difícil e o prêmio maior. Você escolhe.</small></p>
        <div class="mk-clausulas">${CLAUSULAS.map((c) => `<button class="mk-cl" data-c="${c.id}"><i>${c.ic}</i><span><b>${c.nome}</b><small>${c.desc}</small></span><em>${c.x > 1 ? `prêmio ×${String(c.x).replace('.', ',')}` : 'prêmio ×1'}</em></button>`).join('')}</div>`,
      botoes: [{ texto: 'Voltar', acao: voltar }],
    });
    md.el.querySelectorAll('.mk-cl').forEach((b) => (b.onclick = () => {
      const cl = CLAUSULAS.find((c) => c.id === b.dataset.c);
      md.fechar();
      ctx.iniciar({ id: 'mk_' + f.n, nome: `Contrato da Makima · ${f.nome}`, mk: { n: f.n, cl: cl.id, x: cl.x }, ...f.ev, ...cl.ev });
    }));
  }

  function abrir(ctx) {
    const e = dados();
    const proxima = e.fase >= 6 ? FINAL : FASES[e.fase];
    const maxMarco = MARCOS[MARCOS.length - 1].an;
    const pct = Math.min(100, (e.pts / maxMarco) * 100);
    const nos = FASES.map((f) => {
      const feito = e.fase >= f.n, atual = !feito && e.fase + 1 === f.n;
      return `<button class="es-gema${feito ? ' feita' : ''}${atual ? ' atual' : ''}" data-f="${f.n}" style="--cor:${f.cor}"><i></i><small>${f.n}</small></button>`;
    }).join('');
    const marcos = MARCOS.map((m) => `<span class="es-marco${e.marcos.includes(m.an) ? ' pego' : ''}" style="left:${(m.an / maxMarco) * 100}%"><i>${e.marcos.includes(m.an) ? '✓' : '🎁'}</i><small>${m.an}</small></span>`).join('');
    const md = UI.modal({
      titulo: '👁️ Contrato da Makima', classe: 'modal-esm modal-mk',
      html: `<div class="es-banner"><img src="assets/cartas/makima.jpg" alt="" /><b>Makima</b></div>
        <div class="es-aneis"><span>🐕 ${e.pts} pontos de Obediência</span><div class="es-trilha"><i style="width:${pct}%"></i>${marcos}</div><small>Todo duelo dá pontos (até perdendo!). O 1º duelo do dia rende o DOBRO.</small></div>
        <div class="es-gemas">${nos}<button class="es-gema final${e.final ? ' feita' : e.fase >= 6 ? ' atual' : ''}" data-f="7" style="--cor:#E8324A"><i></i><small>♛</small></button></div>
        <div class="es-info" id="mk-info"></div>`,
      botoes: [{ texto: 'Fechar' }],
    });
    const info = md.el.querySelector('#mk-info');
    const mostrar = (n) => {
      const f = n === 7 ? FINAL : FASES[n - 1];
      const feito = n === 7 ? e.final : e.fase >= n;
      const travada = n > e.fase + 1 && !(n === 7 && e.fase >= 6);
      info.innerHTML = `<b style="color:${f.cor}">${esc(f.nome)}</b><small>${n === 7 ? 'Chefe final' : `Contrato ${n}`}</small><p>${f.regra}</p>
        <p class="es-pr">${feito ? 'Já assinado ✓ (jogue de novo pelos pontos!)' : `Prêmio: ${n === 7 ? 'Makima + ' : ''}${textoRw(f.rw)} <small>(a cláusula multiplica ouro e gemas)</small>`}</p>
        <button class="btn-modal principal${travada ? ' desativado' : ''}" id="mk-lutar">${travada ? '🔒 Vença o contrato anterior' : '📜 Assinar e lutar'}</button>`;
      info.querySelector('#mk-lutar').onclick = () => {
        if (travada) { UI.toast('Vença o contrato anterior primeiro! 👁️'); return; }
        if (!ativo()) { UI.toast('O evento acabou 💤'); return; }
        md.fechar();
        escolherClausula(f, ctx, () => abrir(ctx));
      };
    };
    md.el.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => mostrar(+b.dataset.f)));
    mostrar(proxima.n);
  }

  // ---------- fim da luta ----------
  function fimFase(r, ctx) {
    const e = dados();
    const mk = (r.evento && r.evento.mk) || {};
    const n = mk.n || 0, x = mk.x || 1;
    const f = n === 7 ? FINAL : FASES[n - 1];
    const voltar = () => { if (ctx.tudo) ctx.tudo(); };
    if (!f) { voltar(); return; }
    const cl = CLAUSULAS.find((c) => c.id === mk.cl) || CLAUSULAS[0];
    const venceu = r.resultado === 'vitoria';
    let pts = (venceu ? 30 + 10 * Math.max(0, Math.min(3, r.coroas || 0)) : 10) * (x > 1 && venceu ? 1.5 : 1);
    pts = Math.round(pts);
    const dobro = e.dia !== hoje();
    if (dobro) { pts *= 2; e.dia = hoje(); }
    const antes = e.pts; e.pts += pts;
    const baus = [], linhas = [];
    for (const m of MARCOS) if (antes < m.an && e.pts >= m.an && !e.marcos.includes(m.an)) { e.marcos.push(m.an); darRw(m.rw, baus); linhas.push(`🐕 Marco de ${m.an} pontos: <b>${textoRw(m.rw)}</b>`); }
    let titulo, corpo, extra = null;
    if (venceu && n === e.fase + 1) {
      e.fase = n <= 6 ? n : e.fase;
      const rw = escala(f.rw, x);
      darRw(rw, baus);
      if (n === 7) { e.final = true; extra = Ranque.darEvolucao('makima'); try { Titulos.dar('cao_makima'); } catch (z) { /* nada */ } }
      titulo = n === 7 ? '👑 CONTRATO CUMPRIDO!' : '📜 Contrato assinado!';
      corpo = n === 7 ? `Você quebrou o controle do Mestre Marionetista! <b>Makima</b> é sua!<br />+ ${textoRw(rw)}` : `Você cumpriu o <b>${esc(f.nome)}</b>${cl.id !== '0' ? ` com a ${esc(cl.nome)} (×${String(x).replace('.', ',')})` : ''}!<br />+ ${textoRw(rw)}`;
    } else if (venceu) { titulo = '🏆 Vitória!'; corpo = 'Você já tinha esse contrato, mas os pontos contam!'; }
    else { titulo = '💥 A Makima venceu…'; corpo = `O <b>${esc(f.nome)}</b> ainda não foi cumprido… tente de novo!<br /><small>${f.regra}</small>`; }
    Estado.salvar();
    UI.modal({ titulo, html: `<p class="ev-res">${corpo}<br />🐕 +${pts} pontos${dobro ? ' <b>(dobro do dia!)</b>' : ''} · total ${e.pts}${linhas.length ? '<br />' + linhas.join('<br />') : ''}</p>`,
      botoes: [{ texto: n === 7 && extra ? 'Pegar a Makima!' : 'Oba!', classe: 'principal', acao: () => {
        abrirBaus(baus, ctx); voltar();
        if (extra) setTimeout(() => { try { Eventos.revelar(extra, 'LENDÁRIA EXCLUSIVA DE EVENTO', '"Você é um bom cão. Agora… ajoelhe-se."'); } catch (z) { /* nada */ } }, 600 + baus.length * 700);
      } }] });
  }

  return { ID, ativo, cartaoHtml, abrir, fimFase, dados };
})();
