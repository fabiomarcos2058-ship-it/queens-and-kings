// Amigos e perfis públicos (Firestore).
// perfis/{uid}               -> perfil público com as estatísticas (todo mundo logado vê)
// perfis/{uid}/pedidos/{de}  -> pedidos de amizade recebidos
// perfis/{uid}/amigos/{uid2} -> lista de amigos (os dois lados são gravados juntos)
// perfis/{uid}/convites/{de} -> convite de x1 com o código da sala
const Amigos = (() => {
  const fb = () => Conta.fb();
  const uid = () => Conta.uid();
  const ONLINE_MS = 3 * 60 * 1000;
  let pararPedidos = null, pararConvites = null, batimento = null;
  const convitesVistos = new Set();

  const ref = (...p) => fb().doc(fb().db, 'perfis', ...p);
  const col = (...p) => fb().collection(fb().db, 'perfis', ...p);

  // ---------- Perfil público ----------
  function dadosPublicos() {
    const d = Estado.d;
    const colecao = Object.entries(d.colecao || {}).filter(([, c]) => c.tem);
    return {
      nome: String(d.nome || 'Jogador').slice(0, 16),
      nomeBusca: String(d.nome || 'jogador').slice(0, 16).toLowerCase(),
      avatar: d.avatar || 'coroa', cor: d.cor || 'roxo', nivel: d.nivel || 1,
      trofeus: Math.max(0, Math.round(d.trofeus || 0)), recorde: Math.max(0, Math.round(d.recorde || 0)),
      vitorias: d.vitorias || 0, derrotas: d.derrotas || 0,
      tresCoroas: (d.conquistas && d.conquistas.tresCoroas) || 0,
      baus: (d.conquistas && d.conquistas.baus) || 0,
      x1v: (d.x1 && d.x1.v) || 0, x1d: (d.x1 && d.x1.d) || 0,
      ranque: typeof Ranque !== 'undefined' ? Ranque.publico() : null,
      cartas: colecao.length, totalCartas: Estado.catalogo().length,
      deck: (d.deck || []).slice(0, 8).map((id) => ({ id, nivel: (d.colecao[id] && d.colecao[id].nivel) || 1 })),
      torres: Estado.minhasTorres(),
      estiloNome: Passe.estiloNome(),
      cla: d.cla && d.cla.nome ? String(d.cla.nome).slice(0, 20) : '',
      mod: !!d.modUsado,
      visto: fb().serverTimestamp(),
    };
  }

  async function publicar() {
    if (!fb() || !uid()) return;
    try { await fb().setDoc(ref(uid()), dadosPublicos()); } catch (e) { console.warn('Perfil público não salvou:', e.code || e); }
  }

  async function ver(id) {
    const s = await fb().getDoc(ref(id));
    return s.exists() ? { uid: id, ...s.data() } : null;
  }

  const online = (p) => !!(p && p.visto && p.visto.toMillis && Date.now() - p.visto.toMillis() < ONLINE_MS);

  async function buscar(texto) {
    const t = texto.trim();
    if (!t) return [];
    if (t.length >= 20 && !/\s/.test(t)) { const p = await ver(t); return p ? [p] : []; }
    const f = fb(), b = t.toLowerCase();
    const q = f.query(col(), f.where('nomeBusca', '>=', b), f.where('nomeBusca', '<=', b + ''), f.limit(15));
    const snap = await f.getDocs(q);
    return snap.docs.map((x) => ({ uid: x.id, ...x.data() }));
  }

  // ---------- Amizade ----------
  // situação entre mim e outra pessoa: 'eu' | 'amigos' | 'enviado' | 'recebido' | 'nada'
  async function situacao(id) {
    if (id === uid()) return 'eu';
    const f = fb();
    const [amigo, recebido, enviado] = await Promise.all([
      f.getDoc(ref(uid(), 'amigos', id)), f.getDoc(ref(uid(), 'pedidos', id)), f.getDoc(ref(id, 'pedidos', uid())).catch(() => null),
    ]);
    if (amigo.exists()) return 'amigos';
    if (recebido.exists()) return 'recebido';
    if (enviado && enviado.exists()) return 'enviado';
    return 'nada';
  }

  async function pedir(id) {
    if (id === uid()) throw new Error('Esse é você! 😅');
    const f = fb();
    // se a pessoa já tinha me mandado pedido, vira amizade direto
    if ((await f.getDoc(ref(uid(), 'pedidos', id))).exists()) { await aceitar(id); return 'amigos'; }
    await f.setDoc(ref(id, 'pedidos', uid()), { nome: Estado.d.nome, estiloNome: Passe.estiloNome(), avatar: Estado.d.avatar, quando: f.serverTimestamp() });
    return 'enviado';
  }

  async function aceitar(id) {
    const f = fb(), lote = f.writeBatch(f.db), agora = f.serverTimestamp();
    lote.set(ref(uid(), 'amigos', id), { desde: agora });
    lote.set(ref(id, 'amigos', uid()), { desde: agora });
    await lote.commit();
    await f.deleteDoc(ref(uid(), 'pedidos', id)).catch(() => {});
  }

  const recusar = (id) => fb().deleteDoc(ref(uid(), 'pedidos', id));
  const cancelarPedido = (id) => fb().deleteDoc(ref(id, 'pedidos', uid()));

  async function remover(id) {
    const f = fb(), lote = f.writeBatch(f.db);
    lote.delete(ref(uid(), 'amigos', id));
    lote.delete(ref(id, 'amigos', uid()));
    await lote.commit();
  }

  async function listar() {
    const snap = await fb().getDocs(col(uid(), 'amigos'));
    const lista = await Promise.all(snap.docs.map((x) => ver(x.id).catch(() => null).then((p) => p || { uid: x.id, nome: 'Jogador', trofeus: 0 })));
    return lista.sort((a, b) => (online(b) - online(a)) || (b.trofeus || 0) - (a.trofeus || 0));
  }

  // ---------- Convite de x1 ----------
  async function convidar(id, codigo, modo = 'x1') {
    const f = fb();
    await f.setDoc(ref(id, 'convites', uid()), { nome: Estado.d.nome, estiloNome: Passe.estiloNome(), avatar: Estado.d.avatar, codigo, modo, t: Date.now(), quando: f.serverTimestamp() });
  }
  const apagarConvite = (de) => { try { fb().deleteDoc(ref(uid(), 'convites', de)).catch(() => {}); } catch (e) { /* sem conexão */ } };

  // ---------- Ouvir pedidos e convites ----------
  function ouvir({ aoMudarPedidos, aoConvite }) {
    if (!fb() || !uid() || pararPedidos) return;
    const f = fb();
    pararPedidos = f.onSnapshot(col(uid(), 'pedidos'), (s) => aoMudarPedidos(s.docs.map((x) => ({ uid: x.id, ...x.data() }))), () => {});
    pararConvites = f.onSnapshot(col(uid(), 'convites'), (s) => {
      s.docChanges().forEach((m) => {
        if (m.type === 'removed') return;
        const c = { de: m.doc.id, ...m.doc.data() };
        if (!c.codigo || convitesVistos.has(c.codigo)) return; // o mesmo convite não aparece duas vezes
        const idade = c.quando && c.quando.toMillis ? Date.now() - c.quando.toMillis() : 0;
        if (idade > 90 * 1000) { apagarConvite(c.de); return; } // convite velho
        convitesVistos.add(c.codigo);
        aoConvite(c);
      });
    }, () => {});
    publicar();
    batimento = setInterval(() => { if (uid() && document.visibilityState === 'visible') f.updateDoc(ref(uid()), { visto: f.serverTimestamp() }).catch(() => {}); }, 60 * 1000);
  }

  function parar() {
    [pararPedidos, pararConvites].forEach((p) => p && p());
    pararPedidos = pararConvites = null;
    clearInterval(batimento);
  }

  return { publicar, ver, buscar, online, situacao, pedir, aceitar, recusar, cancelarPedido, remover, listar, convidar, apagarConvite, ouvir, parar };
})();
