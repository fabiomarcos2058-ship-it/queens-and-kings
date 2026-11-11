// Contas com Firebase: e-mail/senha, Google ou jogar sem conta.
// O progresso de quem tem conta fica salvo no Firestore em jogadores/{uid}.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDpiNpTeYdiuJbsGhBUtKOEKz6XC_UbNKI',
  authDomain: 'queens-and-kings-dab10.firebaseapp.com',
  projectId: 'queens-and-kings-dab10',
  storageBucket: 'queens-and-kings-dab10.firebasestorage.app',
  messagingSenderId: '884266795254',
  appId: '1:884266795254:web:aa60cb867487cdac316cd7',
};

const Conta = (() => {
  const VERSAO_SDK = '10.12.2';
  const sdk = (m) => `https://www.gstatic.com/firebasejs/${VERSAO_SDK}/firebase-${m}.js`;
  let fb = null;
  let usuario = null;
  let timerNuvem = null;

  const ativo = () => !!FIREBASE_CONFIG;
  const logado = () => !!usuario;
  const email = () => (usuario ? usuario.email || usuario.displayName || 'conta Google' : null);

  async function iniciarFirebase() {
    if (fb || !ativo()) return fb;
    const [app, auth, fs] = await Promise.all([import(sdk('app')), import(sdk('auth')), import(sdk('firestore'))]);
    const a = app.initializeApp(FIREBASE_CONFIG);
    fb = { ...auth, ...fs, auth: auth.getAuth(a), db: fs.getFirestore(a) };
    fb.auth.languageCode = 'pt';
    return fb;
  }

  // ---------- Nuvem ----------
  const docJogador = () => fb.doc(fb.db, 'jogadores', usuario.uid);

  async function baixarDaNuvem() {
    const snap = await fb.getDoc(docJogador());
    return snap.exists() ? JSON.parse(snap.data().dados) : null;
  }

  async function enviarParaNuvem() {
    if (!usuario) return;
    try {
      await fb.setDoc(docJogador(), { dados: JSON.stringify(Estado.d), atualizado: fb.serverTimestamp(), nome: Estado.d.nome });
      // top global (contas que usaram o mod menu ficam de fora, pra ser justo)
      if (!Estado.d.modUsado) {
        await fb.setDoc(fb.doc(fb.db, 'ranking', usuario.uid), {
          nome: Estado.d.nome.slice(0, 16), trofeus: Math.max(0, Math.min(99999, Math.round(Estado.d.trofeus))),
          avatar: Estado.d.avatar, cla: Estado.d.cla ? Estado.d.cla.nome.slice(0, 20) : '', atualizado: fb.serverTimestamp(),
        }).catch(() => {});
      } else {
        await fb.deleteDoc(fb.doc(fb.db, 'ranking', usuario.uid)).catch(() => {});
      }
      // mantém nome e troféus atualizados no clã
      if (Estado.d.cla && Estado.d.cla.id) {
        await fb.updateDoc(fb.doc(fb.db, 'clas', Estado.d.cla.id), {
          [`membros.${usuario.uid}.nome`]: Estado.d.nome,
          [`membros.${usuario.uid}.trofeus`]: Estado.d.trofeus,
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Não salvou na nuvem:', e.code || e);
    }
  }

  function agendarEnvio() {
    clearTimeout(timerNuvem);
    timerNuvem = setTimeout(enviarParaNuvem, 1500);
  }

  // Ao entrar: se a conta já tem progresso, ele é carregado; se não, o progresso deste celular vai para a conta
  const temProgresso = (x) => x && (x.trofeus > 0 || x.vitorias > 0 || Object.values(x.colecao || {}).some((c) => c.tem));

  function escolherProgresso(local, nuvem) {
    const resumo = (x) => `<b>${x.nome}</b><br>🏆 ${x.trofeus} troféus · nível ${x.nivel}<br>🃏 ${Object.values(x.colecao).filter((c) => c.tem).length} cartas`;
    return new Promise((ok) => UI.modal({
      titulo: 'Qual progresso manter?',
      html: `<p>Essa conta já tem um progresso salvo, e este celular também tem um.</p>
        <div class="escolha-progresso"><div><small>☁️ Na conta</small>${resumo(nuvem)}</div><div><small>📱 Neste celular</small>${resumo(local)}</div></div>
        <p class="aviso">O que você não escolher será substituído.</p>`,
      botoes: [
        { texto: 'Usar o da conta', classe: 'secundario', acao: () => ok('nuvem') },
        { texto: 'Usar o deste celular', classe: 'principal', acao: () => ok('local') },
      ],
    }));
  }

  async function aoEntrar(u, { perguntar = false } = {}) {
    usuario = u;
    let nuvem = null;
    try { nuvem = await baixarDaNuvem(); } catch (e) { console.warn('Erro ao ler a nuvem:', e.code || e); }
    if (nuvem) {
      const local = JSON.parse(JSON.stringify(Estado.d));
      const escolha = perguntar && temProgresso(local) && temProgresso(nuvem) ? await escolherProgresso(local, nuvem) : 'nuvem';
      if (escolha === 'nuvem') Estado.importar(nuvem);
    }
    Estado.d.conta = { tipo: 'conta', email: email() };
    if (!nuvem && u.displayName && Estado.d.nome === 'Jogador') Estado.d.nome = u.displayName.slice(0, 16);
    Estado.aoSalvar(agendarEnvio);
    Estado.salvar();
    await enviarParaNuvem();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timerNuvem) { clearTimeout(timerNuvem); enviarParaNuvem(); }
  });

  // Espera o Firebase dizer se já tem alguém logado neste celular
  async function verificarSessao() {
    if (!ativo()) return null;
    try {
      await iniciarFirebase();
      try { await fb.getRedirectResult(fb.auth); } catch (e) { /* sem redirecionamento pendente */ }
      const u = await new Promise((ok) => { const parar = fb.onAuthStateChanged(fb.auth, (x) => { parar(); ok(x); }); });
      if (u) await aoEntrar(u);
      return u;
    } catch (e) {
      console.warn('Firebase indisponível:', e);
      return null;
    }
  }

  const ERROS = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/missing-password': 'Digite a senha.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Tente entrar.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'Não existe conta com esse e-mail.',
    'auth/too-many-requests': 'Muitas tentativas. Espere um pouquinho e tente de novo.',
    'auth/network-request-failed': 'Sem internet. Verifique a conexão.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
    'auth/unauthorized-domain': 'Este site ainda não está autorizado no Firebase.',
  };
  const msgErro = (e) => ERROS[e.code] || (!e.code ? 'Não foi possível conectar. Verifique a internet e tente de novo.' : `Não deu certo (${e.code}). Tente de novo.`);

  // ---------- Tela de entrar / criar conta ----------
  function tela({ podeFechar = false } = {}) {
    return new Promise((ok) => {
      const d = Estado.d;
      if (!podeFechar && (d.conta || logado())) return ok();

      const el = document.createElement('div');
      el.className = 'tela-conta';
      el.innerHTML = `
        <div class="conta-caixa">
          <div class="logo-texto"><span>Queens</span><small>and</small><span>Kings</span></div>
          <div class="conta-abas"><button class="ativa" data-aba="entrar">Entrar</button><button data-aba="criar">Criar conta</button></div>
          <form class="conta-form" autocomplete="on" novalidate>
            <label class="campo so-criar oculto">Nome no jogo<input name="nome" maxlength="16" placeholder="Como quer ser chamado(a)" /></label>
            <label class="campo">E-mail<input name="email" type="email" autocomplete="email" placeholder="seu@email.com" /></label>
            <label class="campo">Senha<input name="senha" type="password" autocomplete="current-password" placeholder="Pelo menos 6 caracteres" /></label>
            <p class="conta-erro"></p>
            <button type="submit" class="btn-modal principal" id="conta-enviar">Entrar</button>
            <button type="button" class="link-senha" id="conta-esqueci">Esqueci minha senha</button>
          </form>
          <div class="conta-ou"><span>ou</span></div>
          <button class="btn-modal btn-google" id="conta-google"><b>G</b> Entrar com Google</button>
          <button class="btn-modal secundario" id="conta-convidado">${podeFechar ? 'Voltar' : 'Jogar sem conta'}</button>
          <p class="aviso">Com uma conta, seu progresso fica salvo na nuvem e você pode jogar em qualquer celular.</p>
        </div>`;
      document.getElementById('app').appendChild(el);

      let modo = 'entrar';
      const form = el.querySelector('form');
      const erro = el.querySelector('.conta-erro');
      const btn = el.querySelector('#conta-enviar');
      el.querySelectorAll('.conta-abas button').forEach((b) => (b.onclick = () => {
        modo = b.dataset.aba;
        el.querySelectorAll('.conta-abas button').forEach((x) => x.classList.toggle('ativa', x === b));
        el.querySelector('.so-criar').classList.toggle('oculto', modo !== 'criar');
        btn.textContent = modo === 'criar' ? 'Criar conta' : 'Entrar';
        form.senha.autocomplete = modo === 'criar' ? 'new-password' : 'current-password';
        erro.textContent = '';
      }));

      const fechar = () => { el.classList.add('saindo'); setTimeout(() => { el.remove(); ok(); }, 300); };
      const carregando = (sim) => { el.querySelectorAll('button').forEach((b) => (b.disabled = sim)); el.classList.toggle('carregando', sim); };
      const entrou = async (u, nome) => {
        if (nome) { try { await fb.updateProfile(u, { displayName: nome }); } catch (e) { /* tudo bem */ } }
        await aoEntrar(u, { perguntar: true });
        if (nome) { Estado.d.nome = nome; Estado.salvar(); }
        UI.toast(`Conectado como ${email()} 💕`);
        fechar();
      };

      form.onsubmit = async (e) => {
        e.preventDefault();
        const em = form.email.value.trim(), senha = form.senha.value, nome = form.nome.value.trim();
        if (!em.includes('@')) { erro.textContent = 'Digite um e-mail válido.'; return; }
        if (senha.length < 6) { erro.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
        erro.textContent = '';
        carregando(true);
        try {
          await iniciarFirebase();
          const r = modo === 'criar'
            ? await fb.createUserWithEmailAndPassword(fb.auth, em, senha)
            : await fb.signInWithEmailAndPassword(fb.auth, em, senha);
          await entrou(r.user, modo === 'criar' ? nome : null);
        } catch (x) {
          erro.textContent = msgErro(x);
        }
        carregando(false);
      };

      el.querySelector('#conta-esqueci').onclick = async () => {
        const em = form.email.value.trim();
        if (!em.includes('@')) { erro.textContent = 'Digite seu e-mail acima para receber o link.'; return; }
        try { await iniciarFirebase(); await fb.sendPasswordResetEmail(fb.auth, em); UI.toast('Enviamos um link para o seu e-mail 📩'); }
        catch (x) { erro.textContent = msgErro(x); }
      };

      el.querySelector('#conta-google').onclick = async () => {
        erro.textContent = '';
        carregando(true);
        try {
          await iniciarFirebase();
          const prov = new fb.GoogleAuthProvider();
          try {
            const r = await fb.signInWithPopup(fb.auth, prov);
            await entrou(r.user);
          } catch (x) {
            if (x.code === 'auth/popup-blocked' || x.code === 'auth/operation-not-supported-in-this-environment') {
              await fb.signInWithRedirect(fb.auth, prov);
            } else throw x;
          }
        } catch (x) {
          erro.textContent = msgErro(x);
        }
        carregando(false);
      };

      el.querySelector('#conta-convidado').onclick = () => {
        if (!podeFechar) { d.conta = { tipo: 'convidado' }; Estado.salvar(); }
        fechar();
      };
    });
  }

  async function salvarComGoogle() {
    try {
      await iniciarFirebase();
      const prov = new fb.GoogleAuthProvider();
      const r = await fb.signInWithPopup(fb.auth, prov);
      await aoEntrar(r.user, { perguntar: true });
      UI.toast(`Progresso salvo na conta ${email()} ☁️`);
      return true;
    } catch (x) {
      if (x.code === 'auth/popup-blocked' || x.code === 'auth/operation-not-supported-in-this-environment') {
        await fb.signInWithRedirect(fb.auth, new fb.GoogleAuthProvider());
      } else UI.toast(msgErro(x));
      return false;
    }
  }

  async function topGlobal() {
    await iniciarFirebase();
    const q = fb.query(fb.collection(fb.db, 'ranking'), fb.orderBy('trofeus', 'desc'), fb.limit(50));
    const snap = await fb.getDocs(q);
    return snap.docs.map((x) => ({ uid: x.id, ...x.data() }));
  }

  async function sair() {
    try { await enviarParaNuvem(); await fb.signOut(fb.auth); } catch (e) { /* nada */ }
    usuario = null;
    Estado.aoSalvar(null);
    Estado.apagar(); // o progresso continua salvo na conta
    location.reload();
  }

  return { tela, ativo, logado, email, verificarSessao, sair, salvarComGoogle, fb: () => fb, uid: () => (usuario ? usuario.uid : null), salvarAgora: enviarParaNuvem, topGlobal };
})();
