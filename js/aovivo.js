// Assistir a batalha de um amigo ao vivo (Firebase Realtime Database).
// Quem está jogando escreve aoVivo/{uid} = { nome, modo, sala?, lado? }.
// - Batalha online (x1/2v2): o espectador lê o mesmo estado da sala (salas/{código}/estado).
// - Batalha contra a IA: o jogador só manda o estado (aoVivo/{uid}/estado) enquanto alguém está assistindo.
const AoVivo = (() => {
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
  let m = null, db = null;
  let meu = null, desligar = [], vendo = 0, enviando = false;
  let espiando = null; // { uid, desligar[] }
  const limpo = (o) => JSON.parse(JSON.stringify(o));

  async function iniciar() {
    if (db) return true;
    try {
      const f = Conta.fb && Conta.fb();
      if (!f || !Conta.logado() || typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.databaseURL) return false;
      m = await import(SDK);
      db = m.getDatabase(f.app, FIREBASE_CONFIG.databaseURL);
      return true;
    } catch (e) { return false; }
  }
  const r = (p) => m.ref(db, p);

  // ---------- quem joga ----------
  async function comecou(info) {
    try {
      parar();
      if (!(await iniciar())) return;
      meu = Conta.uid();
      const d = Estado.d;
      await m.set(r(`aoVivo/${meu}`), limpo({ nome: d.nome || 'Jogador', avatar: d.avatar || null, ...info, desde: m.serverTimestamp() }));
      m.onDisconnect(r(`aoVivo/${meu}`)).remove();
      desligar.push(m.onValue(r(`aoVivo/${meu}/assistindo`), (snap) => {
        vendo = snap.exists() ? Object.keys(snap.val() || {}).length : 0;
        const s = Batalha._estado();
        if (s && !s.rede && !s.convidado) s.aoVivo = vendo > 0 ? { vendo } : null;
        if (s && vendo && !info.sala) UI.toast(`👁 ${vendo} amigo${vendo > 1 ? 's' : ''} assistindo`);
      }));
    } catch (e) { /* assistir é extra: nunca atrapalha a batalha */ }
  }
  function publicar(est) {
    if (!meu || !m || enviando) return;
    enviando = true;
    m.set(r(`aoVivo/${meu}/estado`), limpo(est)).catch(() => {}).finally(() => (enviando = false));
  }
  function terminou(est, resultado) {
    if (!meu || !m) return;
    const uid = meu;
    if (vendo) m.set(r(`aoVivo/${uid}/estado`), limpo({ ...est, fim: { resultado } })).catch(() => {});
    else m.update(r(`aoVivo/${uid}`), { acabou: resultado }).catch(() => {});
    desligar.forEach((f) => { try { f(); } catch (e) { /* nada */ } });
    desligar = []; vendo = 0; meu = null;
    setTimeout(() => m.remove(r(`aoVivo/${uid}`)).catch(() => {}), 4000);
  }
  function parar() {
    desligar.forEach((f) => { try { f(); } catch (e) { /* nada */ } });
    desligar = []; vendo = 0;
    if (meu && m) m.remove(r(`aoVivo/${meu}`)).catch(() => {});
    meu = null;
  }

  // ---------- quem assiste ----------
  async function status(uids) {
    const out = {};
    if (!uids.length || !(await iniciar())) return out;
    await Promise.all(uids.map(async (u) => {
      try { const s = await m.get(r(`aoVivo/${u}`)); if (s.exists() && !s.val().acabou) out[u] = s.val(); } catch (e) { /* sem permissão ou offline */ }
    }));
    return out;
  }
  async function assistir(uid, nome) {
    if (!(await iniciar())) { UI.toast('Entre numa conta para assistir'); return false; }
    const snap = await m.get(r(`aoVivo/${uid}`)).catch(() => null);
    if (!snap || !snap.exists() || snap.val().acabou) { UI.toast('Essa batalha já acabou 😅'); return false; }
    const info = snap.val();
    const eu = Conta.uid();
    sairDeAssistir();
    await m.set(r(`aoVivo/${uid}/assistindo/${eu}`), true).catch(() => {});
    m.onDisconnect(r(`aoVivo/${uid}/assistindo/${eu}`)).remove();
    espiando = { uid, desligar: [] };
    Batalha.iniciarEspectador({ info, nome: nome || info.nome, sair: sairDeAssistir });
    const caminho = info.sala ? `salas/${info.sala}/estado` : `aoVivo/${uid}/estado`;
    espiando.desligar.push(m.onValue(r(caminho), (s) => { if (s.exists()) Batalha.receberEstado(s.val()); }));
    espiando.desligar.push(m.onValue(r(`aoVivo/${uid}`), (s) => { if (!s.exists()) Batalha.espectadorFim(null); }));
    return true;
  }
  function sairDeAssistir() {
    if (!espiando) return;
    espiando.desligar.forEach((f) => { try { f(); } catch (e) { /* nada */ } });
    if (m) m.remove(r(`aoVivo/${espiando.uid}/assistindo/${Conta.uid()}`)).catch(() => {});
    espiando = null;
  }

  return { comecou, publicar, terminou, parar, status, assistir, sairDeAssistir };
})();
