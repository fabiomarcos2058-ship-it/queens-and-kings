// Esmeraldas do Caos: corrida de 7 fases (uma esmeralda por fase) + trilha de ANÉIS que dá prêmio até perdendo.
// Cada fase tem uma regra maluca. Com as 7 esmeraldas abre a luta final e o prêmio é o Super Quarteto (Sonic, Shadow, Silver e Amy).
const Esmeraldas = (() => {
  const ID = 'esm1';
  const FIM = Date.UTC(2026, 11, 16, 2, 59); // 15/12/2026 23:59 (Brasília)
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hoje = () => { const t = new Date(); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; };
  const FASES = [
    { n: 1, nome: 'Esmeralda Verde', heroi: 'Sonic', cor: '#3BE05A', regra: '💨 Corrida Relâmpago: luta acelerada e elixir 1.5× mais rápido!', ev: { turbo: true, elixirMult: 1.5 }, rw: { ouro: 400, gemas: 40 } },
    { n: 2, nome: 'Esmeralda Azul', heroi: 'Silver', cor: '#3B8BFF', regra: '🔮 Mente Aberta: as cartas inimigas chegam viradas!', ev: { cartasViradas: true }, rw: { gemas: 50, bau: 'prata' } },
    { n: 3, nome: 'Esmeralda Vermelha', heroi: 'Shadow', cor: '#FF3B3B', regra: '⏳ Controle do Caos: morte súbita, só 2 minutos!', ev: { subita: true }, rw: { ouro: 700, gemas: 70 } },
    { n: 4, nome: 'Esmeralda Rosa', heroi: 'Amy', cor: '#FF8FD0', regra: '🔨 Martelo Piko: IA esperta e 1 nível acima.', ev: { dif: 3, nivelIAMais: 1 }, rw: { gemas: 100, bau: 'ouro' } },
    { n: 5, nome: 'Esmeralda Amarela', heroi: 'Super Sonic', cor: '#FFD93B', regra: '⚡ Velocidade Máxima: turbo e IA esperta!', ev: { turbo: true, dif: 3 }, rw: { ouro: 1200, gemas: 150 } },
    { n: 6, nome: 'Esmeralda Ciano', heroi: 'Super Silver', cor: '#4FFFE8', regra: '🌊 Maré de Energia: todo mundo começa com 10 de elixir e a IA é 1 nível acima!', ev: { elixirInicial: 10, nivelIAMais: 1 }, rw: { gemas: 200, bau: 'lendario' } },
    { n: 7, nome: 'Esmeralda Roxa', heroi: 'Super Shadow', cor: '#B05CFF', regra: '🌌 A IA mais esperta, 2 níveis acima!', ev: { dif: 4, nivelIAMais: 2 }, rw: { ouro: 1500, gemas: 300, bau: 'lendario' } },
  ];
  const FINAL = { n: 8, nome: 'Hiper Forma', heroi: 'Super Quarteto', cor: '#FFD93B', regra: '🌟 A luta final: IA mais esperta, 2 níveis acima e elixir 1.5× mais rápido!', ev: { dif: 4, nivelIAMais: 2, elixirMult: 1.5 }, rw: { gemas: 500, bau: 'lendario' } };
  // trilha de anéis: ganha anéis em toda luta (vencendo ou não) e o prêmio vem sozinho
  const MARCOS = [
    { an: 50, rw: { gemas: 60 } }, { an: 150, rw: { bau: 'ouro' } }, { an: 300, rw: { ouro: 800, gemas: 120 } },
    { an: 500, rw: { bau: 'lendario' } }, { an: 800, rw: { gemas: 250, bau: 'lendario' } },
  ];
  const NOMEBAU = { prata: 'Baú de prata', ouro: 'Baú de ouro', lendario: 'Baú Lendário' };

  function dados() {
    const d = Estado.d;
    if (!d.esm || d.esm.id !== ID) d.esm = { id: ID, fase: 0, final: false, aneis: 0, marcos: [], dia: '' };
    return d.esm;
  }
  const ativo = () => Date.now() < FIM;
  function tempoRestante() {
    const ms = FIM - Date.now();
    if (ms <= 0) return 'encerrado';
    const dias = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5);
    return dias ? `${dias}d ${h}h` : `${h}h`;
  }
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
    return `<button class="cartao-esm${ativo() || e.final ? '' : ' fim'}" id="abrir-esm">
      <img class="es-img" src="assets/cartas/super_quarteto_medalhao.png" alt="" />
      <div class="es-txt"><b>💎 Esmeraldas do Caos</b><small>Sonic, Shadow, Silver e Amy!</small>
      <span>${e.final ? 'Completo! Super Quarteto conquistado ✓' : `${e.fase}/7 esmeraldas · 💍 ${e.aneis} · ${ativo() ? `faltam ${tempoRestante()}` : 'encerrado'}`}</span></div></button>`;
  }

  function abrir(ctx) {
    const e = dados();
    const proxima = e.fase >= 7 ? FINAL : FASES[e.fase];
    const maxMarco = MARCOS[MARCOS.length - 1].an;
    const pct = Math.min(100, (e.aneis / maxMarco) * 100);
    const gemas = FASES.map((f) => {
      const feito = e.fase >= f.n, atual = !feito && e.fase + 1 === f.n;
      return `<button class="es-gema${feito ? ' feita' : ''}${atual ? ' atual' : ''}" data-f="${f.n}" style="--cor:${f.cor}"><i></i><small>${f.n}</small></button>`;
    }).join('');
    const marcos = MARCOS.map((m) => `<span class="es-marco${e.marcos.includes(m.an) ? ' pego' : ''}" style="left:${(m.an / maxMarco) * 100}%"><i>${e.marcos.includes(m.an) ? '✓' : '🎁'}</i><small>${m.an}</small></span>`).join('');
    const md = UI.modal({
      titulo: '💎 Esmeraldas do Caos', classe: 'modal-esm',
      html: `<div class="es-banner"><img src="assets/cartas/super_quarteto.jpg" alt="" /><b>Super Quarteto</b></div>
        <div class="es-aneis"><span>💍 ${e.aneis} anéis</span><div class="es-trilha"><i style="width:${pct}%"></i>${marcos}</div><small>Todo duelo dá anéis (até perdendo!). O 1º duelo do dia rende o DOBRO.</small></div>
        <div class="es-gemas">${gemas}<button class="es-gema final${e.final ? ' feita' : e.fase >= 7 ? ' atual' : ''}" data-f="8" style="--cor:#FFD93B"><i></i><small>★</small></button></div>
        <div class="es-info" id="es-info"></div>`,
      botoes: [{ texto: 'Fechar' }],
    });
    const info = md.el.querySelector('#es-info');
    const mostrar = (n) => {
      const f = n === 8 ? FINAL : FASES[n - 1];
      const feito = n === 8 ? e.final : e.fase >= n;
      const travada = n > e.fase + 1 && !(n === 8 && e.fase >= 7) ;
      info.innerHTML = `<b style="color:${f.cor}">${esc(f.nome)}</b><small>${n === 8 ? 'Chefe final' : 'Herói da fase'}: ${esc(f.heroi)}</small><p>${f.regra}</p>
        <p class="es-pr">${feito ? 'Já conquistada ✓ (jogue de novo pelos anéis!)' : `Prêmio: ${n === 8 ? 'Super Quarteto + ' : ''}${textoRw(f.rw)}`}</p>
        <button class="btn-modal principal${travada ? ' desativado' : ''}" id="es-lutar">${travada ? '🔒 Vença a fase anterior' : '⚔️ Lutar!'}</button>`;
      info.querySelector('#es-lutar').onclick = () => {
        if (travada) { UI.toast('Vença a fase anterior primeiro! 💎'); return; }
        if (!ativo()) { UI.toast('O evento acabou 💤'); return; }
        md.fechar();
        ctx.iniciar({ id: 'esm_' + n, nome: `Esmeraldas do Caos · ${f.nome}`, esm: { n }, ...f.ev });
      };
    };
    md.el.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => mostrar(+b.dataset.f)));
    mostrar(proxima.n);
  }

  // ---------- fim da luta ----------
  function fimFase(r, ctx) {
    const e = dados();
    const n = (r.evento && r.evento.esm && r.evento.esm.n) || 0;
    const f = n === 8 ? FINAL : FASES[n - 1];
    const voltar = () => { if (ctx.tudo) ctx.tudo(); };
    if (!f) { voltar(); return; }
    const venceu = r.resultado === 'vitoria';
    // anéis: vitória 30 + 10 por coroa, derrota 10; o 1º duelo do dia vale o dobro
    let aneis = venceu ? 30 + 10 * Math.max(0, Math.min(3, r.coroas || 0)) : 10;
    const dobro = e.dia !== hoje();
    if (dobro) { aneis *= 2; e.dia = hoje(); }
    const antes = e.aneis; e.aneis += aneis;
    const baus = [], linhas = [];
    for (const m of MARCOS) if (antes < m.an && e.aneis >= m.an && !e.marcos.includes(m.an)) { e.marcos.push(m.an); darRw(m.rw, baus); linhas.push(`💍 Marco de ${m.an} anéis: <b>${textoRw(m.rw)}</b>`); }
    let titulo, corpo, extra = null;
    if (venceu && n === e.fase + 1) {
      e.fase = n <= 7 ? n : e.fase;
      darRw(f.rw, baus);
      if (n === 8) { e.final = true; extra = Ranque.darEvolucao('super_quarteto'); try { Titulos.dar('mestre_chaos'); } catch (x) { /* nada */ } }
      titulo = n === 8 ? '🌟 HIPER FORMA!' : '💎 Esmeralda conquistada!';
      corpo = n === 8 ? `Os quatro heróis se juntaram! <b>Super Quarteto</b> é seu!<br />+ ${textoRw(f.rw)}` : `Você pegou a <b>${esc(f.nome)}</b>!<br />+ ${textoRw(f.rw)}${n === 7 ? '<br /><b>As 7 esmeraldas! A luta final abriu!</b> 🌟' : ''}`;
    } else if (venceu) { titulo = '🏆 Vitória!'; corpo = 'Você já tinha essa esmeralda, mas os anéis contam!'; }
    else { titulo = '💥 Quase!'; corpo = `A ${esc(f.nome)} ainda não é sua… tente de novo!<br /><small>${f.regra}</small>`; }
    Estado.salvar();
    UI.modal({ titulo, html: `<p class="ev-res">${corpo}<br />💍 +${aneis} anéis${dobro ? ' <b>(dobro do dia!)</b>' : ''} · total ${e.aneis}${linhas.length ? '<br />' + linhas.join('<br />') : ''}</p>`,
      botoes: [{ texto: n === 8 && extra ? 'Pegar o Super Quarteto!' : 'Oba!', classe: 'principal', acao: () => {
        abrirBaus(baus, ctx); voltar();
        if (extra) setTimeout(() => { try { Eventos.revelar(extra, 'LENDÁRIA EXCLUSIVA DE EVENTO', '"Juntos somos mais rápidos! Pode contar com a gente!"'); } catch (x) { /* nada */ } }, 600 + baus.length * 700);
      } }] });
  }

  return { ID, ativo, cartaoHtml, abrir, fimFase, dados };
})();
