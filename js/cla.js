// Clãs de verdade (Firestore): clas/{id} com os membros e clas/{id}/mensagens com o chat.
const Cla = (() => {
  const CORES = ['#ED93B1', '#FAC775', '#F09595', '#85B7EB', '#5DCAA5', '#AFA9EC'];
  const MAX = 50;
  const fb = () => Conta.fb();
  const uid = () => Conta.uid();
  let pararChat = null;

  async function listar() {
    const f = fb();
    const q = f.query(f.collection(f.db, 'clas'), f.orderBy('criado', 'desc'), f.limit(50));
    const snap = await f.getDocs(q);
    return snap.docs.map((x) => ({ id: x.id, ...x.data() }));
  }

  async function buscar(id) {
    const f = fb();
    const snap = await f.getDoc(f.doc(f.db, 'clas', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  const eu = () => ({ nome: Estado.d.nome, estiloNome: Passe.estiloNome(), trofeus: Estado.d.trofeus, avatar: Estado.d.avatar, entrou: Date.now() });

  async function criar({ nome, descricao, cor }) {
    const f = fb();
    const ref = f.doc(f.collection(f.db, 'clas'));
    await f.setDoc(ref, {
      nome, nomeBusca: nome.toLowerCase(), descricao, cor, letra: nome.trim()[0].toUpperCase(),
      lider: uid(), criado: f.serverTimestamp(), membros: { [uid()]: eu() },
    });
    Estado.d.cla = { id: ref.id, nome };
    Estado.salvar();
    return ref.id;
  }

  async function entrar(id) {
    const f = fb();
    const ref = f.doc(f.db, 'clas', id);
    await f.runTransaction(f.db, async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists()) throw new Error('Esse clã não existe mais.');
      if (Object.keys(snap.data().membros || {}).length >= MAX) throw new Error('Esse clã está cheio.');
      t.update(ref, { [`membros.${uid()}`]: eu() });
      Estado.d.cla = { id, nome: snap.data().nome };
    });
    Estado.salvar();
  }

  async function sair() {
    const f = fb();
    const ref = f.doc(f.db, 'clas', Estado.d.cla.id);
    await f.runTransaction(f.db, async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists()) return;
      const c = snap.data();
      const outros = Object.entries(c.membros || {}).filter(([u]) => u !== uid());
      if (!outros.length) { t.delete(ref); return; } // último membro: o clã acaba
      const mudancas = { [`membros.${uid()}`]: f.deleteField() };
      if (c.lider === uid()) mudancas.lider = outros.sort((a, b) => (a[1].entrou || 0) - (b[1].entrou || 0))[0][0];
      t.update(ref, mudancas);
    });
    Estado.d.cla = null;
    Estado.salvar();
  }

  async function expulsar(id, membro) {
    const f = fb();
    await f.updateDoc(f.doc(f.db, 'clas', id), { [`membros.${membro}`]: f.deleteField() });
  }

  function ouvirChat(id, aoMudar) {
    pararOuvir();
    const f = fb();
    const q = f.query(f.collection(f.db, 'clas', id, 'mensagens'), f.orderBy('criado', 'desc'), f.limit(40));
    pararChat = f.onSnapshot(q, (snap) => aoMudar(snap.docs.map((x) => x.data()).reverse()), () => aoMudar(null));
  }
  function pararOuvir() { if (pararChat) { pararChat(); pararChat = null; } }

  async function enviar(id, texto) {
    const f = fb();
    await f.addDoc(f.collection(f.db, 'clas', id, 'mensagens'), {
      uid: uid(), nome: Estado.d.nome, estiloNome: Passe.estiloNome(), texto: texto.slice(0, 200), criado: f.serverTimestamp(),
    });
  }

  return { CORES, MAX, listar, buscar, criar, entrar, sair, expulsar, ouvirChat, pararOuvir, enviar };
})();
