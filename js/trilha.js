// Trilha de troféus (como no Clash Royale): a cada 100 troféus de recorde tem um prêmio pra pegar.
const Trilha = (() => {
  const PASSO = 100, MAX = 4000;
  const NOMEBAU = { prata: 'Baú de prata', ouro: 'Baú de ouro', lendario: 'Baú Lendário' };
  function recompensa(t) {
    const i = t / PASSO;
    if (i % 10 === 0) return { bau: 'lendario', gemas: 100 };
    if (i % 5 === 0) return { bau: 'ouro', gemas: 40 };
    if (i % 2 === 0) return { bau: 'prata', ouro: 150 + t / 4 };
    return i % 3 === 0 ? { ouro: 100 + t / 2, gemas: 15 } : { ouro: 100 + t / 2 };
  }
  const passos = () => { const l = []; for (let t = PASSO; t <= MAX; t += PASSO) l.push(t); return l; };
  const pegos = () => { const d = Estado.d; if (!Array.isArray(d.trilhaPegos)) d.trilhaPegos = []; return d.trilhaPegos; };
  const prontos = () => passos().filter((t) => Estado.d.recorde >= t && !pegos().includes(t));
  function texto(rw) { return [rw.ouro && `${Math.round(rw.ouro)} 🪙`, rw.gemas && `${rw.gemas} 💎`, rw.bau && NOMEBAU[rw.bau]].filter(Boolean).join(' + '); }
  // pega os prêmios (um só, ou todos). Devolve o que ganhou; os baús ficam pra abrir na tela (ctx.mostrarBau).
  function pegar(lista) {
    const d = Estado.d, baus = [];
    let ouro = 0, gemas = 0;
    for (const t of lista) {
      if (pegos().includes(t) || d.recorde < t) continue;
      const rw = recompensa(t);
      pegos().push(t);
      if (rw.ouro) ouro += Math.round(rw.ouro);
      if (rw.gemas) gemas += rw.gemas;
      if (rw.bau) baus.push(rw.bau);
    }
    d.ouro += ouro; d.gemas += gemas;
    Estado.salvar();
    return { ouro, gemas, baus };
  }
  return { PASSO, MAX, passos, recompensa, pegos, prontos, pegar, texto };
})();
