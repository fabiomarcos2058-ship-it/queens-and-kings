// Presentes da criadora (Firestore): presentes/{uid}/itens/{id}
// A criadora manda pelo mod menu; o jogador recebe quando abrir o jogo logado (ou na hora, se já estiver jogando).
// Tipos: passe { passe: 'plus'|'ultra', temporada }, carta { carta, nivel, copias }, ouro { qtd }, gemas { qtd }.
// Remoção (só a criadora, aplicada em silêncio): remover { alvo: 'carta'|'nivel'|'ouro'|'gemas'|'trofeus'|'passe', carta?, nivel?, qtd? }
// Ajuste (só a criadora, em silêncio): ajustar { trofeus?, vitorias?, derrotas? } = valores novos (pra mais ou pra menos)
const Presentes = (() => {
  const fb = () => Conta.fb();
  let parar = null;
  const col = (uid) => fb().collection(fb().db, 'presentes', uid, 'itens');

  // ---------- Criadora ----------
  async function enviar(uid, item) {
    if (!Mod.ehCriador()) throw new Error('Só a criadora pode mandar presentes.');
    await fb().addDoc(col(uid), { ...item, de: Conta.uid(), criado: fb().serverTimestamp() });
  }
  async function pendentes(uid) {
    const snap = await fb().getDocs(col(uid));
    return snap.docs.map((x) => ({ id: x.id, ...x.data() }));
  }
  // inventário do jogador (só a criadora pode ler, pelas regras do Firebase)
  async function inventario(uid) {
    const s = await fb().getDoc(fb().doc(fb().db, 'jogadores', uid));
    if (!s.exists()) return null;
    try { return JSON.parse(s.data().dados); } catch (e) { return null; }
  }
  const cancelar = (uid, id) => fb().deleteDoc(fb().doc(fb().db, 'presentes', uid, 'itens', id));

  // texto bonitinho do presente
  function descrever(p) {
    if (p.tipo === 'remover') {
      const c = p.carta && Estado.carta(p.carta);
      return { carta: `🗑️ Tirar a carta ${c ? c.nome : p.carta}`, nivel: `⬇️ ${c ? c.nome : p.carta} para o nível ${p.nivel}`, ouro: `🗑️ Tirar ${UI.fmt(p.qtd)} de ouro`,
        gemas: `🗑️ Tirar ${UI.fmt(p.qtd)} gemas`, trofeus: `🗑️ Tirar ${UI.fmt(p.qtd)} troféus`, passe: '🗑️ Tirar o passe Plus/Ultra' }[p.alvo] || '🗑️ Remoção';
    }
    if (p.tipo === 'ajustar') return `📊 Ajustar: ${[p.trofeus !== undefined ? `🏆 ${UI.fmt(p.trofeus)}` : '', p.vitorias !== undefined ? `${UI.fmt(p.vitorias)} vitórias` : '', p.derrotas !== undefined ? `${UI.fmt(p.derrotas)} derrotas` : ''].filter(Boolean).join(' · ')}`;
    if (p.tipo === 'passe') return `🎟️ Passe ${p.passe === 'ultra' ? 'Ultra' : 'Plus'} (${p.temporada})`;
    if (p.tipo === 'ouro') return `🪙 ${UI.fmt(p.qtd)} de ouro`;
    if (p.tipo === 'gemas') return `💎 ${UI.fmt(p.qtd)} gemas`;
    if (p.tipo === 'carta') { const c = Estado.carta(p.carta); return `🃏 ${c ? c.nome : p.carta} · nível ${p.nivel}${p.copias ? ` · +${p.copias} cópias` : ''}`; }
    return '🎁 Presente';
  }

  // ---------- Jogador ----------
  function remover(p) {
    const d = Estado.d;
    if (p.alvo === 'ouro') { d.ouro = Math.max(0, d.ouro - Math.round(p.qtd || 0)); return true; }
    if (p.alvo === 'gemas') { d.gemas = Math.max(0, d.gemas - Math.round(p.qtd || 0)); return true; }
    if (p.alvo === 'trofeus') { d.trofeus = Math.max(0, d.trofeus - Math.round(p.qtd || 0)); return true; }
    if (p.alvo === 'passe') { const ps = Passe.dados(); ps.plus = false; ps.ultra = false; ps.presenteUltra = true; if (!Passe.podeEstilo(d.estiloNome)) d.estiloNome = ''; return true; }
    const c = p.carta && Estado.carta(p.carta);
    if (!c) return false;
    const col = d.colecao[c.id];
    if (p.alvo === 'nivel') { if (col) col.nivel = Math.max(1, Math.min(col.nivel, Math.round(p.nivel || 1))); return true; }
    if (p.alvo === 'carta') {
      d.deck = d.deck.filter((x) => x !== c.id);
      if (d.avatar === c.id) d.avatar = 'coroa';
      if (d.cartasExtras) d.cartasExtras = d.cartasExtras.filter((x) => x !== c.id);
      if (c.exclusivo) { if (!d.esgotadas) d.esgotadas = []; if (!d.esgotadas.includes(c.id)) d.esgotadas.push(c.id); } // exclusiva some de vez
      if (col) { col.tem = false; col.nivel = 1; col.copias = 0; }
      Estado.recarregarCatalogo();
      return true;
    }
    return false;
  }

  function aplicar(p) {
    const d = Estado.d;
    if (p.tipo === 'remover') return remover(p);
    if (p.tipo === 'ajustar') {
      const n = (v) => Math.max(0, Math.min(99999999, Math.round(+v || 0)));
      if (p.trofeus !== undefined) { d.trofeus = n(p.trofeus); d.recorde = Math.max(d.recorde || 0, d.trofeus); } // recorde sobe junto (libera as arenas)
      if (p.vitorias !== undefined) d.vitorias = n(p.vitorias);
      if (p.derrotas !== undefined) d.derrotas = n(p.derrotas);
      return true;
    }
    if (p.tipo === 'ouro') { d.ouro += Math.max(0, Math.round(p.qtd || 0)); return true; }
    if (p.tipo === 'gemas') { d.gemas += Math.max(0, Math.round(p.qtd || 0)); return true; }
    if (p.tipo === 'passe') {
      const ps = Passe.dados();
      if (p.temporada && p.temporada !== ps.temporada) return false; // passe de um mês que já acabou
      if (p.passe === 'ultra') ps.ultra = true; else ps.plus = true;
      return true;
    }
    if (p.tipo === 'carta') {
      const c = Estado.carta(p.carta);
      if (!c || c.token) return false;
      // carta exclusiva de outra pessoa: passa a existir nesta conta também
      if (c.exclusivo && !c.exclusivo.includes(Conta.uid())) {
        d.cartasExtras = [...new Set([...(d.cartasExtras || []), c.id])];
        if (!d.presentes.includes(c.id)) d.presentes.push(c.id); // evita o aviso duplicado de "presente exclusivo"
      }
      // carta de partidas limitadas que já tinha acabado: volta com as partidas cheias
      if (d.esgotadas && d.esgotadas.includes(c.id)) { d.esgotadas = d.esgotadas.filter((x) => x !== c.id); if (d.usos) d.usos[c.id] = 0; }
      Estado.recarregarCatalogo();
      const colc = d.colecao[c.id] || (d.colecao[c.id] = { nivel: 1, copias: 0, tem: false });
      colc.tem = true;
      colc.nivel = Math.max(colc.nivel || 1, Math.min(Estado.NIVEL_MAX, Math.max(1, Math.round(p.nivel || 1))));
      colc.copias += Math.max(0, Math.round(p.copias || 0));
      if (d.deck.length < 8 && !d.deck.includes(c.id)) d.deck.push(c.id);
      return true;
    }
    return false;
  }

  function ouvir(aoReceber) {
    if (parar || !fb() || !Conta.uid()) return;
    const eu = Conta.uid();
    parar = fb().onSnapshot(col(eu), async (snap) => {
      const d = Estado.d;
      if (!d.presentesRecebidos) d.presentesRecebidos = [];
      const recebidos = [];
      for (const doc of snap.docs) {
        if (d.presentesRecebidos.includes(doc.id)) { fb().deleteDoc(doc.ref).catch(() => {}); continue; }
        const p = { id: doc.id, ...doc.data() };
        const ok = aplicar(p);
        d.presentesRecebidos = [...d.presentesRecebidos, doc.id].slice(-200);
        recebidos.push({ ...p, ok });
      }
      if (!recebidos.length) return;
      Estado.salvar();
      try { await Conta.salvarAgora(); } catch (e) { /* tenta de novo no próximo salvamento */ }
      for (const p of recebidos) fb().deleteDoc(fb().doc(fb().db, 'presentes', eu, 'itens', p.id)).catch(() => {});
      aoReceber(recebidos);
    }, (e) => console.warn('Presentes:', e.code || e));
  }

  function pararDeOuvir() { if (parar) parar(); parar = null; }

  return { enviar, pendentes, cancelar, descrever, ouvir, inventario, aplicar, parar: pararDeOuvir };
})();
