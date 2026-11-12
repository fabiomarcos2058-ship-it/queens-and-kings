// X1 ao vivo com amigos (Firebase Realtime Database).
// Quem cria a sala (host) calcula a batalha e manda o estado ~10x por segundo;
// o convidado vê a arena espelhada e manda só as jogadas.
const X1 = (() => {
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
  let m = null, db = null;
  let sala = null, souHost = false, modoSala = 'x1';
  let desligar = [];

  async function iniciar() {
    if (db) return;
    const f = Conta.fb();
    if (!f || !Conta.logado()) throw new Error('Entre numa conta para jogar x1.');
    if (!FIREBASE_CONFIG.databaseURL) throw new Error('O Realtime Database ainda não foi configurado.');
    m = await import(SDK);
    db = m.getDatabase(f.app, FIREBASE_CONFIG.databaseURL);
  }
  const r = (p) => m.ref(db, p);

  function perfil() {
    const d = Estado.d;
    return { uid: Conta.uid(), versao: String(window.VERSAO_JOGO || ''), arena: Arena.daQtd(d.recorde).id, nome: d.nome, estiloNome: Passe.estiloNome(), avatar: d.avatar, torres: Estado.minhasTorres(), deck: d.deck.slice(0, 8), niveis: Object.fromEntries(d.deck.map((id) => [id, d.colecao[id] ? d.colecao[id].nivel : 1])) };
  }
  const novoCodigo = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');

  function limpar() { desligar.forEach((f) => { try { f(); } catch (e) { /* nada */ } }); desligar = []; }

  // ---------- Host ----------
  async function criarSala({ aoEntrarAmigo, aoResposta, modo = 'x1' }) {
    await iniciar();
    let cod = novoCodigo();
    for (let i = 0; i < 5 && (await m.get(r(`salas/${cod}`))).exists(); i++) cod = novoCodigo();
    sala = cod; souHost = true; modoSala = modo;
    // o modo vai dentro do perfil do host (2v2 = os dois no mesmo time contra 2 IAs)
    await m.set(r(`salas/${cod}`), { host: { ...perfil(), modo }, status: 'esperando', criado: m.serverTimestamp() });
    m.onDisconnect(r(`salas/${cod}`)).remove();
    desligar.push(m.onValue(r(`salas/${cod}/convidado`), (snap) => { if (snap.exists() && !snap.val().saiu) aoEntrarAmigo(snap.val()); }));
    if (aoResposta) desligar.push(m.onValue(r(`salas/${cod}/resposta`), (snap) => { if (snap.exists()) aoResposta(snap.val()); }));
    return cod;
  }

  async function comecar(convidado, fim) {
    await m.update(r(`salas/${sala}`), { status: 'jogando' });
    desligar.push(m.onChildAdded(r(`salas/${sala}/cmds`), (snap) => Batalha.comandoRemoto(snap.val())));
    desligar.push(m.onValue(r(`salas/${sala}/convidado/saiu`), (snap) => { if (snap.val()) Batalha.adversarioSaiu(); }));
    let enviando = false;
    Batalha.iniciar({
      modo: modoSala === '2v2' ? '2v2' : 'x1', fim,
      rede: {
        tipo: 'host', convidado,
        enviarEstado: (est) => { if (enviando && !est.fim) return; enviando = true; m.set(r(`salas/${sala}/estado`), est).finally(() => (enviando = false)); },
        fim: () => { setTimeout(() => { m.remove(r(`salas/${sala}`)).catch(() => {}); limpar(); }, 6000); },
      },
    });
  }

  // ---------- Convidado ----------
  async function entrarSala(codigo, { aoComecar }) {
    await iniciar();
    const cod = codigo.toUpperCase().replace(/[^A-Z]/g, '');
    const snap = await m.get(r(`salas/${cod}`));
    if (!snap.exists()) throw new Error('Sala não encontrada. Confira o código.');
    const v = snap.val();
    if (v.status !== 'esperando' || v.convidado) throw new Error('Essa sala já está cheia.');
    if (v.host.uid === Conta.uid()) throw new Error('Essa sala é sua! Mande o código para um amigo.');
    sala = cod; souHost = false;
    await m.set(r(`salas/${cod}/convidado`), perfil());
    m.onDisconnect(r(`salas/${cod}/convidado/saiu`)).set(true);
    let comecou = false;
    desligar.push(m.onValue(r(`salas/${cod}/status`), (s) => {
      if (s.val() === 'jogando' && !comecou) { comecou = true; aoComecar(v.host); }
    }));
    desligar.push(m.onValue(r(`salas/${cod}`), (s) => { if (!s.exists()) Batalha.adversarioSaiu(); }));
    return v.host;
  }

  function assistir(host, fim) {
    desligar.push(m.onValue(r(`salas/${sala}/estado`), (snap) => Batalha.receberEstado(snap.val())));
    Batalha.iniciarConvidado({
      fim: (dados) => { limpar(); fim(dados); },
      rede: {
        host,
        enviarComando: (cmd) => m.push(r(`salas/${sala}/cmds`), cmd),
        sair: () => { m.set(r(`salas/${sala}/convidado/saiu`), true).catch(() => {}); limpar(); },
      },
    });
  }

  // quem foi chamado responde sem entrar (recusou / está ocupado)
  async function responder(codigo, resposta) {
    try { await iniciar(); await m.set(r(`salas/${codigo}/resposta`), { r: resposta, nome: Estado.d.nome, t: Date.now() }); } catch (e) { /* sala pode já ter acabado */ }
  }

  async function cancelar() {
    try {
      if (souHost && sala) await m.remove(r(`salas/${sala}`));
      else if (sala) await m.set(r(`salas/${sala}/convidado/saiu`), true);
    } catch (e) { /* nada */ }
    limpar();
    sala = null;
  }

  return { criarSala, comecar, entrarSala, assistir, cancelar, responder };
})();
