// Obriga a atualizar quando sai uma versão nova do jogo.
// - O carregador (index.html) guarda a versão em window.VERSAO_JOGO.
// - O "sino" do Firebase avisa na hora quando alguém abre uma versão nova (ver ligarSino).
// - A cada 15s, quando o jogo volta a aparecer na tela e antes de cada batalha, conferimos o versao.txt
//   (com ?t= para furar o cache do GitHub Pages, que guarda cópias por até 10 minutos).
// - Se mudou, aparece uma tela que bloqueia o jogo até atualizar. Durante uma batalha, ela espera a batalha acabar.
const Atualizacao = (() => {
  let pendente = null;
  let mostrando = false;
  let ultimaConferida = 0;

  const emBatalha = () => {
    const b = document.getElementById('batalha');
    return b && !b.classList.contains('oculto');
  };
  const minha = () => String(window.VERSAO_JOGO || '');
  const maisNova = (a, b) => /^\d+$/.test(a) && /^\d+$/.test(b) && +a > +b; // a é mais nova que b?

  async function versaoNoServidor(limiteMs = 6000) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), limiteMs);
      const r = await fetch(`versao.txt?t=${Date.now()}`, { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) return null;
      const v = (await r.text()).trim();
      return /^\d+$/.test(v) ? v : null;
    } catch (e) {
      return null; // sem internet: tenta de novo depois
    }
  }

  async function atualizarAgora() {
    try { Estado.salvar(); } catch (e) { /* nada */ }
    try { if (Conta.logado()) await Promise.race([Conta.salvarAgora(), new Promise((ok) => setTimeout(ok, 3000))]); } catch (e) { /* nada */ }
    try { sessionStorage.setItem('qk-atualizou', minha()); } catch (e) { /* nada */ }
    // endereço novo = o navegador e o GitHub não podem usar a página antiga guardada
    location.replace(`${location.pathname}?v=${pendente || Date.now()}&r=${Date.now()}`);
  }

  function mostrarTela() {
    if (mostrando) return;
    mostrando = true;
    document.querySelectorAll('.modal-fundo').forEach((m) => m.remove());
    const el = document.createElement('div');
    el.className = 'tela-atualizar';
    el.innerHTML = `<div class="atualizar-caixa">
      <div class="atualizar-icone">✨</div>
      <b>Nova versão do jogo!</b>
      <p>Saiu uma atualização com novidades e correções. Atualize para continuar jogando.</p>
      <p class="aviso">Seu progresso fica salvo.</p>
      <button class="btn-modal principal" id="btn-atualizar-jogo">Atualizar agora</button>
    </div>`;
    document.getElementById('app').appendChild(el);
    el.querySelector('#btn-atualizar-jogo').onclick = (e) => { e.target.disabled = true; e.target.textContent = 'Atualizando…'; atualizarAgora(); };
    // se a pessoa não tocar, atualiza sozinho depois de 20s (só fora de batalha)
    setTimeout(() => { if (!emBatalha()) atualizarAgora(); }, 20000);
  }

  // devolve true se achou versão nova
  async function conferir() {
    if (mostrando) return true;
    ultimaConferida = Date.now();
    const nova = await versaoNoServidor();
    if (!nova || !minha() || nova === minha()) return false;
    if (!maisNova(nova, minha())) return false; // servidor com cópia velha: ignora
    pendente = nova;
    if (!emBatalha()) mostrarTela();
    return true;
  }

  // chamado antes de começar uma batalha: se tem atualização, bloqueia
  async function podeJogar() {
    if (pendente) { mostrarTela(); return false; }
    if (Date.now() - ultimaConferida < 15000) return true; // conferiu agora há pouco
    const achou = await conferir();
    return !achou;
  }

  // o amigo do x1 está numa versão mais nova que a minha?
  function versaoDoAmigo(v) {
    v = String(v || '');
    if (!v || v === minha()) return 'igual';
    if (maisNova(v, minha())) { pendente = v; mostrarTela(); return 'eu-velho'; }
    return 'amigo-velho';
  }

  // ---------- "Sino" no Firebase: o primeiro celular que abre a versão nova avisa todo mundo na hora ----------
  // Realtime Database: config/versao = número da versão mais nova que alguém já abriu.
  let rapidoAte = 0;
  function modoRapido() {
    // o GitHub pode demorar até ~1 min para publicar: confere a cada 5s por até 3 min
    const jaEstava = Date.now() < rapidoAte;
    rapidoAte = Date.now() + 3 * 60 * 1000;
    if (jaEstava) return;
    const tic = async () => {
      if (mostrando || pendente || Date.now() > rapidoAte) return;
      if (await conferir()) return;
      setTimeout(tic, 5000);
    };
    tic();
  }

  async function ligarSino() {
    // espera o Firebase iniciar (a conta liga ele no começo do jogo)
    for (let i = 0; i < 60 && !(typeof Conta !== 'undefined' && Conta.fb && Conta.fb() && Conta.fb().app); i++) await new Promise((ok) => setTimeout(ok, 1000));
    const f = typeof Conta !== 'undefined' && Conta.fb && Conta.fb();
    if (!f || !f.app || typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.databaseURL) return;
    try {
      const m = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
      const db = m.getDatabase(f.app, FIREBASE_CONFIG.databaseURL);
      const ref = m.ref(db, 'config/versao');
      m.onValue(ref, (snap) => {
        const v = snap.val();
        const minhaN = +minha();
        if (typeof v === 'number' && minhaN && v > minhaN) modoRapido(); // alguém já está numa versão mais nova
        else if (minhaN && (!v || minhaN > v) && Conta.logado()) {
          // eu sou o primeiro com a versão nova: toco o sino
          m.runTransaction(ref, (atual) => (!atual || minhaN > atual ? minhaN : undefined)).catch(() => {});
        }
      }, () => {});
    } catch (e) { console.warn('Sino de atualização indisponível:', e); }
  }
  ligarSino();

  // aviso pequeno durante a batalha
  function avisoNaBatalha() {
    let b = document.getElementById('aviso-atualizacao');
    const mostrar = pendente && emBatalha();
    if (!mostrar) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div');
      b.id = 'aviso-atualizacao';
      b.textContent = '✨ Nova versão! O jogo atualiza quando a batalha acabar';
      document.getElementById('app').appendChild(b);
    }
  }

  // quando a batalha fecha, mostra a tela se havia atualização esperando
  setInterval(() => { avisoNaBatalha(); if (pendente && !mostrando && !emBatalha()) mostrarTela(); }, 1000);
  setInterval(() => { if (document.visibilityState === 'visible') conferir(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') conferir(); });
  window.addEventListener('online', conferir);
  window.addEventListener('pageshow', (e) => { if (e.persisted) conferir(); }); // voltou pelo botão "voltar" do navegador
  setTimeout(conferir, 4000);

  // avisa que atualizou
  setTimeout(() => {
    try {
      const antes = sessionStorage.getItem('qk-atualizou');
      if (antes && antes !== minha() && typeof UI !== 'undefined') UI.toast('Jogo atualizado! ✨');
      sessionStorage.removeItem('qk-atualizou');
    } catch (e) { /* nada */ }
  }, 2500);

  return { conferir, podeJogar, versaoDoAmigo, versao: minha, modoRapido };
})();
