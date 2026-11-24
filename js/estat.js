// Estatísticas de longo prazo (o histórico guarda só as últimas 40 partidas). Estado em Estado.d.est.
const Estat = (() => {
  const MODOS = { normal: '⚔️ Batalha', elixir2x: '⚡ Elixir 2x', x1: '🤺 X1', '2v2': '🤝 2v2', ranq: '🏅 Ranqueada', ranq2v2: '🏅 Ranq. 2v2', evento: '🎪 Evento' };
  const esc = (t) => String(t).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  function est() {
    const d = Estado.d;
    const nova = !d.est;
    const e = d.est || (d.est = {});
    for (const [k, v] of Object.entries({ p: 0, v: 0, d: 0, em: 0, seq: 0, melhor: 0, coroas: 0, tres: 0, segs: 0, usos: {}, modos: {} })) if (e[k] === undefined) e[k] = v;
    if (nova && Array.isArray(d.historico)) for (const r of [...d.historico].reverse()) contar(r); // aproveita as partidas já guardadas
    return e;
  }
  // chamado por Ranque.registrar a cada partida terminada
  function contar(r) {
    try {
      const e = est(), ganhou = r.res === 'vitoria', perdeu = r.res === 'derrota';
      e.p++;
      if (ganhou) { e.v++; e.seq++; e.melhor = Math.max(e.melhor, e.seq); } else { if (perdeu) e.d++; else e.em++; e.seq = 0; }
      if (r.cz) { e.coroas += r.cz[0] || 0; if (ganhou && r.cz[0] >= 3) e.tres++; }
      e.segs += Math.max(0, Math.min(1200, r.dur || 0));
      for (const id of r.deck || []) { const u = e.usos[id] || (e.usos[id] = { p: 0, v: 0 }); u.p++; if (ganhou) u.v++; }
      const m = e.modos[r.modo || 'normal'] || (e.modos[r.modo || 'normal'] = { p: 0, v: 0 }); m.p++; if (ganhou) m.v++;
    } catch (err) { /* nada */ }
  }
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const tempo = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min` : `${Math.floor(s / 60)} min`);

  function abrir() {
    const e = est(), h = (Ranque.historico ? Ranque.historico() : []).slice(0, 12);
    const med = (id) => { const c = Estado.carta(id); return c && (c.feitico || c.barril) ? Cartas.arte(c) : `assets/cartas/${id}_medalhao.png`; };
    const top = Object.entries(e.usos).filter(([id]) => Estado.carta(id)).sort((a, b) => b[1].p - a[1].p).slice(0, 5);
    const modos = Object.entries(e.modos).sort((a, b) => b[1].p - a[1].p);
    const caixa = (n, t, ic) => `<div class="es-caixa"><span>${ic}</span><b>${n}</b><small>${t}</small></div>`;
    UI.modal({
      titulo: '📊 Estatísticas', classe: 'modal-estat',
      html: e.p ? `<div class="es-grade">${caixa(UI.fmt(e.p), 'Partidas', '⚔️')}${caixa(`${pct(e.v, e.p)}%`, 'Vitórias', '🏆')}${caixa(e.seq, 'Sequência atual', '🔥')}${caixa(e.melhor, 'Melhor sequência', '⭐')}${caixa(UI.fmt(e.coroas), 'Coroas ganhas', '👑')}${caixa(e.tres, 'Vitórias 3 coroas', '💥')}${caixa(tempo(e.segs), 'Tempo jogado', '⏱️')}${caixa(`${e.v}-${e.d}`, 'Vitórias-derrotas', '📈')}</div>
        ${h.length ? `<div class="es-titulo">Últimas ${h.length}</div><div class="es-fita">${h.map((x) => `<i class="${x.res}" title="${x.res}">${x.res === 'vitoria' ? 'V' : x.res === 'derrota' ? 'D' : 'E'}</i>`).join('')}</div>` : ''}
        ${top.length ? `<div class="es-titulo">Cartas que você mais usa</div>${top.map(([id, u]) => `<div class="es-carta"><img src="${med(id)}" alt="" /><div><b>${esc(Estado.carta(id).nome)}</b><div class="es-barra"><i style="width:${pct(u.v, u.p)}%"></i></div></div><small>${u.p}x · ${pct(u.v, u.p)}%</small></div>`).join('')}` : ''}
        ${modos.length ? `<div class="es-titulo">Por modo</div>${modos.map(([k, m]) => `<div class="es-modo"><span>${MODOS[k] || k}</span><div class="es-barra"><i style="width:${pct(m.v, m.p)}%"></i></div><small>${m.v}/${m.p}</small></div>`).join('')}` : ''}
        <p class="aviso">Conta todas as partidas, não só as últimas 40 do histórico.</p>`
        : '<p class="aviso">Ainda sem estatísticas. Jogue uma batalha e volte aqui! 📊</p>',
      botoes: [{ texto: 'Fechar', classe: 'principal' }],
    });
  }
  return { contar, abrir, dados: est };
})();
