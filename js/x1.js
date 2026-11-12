// X1 ao vivo com amigos (Firebase Realtime Database).
// Quem cria a sala (host) calcula a batalha e manda o estado ~10x por segundo;
// o convidado vê a arena espelhada e manda só as jogadas.
const X1 = (() => {
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
  let m = null, db = null;
  let sala = null, souHost = false, modoSala = 'x1', meuLado = null;
  const VAGAS = ['azul', 'azul2', 'vermelho', 'vermelho2'];
  const timeDe = (l) => (l.startsWith('azul') ? 'azul' : 'vermelho');
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
  // o Firebase não aceita campos "undefined": limpa antes de mandar
  const limpo = (o) => JSON.parse(JSON.stringify(o));

  function perfil() {
    const d = Estado.d;
    return { uid: Conta.uid(), versao: String(window.VERSAO_JOGO || ''), arena: Arena.daQtd(d.recorde).id, nome: d.nome, estiloNome: Passe.estiloNome(), avatar: d.avatar, torres: Estado.minhasTorres(), deck: d.deck.slice(0, 8), niveis: Object.fromEntries(d.deck.map((id) => [id, d.colecao[id] ? d.colecao[id].nivel : 1])) };
  }
  const novoCodigo = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');

  function limpar() { desligar.forEach((f) => { try { f(); } catch (e) { /* nada */ } }); desligar = []; }

  // ---------- Host ----------
  async function criarSala({ aoEntrarAmigo, aoResposta, aoMudarVagas, modo = 'x1' }) {
    await iniciar();
    let cod = novoCodigo();
    for (let i = 0; i < 5 && (await m.get(r(`salas/${cod}`))).exists(); i++) cod = novoCodigo();
    sala = cod; souHost = true; modoSala = modo;
    // o modo vai dentro do perfil do host (2v2 = os dois no mesmo time contra 2 IAs)
    const eu = perfil();
    const sala0 = { host: { ...eu, modo }, status: 'esperando', criado: m.serverTimestamp() };
    if (modo === '2v2') sala0.vagas = { azul: eu }; // o host fica sempre no time azul; as outras 3 vagas são de quem entrar
    await m.set(r(`salas/${cod}`), sala0);
    m.onDisconnect(r(`salas/${cod}`)).remove();
    if (modo === '2v2') desligar.push(m.onValue(r(`salas/${cod}/vagas`), (snap) => aoMudarVagas && aoMudarVagas(snap.val() || {})));
    else desligar.push(m.onValue(r(`salas/${cod}/convidado`), (snap) => { if (snap.exists() && !snap.val().saiu) aoEntrarAmigo(snap.val()); }));
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
        enviarEstado: (est) => { if (enviando && !est.fim) return; enviando = true; m.set(r(`salas/${sala}/estado`), limpo(est)).catch(() => {}).finally(() => (enviando = false)); },
        fim: () => { setTimeout(() => { m.remove(r(`salas/${sala}`)).catch(() => {}); limpar(); }, 6000); },
      },
    });
  }

  // 2v2: o host começa com quem estiver nas vagas (vaga vazia = IA)
  async function comecar2v2(fim) {
    const vagas = (await m.get(r(`salas/${sala}/vagas`))).val() || {};
    const jogadores = {};
    for (const l of ['azul2', 'vermelho', 'vermelho2']) if (vagas[l]) jogadores[l] = vagas[l];
    await m.update(r(`salas/${sala}`), { status: 'jogando' });
    desligar.push(m.onChildAdded(r(`salas/${sala}/cmds`), (snap) => Batalha.comandoRemoto(snap.val())));
    // quem sair no meio vira IA
    desligar.push(m.onChildRemoved(r(`salas/${sala}/vagas`), (snap) => { if (snap.key !== 'azul') Batalha.adversarioSaiu(snap.key); }));
    let enviando = false;
    Batalha.iniciar({
      modo: '2v2', fim,
      rede: {
        tipo: 'host', jogadores,
        enviarEstado: (est) => { if (enviando && !est.fim) return; enviando = true; m.set(r(`salas/${sala}/estado`), limpo(est)).catch(() => {}).finally(() => (enviando = false)); },
        fim: () => { setTimeout(() => { m.remove(r(`salas/${sala}`)).catch(() => {}); limpar(); }, 6000); },
      },
    });
  }

  // convidado do 2v2 troca de time (pega uma vaga livre do outro lado)
  async function trocarTime() {
    if (!sala || !meuLado || souHost) return false;
    const destino = timeDe(meuLado) === 'azul' ? ['vermelho', 'vermelho2'] : ['azul2'];
    const eu = perfil();
    let novo = null;
    const res = await m.runTransaction(r(`salas/${sala}/vagas`), (v) => {
      v = v || {};
      const livre = destino.find((l) => !v[l]);
      if (!livre) return; // cancela: o outro time está cheio
      delete v[meuLado]; v[livre] = eu; novo = livre;
      return v;
    });
    if (!res.committed || !novo) return false;
    meuLado = novo;
    m.onDisconnect(r(`salas/${sala}/vagas/${meuLado}`)).remove();
    return meuLado;
  }

  // ---------- Convidado ----------
  async function entrarSala(codigo, { aoComecar, aoMudarVagas }) {
    await iniciar();
    const cod = codigo.toUpperCase().replace(/[^A-Z]/g, '');
    const snap = await m.get(r(`salas/${cod}`));
    if (!snap.exists()) throw new Error('Sala não encontrada. Confira o código.');
    const v = snap.val();
    if (v.host.uid === Conta.uid()) throw new Error('Essa sala é sua! Mande o código para um amigo.');
    if (v.host.modo === '2v2') return entrar2v2(cod, v, { aoComecar, aoMudarVagas });
    if (v.status !== 'esperando' || v.convidado) throw new Error('Essa sala já está cheia.');
    sala = cod; souHost = false; modoSala = 'x1'; meuLado = null;
    await m.set(r(`salas/${cod}/convidado`), perfil());
    m.onDisconnect(r(`salas/${cod}/convidado/saiu`)).set(true);
    let comecou = false;
    desligar.push(m.onValue(r(`salas/${cod}/status`), (s) => {
      if (s.val() === 'jogando' && !comecou) { comecou = true; aoComecar(v.host); }
    }));
    desligar.push(m.onValue(r(`salas/${cod}`), (s) => { if (!s.exists()) Batalha.adversarioSaiu(); }));
    return v.host;
  }

  async function entrar2v2(cod, v, { aoComecar, aoMudarVagas }) {
    if (v.status !== 'esperando') throw new Error('Essa partida já começou.');
    const eu = perfil();
    let pegou = null;
    const res = await m.runTransaction(r(`salas/${cod}/vagas`), (vs) => {
      vs = vs || {};
      for (const l of Object.keys(vs)) if (vs[l] && vs[l].uid === eu.uid) delete vs[l]; // entrando de novo
      const livre = ['azul2', 'vermelho', 'vermelho2'].find((l) => !vs[l]);
      if (!livre) return; // sala cheia
      vs[livre] = eu; pegou = livre;
      return vs;
    });
    if (!res.committed || !pegou) throw new Error('Essa sala já está cheia (4 jogadores).');
    sala = cod; souHost = false; modoSala = '2v2'; meuLado = pegou;
    m.onDisconnect(r(`salas/${cod}/vagas/${meuLado}`)).remove();
    let comecou = false;
    desligar.push(m.onValue(r(`salas/${cod}/vagas`), (snap) => aoMudarVagas && aoMudarVagas(snap.val() || {}, meuLado)));
    desligar.push(m.onValue(r(`salas/${cod}/status`), async (st) => {
      if (st.val() === 'jogando' && !comecou) {
        comecou = true;
        const vagas = (await m.get(r(`salas/${cod}/vagas`))).val() || {};
        aoComecar(v.host, { meuLado, vagas });
      }
    }));
    desligar.push(m.onValue(r(`salas/${cod}`), (s) => { if (!s.exists()) Batalha.adversarioSaiu(); }));
    return { ...v.host, meuLado };
  }

  function assistir(host, fim, extra = {}) {
    desligar.push(m.onValue(r(`salas/${sala}/estado`), (snap) => Batalha.receberEstado(snap.val())));
    Batalha.iniciarConvidado({
      fim: (dados) => { limpar(); fim(dados); },
      rede: {
        host, ...extra,
        enviarComando: (cmd) => m.push(r(`salas/${sala}/cmds`), limpo(cmd)).catch(() => {}),
        sair: () => { (modoSala === '2v2' && meuLado ? m.remove(r(`salas/${sala}/vagas/${meuLado}`)) : m.set(r(`salas/${sala}/convidado/saiu`), true)).catch(() => {}); limpar(); },
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
      else if (sala && modoSala === '2v2' && meuLado) await m.remove(r(`salas/${sala}/vagas/${meuLado}`));
      else if (sala) await m.set(r(`salas/${sala}/convidado/saiu`), true);
    } catch (e) { /* nada */ }
    limpar();
    sala = null; meuLado = null; modoSala = 'x1';
  }

  const codigo = () => sala;
  return { criarSala, comecar, comecar2v2, trocarTime, entrarSala, assistir, cancelar, responder, codigo, VAGAS };
})();
